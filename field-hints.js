(function () {
  'use strict';

  function init() {
    var buttons = document.querySelectorAll('.field-help-btn');
    var counter = 0;

    buttons.forEach(function (btn) {
      var group = btn.closest('.form-group');
      var hint = group ? group.querySelector('.field-hint') : null;
      if (!hint) return;

      if (!hint.id) {
        counter += 1;
        hint.id = 'field-hint-auto-' + counter;
      }
      btn.setAttribute('aria-controls', hint.id);

      btn.addEventListener('click', function () {
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        hint.hidden = expanded;
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
