(function () {
    const DEFAULT_LANG = 'fr';
    const savedLang = (() => {
        try { return localStorage.getItem('sujoLang') || DEFAULT_LANG; }
        catch (e) { return DEFAULT_LANG; }
    })();

    document.documentElement.lang = savedLang;

    function applyLang(lang) {
        document.querySelectorAll('[data-fr][data-en]').forEach(el => {
            const text = lang === 'fr' ? el.getAttribute('data-fr') : el.getAttribute('data-en');
            el.innerHTML = text;
        });

        document.querySelectorAll('[data-fr-placeholder][data-en-placeholder]').forEach(el => {
            el.placeholder = lang === 'fr' ? el.getAttribute('data-fr-placeholder') : el.getAttribute('data-en-placeholder');
        });

        document.documentElement.lang = lang;
    }

    function updateLangButtons(lang) {
        document.querySelectorAll('[data-lang-button]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang-button') === lang);
            btn.setAttribute('aria-pressed', btn.getAttribute('data-lang-button') === lang ? 'true' : 'false');
        });
    }

    window.setLang = function (lang) {
        try { localStorage.setItem('sujoLang', lang); } catch (e) {}
        applyLang(lang);
        updateLangButtons(lang);
        if (window.__sujoRefreshProductSearch) window.__sujoRefreshProductSearch();
    };

    window.toggleService = function (btn) {
        const details = btn.nextElementSibling;
        if (!details) return;
        const isOpen = details.classList.toggle('open');
        btn.classList.toggle('open', isOpen);
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    window.toggleMenu = function () {
        const menu = document.getElementById('mobileMenu');
        const hamburger = document.querySelector('.hamburger');
        if (!menu || !hamburger) return;
        const isOpen = menu.classList.toggle('open');
        hamburger.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        hamburger.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    };



    function setupReliableMobileNavigation() {
        if (window.__sujoMobileNavBound) return;
        window.__sujoMobileNavBound = true;

        function isMobileNav() {
            return window.matchMedia('(max-width: 900px)').matches;
        }

        function closeMobileMenu() {
            const menu = document.getElementById('mobileMenu');
            const hamburger = document.querySelector('.hamburger');
            if (menu) menu.classList.remove('open');
            document.querySelectorAll('#mobileMenu .dropdown.open').forEach(dropdown => dropdown.classList.remove('open'));
            if (hamburger) {
                hamburger.classList.remove('open');
                hamburger.setAttribute('aria-expanded', 'false');
                hamburger.setAttribute('aria-label', 'Open navigation menu');
            }
        }

        // Capture mobile clicks before older inline handlers can double-toggle the menu.
        document.addEventListener('click', function (event) {
            const hamburger = event.target.closest('.hamburger');
            if (hamburger) {
                event.preventDefault();
                event.stopImmediatePropagation();
                window.toggleMenu();
                return;
            }

            const dropdownTrigger = event.target.closest('#mobileMenu .dropdown > a');
            if (dropdownTrigger && isMobileNav()) {
                event.preventDefault();
                event.stopImmediatePropagation();
                const dropdown = dropdownTrigger.parentElement;
                const isOpen = dropdown.classList.toggle('open');
                dropdownTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                return;
            }

            const menuLink = event.target.closest('#mobileMenu a');
            if (menuLink && isMobileNav()) {
                closeMobileMenu();
            }
        }, true);

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && isMobileNav()) {
                closeMobileMenu();
            }
        });

        window.addEventListener('resize', function () {
            if (!isMobileNav()) closeMobileMenu();
        });
    }

    function loadLazyBackgrounds() {
        const applyBg = el => {
            const src = el.getAttribute('data-bg');
            if (!src || el.dataset.bgLoaded === 'true') return;
            el.style.backgroundImage = `url('${src}')`;
            el.dataset.bgLoaded = 'true';
            el.classList.add('lazy-bg-loaded');
        };

        const targets = document.querySelectorAll('.lazy-bg[data-bg]');
        if (!('IntersectionObserver' in window)) {
            targets.forEach(applyBg);
            return;
        }

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    applyBg(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '250px 0px' });

        targets.forEach(el => observer.observe(el));
    }

    function setActiveNav() {
        const currentFile = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        document.querySelectorAll('.nav-links a').forEach(link => {
            const href = (link.getAttribute('href') || '').split('#')[0].split('/').pop().toLowerCase();
            const isCurrent = href && href === currentFile;
            link.classList.toggle('active', isCurrent);
            if (isCurrent) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
    }

    function bindUI() {
        document.querySelectorAll('[data-lang-button]').forEach(btn => {
            if (btn.dataset.bound) return;
            btn.addEventListener('click', () => window.setLang(btn.getAttribute('data-lang-button')));
            btn.dataset.bound = 'true';
        });

        const hamburger = document.querySelector('.hamburger');
        if (hamburger && !hamburger.dataset.bound) {
            hamburger.addEventListener('click', window.toggleMenu);
            hamburger.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    window.toggleMenu();
                }
            });
            hamburger.dataset.bound = 'true';
        }

        document.querySelectorAll('.dropdown > a').forEach(link => {
            if (link.dataset.bound) return;
            link.addEventListener('click', event => {
                if (window.innerWidth <= 900) {
                    event.preventDefault();
                    link.parentElement.classList.toggle('open');
                }
            });
            link.dataset.bound = 'true';
        });

        // Desktop hover-intent: keep the dropdown open briefly after the
        // cursor leaves so it doesn't vanish while moving diagonally down
        // into the submenu. Also supports keyboard focus.
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            if (dropdown.dataset.hoverBound) return;
            let closeTimer = null;

            const openNow = () => {
                clearTimeout(closeTimer);
                dropdown.classList.add('open');
            };
            const scheduleClose = () => {
                clearTimeout(closeTimer);
                closeTimer = setTimeout(() => dropdown.classList.remove('open'), 400);
            };

            dropdown.addEventListener('mouseenter', openNow);
            dropdown.addEventListener('mouseleave', scheduleClose);
            dropdown.addEventListener('focusin', openNow);
            dropdown.addEventListener('focusout', scheduleClose);

            dropdown.dataset.hoverBound = 'true';
        });

        document.querySelectorAll('#mobileMenu a, .mobile-menu a').forEach(link => {
            if (link.dataset.closeBound) return;
            link.addEventListener('click', () => {
                const menu = document.getElementById('mobileMenu');
                const hamburgerIcon = document.querySelector('.hamburger');
                if (menu) menu.classList.remove('open');
                if (hamburgerIcon) {
                    hamburgerIcon.classList.remove('open');
                    hamburgerIcon.setAttribute('aria-expanded', 'false');
                    hamburgerIcon.setAttribute('aria-label', 'Open navigation menu');
                }
            });
            link.dataset.closeBound = 'true';
        });

        document.querySelectorAll('form[data-validate="true"]').forEach(form => {
            if (form.dataset.bound) return;
            form.addEventListener('submit', event => {
                const required = form.querySelectorAll('[required]');
                let valid = form.checkValidity();
                required.forEach(field => {
                    if (!field.checkValidity()) {
                        field.classList.add('field-error');
                    } else {
                        field.classList.remove('field-error');
                    }
                });
                const feedback = form.querySelector('[data-form-feedback]');
                if (!valid) {
                    event.preventDefault();
                    if (feedback) {
                        feedback.textContent = document.documentElement.lang === 'fr'
                            ? 'Veuillez remplir tous les champs obligatoires.'
                            : 'Please complete all required fields.';
                        feedback.className = 'form-feedback error';
                    }
                    return;
                }
                const submit = form.querySelector('button[type="submit"]');
                if (submit) {
                    submit.disabled = true;
                    submit.classList.add('is-loading');
                    submit.dataset.originalText = submit.textContent;
                    submit.textContent = document.documentElement.lang === 'fr' ? 'Envoi en cours…' : 'Sending…';
                }
            });
            form.dataset.bound = 'true';
        });
    }

    function setupProductSearch() {
        const input = document.getElementById('productSearch');
        const grid = document.querySelector('.grid-3');
        if (!input || !grid) return;

        const cards = Array.from(grid.querySelectorAll(':scope > .card-system'));
        if (!cards.length) return;

        let emptyState = document.querySelector('.search-empty-state');
        if (!emptyState) {
            emptyState = document.createElement('p');
            emptyState.className = 'search-empty-state';
            emptyState.setAttribute('data-fr', 'Aucun produit ne correspond à votre recherche.');
            emptyState.setAttribute('data-en', 'No products match your search.');
            emptyState.hidden = true;
            grid.insertAdjacentElement('afterend', emptyState);
        }

        function refresh() {
            const query = input.value.trim().toLowerCase();
            let visibleCount = 0;

            cards.forEach(card => {
                const heading = card.querySelector('h3');
                const headingText = heading ? heading.textContent.toLowerCase() : '';
                const pills = Array.from(card.querySelectorAll('.pill-node'));

                if (!query) {
                    pills.forEach(pill => { pill.style.display = ''; });
                    card.style.display = '';
                    visibleCount++;
                    return;
                }

                if (headingText.includes(query)) {
                    pills.forEach(pill => { pill.style.display = ''; });
                    card.style.display = '';
                    visibleCount++;
                    return;
                }

                const matchingPills = pills.filter(pill => pill.textContent.toLowerCase().includes(query));
                if (matchingPills.length) {
                    pills.forEach(pill => {
                        pill.style.display = matchingPills.includes(pill) ? '' : 'none';
                    });
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            emptyState.hidden = visibleCount !== 0;
            emptyState.textContent = document.documentElement.lang === 'fr'
                ? emptyState.getAttribute('data-fr')
                : emptyState.getAttribute('data-en');
        }

        input.addEventListener('input', refresh);
        window.__sujoRefreshProductSearch = refresh;
        refresh();
    }

    document.addEventListener('DOMContentLoaded', () => {
        applyLang(savedLang);
        updateLangButtons(savedLang);
        setActiveNav();
        bindUI();
        setupReliableMobileNavigation();
        loadLazyBackgrounds();
        setupProductSearch();
        document.documentElement.classList.remove('lang-loading');
        document.documentElement.classList.add('lang-ready');
    });
})();
