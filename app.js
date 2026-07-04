let currentLang = 'fr';

function setLang(lang) {
    currentLang = lang;
    
    // Toggle active buttons
    document.getElementById('btn-fr').classList.toggle('active', lang === 'fr');
    document.getElementById('btn-en').classList.toggle('active', lang === 'en');
    
    // Update all translatable elements
    document.querySelectorAll('[data-fr][data-en]').forEach(el => {
        const text = lang === 'fr' ? el.getAttribute('data-fr') : el.getAttribute('data-en');
        
        if (el.tagName === 'H1' || el.tagName === 'H3' || el.tagName === 'H4' || el.classList.contains('section-title') || el.classList.contains('product-col-title')) {
            el.innerHTML = text;
        } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            if (el.placeholder) el.placeholder = text;
        } else {
            el.textContent = text;
        }
    });
    
    // Update document language
    document.documentElement.lang = lang;
}

function toggleService(btn) {
    const details = btn.nextElementSibling;
    const isOpen = details.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
}

function toggleMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('open');
}

// TEAM CAROUSEL
let teamIndex = 0;
function teamSlide(dir) {
    const track = document.getElementById('teamTrack');
    const slides = track.children.length;
    teamIndex = (teamIndex + dir + slides) % slides;
    track.scrollTo({ left: teamIndex * track.clientWidth, behavior: 'smooth' });
    updateTeamDots();
}
function teamGoTo(i) {
    const track = document.getElementById('teamTrack');
    teamIndex = i;
    track.scrollTo({ left: teamIndex * track.clientWidth, behavior: 'smooth' });
    updateTeamDots();
}
function updateTeamDots() {
    document.querySelectorAll('.team-dot').forEach((d, i) => {
        d.classList.toggle('active', i === teamIndex);
    });
}
// Keep dots in sync if user swipes/scrolls the track directly
(function() {
    const track = document.getElementById('teamTrack');
    if (!track) return;
    let scrollTimeout;
    track.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const width = track.clientWidth || 1;
            teamIndex = Math.round(track.scrollLeft / width);
            updateTeamDots();
        }, 100);
    }, { passive: true });
    // Re-sync position on window resize
    window.addEventListener('resize', () => {
        track.scrollTo({ left: teamIndex * track.clientWidth, behavior: 'auto' });
    });
})();

// Close mobile menu when clicking a link
document.querySelectorAll('.mobile-menu a').forEach(link => {
    link.addEventListener('click', () => {
        document.getElementById('mobileMenu').classList.remove('open');
    });
});

// Form success simulation (Formspree handles real submission)
const form = document.querySelector('form');
if (form) {
    form.addEventListener('submit', function(e) {
        // Formspree will handle redirect/success
    });
}

// Scroll active nav
window.addEventListener('scroll', () => {
    let current = '';
    document.querySelectorAll('section[id]').forEach(section => {
        const sectionTop = section.offsetTop;
        if (scrollY >= sectionTop - 150) {
            current = section.getAttribute('id');
        }
    });
    
    document.querySelectorAll('.nav-links a').forEach(a => {
        a.classList.remove('active');
        if (a.getAttribute('href') === '#' + current) {
            a.classList.add('active');
        }
    });
});

/**
 * UI Filter for Brand Matrix Cards
 * Evaluates target dataset strings instantly to filter out elements
 */
function filterBrands() {
    const input = document.getElementById('brandSearch');
    const matrix = document.getElementById('brandMatrix');
    if (!input || !matrix) return;
    
    const filter = input.value.toUpperCase();
    const cards = matrix.getElementsByClassName('brand-enterprise-card');

    for (let i = 0; i < cards.length; i++) {
        const dataSearch = cards[i].getAttribute('data-search') || '';
        const txtValue = cards[i].textContent + ' ' + dataSearch;
        
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            cards[i].style.display = 'flex';
        } else {
            cards[i].style.display = 'none';
        }
    }
}
