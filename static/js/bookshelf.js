// Search and genre filtering for the bookshelf page.
//
// The cards are rendered at build time by templates/bookshelf.html. This script only shows,
// hides and reorders those existing elements; it never builds markup from data.
(function () {
  'use strict';

  const grid = document.getElementById('bookshelf');
  const searchInput = document.getElementById('search');
  const clearButton = document.getElementById('clear-genres');
  const stats = document.getElementById('stats');
  const noResults = document.getElementById('no-results');
  if (!grid || !searchInput || !clearButton || !stats || !noResults) return;

  const cards = Array.from(grid.querySelectorAll('.book-card'));
  const genreButtons = Array.from(document.querySelectorAll('.genre-filter[data-genre]'));
  const activeGenres = new Set();

  // Shuffle once on load for variety, by reordering the existing nodes.
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  cards.forEach((card) => grid.appendChild(card));

  function cardGenres(card) {
    return card.dataset.genres ? card.dataset.genres.split('|') : [];
  }

  function matches(card, query) {
    // Genre filter: OR logic, the card must carry at least one active genre.
    if (activeGenres.size > 0 && !cardGenres(card).some((g) => activeGenres.has(g))) {
      return false;
    }
    if (!query) return true;
    const title = card.dataset.title || '';
    const authors = card.dataset.authors || '';
    return title.includes(query) || authors.includes(query);
  }

  function render() {
    const query = searchInput.value.toLowerCase().trim();
    let shown = 0;
    for (const card of cards) {
      const visible = matches(card, query);
      card.classList.toggle('is-hidden', !visible);
      if (visible) shown += 1;
    }

    noResults.hidden = shown > 0;
    const filtered = query.length > 0 || activeGenres.size > 0;
    stats.textContent = filtered
      ? shown + ' of ' + cards.length + ' books shown'
      : cards.length + ' books in the collection';
  }

  function toggleGenre(button) {
    const genre = button.dataset.genre;
    const active = !activeGenres.has(genre);
    if (active) activeGenres.add(genre);
    else activeGenres.delete(genre);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    render();
  }

  function clearGenres() {
    activeGenres.clear();
    for (const button of genreButtons) {
      button.classList.remove('active');
      button.setAttribute('aria-pressed', 'false');
    }
    render();
  }

  genreButtons.forEach((button) => button.addEventListener('click', () => toggleGenre(button)));
  searchInput.addEventListener('input', render);
  clearButton.addEventListener('click', clearGenres);

  render();
})();
