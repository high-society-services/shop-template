/* Pure shop logic: no DOM access, so it can be unit-tested in Node. */

export const MAX_QTY = 20;

/* ---------------------------- Prices ---------------------------- */

/** Convert a price written in pounds (e.g. 49.5) to whole pence. */
export function toPence(pounds) {
  const n = Number(pounds);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export function createPriceFormatter({ code = 'GBP', locale = 'en-GB' } = {}) {
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (pence) => fmt.format(pence / 100);
}

/* --------------------------- Options --------------------------- */

/** Stable key for a set of chosen options, so identical choices merge. */
export function lineKey(productId, options = {}) {
  const parts = Object.keys(options).sort().map((k) => `${k}=${options[k]}`);
  return [productId, ...parts].join('|');
}

/** Option names the customer has not yet chosen a valid value for. */
export function missingOptions(product, chosen = {}) {
  return product.options.filter((o) => !o.values.includes(chosen[o.name])).map((o) => o.name);
}

/** The variant (price and stock) for the chosen options, or null if none is listed. */
export function findVariant(product, chosen = {}) {
  if (missingOptions(product, chosen).length) return null;
  return (
    product.variants.find((v) => product.options.every((o) => v.options[o.name] === chosen[o.name])) || null
  );
}

/* ---------------------------- Catalogue ---------------------------- */

function makeVariant(raw, options, groups, where, warn) {
  for (const g of groups) {
    if (!g.values.includes(options[g.name])) {
      warn(`${where}: variant has no valid "${g.name}" value — skipped`);
      return null;
    }
  }
  const pricePence = toPence(raw.price);
  if (!Number.isFinite(pricePence) || pricePence < 0) {
    warn(`${where}: variant has an invalid price — skipped`);
    return null;
  }
  let stock = Number(raw.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    warn(`${where}: variant has no valid stock number — treated as out of stock (0)`);
    stock = 0;
  }
  return { key: lineKey('', options), options: { ...options }, pricePence, stock };
}

/**
 * Validate and normalise products from the config. Bad entries are skipped
 * (with a console warning) rather than breaking the whole shop.
 */
export function normaliseProducts(products, warn = () => {}) {
  const seen = new Set();
  const out = [];
  for (const [i, p] of (products || []).entries()) {
    const where = `products[${i}]${p && p.name ? ` (“${p.name}”)` : ''}`;
    if (!p || typeof p !== 'object') { warn(`${where}: not a product object`); continue; }
    if (!p.id || typeof p.id !== 'string' || /\s/.test(p.id)) { warn(`${where}: missing or invalid id`); continue; }
    if (seen.has(p.id)) { warn(`${where}: duplicate id "${p.id}"`); continue; }

    const options = (Array.isArray(p.options) ? p.options : [])
      .filter((o) => o && o.name && Array.isArray(o.values) && o.values.length > 0)
      .map((o) => ({ name: String(o.name), values: o.values.map(String) }));

    let variants = [];
    if (options.length === 0) {
      const v = makeVariant({ price: p.price, stock: p.stock }, {}, [], where, warn);
      if (!v) continue;
      variants = [v];
    } else {
      for (const raw of Array.isArray(p.variants) ? p.variants : []) {
        if (!raw || typeof raw !== 'object') continue;
        const v = makeVariant(raw, raw.options || {}, options, where, warn);
        if (!v) continue;
        if (variants.some((x) => x.key === v.key)) { warn(`${where}: duplicate variant ${v.key} — skipped`); continue; }
        variants.push(v);
      }
      if (!variants.length) { warn(`${where}: no valid variants — skipped`); continue; }
    }
    variants.forEach((v) => (v.key = lineKey('', v.options)));

    seen.add(p.id);
    const list = (x) => (Array.isArray(x) ? x : []).map((s) => String(s).trim()).filter(Boolean);
    out.push({
      id: p.id,
      name: String(p.name || 'Untitled product'),
      description: String(p.description || ''),
      categories: list(p.categories),
      tags: list(p.tags),
      image: p.image ? String(p.image) : '',
      imageAlt: String(p.imageAlt || p.name || ''),
      options,
      variants,
      fromPence: Math.min(...variants.map((v) => v.pricePence)),
      inStock: variants.some((v) => v.stock > 0),
    });
  }
  return out;
}

/** Distinct categories and tags across the catalogue, sorted for the filter controls. */
export function collectFacets(products) {
  const cats = new Set();
  const tags = new Set();
  products.forEach((p) => {
    p.categories.forEach((c) => cats.add(c));
    p.tags.forEach((t) => tags.add(t));
  });
  const sort = (set) => [...set].sort((a, b) => a.localeCompare(b, 'en-GB'));
  return { categories: sort(cats), tags: sort(tags) };
}

/**
 * Filter the catalogue. Every word typed in the search must appear in the
 * name, description, categories or tags. Any selected tag matches.
 */
export function filterProducts(products, f = {}) {
  const words = String(f.query || '').toLowerCase().split(/\s+/).filter(Boolean);
  return products.filter((p) => {
    if (words.length) {
      const hay = [p.name, p.description, ...p.categories, ...p.tags].join(' ').toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    if (f.availability === 'in' && !p.inStock) return false;
    if (f.availability === 'out' && p.inStock) return false;
    if (f.band) {
      const from = p.fromPence / 100;
      if (from < f.band.min) return false;
      if (f.band.max != null && from >= f.band.max) return false;
    }
    if (f.category && !p.categories.includes(f.category)) return false;
    if (f.tags && f.tags.length && !p.tags.some((t) => f.tags.includes(t))) return false;
    return true;
  });
}

/* ------------------------------ Cart ----------------------------- */

/** Returns a new cart (array of {productId, options, qty}) with the item added. */
export function addToCart(cart, productId, options, qty = 1) {
  const key = lineKey(productId, options);
  const next = cart.map((l) => ({ ...l }));
  const existing = next.find((l) => lineKey(l.productId, l.options) === key);
  if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
  else next.push({ productId, options: { ...options }, qty: Math.min(MAX_QTY, Math.max(1, qty)) });
  return next;
}

export function setQty(cart, key, qty) {
  if (qty < 1) return removeLine(cart, key);
  return cart.map((l) => (lineKey(l.productId, l.options) === key ? { ...l, qty: Math.min(MAX_QTY, qty) } : l));
}

export function removeLine(cart, key) {
  return cart.filter((l) => lineKey(l.productId, l.options) !== key);
}

/**
 * Drop anything in a saved cart that no longer matches the catalogue
 * (deleted products, changed options, corrupt data). Prices always come
 * from the current config, never from storage.
 */
export function sanitiseCart(raw, products) {
  if (!Array.isArray(raw)) return [];
  const byId = new Map(products.map((p) => [p.id, p]));
  let cart = [];
  for (const l of raw) {
    if (!l || typeof l !== 'object') continue;
    const product = byId.get(l.productId);
    if (!product) continue;
    const options = {};
    for (const o of product.options) {
      if (l.options && o.values.includes(l.options[o.name])) options[o.name] = l.options[o.name];
    }
    if (!findVariant(product, options)) continue;
    const qty = Math.floor(Number(l.qty));
    if (!Number.isFinite(qty) || qty < 1) continue;
    cart = addToCart(cart, product.id, options, Math.min(qty, MAX_QTY));
  }
  return cart;
}

/**
 * Enquiry check for one cart line. Out-of-stock (0) and quantities above
 * the listed stock are never blocked; they are marked as enquiries.
 */
export function enquiryReason(variant, qty) {
  if (variant.stock === 0) return 'out';
  if (qty > variant.stock) return 'over';
  return null;
}

/** Join cart lines with their products and current prices for display and totals. */
export function resolveCart(cart, products) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = cart
    .map((l) => {
      const product = byId.get(l.productId);
      if (!product) return null;
      const variant = findVariant(product, l.options);
      if (!variant) return null;
      const reason = enquiryReason(variant, l.qty);
      return {
        key: lineKey(l.productId, l.options),
        product,
        options: l.options,
        qty: l.qty,
        stock: variant.stock,
        unitPence: variant.pricePence,
        totalPence: variant.pricePence * l.qty,
        enquiry: reason !== null,
        enquiryReason: reason,
      };
    })
    .filter(Boolean);
  return {
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    totalPence: lines.reduce((n, l) => n + l.totalPence, 0),
    hasEnquiry: lines.some((l) => l.enquiry),
  };
}

export function describeOptions(options) {
  return Object.entries(options || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

/* --------------------------- Validation -------------------------- */

// UK postcode format (outward + inward code), incl. GIR 0AA.
const POSTCODE_RE =
  /^(GIR0AA|[A-PR-UWYZ]([0-9]{1,2}|[A-HK-Y][0-9]{1,2}|[0-9][A-HJKPSTUW]|[A-HK-Y][0-9][ABEHMNPRVWXY])[0-9][ABD-HJLNP-UW-Z]{2})$/;

/** Upper-cases, removes spacing, and re-inserts a single space: "sw1a1aa" → "SW1A 1AA". */
export function normalisePostcode(input) {
  const compact = String(input || '').toUpperCase().replace(/\s+/g, '');
  if (compact.length < 5) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function validatePostcode(input) {
  const compact = String(input || '').toUpperCase().replace(/\s+/g, '');
  if (!compact) return { ok: false, error: 'Please enter your postcode.' };
  if (!POSTCODE_RE.test(compact)) {
    return { ok: false, error: 'Please enter a valid UK postcode, for example SW1A 1AA.' };
  }
  return { ok: true, value: normalisePostcode(compact) };
}

export function validateName(input) {
  const value = String(input || '').replace(/\s+/g, ' ').trim();
  if (!value) return { ok: false, error: 'Please enter your name.' };
  if (value.length > 80) return { ok: false, error: 'Please keep your name under 80 characters.' };
  if (!/\p{L}/u.test(value)) return { ok: false, error: 'Please enter your name using letters.' };
  return { ok: true, value };
}

export function validateQuantity(input) {
  const n = Number(String(input ?? '').trim());
  if (!Number.isInteger(n) || n < 1 || n > MAX_QTY) {
    return { ok: false, error: `Please enter a whole number from 1 to ${MAX_QTY}.` };
  }
  return { ok: true, value: n };
}

export function validateDescription(input) {
  const value = String(input || '').trim();
  if (!value) return { ok: false, error: 'Please tell us what you’d like us to source.' };
  if (value.length > 1000) return { ok: false, error: 'Please keep your description under 1,000 characters.' };
  return { ok: true, value };
}

/* ------------------------ Messaging links ------------------------ */

/** WhatsApp needs digits only, in international format without "+" or a leading 0. */
export function cleanWhatsAppNumber(raw) {
  const digits = String(raw || '').replace(/[\s()+-]/g, '');
  return /^[1-9][0-9]{7,14}$/.test(digits) ? digits : '';
}

/** Telegram public usernames: 5–32 chars, letters/digits/underscore, starting with a letter. */
export function cleanTelegramUsername(raw) {
  let u = String(raw || '').trim();
  u = u.replace(/^https?:\/\/(www\.)?t\.me\//i, '').replace(/^@/, '').replace(/\/+$/, '');
  return /^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(u) ? u : '';
}

export function whatsappLink(number, text) {
  const n = cleanWhatsAppNumber(number);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : '';
}

export function telegramLink(username, text) {
  const u = cleanTelegramUsername(username);
  return u ? `https://t.me/${u}?text=${encodeURIComponent(text)}` : '';
}

/** Plain profile links (no prefilled text) for the footer contact list. */
export function whatsappProfileLink(number) {
  const n = cleanWhatsAppNumber(number);
  return n ? `https://wa.me/${n}` : '';
}

export function telegramProfileLink(username) {
  const u = cleanTelegramUsername(username);
  return u ? `https://t.me/${u}` : '';
}

/** Only web addresses are allowed, so a mistyped entry can't become a script link. */
export function safeWebUrl(raw) {
  const s = String(raw || '').trim();
  return /^https:\/\/[^\s]+$/i.test(s) ? s : '';
}

/* ------------------------- Message text ------------------------- */

/** Build the plain-text order message the customer sends. */
export function buildOrderMessage({ shopName, greeting, footer, labels = {}, customer, resolved, formatPrice }) {
  const fill = (s) => String(s || '').replaceAll('{shop}', shopName);
  const L = { name: 'Name', postcode: 'Postcode', order: 'ORDER', subtotal: 'Subtotal', enquiry: 'ENQUIRY', ...labels };
  const lines = [];
  lines.push(fill(greeting));
  lines.push('');
  lines.push(`${L.name}: ${customer.name}`);
  lines.push(`${L.postcode}: ${customer.postcode}`);
  lines.push('');
  lines.push(L.order);
  resolved.lines.forEach((l, i) => {
    lines.push(`${i + 1}. ${l.product.name}`);
    const opts = describeOptions(l.options);
    if (opts) lines.push(`   ${opts}`);
    lines.push(`   Qty ${l.qty} × ${formatPrice(l.unitPence)} = ${formatPrice(l.totalPence)}`);
    if (l.enquiry) lines.push(`   ${L.enquiry}`);
  });
  lines.push('');
  lines.push(`${L.subtotal}: ${formatPrice(resolved.totalPence)}`);
  if (footer) {
    lines.push('');
    lines.push(fill(footer));
  }
  return lines.join('\n');
}

/** Build the plain-text sourcing request the customer sends. */
export function buildRequestMessage({ shopName, greeting, footer, labels = {}, customer, description }) {
  const fill = (s) => String(s || '').replaceAll('{shop}', shopName);
  const L = { name: 'Name', postcode: 'Postcode', request: 'Request', ...labels };
  const lines = [];
  lines.push(fill(greeting));
  lines.push('');
  lines.push(`${L.name}: ${customer.name}`);
  lines.push(`${L.postcode}: ${customer.postcode}`);
  lines.push('');
  lines.push(`${L.request}:`);
  lines.push(description);
  if (footer) {
    lines.push('');
    lines.push(fill(footer));
  }
  return lines.join('\n');
}
