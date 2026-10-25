(function () {
  'use strict';

  var root = document.getElementById('rag-chat');
  if (!root) return;

  var lang = document.documentElement.lang === 'en' ? 'en' : 'es';
  var T = {
    es: {
      thinking: 'Buscando en ProbLab…',
      sources: 'Fuentes en ProbLab',
      errors: {
        rate_limited: 'Has hecho muchas preguntas seguidas. Espera un rato y vuelve a intentarlo.',
        daily_limit: 'El asistente ha alcanzado su límite diario de preguntas. Vuelve mañana.',
        busy: 'El asistente está saturado ahora mismo. Inténtalo de nuevo en unos segundos.',
        not_configured: 'El asistente todavía no está disponible.',
        bad_question: 'Escribe una pregunta de hasta 600 caracteres.',
        refused: 'No puedo responder a esa pregunta.',
        network: 'No se ha podido conectar con el asistente. Comprueba tu conexión.',
        other: 'Ha ocurrido un error. Inténtalo de nuevo.'
      }
    },
    en: {
      thinking: 'Searching ProbLab…',
      sources: 'Sources on ProbLab',
      errors: {
        rate_limited: 'You have asked many questions in a row. Please wait a while and try again.',
        daily_limit: 'The assistant has reached its daily question limit. Please come back tomorrow.',
        busy: 'The assistant is busy right now. Please try again in a few seconds.',
        not_configured: 'The assistant is not available yet.',
        bad_question: 'Please write a question of up to 600 characters.',
        refused: 'I cannot answer that question.',
        network: 'Could not reach the assistant. Please check your connection.',
        other: 'Something went wrong. Please try again.'
      }
    }
  }[lang];

  var log = root.querySelector('.rag-log');
  var form = root.querySelector('.rag-form');
  var input = form.querySelector('textarea');
  var button = form.querySelector('button');
  var history = [];
  var busy = false;

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Markdown mínimo (negritas, cursivas, código, listas, párrafos) sobre texto
  // ya escapado, y citas [n] convertidas en enlaces a la fuente.
  function render(text, sources) {
    var byN = {};
    sources.forEach(function (s) { byN[s.n] = s; });

    function inline(s) {
      return s
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
        .replace(/\[(\d{1,2})\]/g, function (m, n) {
          var s = byN[n];
          if (!s) return '';
          return '<a class="rag-cite" href="' + escapeHtml(s.url) + '" title="' +
            escapeHtml(s.title + ' — ' + s.section) + '">[' + n + ']</a>';
        });
    }

    var html = '';
    var list = null;
    escapeHtml(text).split('\n').forEach(function (line) {
      var item = line.match(/^\s*(?:[-*•]|(\d+)\.)\s+(.*)$/);
      if (item) {
        var type = item[1] ? 'ol' : 'ul';
        if (list !== type) {
          if (list) html += '</' + list + '>';
          html += '<' + type + '>';
          list = type;
        }
        html += '<li>' + inline(item[2]) + '</li>';
        return;
      }
      if (list) { html += '</' + list + '>'; list = null; }
      line = line.replace(/^#{1,6}\s+/, '');
      if (line.trim()) html += '<p>' + inline(line) + '</p>';
    });
    if (list) html += '</' + list + '>';
    return html;
  }

  function sourcesHtml(text, sources) {
    // Solo las fuentes citadas en la respuesta; si no cita ninguna, las tres primeras.
    var cited = sources.filter(function (s) { return text.indexOf('[' + s.n + ']') !== -1; });
    if (!cited.length) cited = sources.slice(0, 3);
    var seen = {};
    var items = cited.filter(function (s) {
      if (seen[s.url]) return false;
      seen[s.url] = true;
      return true;
    }).map(function (s) {
      return '<li><a href="' + escapeHtml(s.url) + '">' + escapeHtml(s.title) + '</a></li>';
    });
    if (!items.length) return '';
    return '<div class="rag-sources">' + T.sources + ':<ol>' + items.join('') + '</ol></div>';
  }

  function addMessage(cls, html) {
    var div = document.createElement('div');
    div.className = 'rag-msg ' + cls;
    div.innerHTML = html;
    log.appendChild(div);
    div.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return div;
  }

  function ask(question) {
    question = question.trim();
    if (!question || busy) return;
    busy = true;
    button.disabled = true;
    addMessage('rag-msg-user', '<p>' + escapeHtml(question).replace(/\n/g, '<br>') + '</p>');
    var pending = addMessage('rag-msg-bot rag-thinking', '<p>' + T.thinking + '</p>');
    input.value = '';

    fetch('/api/rag.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question, lang: lang, history: history.slice(-6) })
    })
      .then(function (res) {
        return res.json().catch(function () { return { error: 'other' }; });
      })
      .then(function (data) {
        if (data.error || !data.answer) {
          pending.className = 'rag-msg rag-msg-bot rag-msg-error';
          pending.innerHTML = '<p>' + (T.errors[data.error] || T.errors.other) + '</p>';
          return;
        }
        pending.className = 'rag-msg rag-msg-bot';
        pending.innerHTML = render(data.answer, data.sources || []) + sourcesHtml(data.answer, data.sources || []);
        history.push({ role: 'user', content: question }, { role: 'assistant', content: data.answer });
      })
      .catch(function () {
        pending.className = 'rag-msg rag-msg-bot rag-msg-error';
        pending.innerHTML = '<p>' + T.errors.network + '</p>';
      })
      .then(function () {
        busy = false;
        button.disabled = false;
        input.focus();
      });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    ask(input.value);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask(input.value);
    }
  });
  root.querySelectorAll('.rag-examples button').forEach(function (b) {
    b.addEventListener('click', function () { ask(b.textContent); });
  });
})();
