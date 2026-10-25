<?php
/**
 * Asistente de ProbLab (RAG): recibe una pregunta, busca los fragmentos más
 * relevantes de la web en rag/index-{es,en}.json (BM25) y pide a Claude que
 * responda usando solo ese contexto.
 *
 * POST /api/rag.php   {"question": "...", "lang": "es"|"en", "history": [...]}
 * → {"answer": "...", "sources": [{"n":1,"title":"...","section":"...","url":"..."}]}
 *
 * Configuración (clave de API, modelo, límites): ver api/config.example.php.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function rag_fail(int $status, string $error): never
{
    http_response_code($status);
    echo json_encode(['error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    rag_fail(405, 'method_not_allowed');
}

// ── Configuración ───────────────────────────────────────────────────────
// Se busca fuera de la raíz pública (un nivel por encima de public_html) y,
// como alternativa, en api/config.php (protegido por api/.htaccess).
$config = [];
foreach ([dirname(__DIR__, 2) . '/problab-config.php', __DIR__ . '/config.php'] as $candidate) {
    if (is_file($candidate)) {
        $config = require $candidate;
        break;
    }
}
$config += [
    'api_key' => getenv('ANTHROPIC_API_KEY') ?: '',
    'model' => 'claude-opus-5-5',
    'effort' => 'low',
    'per_ip_per_hour' => 20,
    'global_per_day' => 2000,
    'state_dir' => dirname(__DIR__, 2) . '/problab-rag-state',
    'base_url' => null,
];
if ($config['api_key'] === '') {
    rag_fail(503, 'not_configured');
}

// ── Entrada ─────────────────────────────────────────────────────────────
$input = json_decode((string) file_get_contents('php://input', false, null, 0, 20000), true);
if (!is_array($input)) {
    rag_fail(400, 'bad_request');
}
$lang = ($input['lang'] ?? 'es') === 'en' ? 'en' : 'es';
$question = trim((string) ($input['question'] ?? ''));
if ($question === '' || mb_strlen($question) > 600) {
    rag_fail(400, 'bad_question');
}
// Historial corto (las últimas 3 preguntas y respuestas) para preguntas de seguimiento.
$history = [];
foreach (array_slice(is_array($input['history'] ?? null) ? $input['history'] : [], -6) as $turn) {
    $role = $turn['role'] ?? '';
    $content = mb_substr(trim((string) ($turn['content'] ?? '')), 0, 2000);
    if (in_array($role, ['user', 'assistant'], true) && $content !== '') {
        $history[] = ['role' => $role, 'content' => $content];
    }
}
// La API exige alternar roles empezando por "user".
while ($history && $history[0]['role'] !== 'user') {
    array_shift($history);
}
if ($history && end($history)['role'] !== 'assistant') {
    array_pop($history);
}

// ── Límite de uso ───────────────────────────────────────────────────────
function rag_rate_limited(string $file, int $limit, int $window): bool
{
    $fh = @fopen($file, 'c+');
    if ($fh === false) {
        return false; // sin almacenamiento no bloqueamos, pero tampoco fallamos
    }
    flock($fh, LOCK_EX);
    $now = time();
    $hits = array_filter(
        json_decode((string) stream_get_contents($fh), true) ?: [],
        fn ($t) => $t > $now - $window
    );
    $limited = count($hits) >= $limit;
    if (!$limited) {
        $hits[] = $now;
    }
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode(array_values($hits)));
    flock($fh, LOCK_UN);
    fclose($fh);
    return $limited;
}

$stateDir = $config['state_dir'];
if (!is_dir($stateDir)) {
    @mkdir($stateDir, 0700, true);
}
// De vez en cuando se borran los contadores por IP de más de un día
// (la política de privacidad promete no conservarlos más de 24 horas).
if (random_int(1, 50) === 1) {
    foreach (glob("$stateDir/ip-*.json") ?: [] as $old) {
        if (filemtime($old) < time() - 86400) {
            @unlink($old);
        }
    }
}
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ipKey = hash_hmac('sha256', $ip, $config['api_key']); // no guardamos IPs en claro
if (rag_rate_limited("$stateDir/ip-" . substr($ipKey, 0, 32) . '.json', (int) $config['per_ip_per_hour'], 3600)) {
    rag_fail(429, 'rate_limited');
}
if (rag_rate_limited("$stateDir/global.json", (int) $config['global_per_day'], 86400)) {
    rag_fail(429, 'daily_limit');
}

// ── Recuperación (BM25) ─────────────────────────────────────────────────
// Debe coincidir con tokenize() de rag/build_index.py.
const RAG_STOPWORDS = [
    'a', 'al', 'algo', 'ante', 'como', 'con', 'contra', 'cual', 'cuales', 'cuando', 'de', 'del', 'desde',
    'donde', 'e', 'el', 'ella', 'ellos', 'en', 'entre', 'era', 'es', 'esa', 'ese', 'eso', 'esta', 'este',
    'esto', 'estos', 'estas', 'fue', 'ha', 'hay', 'la', 'las', 'le', 'les', 'lo', 'los', 'mas', 'me', 'mi',
    'muy', 'ni', 'no', 'nos', 'o', 'os', 'otra', 'otro', 'para', 'pero', 'por', 'porque', 'que', 'quien',
    'se', 'sea', 'ser', 'si', 'sin', 'sobre', 'son', 'su', 'sus', 'tambien', 'te', 'tiene', 'tu', 'un',
    'una', 'uno', 'unos', 'unas', 'y', 'ya', 'yo', 'puedo', 'puede', 'debo', 'hacer', 'hago', 'cuanto',
    'cuantos', 'the', 'of', 'and', 'or', 'to', 'in', 'on', 'for', 'is', 'are', 'be', 'by', 'with', 'as',
    'at', 'from', 'that', 'this', 'it', 'an', 'which', 'what', 'how', 'when', 'can', 'do', 'does', 'i',
    'my', 'we', 'you', 'your', 'our', 'its', 'was', 'were', 'has', 'have',
];

function rag_tokenize(string $text): array
{
    $text = mb_strtolower($text, 'UTF-8');
    if (class_exists('Normalizer')) {
        $text = preg_replace('/\p{Mn}+/u', '', Normalizer::normalize($text, Normalizer::FORM_D));
    } else {
        $text = strtr($text, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n']);
    }
    // "p-valor", "p valor", "p-value" → un solo término.
    $text = preg_replace('/\bp[\s-]+(valor|value)/', 'p$1', $text);
    preg_match_all('/[a-z0-9]+/', $text, $m);
    static $stop = null;
    $stop ??= array_flip(RAG_STOPWORDS);
    $tokens = [];
    foreach ($m[0] as $tok) {
        if (isset($stop[$tok]) || (strlen($tok) < 2 && !ctype_digit($tok))) {
            continue;
        }
        // Raíz por truncado a 6 letras (STEM_LEN en build_index.py).
        $tokens[] = substr($tok, 0, 6);
    }
    return $tokens;
}

$index = json_decode((string) @file_get_contents(dirname(__DIR__) . "/rag/index-$lang.json"), true);
if (!is_array($index) || empty($index['chunks'])) {
    rag_fail(500, 'index_missing');
}

// La pregunta anterior ayuda en seguimientos ("¿y si la muestra es pequeña?").
$queryText = $question;
for ($i = count($history) - 1; $i >= 0; $i--) {
    if ($history[$i]['role'] === 'user') {
        $queryText .= ' ' . $history[$i]['content'];
        break;
    }
}
$qTerms = array_count_values(rag_tokenize($queryText));
$n = (int) $index['n'];
$avgdl = (float) $index['avgdl'] ?: 1.0;
$k1 = 1.2;
$b = 0.75;
$scores = [];
foreach ($index['chunks'] as $chunk) {
    $score = 0.0;
    foreach ($qTerms as $term => $qtf) {
        $tf = $chunk['tf'][$term] ?? 0;
        if ($tf === 0) {
            continue;
        }
        $df = $index['df'][$term];
        $idf = log(1 + ($n - $df + 0.5) / ($df + 0.5));
        $score += $idf * ($tf * ($k1 + 1)) / ($tf + $k1 * (1 - $b + $b * $chunk['len'] / $avgdl));
    }
    if ($score > 0) {
        $scores[$chunk['id']] = $score;
    }
}
arsort($scores);

// Los 10 mejores, con como mucho 3 fragmentos por página para variar las fuentes.
$selected = [];
$perPage = [];
foreach ($scores as $id => $score) {
    $chunk = $index['chunks'][$id];
    if (($perPage[$chunk['url']] ?? 0) >= 3) {
        continue;
    }
    $perPage[$chunk['url']] = ($perPage[$chunk['url']] ?? 0) + 1;
    $selected[] = $chunk;
    if (count($selected) >= 10) {
        break;
    }
}

$sources = [];
$context = '';
foreach ($selected as $i => $chunk) {
    $num = $i + 1;
    $sources[] = ['n' => $num, 'title' => $chunk['title'], 'section' => $chunk['section'], 'url' => $chunk['url']];
    $attrs = sprintf(
        'n="%d" pagina="%s" seccion="%s" url="%s"',
        $num,
        htmlspecialchars($chunk['title'], ENT_QUOTES),
        htmlspecialchars($chunk['section'], ENT_QUOTES),
        htmlspecialchars($chunk['url'], ENT_QUOTES)
    );
    $context .= "<fragmento $attrs>\n{$chunk['text']}\n</fragmento>\n";
}
if ($context === '') {
    $context = "(No se ha encontrado ningún fragmento relevante.)\n";
}

// ── Llamada a Claude ────────────────────────────────────────────────────
require __DIR__ . '/vendor/autoload.php';

$system = <<<TXT
Eres el asistente de ProbLab (problabtools.com), una web educativa de calculadoras y explicaciones de estadística y probabilidad.

Responde preguntas de estadística usando la información de ProbLab que se te da en cada mensaje dentro de <contexto>, en fragmentos numerados.

- Basa la respuesta en esos fragmentos y cítalos con su número entre corchetes, por ejemplo [2], justo después de la afirmación que apoyan.
- Cuando una calculadora de ProbLab sirva para lo que pregunta el usuario, recomiéndala y cita su fragmento para que pueda abrirla.
- Si los fragmentos no cubren la pregunta, dilo con claridad. Puedes añadir una orientación breve de conocimiento general, indicando explícitamente que no procede de ProbLab, y sugerir la herramienta de ProbLab más cercana si la hay.
- Si la pregunta no tiene que ver con estadística, probabilidad o ProbLab, explica amablemente que solo puedes ayudar con esos temas.
- Responde en el idioma del usuario, de forma clara y didáctica, en un máximo de unos 250 palabras. Usa Markdown sencillo (negritas, listas) y escribe las fórmulas en texto plano legible, sin LaTeX.
- No inventes resultados numéricos de calculadoras; si hace falta calcular algo, explica cómo hacerlo con la herramienta.
TXT;

$messages = $history;
$messages[] = [
    'role' => 'user',
    'content' => "<contexto>\n$context</contexto>\n\nPregunta del usuario:\n$question",
];

try {
    $client = new Anthropic\Client(apiKey: $config['api_key'], baseUrl: $config['base_url']);
    $message = $client->beta->messages->create(
        model: $config['model'],
        maxTokens: 4000,
        system: $system,
        messages: $messages,
        outputConfig: ['effort' => $config['effort']],
        // Si el modelo declina por política, el servidor reintenta con su fallback.
        fallbacks: 'default',
        betas: ['server-side-fallback-2026-07-01'],
    );
} catch (Anthropic\Core\Exceptions\RateLimitException $e) {
    rag_fail(503, 'busy');
} catch (Anthropic\Core\Exceptions\APIStatusException $e) {
    error_log('ProbLab RAG API error: ' . $e->getMessage());
    rag_fail(502, 'upstream_error');
} catch (Anthropic\Core\Exceptions\APIConnectionException $e) {
    error_log('ProbLab RAG connection error: ' . $e->getMessage());
    rag_fail(502, 'upstream_unreachable');
} catch (Throwable $e) {
    error_log('ProbLab RAG error: ' . $e->getMessage());
    rag_fail(500, 'internal_error');
}

if ($message->stopReason === 'refusal') {
    rag_fail(422, 'refused');
}
$answer = '';
foreach ($message->content as $block) {
    if ($block->type === 'text') {
        $answer .= $block->text;
    }
}

echo json_encode(['answer' => trim($answer), 'sources' => $sources], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
