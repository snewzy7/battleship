'use strict';

// Stylized SVG snack packages. Each builder draws a tall package in a
// 100 x (100*n) box; `h` rotates it so it lies along a shelf row.
(function (root) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  function text(x, y, str, size, fill, extra) {
    return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-family="'Permanent Marker', Impact, sans-serif" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${x} ${y})" ${extra || ''}>${esc(str)}</text>`;
  }

  const ART = {
    buldak(H) {
      const mid = H / 2;
      return `
        <rect x="6" y="4" width="88" height="${H - 8}" rx="10" fill="#f26b9b"/>
        <rect x="6" y="4" width="88" height="14" fill="#c2185b"/>
        <rect x="6" y="${H - 18}" width="88" height="14" fill="#c2185b"/>
        <rect x="14" y="24" width="72" height="${H - 48}" rx="8" fill="#ffd6e4" opacity="0.55"/>
        <circle cx="50" cy="${mid + 60}" r="18" fill="#ffb703"/>
        <path d="M50 ${mid + 44} q10 10 0 22 q-10 -10 0 -22z" fill="#e63946"/>
        ${text(50, mid - 20, 'BULDAK', 30, '#b3122d')}
        ${text(50, mid - 48, 'carbonara', 12, '#7a0c22')}
      `;
    },
    takis(H) {
      const mid = H / 2;
      return `
        <path d="M14 10 L86 4 L92 ${H - 10} L8 ${H - 4} Z" fill="#d1232a"/>
        <path d="M14 10 L86 4 L92 ${H - 10}" fill="none" stroke="#ff6b6b" stroke-width="3" opacity="0.6"/>
        <rect x="20" y="22" width="60" height="${H - 44}" rx="30" fill="#ef7d1a" opacity="0.9"/>
        <path d="M30 ${H - 40} q20 -50 40 0" fill="none" stroke="#ffd166" stroke-width="6"/>
        ${text(50, mid - 10, "TJ'S TAKIS", 24, '#fff')}
        ${text(50, mid + 26, 'CHILI & LIME', 10, '#ffe8a3')}
      `;
    },
    cfa(H) {
      const mid = H / 2;
      return `
        <rect x="26" y="4" width="48" height="26" rx="6" fill="#dd0031"/>
        <rect x="16" y="28" width="68" height="${H - 36}" rx="16" fill="#fff5ec" stroke="#e8dccb" stroke-width="2"/>
        <circle cx="50" cy="${mid + 40}" r="20" fill="#dd0031"/>
        <circle cx="50" cy="${mid + 40}" r="12" fill="#fff5ec"/>
        <circle cx="50" cy="${mid + 40}" r="5" fill="#dd0031"/>
        ${text(50, mid - 18, 'THE SAUCE', 20, '#dd0031')}
      `;
    },
    pbcups(H) {
      const mid = H / 2;
      return `
        <rect x="6" y="6" width="88" height="${H - 12}" rx="6" fill="#f36f21"/>
        <path d="M6 6 l10 8 l-10 8 l10 8 l-10 8 l10 8 l-10 8 l10 8 l-10 8 l10 8 l-10 8" fill="none" stroke="#c2501a" stroke-width="2"/>
        <rect x="22" y="22" width="56" height="${H - 44}" rx="6" fill="#3e2211"/>
        <circle cx="50" cy="${mid + 48}" r="16" fill="#8b4a1d"/>
        <path d="M34 ${mid + 48} a16 16 0 0 1 32 0z" fill="#5a2f14"/>
        ${text(50, mid - 20, 'PB CUPS', 26, '#ffd166')}
      `;
    },
    poppi(H) {
      const mid = H / 2;
      return `
        <rect x="18" y="6" width="64" height="${H - 12}" rx="8" fill="#f28cb3"/>
        <rect x="18" y="6" width="64" height="10" rx="3" fill="#cfd4d8"/>
        <rect x="18" y="${H - 16}" width="64" height="10" rx="3" fill="#cfd4d8"/>
        <rect x="24" y="18" width="10" height="${H - 36}" rx="5" fill="#fff" opacity="0.45"/>
        <circle cx="50" cy="${mid + 34}" r="12" fill="#b4174b"/>
        <circle cx="44" cy="${mid + 30}" r="3" fill="#f28cb3"/>
        ${text(50, mid - 18, 'poppi', 26, '#fff')}
        ${text(50, mid - 44, 'raspberry rose', 8, '#7a0c35')}
      `;
    },
  };

  function svg(key, n, orientation) {
    const H = 100 * n;
    const body = ART[key](H);
    if (orientation === 'h') {
      return `<svg class="pkg" viewBox="0 0 ${H} 100" preserveAspectRatio="none" aria-hidden="true"><g transform="translate(${H} 0) rotate(90)">${body}</g></svg>`;
    }
    return `<svg class="pkg" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;
  }

  root.Packages = { svg };
})(typeof window !== 'undefined' ? window : globalThis);
