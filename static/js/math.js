// Renders TeX in pages that set `math = true`. Loaded with `defer` after KaTeX and its
// auto-render extension (see templates/_math.html).
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true },
      ],
      throwOnError: false,
    });
  });
})();
