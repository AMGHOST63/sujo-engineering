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