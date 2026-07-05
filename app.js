(function () {
    const savedLang = localStorage.getItem('sujoLang') || 'fr';
    document.documentElement.lang = savedLang;
    document.documentElement.classList.add('lang-loading');

    function applyLang(lang) {
        document.querySelectorAll('[data-fr][data-en]').forEach(el => {
            const text = lang === 'fr' ? el.getAttribute('data-fr') : el.getAttribute('data-en');
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.placeholder) el.placeholder = text;
            } else {
                el.innerHTML = text;
            }
        });
        document.querySelectorAll('[data-fr-placeholder][data-en-placeholder]').forEach(el => {
            el.placeholder = lang === 'fr' ? el.getAttribute('data-fr-placeholder') : el.getAttribute('data-en-placeholder');
        });
        document.documentElement.lang = lang;
    }

    function updateLangButtons(lang) {
        document.querySelectorAll('[data-lang-button]').forEach(btn => {
            const active = btn.getAttribute('data-lang-button') === lang;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }

    window.setLang = function (lang) {
        localStorage.setItem('sujoLang', lang);
        applyLang(lang);
        updateLangButtons(lang);
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
        const open = !menu.classList.contains('open');
        menu.classList.toggle('open', open);
        hamburger.classList.toggle('open', open);
        hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    function lazyLoadBackgrounds() {
        const nodes = document.querySelectorAll('[data-bg]');
        const load = el => {
            el.style.backgroundImage = `url('${el.getAttribute('data-bg')}')`;
            el.classList.add('bg-loaded');
            el.removeAttribute('data-bg');
        };
        if (!('IntersectionObserver' in window)) {
            nodes.forEach(load);
            return;
        }
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    load(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '250px 0px' });
        nodes.forEach(el => observer.observe(el));
    }

    let teamIndex = 0;
    window.teamSlide = function (dir) {
        const track = document.getElementById('teamTrack');
        if (!track) return;
        const slides = track.children.length;
        teamIndex = (teamIndex + dir + slides) % slides;
        track.scrollTo({ left: teamIndex * track.clientWidth, behavior: 'smooth' });
        updateTeamDots();
    };
    window.teamGoTo = function (i) {
        const track = document.getElementById('teamTrack');
        if (!track) return;
        teamIndex = i;
        track.scrollTo({ left: teamIndex * track.clientWidth, behavior: 'smooth' });
        updateTeamDots();
    };
    function updateTeamDots() {
        document.querySelectorAll('.team-dot').forEach((dot, i) => dot.classList.toggle('active', i === teamIndex));
    }

    function bindContactValidation() {
        const form = document.getElementById('contactForm');
        if (!form || form.dataset.bound) return;
        form.dataset.bound = 'true';
        const status = document.getElementById('formStatus');
        form.addEventListener('submit', e => {
            const lang = localStorage.getItem('sujoLang') || 'fr';
            const required = form.querySelectorAll('[required]');
            let valid = true;
            required.forEach(field => {
                const bad = !field.value.trim() || (field.type === 'email' && !field.checkValidity());
                field.classList.toggle('input-error', bad);
                field.setAttribute('aria-invalid', bad ? 'true' : 'false');
                if (bad) valid = false;
            });
            if (!valid) {
                e.preventDefault();
                if (status) {
                    status.className = 'form-status error';
                    status.textContent = lang === 'fr' ? 'Veuillez remplir correctement les champs obligatoires.' : 'Please correctly complete all required fields.';
                }
                return;
            }
            if (status) {
                status.className = 'form-status success';
                status.textContent = lang === 'fr' ? 'Votre demande est prête à être envoyée.' : 'Your request is ready to be sent.';
            }
        });
    }

    function bindUI() {
        document.querySelectorAll('[data-lang-button]').forEach(btn => {
            if (!btn.dataset.bound) {
                btn.addEventListener('click', () => setLang(btn.getAttribute('data-lang-button')));
                btn.dataset.bound = 'true';
            }
        });
        const hamburger = document.querySelector('.hamburger');
        if (hamburger && !hamburger.dataset.bound) {
            hamburger.addEventListener('click', toggleMenu);
            hamburger.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleMenu();
                }
            });
            hamburger.dataset.bound = 'true';
        }
        document.querySelectorAll('#mobileMenu a, .mobile-menu a').forEach(link => {
            if (!link.dataset.bound) {
                link.addEventListener('click', () => {
                    const menu = document.getElementById('mobileMenu');
                    const hamburgerIcon = document.querySelector('.hamburger');
                    if (menu) menu.classList.remove('open');
                    if (hamburgerIcon) {
                        hamburgerIcon.classList.remove('open');
                        hamburgerIcon.setAttribute('aria-expanded', 'false');
                    }
                });
                link.dataset.bound = 'true';
            }
        });
        const teamTrack = document.getElementById('teamTrack');
        if (teamTrack && !teamTrack.dataset.bound) {
            let scrollTimeout;
            teamTrack.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    const width = teamTrack.clientWidth || 1;
                    teamIndex = Math.round(teamTrack.scrollLeft / width);
                    updateTeamDots();
                }, 100);
            }, { passive: true });
            window.addEventListener('resize', () => teamTrack.scrollTo({ left: teamIndex * teamTrack.clientWidth, behavior: 'auto' }));
            teamTrack.dataset.bound = 'true';
        }
        window.addEventListener('scroll', () => {
            let current = '';
            document.querySelectorAll('section[id]').forEach(section => {
                if (window.scrollY >= section.offsetTop - 150) current = section.getAttribute('id');
            });
            document.querySelectorAll('.nav-links a').forEach(a => {
                const href = a.getAttribute('href') || '';
                if (href.startsWith('#')) a.classList.toggle('active', href === '#' + current);
            });
        }, { passive: true });
        lazyLoadBackgrounds();
        bindContactValidation();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const lang = localStorage.getItem('sujoLang') || 'fr';
        applyLang(lang);
        updateLangButtons(lang);
        bindUI();
        document.documentElement.classList.remove('lang-loading');
        document.documentElement.classList.add('lang-ready');
    });
})();
