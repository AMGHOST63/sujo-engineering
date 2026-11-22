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

    // Accessible names that differ from the visible text — the catalogue's
    // several hundred "Request quote" links each name their own item.
    var labels = document.querySelectorAll('[data-fr-aria][data-en-aria]');
    for (var n = 0; n < labels.length; n++) {
      labels[n].setAttribute('aria-label', labels[n].getAttribute(lang === 'en' ? 'data-en-aria' : 'data-fr-aria'));
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

  // The catalogue is 639 item types across ten families, of which only 90 are
  // photographed. The photographed tiers are static markup; this drives the
  // text list below them — search plus up to three filters (family, category,
  // application), ANDed together.
  //
  // Rows are matched against their own child text, so nothing is duplicated
  // into a data-search attribute. At 639 rows on the hub that saves a good deal
  // of markup, and the per-row search string is cached until the language
  // changes.
  function initCatalog() {
    var root = document.querySelector('[data-catalog]');
    if (!root) return;

    var input = document.querySelector('[data-catalog-search]');
    var countEl = document.querySelector('[data-catalog-count]');
    var emptyEl = document.querySelector('[data-catalog-empty]');
    var resetEl = document.querySelector('[data-catalog-reset]');
    var items = root.querySelectorAll('[data-catalog-item]');
    var groups = root.querySelectorAll('[data-catalog-group]');
    var selects = document.querySelectorAll('[data-catalog-filter]');

    var cacheLang = null;
    var cache = [];

    // The catalogue sits behind a small search icon, Apple-style: the icon
    // opens a panel with a large search field and the product families as
    // quick links. Anything that targets the catalogue opens it first.
    var panel = document.querySelector('[data-cat-panel]');
    var opener = document.querySelector('[data-cat-open]');
    function openPanel(focus) {
      if (!panel) return;
      panel.hidden = false;
      if (opener) opener.setAttribute('aria-expanded', 'true');
      if (focus && input) input.focus({ preventScroll: true });
    }
    function closePanel() {
      if (!panel) return;
      panel.hidden = true;
      if (opener) { opener.setAttribute('aria-expanded', 'false'); opener.focus(); }
    }
    if (opener) {
      opener.addEventListener('click', function () {
        if (panel && panel.hidden) openPanel(true); else closePanel();
      });
    }
    if (panel) {
      panel.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closePanel();
      });
    }
    document.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('a[href="#catalogue"]') : null;
      // Family links ("See products") open the panel themselves, without
      // focusing the field: on a phone that would pop the keyboard and pull
      // the page away from the filtered list.
      if (link && !link.hasAttribute('data-catalog-family')) {
        e.preventDefault();
        openPanel(false);
        var target = document.getElementById('catalogue');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (input) input.focus({ preventScroll: true });
      }
    });

    // A row's searchable text: its name, plus anything marked as catalogue
    // text (description, key specification). Falls back to textContent for the
    // plain pill markup older pages may still carry.
    function rowText(node) {
      var lang = currentLang();
      var parts = [];
      var name = node.querySelector('[data-catalog-name]');
      if (name) parts.push(name.textContent);
      var texts = node.querySelectorAll('[data-catalog-text]');
      for (var t = 0; t < texts.length; t++) {
        parts.push(texts[t].getAttribute(lang === 'en' ? 'data-en' : 'data-fr') || texts[t].textContent);
      }
      if (!parts.length) {
        parts.push(node.getAttribute(lang === 'en' ? 'data-en' : 'data-fr') || node.textContent);
      }
      return parts.join(' ').toLowerCase();
    }

    function buildCache() {
      cacheLang = currentLang();
      cache = [];
      for (var i = 0; i < items.length; i++) cache.push(rowText(items[i]));
    }

    function filterValue(name) {
      for (var s = 0; s < selects.length; s++) {
        if (selects[s].getAttribute('data-catalog-filter') === name) return selects[s].value;
      }
      return '';
    }

    // Choosing a family narrows the category list to that family's categories,
    // so the visitor is never offered a combination that yields nothing.
    function syncCategoryOptions(family) {
      for (var s = 0; s < selects.length; s++) {
        if (selects[s].getAttribute('data-catalog-filter') !== 'category') continue;
        var opts = selects[s].options;
        var lost = false;
        for (var o = 0; o < opts.length; o++) {
          var fam = opts[o].getAttribute('data-family');
          var ok = !family || !fam || fam === family;
          opts[o].hidden = !ok;
          opts[o].disabled = !ok;
          if (!ok && opts[o].selected) lost = true;
        }
        if (lost) selects[s].value = '';
      }
    }

    function refresh() {
      if (cacheLang !== currentLang()) buildCache();

      var q = input ? input.value.trim().toLowerCase() : '';
      var application = filterValue('application');
      var family = filterValue('family') || application;
      var category = filterValue('category');

      syncCategoryOptions(family);
      if (category && family && category.indexOf(family + ':') !== 0) category = '';

      var shown = 0;
      for (var i = 0; i < items.length; i++) {
        var row = items[i];
        var hit = true;
        if (family && row.getAttribute('data-family') !== family) hit = false;
        if (hit && category && row.getAttribute('data-category') !== category) hit = false;
        // Request-only items stay out of the default list but remain findable:
        // a search that names one still turns it up.
        if (hit && !q && row.hasAttribute('data-request-only')) hit = false;
        if (hit && q && cache[i].indexOf(q) === -1) hit = false;
        row.hidden = !hit;
        // Tile colours cycle white / pale blue / pale grey over the visible
        // cards, like the family carousel, so a filtered list keeps the rhythm.
        if (hit) { row.setAttribute('data-tone', String(shown % 3)); shown++; }
      }

      for (var g = 0; g < groups.length; g++) {
        groups[g].hidden = groups[g].querySelectorAll('[data-catalog-item]:not([hidden])').length === 0;
      }

      // The full list opens on demand, but a visitor who searches or filters
      // must see the result without a second click.
      var disclosure = document.querySelector('[data-catalog-disclosure]');
      if (disclosure && (q || family || category || application)) disclosure.open = true;

      var quick = document.querySelectorAll('.cat-ql-link');
      for (var k = 0; k < quick.length; k++) {
        quick[k].setAttribute('aria-pressed', quick[k].getAttribute('data-catalog-family') === family ? 'true' : 'false');
      }

      // Apple-style: only the field and quick links until the visitor asks for something.
      if (panel) panel.classList.toggle('cat-active', !!(q || family || category || application));

      if (countEl) countEl.textContent = String(shown);
      if (emptyEl) emptyEl.hidden = shown !== 0;
      if (resetEl) resetEl.hidden = !(q || family || category || application);
    }

    var debounce = null;
    if (input) {
      input.addEventListener('input', function () {
        clearTimeout(debounce);
        debounce = setTimeout(refresh, 120);
      });
    }
    for (var s = 0; s < selects.length; s++) selects[s].addEventListener('change', refresh);

    if (resetEl) {
      resetEl.addEventListener('click', function () {
        if (input) input.value = '';
        for (var s2 = 0; s2 < selects.length; s2++) selects[s2].value = '';
        refresh();
      });
    }

    // Set the family filter (and clear the category and application ones, which
    // may belong to another family). Returns false if no such family exists.
    function setFamily(id) {
      var set = false;
      for (var s4 = 0; s4 < selects.length; s4++) {
        var which = selects[s4].getAttribute('data-catalog-filter');
        if (which === 'family') {
          for (var o4 = 0; o4 < selects[s4].options.length; o4++) {
            if (selects[s4].options[o4].value === id) { selects[s4].value = id; set = true; }
          }
        } else if (which === 'category' || which === 'application') {
          selects[s4].value = '';
        }
      }
      return set;
    }

    // A family card on the Equipment & Sourcing page filters the list below the
    // same way a category card does. A photographed category card sets the
    // category filter rather than navigating: the visitor asked for bearings,
    // not for another page of navigation.
    document.addEventListener('click', function (e) {
      var famCard = e.target.closest ? e.target.closest('[data-catalog-family]') : null;
      if (famCard) {
        var famId = famCard.getAttribute('data-catalog-family');
        // A second click on the active quick link clears the family filter.
        if (famCard.getAttribute('aria-pressed') === 'true') famId = '';
        if (!setFamily(famId)) return;
        e.preventDefault();
        openPanel(false);
        refresh();
        if (famCard.classList.contains('cat-ql-link')) return;
        var famAnchor = document.getElementById('catalogue');
        if (famAnchor) famAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      var card = e.target.closest ? e.target.closest('[data-catalog-jump]') : null;
      if (!card) return;
      var slug = card.getAttribute('data-catalog-jump');
      var set = false;
      for (var s3 = 0; s3 < selects.length; s3++) {
        if (selects[s3].getAttribute('data-catalog-filter') !== 'category') continue;
        var opts = selects[s3].options;
        for (var o = 0; o < opts.length; o++) {
          if (opts[o].value.split(':')[1] === slug) { selects[s3].value = opts[o].value; set = true; }
        }
      }
      if (!set) return;
      e.preventDefault();
      openPanel(false);
      refresh();
      var anchor = document.getElementById('catalogue');
      if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.addEventListener('sujo:langchange', refresh);

    // ?family=<id> is how the homepage family cards land on a filtered list.
    var famParam = /[?&]family=([^&#]*)/.exec(window.location.search);
    if (famParam && setFamily(decodeURIComponent(famParam[1]))) openPanel(false);
    if (window.location.hash === '#catalogue') openPanel(false);

    buildCache();
    refresh();
  }

  /* ------------------------------------------------ catalogue -> quote -- */

  // A "Request quote" button in the catalogue carries the item name in the
  // query string. Drop it into the first line item so the visitor does not
  // retype what they just clicked.
  function initQuotePrefill() {
    var match = /[?&]item=([^&]*)/.exec(window.location.search);
    if (!match) return;

    var name;
    try { name = decodeURIComponent(match[1].replace(/\+/g, ' ')); } catch (e) { return; }
    if (!name) return;

    var field = document.querySelector('[name="items[0][description]"]')
      || document.querySelector('[name$="[description]"]');
    if (!field) return;

    field.value = name;
    var section = field.closest ? field.closest('section, fieldset') : null;
    if (section && section.scrollIntoView) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  // --- 12.0 homepage: figures count up, sector carousel, design-studio tabs ---
  function initHome() {
    var nums = document.querySelectorAll('[data-count]');
    if (nums.length && 'IntersectionObserver' in window &&
        !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          var el = e.target, end = +el.getAttribute('data-count'), t0 = null;
          function step(t) {
            if (!t0) t0 = t;
            var p = Math.min(1, (t - t0) / 1400);
            el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(step);
          }
          el.textContent = '0';
          requestAnimationFrame(step);
        });
      }, { threshold: 0.4 });
      nums.forEach(function (n) { io.observe(n); });
    }
    document.querySelectorAll('[data-carousel]').forEach(function (b) {
      b.addEventListener('click', function () {
        var sec = b.closest('section');
        var car = sec ? sec.querySelector('.g-carousel') : document.querySelector('.g-carousel');
        if (!car) return;
        var card = car.querySelector('.g-market');
        var w = card ? card.getBoundingClientRect().width + 22 : 400;
        car.scrollBy({ left: b.getAttribute('data-carousel') === 'next' ? w : -w, behavior: 'smooth' });
      });
    });
    // background videos: play while on screen, hero runs through its playlist
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var vids = document.querySelectorAll('video[data-bg-video]');
    vids.forEach(function (v) {
      v.muted = true;
      var list = (v.getAttribute('data-playlist') || '').split(' ').filter(Boolean);
      // data-start: seconds to skip at the start of each film (the empty opening frames);
      // the film also loops back to that point, not to 0
      var start = +(v.getAttribute('data-start') || 10);
      // every film starts 10 s in (the empty opening frames are skipped). When it ends,
      // the finished, coloured model stays up for a moment, then a quick fade takes it
      // back to the start, or on to the next film of the playlist.
      var HOLD = 1200, FADE = 250, i = 0, holdTimer = null;
      // data-seamless: a loop made to repeat with no cut (tile loops): keep the native
      // loop, no start skip, no hold or fade
      if (v.hasAttribute('data-seamless')) {
        v.loop = true;
        if (reduce) { v.removeAttribute('autoplay'); v.pause(); }
        return;
      }
      v.loop = false;
      v.removeAttribute('loop');
      v.style.transition = 'opacity ' + FADE + 'ms ease';
      v.addEventListener('loadedmetadata', function () {
        if (v.duration && v.currentTime < start && v.duration > start + 2) v.currentTime = start;
      });
      v.addEventListener('playing', function () { v.style.opacity = ''; });
      v.addEventListener('ended', function () {
        clearTimeout(holdTimer);
        holdTimer = setTimeout(function () {
          v.style.opacity = '0';
          setTimeout(function () {
            if (list.length > 1) { i = (i + 1) % list.length; v.src = list[i]; }
            else v.currentTime = v.duration > start + 2 ? start : 0;
            if (v.getAttribute('data-visible') === '0') { v.style.opacity = ''; return; }
            var p = v.play(); if (p && p.catch) p.catch(function () { v.style.opacity = ''; });
          }, FADE);
        }, HOLD);
      });
      if (reduce) { v.removeAttribute('autoplay'); v.pause(); }
    });
    if (!reduce && vids.length && 'IntersectionObserver' in window) {
      var vo = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var v = e.target;
          v.setAttribute('data-visible', e.isIntersecting ? '1' : '0');
          if (e.isIntersecting) { if (!v.ended) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
          else v.pause();
        });
      }, { threshold: 0.15 });
      vids.forEach(function (v) { vo.observe(v); });
    }
  }

  // --- architecture page: project slideshow and image galleries ------------
  function initArchi() {
    document.querySelectorAll('[data-slider]').forEach(function (slider) {
      var slides = slider.querySelectorAll('[data-slide]');
      var dots = slider.querySelectorAll('[data-slide-dot]');
      var cur = 0, timer = null;
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      function go(n) {
        cur = (n + slides.length) % slides.length;
        slides.forEach(function (sl, i) { sl.classList.toggle('is-on', i === cur); sl.setAttribute('aria-hidden', i === cur ? 'false' : 'true'); });
        dots.forEach(function (d, i) { d.classList.toggle('is-on', i === cur); });
      }
      function start() { if (!reduce && slides.length > 1) { stop(); timer = setInterval(function () { go(cur + 1); }, 6500); } }
      function stop() { if (timer) clearInterval(timer); timer = null; }
      var prev = slider.querySelector('[data-slide-prev]'), next = slider.querySelector('[data-slide-next]');
      if (prev) prev.addEventListener('click', function () { go(cur - 1); start(); });
      if (next) next.addEventListener('click', function () { go(cur + 1); start(); });
      dots.forEach(function (d) { d.addEventListener('click', function () { go(+d.getAttribute('data-slide-dot')); start(); }); });
      slider.addEventListener('mouseenter', stop);
      slider.addEventListener('mouseleave', start);
      start();
    });
    document.querySelectorAll('.a-gallery').forEach(function (g) {
      var main = g.querySelector('[data-gallery-main]');
      g.querySelectorAll('[data-gallery-thumb]').forEach(function (b) {
        b.addEventListener('click', function () {
          var pic = b.querySelector('picture');
          if (!main || !pic) return;
          var copy = pic.cloneNode(true);
          copy.querySelectorAll('[sizes]').forEach(function (el) { el.setAttribute('sizes', '(max-width: 900px) 100vw, 60vw'); });
          var img = copy.querySelector('img'); if (img) { img.loading = 'eager'; }
          main.innerHTML = '';
          main.appendChild(copy);
          main.classList.toggle('a-plain', b.classList.contains('a-plain'));
          g.querySelectorAll('[data-gallery-thumb]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        });
      });
    });
  }

  // --- fabrication gallery tabs (engineering.html) -------------------------
  function initFab() {
    var tabs = document.querySelectorAll('.fab-tab');
    if (!tabs.length) return;
    function show(tab) {
      tabs.forEach(function (t) {
        var on = t === tab, p = document.getElementById(t.getAttribute('aria-controls'));
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        if (p) p.hidden = !on;
      });
    }
    document.querySelectorAll('[data-fab-hidden]').forEach(function (p) { p.hidden = true; });
    tabs.forEach(function (t) { t.addEventListener('click', function () { show(t); }); });
  }

  // --- Apple-style lineup cards: dots under the tile switch between models -----

  // Apple-style accordion (Architecture "What we design"): one item open at a
  // time; the picture on the right follows the open item.
  function initAccordion() {
    document.querySelectorAll('[data-acc]').forEach(function (acc) {
      var btns = acc.querySelectorAll('[data-acc-btn]');
      var imgs = acc.querySelectorAll('[data-acc-img]');
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          var idx = b.getAttribute('data-acc-btn');
          btns.forEach(function (o) {
            var on = o === b;
            o.setAttribute('aria-expanded', on ? 'true' : 'false');
            var body = document.getElementById(o.getAttribute('aria-controls'));
            if (body) body.hidden = !on;
            o.closest('.acc-item').classList.toggle('is-open', on);
          });
          imgs.forEach(function (im) { im.classList.toggle('is-on', im.getAttribute('data-acc-img') === idx); });
        });
      });
    });
  }

  function initLineupDots() {
    document.querySelectorAll('.lu-card').forEach(function (card) {
      var dots = card.querySelector('[data-lu-dots]');
      var btn = card.querySelector('[data-lightbox]');
      var img = card.querySelector('.f-card-media img');
      var source = card.querySelector('.f-card-media source');
      if (!dots || !btn || !img) return;
      var list; try { list = JSON.parse(btn.getAttribute('data-lightbox')); } catch (e) { return; }
      list = list.slice(0, 5);
      if (list.length < 2) { dots.hidden = true; return; }
      list.forEach(function (it, n) {
        var d = document.createElement('button');
        d.type = 'button'; d.className = 'lu-dot'; d.setAttribute('aria-label', it.en);
        if (n === 0) d.setAttribute('aria-pressed', 'true');
        d.addEventListener('click', function () {
          var webp = it.src.replace(/\.jpg$/, '.webp');
          if (source) source.srcset = webp;
          img.srcset = it.src; img.src = it.src;
          img.alt = it[document.documentElement.lang === 'en' ? 'en' : 'fr'] || it.en;
          dots.querySelectorAll('.lu-dot').forEach(function (o) { o.setAttribute('aria-pressed', o === d ? 'true' : 'false'); });
        });
        dots.appendChild(d);
      });
    });
  }

  // --- projects slider: open centred on a given slide (data-start-slide), so the
  // courtyard block shows first with a neighbour peeking in on each side (2026-11-22)
  function initStageStart() {
    document.querySelectorAll('.g-carousel[data-start-slide]').forEach(function (c) {
      var el = c.children[+c.getAttribute('data-start-slide') || 0];
      if (!el) return;
      var prev = c.style.scrollBehavior;
      c.style.scrollBehavior = 'auto';
      c.scrollLeft = el.offsetLeft - (c.clientWidth - el.offsetWidth) / 2;
      c.style.scrollBehavior = prev;
    });
  }

  // --- image lightbox (architecture project cards) ---------------------------
  function initLightbox() {
    var btns = document.querySelectorAll('[data-lightbox]');
    if (!btns.length) return;
    var box = document.createElement('div');
    box.className = 'lb'; box.hidden = true;
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML = '<button type="button" class="lb-close" aria-label="Fermer / Close">×</button>' +
      '<button type="button" class="lb-nav lb-prev" aria-label="‹">‹</button><figure class="lb-fig"><img alt=""><figcaption></figcaption></figure>' +
      '<button type="button" class="lb-nav lb-next" aria-label="›">›</button><p class="lb-count"></p>';
    document.body.appendChild(box);
    var img = box.querySelector('img'), cap = box.querySelector('figcaption'), cnt = box.querySelector('.lb-count');
    var list = [], i = 0, back = null;
    function lang() { return document.documentElement.getAttribute('data-lang') === 'en' || document.documentElement.lang === 'en' ? 'en' : 'fr'; }
    function show(n) {
      i = (n + list.length) % list.length;
      var it = list[i]; img.src = it.src; img.alt = it[lang()]; cap.textContent = it[lang()];
      cnt.textContent = (i + 1) + ' / ' + list.length;
    }
    function open(b) { try { list = JSON.parse(b.getAttribute('data-lightbox')); } catch (e) { return; } back = b; box.hidden = false; document.body.style.overflow = 'hidden'; show(0); box.querySelector('.lb-close').focus(); }
    function close() { box.hidden = true; document.body.style.overflow = ''; if (back) back.focus(); }
    btns.forEach(function (b) {
      b.addEventListener('click', function () { open(b); });
      // whole cards (not buttons) open with Enter / Space too
      if (b.tagName !== 'BUTTON') b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(b); } });
    });
    box.querySelector('.lb-close').addEventListener('click', close);
    box.querySelector('.lb-prev').addEventListener('click', function () { show(i - 1); });
    box.querySelector('.lb-next').addEventListener('click', function () { show(i + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(i - 1); else if (e.key === 'ArrowRight') show(i + 1);
    });
    var x0 = null;
    box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
  }

  function boot() {
    initLang();
    initNav();
    initCatalog();
    initQuotePrefill();
    initLineItems();
    initForms();
    initThanks();
    initHome();
    initArchi();
    initFab();
    initLightbox();
    initStageStart();
    initLineupDots();
    initAccordion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
