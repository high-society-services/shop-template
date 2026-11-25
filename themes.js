/* Style presets.
 *
 * Each preset is defined by a few colours. Everything else (gradients, glows,
 * borders) is worked out from them, so changing one colour changes the look.
 *
 * To use a preset, set `theme` in shopConfig.js to its name.
 * To change one colour of a preset, add it to `themeOverrides` in shopConfig.js,
 * for example: themeOverrides: { accent: '#b8860b' }
 *
 * Fields:
 *   scheme      'dark' or 'light' (controls scrollbars and form controls)
 *   bg          page background
 *   panel       card and box background
 *   panelAlt    slightly different background for depth
 *   text        main text colour
 *   muted       secondary text colour
 *   accentLight the lightest highlight (used on headings and gradients)
 *   accent      main accent colour (headings, links, borders)
 *   accentMid   middle shade of the gradient
 *   accentDeep  darkest shade of the gradient
 *   line        colour of thin borders and dividers
 *   radius      corner rounding in pixels (0 = square, 24 = very round)
 */

export const palettes = {
  // Dark
  'black-gold':      { scheme: 'dark',  bg: '#000000', panel: '#15110c', panelAlt: '#1d1811', text: '#f3ece0', muted: '#b9ad98', accentLight: '#fbe9b0', accent: '#e2c06a', accentMid: '#c99b3f', accentDeep: '#8a6522', line: '#d9b45a', radius: 14 },
  'midnight-silver': { scheme: 'dark', bg: '#05080f', panel: '#0d1421', panelAlt: '#131c2e', text: '#e9eef6', muted: '#97a3b8', accentLight: '#f2f5fa', accent: '#c9d3e3', accentMid: '#9aa8bf', accentDeep: '#5d6b82', line: '#9aa8bf', radius: 6 },
  'charcoal-copper': { scheme: 'dark', bg: '#0c0b0a', panel: '#1a1714', panelAlt: '#221e1a', text: '#f4ece6', muted: '#b8a89b', accentLight: '#f7dcc4', accent: '#e0a177', accentMid: '#c0734a', accentDeep: '#7d4226', line: '#c0734a', radius: 20 },
  'emerald-gold':    { scheme: 'dark', bg: '#03130d', panel: '#0a2118', panelAlt: '#0f2c20', text: '#eef5ef', muted: '#a6bfb1', accentLight: '#f3e3a6', accent: '#d4af37', accentMid: '#b8902a', accentDeep: '#7a5d18', line: '#d4af37', radius: 14 },
  'burgundy-rose':   { scheme: 'dark', bg: '#140509', panel: '#241017', panelAlt: '#2e161e', text: '#f7ebee', muted: '#c4a4ac', accentLight: '#f6d3cf', accent: '#e8a598', accentMid: '#c97e72', accentDeep: '#7e3f3a', line: '#c97e72', radius: 18 },
  'ocean-teal':      { scheme: 'dark', bg: '#03121a', panel: '#082230', panelAlt: '#0c2c3d', text: '#e8f4f6', muted: '#9bbcc4', accentLight: '#c8f5f0', accent: '#5fd3c8', accentMid: '#2fa59c', accentDeep: '#156a64', line: '#5fd3c8', radius: 12 },
  'royal-violet':    { scheme: 'dark', bg: '#0b0716', panel: '#18112a', panelAlt: '#211838', text: '#f0ecf8', muted: '#aea3c6', accentLight: '#ead9ff', accent: '#b89cff', accentMid: '#8c6fd6', accentDeep: '#4f3a8a', line: '#b89cff', radius: 16 },
  'slate-minimal':   { scheme: 'dark', bg: '#101214', panel: '#1b1e22', panelAlt: '#23272c', text: '#f1f3f5', muted: '#9aa2ab', accentLight: '#ffffff', accent: '#d8dee6', accentMid: '#aab3be', accentDeep: '#5c6670', line: '#6b7480', radius: 4 },

  // Light
  'ivory-bronze':    { scheme: 'light', bg: '#faf6ee', panel: '#ffffff', panelAlt: '#f3ead9', text: '#2b2118', muted: '#6e6255', accentLight: '#e3c58a', accent: '#9a7326', accentMid: '#b8914a', accentDeep: '#6e4f14', line: '#c9a86a', radius: 14 },
  'blush-rose':      { scheme: 'light', bg: '#fdf6f5', panel: '#ffffff', panelAlt: '#f8e6e4', text: '#3a2326', muted: '#7d6064', accentLight: '#f3c9c4', accent: '#b5626a', accentMid: '#cf8a8f', accentDeep: '#7f3d44', line: '#d9a0a6', radius: 18 },
  'sage-olive':      { scheme: 'light', bg: '#f4f6ef', panel: '#ffffff', panelAlt: '#e6ebdc', text: '#243020', muted: '#5f6e56', accentLight: '#cfdcb4', accent: '#5b7a2e', accentMid: '#7d9a4d', accentDeep: '#3d5219', line: '#9bb17a', radius: 12 },
  'marble-monochrome': { scheme: 'light', bg: '#ffffff', panel: '#f5f5f5', panelAlt: '#ebebeb', text: '#111111', muted: '#666666', accentLight: '#444444', accent: '#111111', accentMid: '#333333', accentDeep: '#000000', line: '#999999', radius: 0 },
  'sand-terracotta': { scheme: 'light', bg: '#f7efe4', panel: '#fffaf3', panelAlt: '#efe2cf', text: '#3b2a1e', muted: '#7a6452', accentLight: '#e9c2a0', accent: '#b8603c', accentMid: '#cf8055', accentDeep: '#7d3c20', line: '#cf8f6b', radius: 10 },
  'sky-navy':        { scheme: 'light', bg: '#f5f9fd', panel: '#ffffff', panelAlt: '#e5eef8', text: '#14233a', muted: '#5a6b82', accentLight: '#bcd6f2', accent: '#1f4e8c', accentMid: '#3a6fb0', accentDeep: '#14365f', line: '#7fa3cc', radius: 8 },
};

export const paletteNames = Object.keys(palettes);

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

// Turn a palette into the CSS variables the stylesheet reads.
export function resolveTheme(name, overrides = {}) {
  const base = palettes[name] || palettes['black-gold'];
  const p = { ...base, ...overrides };
  return {
    scheme: p.scheme,
    vars: {
      '--black': p.bg,
      '--ink': p.bg,
      '--panel': p.panel,
      '--panel-2': p.panelAlt,
      '--text': p.text,
      '--muted': p.muted,
      '--gold-1': p.accentLight,
      '--gold-2': p.accent,
      '--gold-3': p.accentMid,
      '--gold-4': p.accentDeep,
      '--gold-text': p.accent,
      '--accent-rgb': hexToRgb(p.accent),
      '--line-rgb': hexToRgb(p.line),
      '--gold-gradient': `linear-gradient(180deg, ${p.accentLight} 0%, ${p.accent} 38%, ${p.accentMid} 62%, ${p.accentDeep} 100%)`,
      '--gold-sheen': `linear-gradient(110deg, ${p.accentDeep} 0%, ${p.accent} 22%, ${p.accentLight} 38%, ${p.accent} 52%, ${p.accentMid} 75%, ${p.accentLight} 100%)`,
      '--field-bg': p.scheme === 'light' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.35)',
      '--radius': `${p.radius}px`,
    },
  };
}
