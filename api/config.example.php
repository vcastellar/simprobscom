<?php
/**
 * Plantilla de configuración del asistente (api/rag.php).
 *
 * Copia este fichero como problab-config.php UN NIVEL POR ENCIMA de
 * public_html (fuera de la web pública) y rellena la clave. Nunca subas la
 * clave real al repositorio.
 */
return [
    // Clave de https://platform.claude.com (Settings → API keys).
    'api_key' => 'sk-ant-...',

    // Modelo y esfuerzo. claude-haiku-5-5 es mucho más barato y suele bastar
    // para preguntas cortas; claude-opus-5-5 da respuestas de más calidad.
    'model' => 'claude-opus-5-5',
    'effort' => 'low',

    // Límites de uso para controlar el gasto.
    'per_ip_per_hour' => 20,
    'global_per_day' => 2000,

    // Carpeta para los contadores de uso (fuera de public_html).
    // 'state_dir' => '/home/USUARIO/problab-rag-state',
];
