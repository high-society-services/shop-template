/* High Society storefront — UI. All shop content comes from shopConfig.js. */
import { shopConfig as config } from './shopConfig.js';
import * as core from './core.js';

const STORAGE_KEY = 'highsociety-cart-v1';
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fill = (s, vars) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

const shopName = config.shop?.name || 'Shop';
const formatPrice = core.createPriceFormatter(config.currency);
const products = core.normaliseProducts(config.products, (m) => console.warn('[shopConfig]', m));
const productById = new Map(products.map((p) => [p.id, p]));
const facets = core.collectFacets(products);
const stock = config.stock || {};
const filterText = config.filters || {};
const priceBands = filterText.priceBands || [];
const contact = config.contact || {};
const checkout = config.checkout || {};
const request = config.request || {};

const els = {
  filters: $('#filters'),
  grid: $('#product-grid'),
  status: $('#catalogue-status'),
  cartButton: $('#cart-button'),
  cartCount: $('#cart-count'),
  cartLabel: $('#cart-button-label'),
  productDialog: $('#product-dialog'),
  productContent: $('#product-dialog-content'),
  cartDialog: $('#cart-dialog'),
  cartTitle: $('#cart-title'),
  cartBody: $('#cart-body'),
  cartFoot: $('#cart-foot'),
  steps: $('#checkout-steps'),
  requestBody: $('#request-body'),
  faqList: $('#faq-list'),
  footerLinks: $('#footer-links'),
  live: $('#live-region'),
};

const state = {
  cart: loadCart(),
  step: 'cart', // cart → details → send → done
  customer: null, // { name, postcode } — kept in memory only, never stored
  openedApp: null,
  request: { step: 'form', data: null, openedApp: null }, // form → send
};

/* ----------------------------- Helpers ----------------------------- */

const icons = {
  diamond:
    '<svg aria-hidden="true" viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M14 8h20l8 11-18 21L6 19z"/><path d="M6 19h36M18 8l-4 11 10 21 10-21-4-11M14 19l10-11 10 11"/></svg>',
  close:
    '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chat:
    '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M4 19.5l1.3-3.9A8 8 0 1 1 8.6 19z"/><path d="M9 10.5h6M9 13.5h4"/></svg>',
  plane:
    '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M21 4L3 11l6 2.5L19 7l-8 8 .5 5.5 3-4 4.5 3z"/></svg>',
  check:
    '<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};

function announce(msg) {
  els.live.textContent = '';
  setTimeout(() => (els.live.textContent = msg), 60);
}

/** Image with loading shimmer and an "image unavailable" fallback. Uses <span>s so it can sit inside buttons. */
function fallbackHTML(alt) {
  return `<span class="img-fallback" ${alt ? `role="img" aria-label="${esc(alt)} — image unavailable"` : 'aria-hidden="true"'}>${icons.diamond}<span class="img-fallback-text">Image unavailable</span></span>`;
}

function mediaHTML(src, alt, cls) {
  if (!src) return `<span class="media ${cls} is-loaded">${fallbackHTML(alt)}</span>`;
  return `<span class="media ${cls}"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" data-has-fallback></span>`;
}

// Image load / error handling for every image rendered by mediaHTML.
document.addEventListener(
  'load',
  (e) => {
    if (e.target.matches?.('img[data-has-fallback]')) e.target.parentElement.classList.add('is-loaded');
  },
  true,
);
document.addEventListener(
  'error',
  (e) => {
    const img = e.target;
    if (!img.matches?.('img[data-has-fallback]')) return;
    const wrap = img.parentElement;
    wrap.classList.add('is-loaded');
    wrap.innerHTML = fallbackHTML(img.alt);
  },
  true,
);

function badgeHTML(product) {
  return product.inStock
    ? `<span class="badge badge--good">${esc(stock.inStock)}</span>`
    : `<span class="badge badge--muted">${esc(stock.outOfStock)}</span>`;
}

function variantBadgeHTML(variant) {
  return variant.stock > 0
    ? `<span class="badge badge--good">${esc(stock.inStock)}</span>`
    : `<span class="badge badge--muted">${esc(stock.outOfStock)}</span>`;
}

/** "From £x" when the options have different prices, otherwise the single price. */
function priceLabel(product) {
  const distinct = new Set(product.variants.map((v) => v.pricePence));
  return distinct.size > 1 ? `From ${formatPrice(product.fromPence)}` : formatPrice(product.fromPence);
}

/* ----------------------------- Storage ----------------------------- */

function loadCart() {
  try {
    return core.sanitiseCart(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'), products);
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart));
  } catch {
    /* Private browsing or storage disabled: the cart still works until the page is closed. */
  }
}

function setCart(cart) {
  state.cart = cart;
  saveCart();
  updateCartButton();
}

// Keep carts in sync if the shop is open in more than one tab.
window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY) return;
  state.cart = loadCart();
  updateCartButton();
  if (els.cartDialog.open && state.step !== 'done') renderCart();
});

/* ----------------------------- Branding ----------------------------- */

function renderBranding() {
  const tagline = config.shop?.tagline || '';
  document.title = tagline ? `${shopName} — ${tagline}` : shopName;
  document.querySelectorAll('[data-shop-name]').forEach((el) => (el.textContent = shopName));

  const textWordmark = (el) => {
    el.classList.add('is-text');
    el.innerHTML = `<span class="wordmark">${esc(shopName)}</span>`;
  };

  // Header logo
  const brand = $('#brand');
  brand.setAttribute('aria-label', `${shopName} — home`);
  if (config.shop?.logo?.header) {
    brand.innerHTML = `<img src="${esc(config.shop.logo.header)}" alt="${esc(shopName)}" width="480" height="256">`;
    brand.querySelector('img').addEventListener('error', () => textWordmark(brand), { once: true });
  } else textWordmark(brand);

  // Hero logo
  const hero = $('#hero-title');
  const heroText = () => {
    hero.classList.add('is-text');
    hero.innerHTML = `<span class="wordmark wordmark--hero">${esc(shopName)}</span>${tagline ? `<span class="hero-tagline">${esc(tagline)}</span>` : ''}`;
  };
  if (config.shop?.logo?.hero) {
    const alt = tagline ? `${shopName} — ${tagline}` : shopName;
    hero.innerHTML = `<img class="hero-logo" src="${esc(config.shop.logo.hero)}" alt="${esc(alt)}" width="1079" height="729" fetchpriority="high">`;
    hero.querySelector('img').addEventListener('error', heroText, { once: true });
  } else heroText();

  $('#shop-title').textContent = config.home?.collectionHeading || 'Shop';

  $('#request-title').textContent = request.heading || 'Request';
  $('#about-title').textContent = config.about?.heading || 'About';
  $('#about-text').innerHTML = (config.about?.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join('');

  $('#faq-title').textContent = config.faq?.heading || 'Frequently asked questions';

  $('#footer-tagline').textContent = tagline;
  $('#footer-year').textContent = String(new Date().getFullYear());
}

/* ----------------------------- FAQ + links ----------------------------- */

function renderFaq() {
  const items = config.faq?.items || [];
  $('#faq').hidden = !items.length;
  els.faqList.innerHTML = items
    .map(
      (it, i) => `<div class="faq-item">
        <button type="button" class="faq-q" id="faq-q-${i}" aria-expanded="false" aria-controls="faq-a-${i}">
          <span>${esc(it.question)}</span><span class="faq-icon" aria-hidden="true"></span>
        </button>
        <div class="faq-panel" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}">
          <div class="faq-answer"><p>${esc(it.answer)}</p></div>
        </div>
      </div>`,
    )
    .join('');
}

els.faqList.addEventListener('click', (e) => {
  const btn = e.target.closest('.faq-q');
  if (!btn) return;
  const item = btn.closest('.faq-item');
  const open = item.classList.toggle('is-open');
  btn.setAttribute('aria-expanded', String(open));
});

/** Footer links: WhatsApp and Telegram profiles plus any social URLs. Unconfigured entries are hidden. */
function renderFooterLinks() {
  const links = [];
  const wa = core.whatsappProfileLink(contact.whatsappNumber);
  if (wa) links.push({ name: 'WhatsApp', url: wa });
  const tg = core.telegramProfileLink(contact.telegramUsername);
  if (tg) links.push({ name: 'Telegram', url: tg });
  for (const s of config.social || []) {
    const url = core.safeWebUrl(s.url);
    if (url && s.name) links.push({ name: String(s.name), url });
  }
  els.footerLinks.innerHTML = links.length
    ? `<p class="footer-links-label">Follow and contact us</p>
       <ul class="social-list">${links
         .map(
           (l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.name)}<span class="visually-hidden"> (opens in a new tab)</span></a></li>`,
         )
         .join('')}</ul>`
    : '';
}

/* ----------------------------- Search + filters ----------------------------- */

function renderFilters() {
  const bandOpts = priceBands.map((b, i) => `<option value="${i}">${esc(b.label)}</option>`).join('');
  const catOpts = facets.categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const tagChips = facets.tags
    .map((t) => `<label class="chip chip--tag"><input type="checkbox" name="tag" value="${esc(t)}"><span>${esc(t)}</span></label>`)
    .join('');

  els.filters.innerHTML = `
    <div class="filters-grid">
      <div class="field field--search">
        <label for="flt-query">${esc(filterText.searchLabel || 'Search')}</label>
        <input id="flt-query" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="${esc(filterText.searchPlaceholder || '')}">
      </div>
      <div class="field">
        <label for="flt-availability">${esc(filterText.availabilityLabel || 'Availability')}</label>
        <select id="flt-availability">
          <option value="any">${esc(filterText.availabilityAll || 'All')}</option>
          <option value="in">${esc(filterText.availabilityIn || 'In stock')}</option>
          <option value="out">${esc(filterText.availabilityOut || 'Out of stock')}</option>
        </select>
      </div>
      ${priceBands.length ? `<div class="field">
        <label for="flt-price">${esc(filterText.priceLabel || 'Price')}</label>
        <select id="flt-price"><option value="">${esc(filterText.priceAny || 'Any price')}</option>${bandOpts}</select>
      </div>` : ''}
      ${facets.categories.length ? `<div class="field">
        <label for="flt-category">${esc(filterText.categoryLabel || 'Category')}</label>
        <select id="flt-category"><option value="">${esc(filterText.categoryAny || 'All categories')}</option>${catOpts}</select>
      </div>` : ''}
    </div>
    ${facets.tags.length ? `<fieldset class="tag-filter">
      <legend>${esc(filterText.tagsLabel || 'Tags')} <span class="req">(${esc(filterText.tagsHint || '')})</span></legend>
      <div class="chips" id="flt-tags">${tagChips}</div>
    </fieldset>` : ''}
    <div class="filter-foot">
      <button type="button" class="link-btn" id="flt-clear" disabled>${esc(filterText.clearLabel || 'Clear filters')}</button>
    </div>`;
}

function readFilters() {
  const band = $('#flt-price')?.value;
  return {
    query: $('#flt-query')?.value || '',
    availability: $('#flt-availability')?.value || 'any',
    band: band !== undefined && band !== '' ? priceBands[Number(band)] : null,
    category: $('#flt-category')?.value || '',
    tags: [...els.filters.querySelectorAll('input[name="tag"]:checked')].map((i) => i.value),
  };
}

function isFiltered(f) {
  return Boolean(f.query.trim() || f.availability !== 'any' || f.band || f.category || f.tags.length);
}

function clearFilters() {
  $('#flt-query').value = '';
  $('#flt-availability').value = 'any';
  if ($('#flt-price')) $('#flt-price').value = '';
  if ($('#flt-category')) $('#flt-category').value = '';
  els.filters.querySelectorAll('input[name="tag"]').forEach((i) => (i.checked = false));
  renderCatalogue();
  $('#flt-query').focus();
}

els.filters.addEventListener('input', (e) => {
  if (e.target.id === 'flt-query') renderCatalogue();
});
els.filters.addEventListener('change', () => renderCatalogue());
els.filters.addEventListener('click', (e) => {
  if (e.target.closest('#flt-clear')) clearFilters();
});

/* ----------------------------- Catalogue ----------------------------- */

function renderCatalogue() {
  const f = readFilters();
  const active = isFiltered(f);
  const list = core.filterProducts(products, f);
  const clear = $('#flt-clear');
  if (clear) clear.disabled = !active;

  els.grid.removeAttribute('aria-busy');
  if (!products.length) {
    els.grid.innerHTML = '';
    els.status.textContent = 'New pieces are coming soon. Please check back shortly.';
    els.status.hidden = false;
    return;
  }
  if (!list.length) {
    els.grid.innerHTML = '';
    els.status.textContent = filterText.noResults || 'No pieces match these filters.';
    els.status.hidden = false;
    return;
  }
  els.status.textContent = active ? `Showing ${list.length} of ${products.length} pieces.` : '';
  els.status.hidden = !active;

  els.grid.innerHTML = list
    .map(
      (p) => `<li class="card${p.inStock ? '' : ' card--unavailable'}">
        <button type="button" class="card-button" data-product="${esc(p.id)}" aria-haspopup="dialog">
          ${mediaHTML(p.image, '', 'card-media')}
          <span class="card-body">
            <span class="card-name">${esc(p.name)}</span>
            <span class="card-price">${esc(priceLabel(p))}</span>
            ${badgeHTML(p)}
          </span>
        </button>
      </li>`,
    )
    .join('');
}

els.grid.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-product]');
  if (btn) openProduct(btn.dataset.product, btn);
});

/* --------------------------- Product pop-up --------------------------- */

let productReturnFocus = null;
let currentProduct = null;

function openProduct(id, opener) {
  const p = productById.get(id);
  if (!p) return;
  currentProduct = p;
  productReturnFocus = opener || document.activeElement;

  const optionsHTML = p.options
    .map(
      (o, i) => `
      <fieldset class="option-group" data-option="${esc(o.name)}" aria-describedby="opt-${i}-err">
        <legend>${esc(o.name)} <span class="req">(required)</span></legend>
        <div class="chips">
          ${o.values
            .map(
              (v) => `<label class="chip"><input type="radio" name="opt-${i}" value="${esc(v)}"${o.values.length === 1 ? ' checked' : ''}><span>${esc(v)}</span></label>`,
            )
            .join('')}
        </div>
        <p class="field-error" id="opt-${i}-err" hidden></p>
      </fieldset>`,
    )
    .join('');

  els.productContent.innerHTML = `
    <button type="button" class="icon-btn modal-close" data-close-product aria-label="Close product details">${icons.close}</button>
    ${mediaHTML(p.image, p.imageAlt, 'pd-media')}
    <div class="pd-body">
      <h2 class="pd-name" id="pd-name">${esc(p.name)}</h2>
      <p class="pd-meta"><span class="pd-price-from">${esc(priceLabel(p))}</span>${badgeHTML(p)}</p>
      ${p.description ? `<p class="pd-desc" id="pd-desc">${esc(p.description)}</p>` : ''}
      <form class="pd-form" id="pd-form" novalidate>
        ${optionsHTML}
        <div class="pd-selection" id="pd-selection" aria-live="polite"></div>
        <div class="field field--qty">
          <label for="pd-qty">Quantity</label>
          <input id="pd-qty" name="qty" type="number" inputmode="numeric" min="1" max="${core.MAX_QTY}" step="1" value="1" aria-describedby="pd-qty-err">
          <p class="field-error" id="pd-qty-err" hidden></p>
        </div>
        <button type="submit" class="btn btn-gold btn-block" id="pd-submit">Add to cart</button>
      </form>
      <div class="pd-added" id="pd-added" hidden></div>
    </div>`;

  if (p.description) els.productDialog.setAttribute('aria-describedby', 'pd-desc');
  else els.productDialog.removeAttribute('aria-describedby');

  renderSelection();
  if (!els.productDialog.open) els.productDialog.showModal();
  els.productDialog.scrollTop = 0;
  els.productContent.scrollTop = 0;
}

function currentChoice(form) {
  const chosen = {};
  form.querySelectorAll('.option-group').forEach((group) => {
    const picked = group.querySelector('input:checked');
    if (picked) chosen[group.dataset.option] = picked.value;
  });
  return chosen;
}

/** Show the price and stock for the chosen options, and mark enquiries. */
function renderSelection() {
  const form = $('#pd-form', els.productContent);
  if (!form || !currentProduct) return;
  const p = currentProduct;
  const chosen = currentChoice(form);
  const variant = core.findVariant(p, chosen);
  const qtyCheck = core.validateQuantity($('#pd-qty', form).value);
  const qty = qtyCheck.ok ? qtyCheck.value : 1;
  const sel = $('#pd-selection', form);
  const submit = $('#pd-submit', form);
  const missing = core.missingOptions(p, chosen);

  if (!variant) {
    const hint = missing.length ? 'Choose your options to see the price and stock.' : stock.notListed;
    sel.innerHTML = `<p class="pd-hint">${esc(hint)}</p>`;
    submit.textContent = 'Add to cart';
    return;
  }

  const reason = core.enquiryReason(variant, qty);
  const note = reason
    ? `<p class="notice" id="pd-enquiry-note">${esc(reason === 'out' ? stock.outOfStockNote : stock.overStockNote)}</p>`
    : '';
  sel.innerHTML = `<p class="pd-selected"><span class="pd-price">${formatPrice(variant.pricePence)}</span>${variantBadgeHTML(variant)}</p>${note}`;
  submit.textContent = `${reason ? stock.enquiryButton || 'Add as enquiry' : 'Add to cart'} · ${formatPrice(variant.pricePence * qty)}`;
  if (reason) submit.setAttribute('aria-describedby', 'pd-enquiry-note');
  else submit.removeAttribute('aria-describedby');
}

function onProductFormChange(e) {
  const group = e.target.closest('.option-group');
  if (group) {
    group.classList.remove('is-invalid');
    const err = group.querySelector('.field-error');
    err.hidden = true;
    err.textContent = '';
  }
  if (e.target.id === 'pd-qty') {
    const err = $('#pd-qty-err');
    const ok = core.validateQuantity(e.target.value).ok;
    e.target.removeAttribute('aria-invalid');
    err.hidden = true;
    if (!ok && e.type === 'change') {
      e.target.setAttribute('aria-invalid', 'true');
      err.textContent = core.validateQuantity(e.target.value).error;
      err.hidden = false;
    }
  }
  renderSelection();
}

els.productContent.addEventListener('change', onProductFormChange);
els.productContent.addEventListener('input', onProductFormChange);

els.productContent.addEventListener('submit', (e) => {
  if (e.target.id !== 'pd-form') return;
  e.preventDefault();
  const form = e.target;
  const p = currentProduct;
  let firstInvalid = null;
  form.querySelectorAll('.option-group').forEach((group) => {
    const err = group.querySelector('.field-error');
    if (currentChoice(form)[group.dataset.option] === undefined) {
      group.classList.add('is-invalid');
      err.textContent = `Please choose a ${group.dataset.option.toLowerCase()}.`;
      err.hidden = false;
      firstInvalid ||= group;
    }
  });
  if (firstInvalid) {
    firstInvalid.querySelector('input')?.focus();
    announce('Please choose the required options before adding to your cart.');
    return;
  }

  const chosen = currentChoice(form);
  const variant = core.findVariant(p, chosen);
  if (!variant) {
    announce(stock.notListed);
    return;
  }

  const qtyInput = $('#pd-qty', form);
  const qty = core.validateQuantity(qtyInput.value);
  if (!qty.ok) {
    const err = $('#pd-qty-err', form);
    qtyInput.setAttribute('aria-invalid', 'true');
    err.textContent = qty.error;
    err.hidden = false;
    qtyInput.focus();
    return;
  }

  setCart(core.addToCart(state.cart, p.id, chosen, qty.value));
  const resolved = core.resolveCart(state.cart, products);
  const line = resolved.lines.find((l) => l.key === core.lineKey(p.id, chosen));
  const opts = core.describeOptions(chosen);
  const added = $('#pd-added', els.productContent);
  form.hidden = true;
  added.hidden = false;
  added.innerHTML = `
    <p class="pd-added-msg" role="status">${icons.check}<span>Added to your cart: ${esc(p.name)}${opts ? ` (${esc(opts)})` : ''}, qty ${qty.value}</span></p>
    ${line?.enquiry ? `<p class="small">${esc(stock.cartEnquiry)}</p>` : ''}
    <div class="btn-row">
      <button type="button" class="btn btn-gold" data-view-cart>View cart (${resolved.count})</button>
      <button type="button" class="btn btn-outline" data-close-product>Keep shopping</button>
    </div>
    <button type="button" class="link-btn" data-add-another>Add another option</button>`;
  added.querySelector('[data-view-cart]').focus();
});

els.productContent.addEventListener('click', (e) => {
  if (e.target.closest('[data-close-product]')) els.productDialog.close();
  else if (e.target.closest('[data-view-cart]')) {
    const back = productReturnFocus;
    productReturnFocus = null;
    els.productDialog.close();
    openCart(back);
  } else if (e.target.closest('[data-add-another]')) {
    openProduct(currentProduct.id, productReturnFocus);
    els.productContent.querySelector('input, button[type="submit"]')?.focus();
  }
});

els.productDialog.addEventListener('click', (e) => {
  if (e.target === els.productDialog) els.productDialog.close(); // backdrop click
});

els.productDialog.addEventListener('close', () => {
  const target = productReturnFocus;
  productReturnFocus = null;
  if (target?.isConnected && !els.cartDialog.open) target.focus();
});

/* ------------------------------- Cart ------------------------------- */

function updateCartButton() {
  const { count } = core.resolveCart(state.cart, products);
  els.cartCount.textContent = count > 99 ? '99+' : String(count);
  els.cartCount.hidden = count === 0;
  els.cartLabel.textContent = `Cart, ${count} item${count === 1 ? '' : 's'}`;
  els.cartButton.classList.remove('bump');
  void els.cartButton.offsetWidth; // restart animation
  if (count) els.cartButton.classList.add('bump');
}

let cartReturnFocus = null;

function openCart(returnFocus) {
  cartReturnFocus = returnFocus || document.activeElement;
  if (state.step === 'done') state.step = 'cart';
  if (!state.cart.length) state.step = 'cart';
  renderCart();
  if (!els.cartDialog.open) els.cartDialog.showModal();
  els.cartTitle.focus();
}

function goTo(step) {
  state.step = step;
  if (step !== 'send' && step !== 'done') state.openedApp = null;
  renderCart();
  els.cartBody.scrollTop = 0;
  els.cartTitle.focus();
}

els.cartButton.addEventListener('click', () => openCart(els.cartButton));
els.cartDialog.addEventListener('click', (e) => {
  if (e.target === els.cartDialog) els.cartDialog.close();
});
els.cartDialog.addEventListener('close', () => {
  if (state.step === 'done') state.step = 'cart';
  const target = cartReturnFocus;
  cartReturnFocus = null;
  if (target?.isConnected) target.focus();
});

const titles = { cart: 'Your cart', details: 'Your details', send: 'Send your order', done: 'Thank you' };

function renderSteps() {
  const order = ['cart', 'details', 'send'];
  const idx = order.indexOf(state.step);
  els.steps.hidden = state.step === 'done' || (state.step === 'cart' && !state.cart.length);
  els.steps.querySelectorAll('li').forEach((li, i) => {
    li.classList.toggle('is-done', i < idx);
    if (i === idx) li.setAttribute('aria-current', 'step');
    else li.removeAttribute('aria-current');
  });
}

function renderCart() {
  const resolved = core.resolveCart(state.cart, products);
  if (!resolved.lines.length && state.step !== 'done') state.step = 'cart';
  els.cartTitle.textContent = titles[state.step];
  renderSteps();
  ({ cart: renderCartStep, details: renderDetailsStep, send: renderSendStep, done: renderDoneStep })[state.step](resolved);
}

function renderCartStep(resolved) {
  if (!resolved.lines.length) {
    els.cartBody.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">${icons.diamond}</span>
        <p class="empty-title">Your cart is empty</p>
        <p>Browse the collection and tap any piece to add it.</p>
        <button type="button" class="btn btn-outline" data-action="browse">${esc(config.home?.browseButton || 'Browse')}</button>
      </div>`;
    els.cartFoot.innerHTML = '';
    return;
  }

  els.cartBody.innerHTML = `<ul class="lines">${resolved.lines
    .map((l) => {
      const opts = core.describeOptions(l.options);
      const label = `${l.product.name}${opts ? `, ${opts}` : ''}`;
      return `<li class="line${l.enquiry ? ' line--enquiry' : ''}">
        ${mediaHTML(l.product.image, '', 'line-media')}
        <div class="line-info">
          <p class="line-name">${esc(l.product.name)}</p>
          ${opts ? `<p class="line-opts">${esc(opts)}</p>` : ''}
          <p class="line-unit">${formatPrice(l.unitPence)} each</p>
          ${l.enquiry ? `<p class="line-warn">${esc(stock.cartEnquiry)}</p>` : ''}
          <div class="line-actions">
            <div class="qty" role="group" aria-label="Quantity for ${esc(label)}">
              <button type="button" class="qty-btn" data-action="dec" data-key="${esc(l.key)}" aria-label="Decrease quantity of ${esc(label)}"${l.qty <= 1 ? ' disabled' : ''}>−</button>
              <span class="qty-value" aria-label="Quantity ${l.qty}">${l.qty}</span>
              <button type="button" class="qty-btn" data-action="inc" data-key="${esc(l.key)}" aria-label="Increase quantity of ${esc(label)}"${l.qty >= core.MAX_QTY ? ' disabled' : ''}>+</button>
            </div>
            <button type="button" class="link-btn" data-action="remove" data-key="${esc(l.key)}" aria-label="Remove ${esc(label)} from cart">Remove</button>
          </div>
        </div>
        <p class="line-total">${formatPrice(l.totalPence)}</p>
      </li>`;
    })
    .join('')}</ul>`;

  els.cartFoot.innerHTML = `
    <div class="total-row"><span>Subtotal</span><span class="total-value">${formatPrice(resolved.totalPence)}</span></div>
    ${checkout.cartNote ? `<p class="foot-note">${esc(checkout.cartNote)}</p>` : ''}
    ${resolved.hasEnquiry ? `<p class="notice">${esc(stock.cartEnquiry)}</p>` : ''}
    <button type="button" class="btn btn-gold btn-block" data-action="to-details">Checkout</button>`;
}

function renderDetailsStep() {
  const c = state.customer || {};
  els.cartBody.innerHTML = `
    <form class="details-form" id="details-form" novalidate>
      <p class="step-intro">${esc(checkout.detailsIntro || '')}</p>
      <div class="field">
        <label for="f-name">Your name</label>
        <input id="f-name" name="name" type="text" autocomplete="name" maxlength="80" required aria-describedby="f-name-err" value="${esc(c.name || '')}">
        <p class="field-error" id="f-name-err" hidden></p>
      </div>
      <div class="field">
        <label for="f-postcode">UK postcode</label>
        <input id="f-postcode" name="postcode" type="text" autocomplete="postal-code" autocapitalize="characters" spellcheck="false" maxlength="10" required aria-describedby="f-postcode-hint f-postcode-err" value="${esc(c.postcode || '')}">
        <p class="field-hint" id="f-postcode-hint">For example, SW1A 1AA</p>
        <p class="field-error" id="f-postcode-err" hidden></p>
      </div>
    </form>`;
  els.cartFoot.innerHTML = `
    <button type="submit" form="details-form" class="btn btn-gold btn-block">Continue</button>
    <button type="button" class="btn btn-ghost btn-block" data-action="to-cart">Back to cart</button>`;
}

function setFieldError(input, message) {
  const err = $(`#${input.id}-err`);
  if (message) {
    input.setAttribute('aria-invalid', 'true');
    err.textContent = message;
    err.hidden = false;
  } else {
    input.removeAttribute('aria-invalid');
    err.textContent = '';
    err.hidden = true;
  }
}

els.cartBody.addEventListener('submit', (e) => {
  if (e.target.id !== 'details-form') return;
  e.preventDefault();
  const nameInput = $('#f-name');
  const pcInput = $('#f-postcode');
  const name = core.validateName(nameInput.value);
  const pc = core.validatePostcode(pcInput.value);
  setFieldError(nameInput, name.ok ? '' : name.error);
  setFieldError(pcInput, pc.ok ? '' : pc.error);
  if (!name.ok || !pc.ok) {
    (!name.ok ? nameInput : pcInput).focus();
    return;
  }
  state.customer = { name: name.value, postcode: pc.value };
  goTo('send');
});

els.cartBody.addEventListener('input', (e) => {
  if (e.target.matches('[aria-invalid="true"]')) setFieldError(e.target, '');
});

function orderMessage(resolved) {
  return core.buildOrderMessage({
    shopName,
    greeting: checkout.messageGreeting,
    footer: checkout.messageFooter,
    labels: checkout.messageLabels,
    customer: state.customer,
    resolved,
    formatPrice,
  });
}

function channelHTML(app, href, icon, noneConfigured, noteId = 'external-note') {
  const slug = app.toLowerCase();
  if (href) {
    return `<a class="btn btn-channel btn-channel--${slug}" href="${esc(href)}" target="_blank" rel="noopener noreferrer" data-channel="${esc(app)}" aria-describedby="${noteId}">
      ${icon}<span><span class="visually-hidden">Send with </span>${esc(app)}<span class="visually-hidden"> (opens ${esc(app)} in a new tab or app)</span></span></a>`;
  }
  const id = noneConfigured ? 'not-configured-note' : `unset-${slug}`;
  return `<button type="button" class="btn btn-channel is-unset" aria-disabled="true" data-unset="${esc(app)}" aria-describedby="${id}">
      ${icon}<span>${esc(app)}</span></button>
    ${noneConfigured ? '' : `<p class="unset-note" id="${id}">${esc(app)} ordering isn’t set up yet.</p>`}`;
}

function renderSendStep(resolved) {
  if (!state.customer) return goTo('details');
  const message = orderMessage(resolved);
  const wa = core.whatsappLink(contact.whatsappNumber, message);
  const tg = core.telegramLink(contact.telegramUsername, message);
  const noneConfigured = !wa && !tg;

  els.cartBody.innerHTML = `
    <p class="step-intro">${esc(checkout.messagingIntro || '')}</p>
    <h3 class="sub-title" id="msg-preview-label">Your order message</h3>
    <pre class="message-preview" tabindex="0" aria-labelledby="msg-preview-label">${esc(message)}</pre>
    <p class="small">Need to change your name or postcode? <button type="button" class="link-btn" data-action="to-details">Edit details</button></p>
    <div class="send-block">
      <h3 class="sub-title" id="send-with-label">Send with</h3>
      ${noneConfigured ? `<p class="notice" id="not-configured-note">${esc(checkout.notConfigured || 'Ordering by message isn’t set up yet.')}</p>` : ''}
      <div class="channel-row" role="group" aria-labelledby="send-with-label">
        <div class="channel">${channelHTML('WhatsApp', wa, icons.chat, noneConfigured)}</div>
        <div class="channel">${channelHTML('Telegram', tg, icons.plane, noneConfigured)}</div>
      </div>
      ${noneConfigured ? '' : '<p class="small center" id="external-note">Opens the app or website in a new tab. Your order is only sent when you press Send there.</p>'}
      <div class="after-open" id="after-open" role="status"></div>
    </div>`;

  els.cartFoot.innerHTML = `<button type="button" class="btn btn-ghost btn-block" data-action="to-details">Back</button>`;
  if (state.openedApp) showAfterOpen(state.openedApp);
}

function showAfterOpen(app) {
  const box = $('#after-open');
  if (!box) return;
  box.innerHTML = `
    <p>${esc(fill(checkout.afterOpen, { app }))}</p>
    <button type="button" class="btn btn-outline btn-block" data-action="confirm-sent">I’ve sent it in ${esc(app)} — clear my cart</button>`;
}

function renderDoneStep() {
  els.cartBody.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">${icons.check}</span>
      <p class="empty-title">Thank you</p>
      <p>${esc(fill(checkout.thanks, { app: state.openedApp || 'the app' }))}</p>
      <button type="button" class="btn btn-outline" data-action="browse">Keep browsing</button>
    </div>`;
  els.cartFoot.innerHTML = '';
}

/* Cart drawer actions (event delegation) */
els.cartDialog.addEventListener('click', (e) => {
  if (e.target.closest('[data-close-cart]')) return els.cartDialog.close();

  const channel = e.target.closest('a[data-channel]');
  if (channel) {
    // Let the link open normally, then explain what happens next without moving focus.
    state.openedApp = channel.dataset.channel;
    setTimeout(() => {
      showAfterOpen(state.openedApp);
      $('#after-open')?.scrollIntoView({ block: 'nearest' });
    }, 0);
    return;
  }

  const unset = e.target.closest('[data-unset]');
  if (unset) return announce(`${unset.dataset.unset} ordering isn’t set up yet.`);

  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, key } = btn.dataset;

  if (action === 'browse') {
    els.cartDialog.close();
    const shop = $('#shop');
    shop.scrollIntoView({ block: 'start' });
    shop.focus({ preventScroll: true });
    return;
  }
  if (action === 'to-cart') return goTo('cart');
  if (action === 'to-details') return goTo('details');
  if (action === 'confirm-sent') {
    setCart([]);
    state.customer = null;
    return goTo('done');
  }

  const line = state.cart.find((l) => core.lineKey(l.productId, l.options) === key);
  if (!line) return;
  const product = productById.get(line.productId);

  if (action === 'inc' || action === 'dec') {
    const qty = line.qty + (action === 'inc' ? 1 : -1);
    setCart(core.setQty(state.cart, key, Math.max(1, qty)));
    renderCart();
    const total = core.resolveCart(state.cart, products).totalPence;
    announce(`${product.name}: quantity ${Math.max(1, Math.min(core.MAX_QTY, qty))}. Subtotal ${formatPrice(total)}.`);
    const same = [...els.cartBody.querySelectorAll('[data-key]')].find((b) => b.dataset.key === key && b.dataset.action === action);
    const other = [...els.cartBody.querySelectorAll('[data-key]')].find((b) => b.dataset.key === key && b.dataset.action === (action === 'inc' ? 'dec' : 'inc'));
    (same && !same.disabled ? same : other)?.focus();
    return;
  }

  if (action === 'remove') {
    const removeButtons = [...els.cartBody.querySelectorAll('[data-action="remove"]')];
    const index = removeButtons.indexOf(btn);
    setCart(core.removeLine(state.cart, key));
    renderCart();
    announce(`${product.name} removed from your cart.`);
    const remaining = [...els.cartBody.querySelectorAll('[data-action="remove"]')];
    (remaining[Math.min(index, remaining.length - 1)] || els.cartTitle).focus();
  }
});

/* ------------------------- Request Services ------------------------- */

function renderRequest() {
  if (state.request.step === 'send' && state.request.data) return renderRequestSend();
  const d = state.request.data || state.customer || {};
  els.requestBody.innerHTML = `
    <p class="step-intro center">${esc(request.intro || '')}</p>
    <form class="details-form request-form" id="request-form" novalidate>
      <div class="field">
        <label for="r-name">${esc(request.nameLabel || 'Your name')}</label>
        <input id="r-name" name="name" type="text" autocomplete="name" maxlength="80" required aria-describedby="r-name-err" value="${esc(d.name || '')}">
        <p class="field-error" id="r-name-err" hidden></p>
      </div>
      <div class="field">
        <label for="r-postcode">${esc(request.postcodeLabel || 'UK postcode')}</label>
        <input id="r-postcode" name="postcode" type="text" autocomplete="postal-code" autocapitalize="characters" spellcheck="false" maxlength="10" required aria-describedby="r-postcode-hint r-postcode-err" value="${esc(d.postcode || '')}">
        <p class="field-hint" id="r-postcode-hint">${esc(request.postcodeHint || '')}</p>
        <p class="field-error" id="r-postcode-err" hidden></p>
      </div>
      <div class="field">
        <label for="r-description">${esc(request.descriptionLabel || 'What would you like us to source?')}</label>
        <textarea id="r-description" name="description" rows="5" maxlength="1000" required aria-describedby="r-description-hint r-description-err">${esc(d.description || '')}</textarea>
        <p class="field-hint" id="r-description-hint">${esc(request.descriptionHint || '')}</p>
        <p class="field-error" id="r-description-err" hidden></p>
      </div>
      <button type="submit" class="btn btn-gold btn-block">${esc(request.submit || 'Continue')}</button>
    </form>`;
}

function renderRequestSend() {
  const d = state.request.data;
  const message = core.buildRequestMessage({
    shopName,
    greeting: request.messageGreeting,
    footer: request.messageFooter,
    labels: request.messageLabels,
    customer: { name: d.name, postcode: d.postcode },
    description: d.description,
  });
  const wa = core.whatsappLink(contact.whatsappNumber, message);
  const tg = core.telegramLink(contact.telegramUsername, message);
  const noneConfigured = !wa && !tg;

  els.requestBody.innerHTML = `
    <p class="step-intro center">${esc(request.sendIntro || '')}</p>
    <h3 class="sub-title" id="req-preview-label">Your request message</h3>
    <pre class="message-preview" tabindex="0" aria-labelledby="req-preview-label">${esc(message)}</pre>
    <p class="small center"><button type="button" class="link-btn" data-req-action="edit">Edit request</button></p>
    <div class="send-block">
      <h3 class="sub-title" id="req-send-with">Send with</h3>
      ${noneConfigured ? `<p class="notice" id="not-configured-note">${esc(checkout.notConfigured || 'Messaging isn’t set up yet.')}</p>` : ''}
      <div class="channel-row" role="group" aria-labelledby="req-send-with">
        <div class="channel">${channelHTML('WhatsApp', wa, icons.chat, noneConfigured, 'req-external-note')}</div>
        <div class="channel">${channelHTML('Telegram', tg, icons.plane, noneConfigured, 'req-external-note')}</div>
      </div>
      ${noneConfigured ? '' : '<p class="small center" id="req-external-note">Opens the app or website in a new tab. Your request is only sent when you press Send there.</p>'}
      <div class="after-open" id="req-after-open" role="status"></div>
    </div>`;
  if (state.request.openedApp) showRequestAfterOpen(state.request.openedApp);
}

function showRequestAfterOpen(app) {
  const box = $('#req-after-open');
  if (!box) return;
  box.innerHTML = `<p>${esc(fill(request.afterOpen, { app }))}</p>`;
}

els.requestBody.addEventListener('submit', (e) => {
  if (e.target.id !== 'request-form') return;
  e.preventDefault();
  const nameInput = $('#r-name');
  const pcInput = $('#r-postcode');
  const descInput = $('#r-description');
  const name = core.validateName(nameInput.value);
  const pc = core.validatePostcode(pcInput.value);
  const desc = core.validateDescription(descInput.value);
  setFieldError(nameInput, name.ok ? '' : name.error);
  setFieldError(pcInput, pc.ok ? '' : pc.error);
  setFieldError(descInput, desc.ok ? '' : desc.error);
  if (!name.ok || !pc.ok || !desc.ok) {
    (!name.ok ? nameInput : !pc.ok ? pcInput : descInput).focus();
    return;
  }
  state.request = { step: 'send', data: { name: name.value, postcode: pc.value, description: desc.value }, openedApp: null };
  renderRequest();
  $('#req-preview-label')?.scrollIntoView({ block: 'nearest' });
  announce('Your request is ready. Choose WhatsApp or Telegram to send it.');
});

els.requestBody.addEventListener('input', (e) => {
  if (e.target.matches('[aria-invalid="true"]')) setFieldError(e.target, '');
});

els.requestBody.addEventListener('click', (e) => {
  const channel = e.target.closest('a[data-channel]');
  if (channel) {
    state.request.openedApp = channel.dataset.channel;
    setTimeout(() => {
      showRequestAfterOpen(state.request.openedApp);
      $('#req-after-open')?.scrollIntoView({ block: 'nearest' });
    }, 0);
    return;
  }
  const unset = e.target.closest('[data-unset]');
  if (unset) return announce(`${unset.dataset.unset} ordering isn’t set up yet.`);
  if (e.target.closest('[data-req-action="edit"]')) {
    state.request.step = 'form';
    renderRequest();
    $('#r-name')?.focus();
  }
});

/* ------------------------------- Start ------------------------------- */

renderBranding();
renderFilters();
renderCatalogue();
renderFaq();
renderFooterLinks();
renderRequest();
updateCartButton();
els.cartButton.classList.remove('bump');
window.__shopReady = true;
