/* ==========================================================================
   SUJO — front-end behaviour.
   Language toggle, navigation, catalogue search, form validation, and the
   client-side inquiry number.

   No dependencies, no external requests.
   ========================================================================== */
(function () {
  'use strict';

  var DEFAULT_LANG = 'fr';
  var STORAGE_KEY = 'sujoLang';

  function storedLang() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return (v === 'fr' || v === 'en') ? v : DEFAULT_LANG;
    } catch (e) { return DEFAULT_LANG; }
  }

  /* ---------------------------------------------------------------- lang -- */

  // Content strings are plain text, so textContent is both correct and safe.
  function applyLang(lang) {
    var nodes = document.querySelectorAll('[data-fr][data-en]');
    for (var i = 0; i < nodes.length; i++) {
      var v = nodes[i].getAttribute(lang === 'en' ? 'data-en' : 'data-fr');
      if (v !== null) nodes[i].textContent = v;
    }

    var ph = document.querySelectorAll('[data-fr-placeholder][data-en-placeholder]');
    for (var j = 0; j < ph.length; j++) {
      ph[j].placeholder = ph[j].getAttribute(lang === 'en' ? 'data-en-placeholder' : 'data-fr-placeholder');
    }

    var alts = document.querySelectorAll('[data-fr-alt][data-en-alt]');
    for (var k = 0; k < alts.length; k++) {
      alts[k].alt = alts[k].getAttribute(lang === 'en' ? 'data-en-alt' : 'data-fr-alt');
    }

    // Title and meta description are per-language too.
    var root = document.documentElement;
    var title = root.getAttribute('data-title-' + lang);
    if (title) document.title = title;
    var desc = root.getAttribute('data-desc-' + lang);
    var descTag = document.querySelector('meta[name="description"]');
    if (desc && descTag) descTag.setAttribute('content', desc);

    root.lang = lang;
    root.setAttribute('data-lang', lang);

    var buttons = document.querySelectorAll('[data-lang-button]');
    for (var m = 0; m < buttons.length; m++) {
      buttons[m].setAttribute('aria-pressed',
        buttons[m].getAttribute('data-lang-button') === lang ? 'true' : 'false');
    }

    document.dispatchEvent(new CustomEvent('sujo:langchange', { detail: { lang: lang } }));
  }

  function setLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    applyLang(lang);
  }

  function initLang() {
    applyLang(storedLang());
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-lang-button]');
      if (!btn) return;
      e.preventDefault();
      setLang(btn.getAttribute('data-lang-button'));
    });
  }

  function currentLang() {
    return document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'fr';
  }

  /* ----------------------------------------------------------------- nav -- */

  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var panel = document.querySelector('.primary-nav');

    function closeAllMenus(except) {
      var open = document.querySelectorAll('.has-menu.open');
      for (var i = 0; i < open.length; i++) {
        if (open[i] === except) continue;
        open[i].classList.remove('open');
        var t = open[i].querySelector('.menu-trigger');
        if (t) t.setAttribute('aria-expanded', 'false');
      }
    }

    if (toggle && panel) {
      toggle.addEventListener('click', function () {
        var open = panel.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (!open) closeAllMenus();
      });
    }

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('.menu-trigger');
      if (trigger) {
        var li = trigger.parentElement;
        var willOpen = !li.classList.contains('open');
        closeAllMenus(li);
        li.classList.toggle('open', willOpen);
        trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        return;
      }
      if (!e.target.closest('.has-menu')) closeAllMenus();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeAllMenus();
      if (panel && panel.classList.contains('open')) {
        panel.classList.remove('open');
        if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
      }
    });

    // Desktop: open on hover with a small close delay so a diagonal cursor
    // path into the panel doesn't dismiss it.
    var menus = document.querySelectorAll('.has-menu');
    for (var i = 0; i < menus.length; i++) {
      (function (li) {
        var timer = null;
        var trigger = li.querySelector('.menu-trigger');
        function open() {
          if (!window.matchMedia('(min-width: 1041px)').matches) return;
          clearTimeout(timer);
          closeAllMenus(li);
          li.classList.add('open');
          if (trigger) trigger.setAttribute('aria-expanded', 'true');
        }
        function scheduleClose() {
          if (!window.matchMedia('(min-width: 1041px)').matches) return;
          clearTimeout(timer);
          timer = setTimeout(function () {
            li.classList.remove('open');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
          }, 260);
        }
        li.addEventListener('mouseenter', open);
        li.addEventListener('mouseleave', scheduleClose);
        li.addEventListener('focusin', open);
        li.addEventListener('focusout', function (e) {
          if (!li.contains(e.relatedTarget)) scheduleClose();
        });
      })(menus[i]);
    }
  }

  /* ------------------------------------------------------------- catalog -- */

  function initCatalog() {
    var input = document.querySelector('[data-catalog-search]');
    var root = document.querySelector('[data-catalog]');
    if (!input || !root) return;

    var countEl = document.querySelector('[data-catalog-count]');
    var emptyEl = document.querySelector('[data-catalog-empty]');
    var items = root.querySelectorAll('[data-catalog-item]');
    var groups = root.querySelectorAll('[data-catalog-group]');

    function itemText(node) {
      var lang = currentLang();
      return (node.getAttribute(lang === 'en' ? 'data-en' : 'data-fr') || node.textContent).toLowerCase();
    }

    function refresh() {
      var q = input.value.trim().toLowerCase();
      var shown = 0;

      for (var i = 0; i < items.length; i++) {
        var hit = !q || itemText(items[i]).indexOf(q) !== -1;
        items[i].hidden = !hit;
        if (hit) shown++;
      }
      for (var g = 0; g < groups.length; g++) {
        var visible = groups[g].querySelectorAll('[data-catalog-item]:not([hidden])').length;
        groups[g].hidden = visible === 0;
      }
      if (countEl) countEl.textContent = String(shown);
      if (emptyEl) emptyEl.hidden = shown !== 0;
    }

    var debounce = null;
    input.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(refresh, 120);
    });
    document.addEventListener('sujo:langchange', refresh);
    refresh();
  }

  /* --------------------------------------------------------- line items -- */

  // Duplicates the first line-item block, renumbering items[N][field] so a
  // server-side handler receives a proper array.
  function initLineItems() {
    var wrap = document.querySelector('[data-line-items]');
    var addBtn = document.querySelector('[data-add-line]');
    if (!wrap || !addBtn) return;

    var template = wrap.querySelector('[data-line-item]').cloneNode(true);

    function renumber() {
      var rows = wrap.querySelectorAll('[data-line-item]');
      for (var i = 0; i < rows.length; i++) {
        var fields = rows[i].querySelectorAll('[name]');
        for (var f = 0; f < fields.length; f++) {
          fields[f].name = fields[f].name.replace(/items\[\d+\]/, 'items[' + i + ']');
        }
        var labels = rows[i].querySelectorAll('label[for]');
        for (var l = 0; l < labels.length; l++) {
          var control = rows[i].querySelectorAll('[id]')[l];
          var newId = labels[l].getAttribute('for').replace(/q-item\d+/, 'q-item' + i);
          labels[l].setAttribute('for', newId);
          if (control) control.id = newId;
        }
      }
      wrap.toggleAttribute('data-single', rows.length === 1);
    }

    addBtn.addEventListener('click', function () {
      var row = template.cloneNode(true);
      var fields = row.querySelectorAll('input, select, textarea');
      for (var i = 0; i < fields.length; i++) {
        if (fields[i].type === 'checkbox' || fields[i].type === 'radio') fields[i].checked = false;
        else fields[i].value = '';
      }
      wrap.appendChild(row);
      renumber();
      var first = row.querySelector('input, select, textarea');
      if (first) first.focus();
    });

    wrap.addEventListener('click', function (e) {
      if (!e.target.closest('[data-remove-line]')) return;
      var rows = wrap.querySelectorAll('[data-line-item]');
      if (rows.length <= 1) return;
      e.target.closest('[data-line-item]').remove();
      renumber();
    });

    renumber();
  }

  /* --------------------------------------------------------------- forms -- */

  var MESSAGES = {
    incomplete: {
      fr: 'Veuillez compléter les champs obligatoires signalés ci-dessous.',
      en: 'Please complete the required fields flagged below.'
    },
    unwired: {
      fr: 'Ce formulaire n’est pas encore connecté à un serveur. Vos informations n’ont pas été envoyées. En attendant, écrivez-nous à contact@sujo-engineering.com.',
      en: 'This form is not yet connected to a server. Your information was not sent. In the meantime, write to us at contact@sujo-engineering.com.'
    }
  };

  // INQ-YYYY-NNNN. Client-side, so it is a reference for the visitor and for
  // the email body — the authoritative number is assigned by whatever system
  // you wire the form into.
  function makeInquiryNumber() {
    var year = new Date().getFullYear();
    var n = Math.floor(Math.random() * 9000) + 1000;
    return 'INQ-' + year + '-' + n;
  }

  function showStatus(form, state, message) {
    var box = form.querySelector('[data-form-status]');
    if (!box) return;
    box.hidden = false;
    box.setAttribute('data-state', state);
    box.textContent = message;
  }

  function validate(form) {
    var invalid = [];
    var fields = form.querySelectorAll('input, select, textarea');
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (f.type === 'hidden' || f.disabled) continue;
      if (f.checkValidity()) {
        f.removeAttribute('aria-invalid');
      } else {
        f.setAttribute('aria-invalid', 'true');
        invalid.push(f);
      }
    }
    return invalid;
  }

  function initForms() {
    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) {
      (function (form) {
        var numberField = form.querySelector('[data-inquiry-number]');
        if (numberField && !numberField.value) numberField.value = makeInquiryNumber();

        form.addEventListener('submit', function (e) {
          var invalid = validate(form);
          if (invalid.length) {
            e.preventDefault();
            showStatus(form, 'error', MESSAGES.incomplete[currentLang()]);
            invalid[0].focus();
            return;
          }

          // The endpoint is a placeholder until the form is wired up. Rather
          // than silently posting nowhere, say so and keep the data on screen.
          var action = form.getAttribute('action') || '';
          if (!action || action.indexOf('REPLACE_WITH') === 0) {
            e.preventDefault();
            showStatus(form, 'error', MESSAGES.unwired[currentLang()]);
            var tpl = document.getElementById('inquiry-success');
            if (tpl && numberField) {
              var node = tpl.content.cloneNode(true);
              var slot = node.querySelector('[data-inquiry-display]');
              if (slot) slot.textContent = numberField.value;
              form.parentNode.insertBefore(node, form);
            }
            return;
          }

          // The form posts away to the handler, which redirects to
          // thank-you.html. Park the inquiry number so that page can still
          // show the visitor their reference after the round trip.
          if (numberField && numberField.value) {
            try { sessionStorage.setItem('sujoInquiry', numberField.value); } catch (err) {}
          }

          var submit = form.querySelector('button[type="submit"]');
          if (submit) {
            submit.disabled = true;
            submit.textContent = currentLang() === 'en' ? 'Sending…' : 'Envoi en cours…';
          }
        });

        form.addEventListener('input', function (e) {
          if (e.target.getAttribute('aria-invalid') && e.target.checkValidity()) {
            e.target.removeAttribute('aria-invalid');
          }
        });
      })(forms[i]);
    }
  }

  /* ----------------------------------------------------------- thank you -- */

  // Shows the reference the visitor was given before they were redirected.
  // Absent (direct visit, or storage blocked) the panel simply stays hidden.
  function initThanks() {
    var panel = document.querySelector('[data-thanks-panel]');
    if (!panel) return;
    var number = null;
    try {
      number = sessionStorage.getItem('sujoInquiry');
      sessionStorage.removeItem('sujoInquiry');
    } catch (e) {}
    if (!number) return;
    var slot = panel.querySelector('[data-inquiry-display]');
    if (slot) slot.textContent = number;
    panel.hidden = false;
  }

  /* ---------------------------------------------------------------- boot -- */

  function boot() {
    initLang();
    initNav();
    initCatalog();
    initLineItems();
    initForms();
    initThanks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
