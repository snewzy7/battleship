'use strict';

// Chunky cartoon snack icons, one per grid cell (and larger on the cards).
// Each drawing lives in a 100x100 box.
(function (root) {
  const ART = {
    // Kraft Mac & Cheese: blue box with noodles
    mac: `
      <rect x="10" y="22" width="80" height="56" rx="5" fill="#2b6cb0"/>
      <rect x="10" y="22" width="80" height="10" rx="3" fill="#1e4f85"/>
      <rect x="16" y="38" width="22" height="12" rx="2" fill="#f6b23c"/>
      <path d="M46 62 q6 -18 18 -8 q8 6 0 12 q-10 6 -18 -4z" fill="#f6b23c" stroke="#e0761b" stroke-width="2"/>
      <path d="M60 46 q8 -14 18 -4 q6 6 -2 10 q-10 4 -16 -6z" fill="#f6b23c" stroke="#e0761b" stroke-width="2"/>`,
    // Pringles: red can with chips on the label
    pringles: `
      <rect x="28" y="12" width="44" height="78" rx="7" fill="#d1232a"/>
      <rect x="28" y="12" width="44" height="10" rx="4" fill="#9aa3a8"/>
      <rect x="34" y="34" width="32" height="40" rx="4" fill="#f4e7cf"/>
      <path d="M40 60 q8 -16 20 -4 q-8 6 -20 4z" fill="#f6b23c" stroke="#e0761b" stroke-width="2"/>
      <path d="M40 50 q8 -16 20 -4 q-8 6 -20 4z" fill="#f6b23c" stroke="#e0761b" stroke-width="2"/>
      <path d="M40 40 q8 -16 20 -4 q-8 6 -20 4z" fill="#f6b23c" stroke="#e0761b" stroke-width="2"/>`,
    // Ray's Red Hot Sauce: tall bottle, red cap, orange label with R
    hotsauce: `
      <rect x="42" y="6" width="16" height="16" rx="3" fill="#d1232a"/>
      <path d="M40 22 h20 v10 q10 6 10 18 v36 a6 6 0 0 1 -6 6 h-28 a6 6 0 0 1 -6 -6 v-36 q0 -12 10 -18z" fill="#c8431f"/>
      <rect x="34" y="52" width="32" height="26" rx="3" fill="#f0803a"/>
      <text x="50" y="72" font-size="20" font-weight="900" fill="#d1232a" font-family="Impact, 'Archivo Black', sans-serif" text-anchor="middle">R</text>`,
    // Peanut butter cup
    pbcups: `
      <path d="M16 46 l8 38 a6 6 0 0 0 6 5 h40 a6 6 0 0 0 6 -5 l8 -38z" fill="#6b3a1e"/>
      <path d="M22 50 l6 28 h44 l6 -28z" fill="#8b4a1d"/>
      <path d="M16 46 l8 38 h8 l-6 -38z M30 46 l4 38 h8 l-2 -38z M50 46 v38 h8 v-38z M70 46 l-6 38 h8 l6 -38z" fill="#4a2512" opacity="0.5"/>
      <path d="M12 44 q38 -16 76 0 q-38 10 -76 0z" fill="#3e2211"/>
      <path d="M26 40 q24 -8 48 0 q-24 6 -48 0z" fill="#5a2f14"/>`,
    // Dr Pepper: maroon can
    drpepper: `
      <rect x="30" y="12" width="40" height="78" rx="8" fill="#8b1a2b"/>
      <rect x="30" y="12" width="40" height="9" rx="3" fill="#cfd4d8"/>
      <rect x="30" y="81" width="40" height="9" rx="3" fill="#cfd4d8"/>
      <rect x="35" y="26" width="7" height="50" rx="3" fill="#fff" opacity="0.25"/>
      <ellipse cx="50" cy="52" rx="15" ry="10" fill="#fff"/>
      <text x="50" y="56" font-size="11" font-weight="900" fill="#8b1a2b" font-family="Impact, 'Archivo Black', sans-serif" text-anchor="middle">DR.</text>`,
  };


  function icon(key, cls) {
    return `<svg class="${cls || 'pkg'}" viewBox="0 0 100 100" aria-hidden="true">${ART[key]}</svg>`;
  }

  root.Packages = { icon };
})(typeof window !== 'undefined' ? window : globalThis);
