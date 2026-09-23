(function () {
  'use strict';

  var counter = 0;

  // Localiza la nota de ayuda (.field-hint) asociada a un botón "i".
  function hintFor(btn) {
    var group = btn.closest('.form-group');
    return group ? group.querySelector('.field-hint') : null;
  }

  // Prepara un botón "i" la primera vez que se ve: enlaza su nota y la deja
  // ABIERTA por defecto. El usuario puede ocultarla —y volver a mostrarla—
  // pulsando el propio botón. Un botón ya inicializado (con aria-controls) se
  // ignora, para no reabrir una nota que el usuario haya cerrado a mano.
  function setup(btn) {
    if (btn.getAttribute('aria-controls')) return;

    var hint = hintFor(btn);
    if (!hint) return;

    if (!hint.id) {
      counter += 1;
      hint.id = 'field-hint-auto-' + counter;
    }
    btn.setAttribute('aria-controls', hint.id);

    // Estado inicial: nota visible.
    hint.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  }

  // Un único manejador delegado: funciona también con los botones que
  // script.js genera dinámicamente para los parámetros de cada distribución.
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('.field-help-btn') : null;
    if (!btn) return;

    var hint = hintFor(btn);
    if (!hint) return;

    var expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    hint.hidden = expanded;
  });

  function init() {
    document.querySelectorAll('.field-help-btn').forEach(setup);

    // Los parámetros de las distribuciones se regeneran al cambiar de
    // distribución; volvemos a inicializar los botones nuevos para que
    // también empiecen con la nota abierta.
    var paramContainer = document.getElementById('parameters');
    if (paramContainer && typeof MutationObserver !== 'undefined') {
      new MutationObserver(function () {
        paramContainer.querySelectorAll('.field-help-btn').forEach(setup);
      }).observe(paramContainer, { childList: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
