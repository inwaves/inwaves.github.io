// Applies the saved or preferred colour scheme before first paint. Loaded synchronously at the
// top of <body> from templates/_base.html so the page never flashes the wrong theme. The dark
// highlight stylesheet URL is passed on the script tag's data-hl-dark attribute, which keeps
// this file free of build-time paths and lets the site ship without inline scripts.
(function () {
  'use strict';
  const script = document.currentScript;
  const theme = sessionStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if ((theme && theme === 'dark') || (!theme && prefersDark)) {
    document.body.classList.add('dark');
    const hl = document.querySelector('link#hl');
    if (hl && script && script.dataset.hlDark) hl.href = script.dataset.hlDark;
  }
})();
