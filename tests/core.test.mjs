// Unit tests for the pure shop logic (run with: node --test tests/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shopConfig } from '../shopConfig.js';
import * as core from '../core.js';

const warnings = [];
const products = core.normaliseProducts(shopConfig.products, (m) => warnings.push(m));
const fmt = core.createPriceFormatter(shopConfig.currency);
const byId = (id) => products.find((p) => p.id === id);

test('config loads with no warnings', () => {
  assert.deepEqual(warnings, []);
  assert.equal(products.length, shopConfig.products.length);
});

test('prices are GBP pence and format as £', () => {
  assert.equal(core.toPence(49.5), 4950);
  assert.equal(fmt(4950), '£49.50');
});

test('invalid variants are skipped or set to 0 stock with a warning', () => {
  const w = [];
  const out = core.normaliseProducts([
    { id: 'a', name: 'A', price: 10, stock: 'lots' },
    { id: 'b', name: 'B', options: [{ name: 'Size', values: ['S', 'M'] }],
      variants: [{ options: { Size: 'S' }, price: 5, stock: 2 }, { options: { Size: 'XL' }, price: 5, stock: 1 }] },
    { id: 'c', name: 'C', options: [{ name: 'Size', values: ['S'] }], variants: [] },
  ], (m) => w.push(m));
  assert.equal(out.find((p) => p.id === 'a').variants[0].stock, 0);
  assert.equal(out.find((p) => p.id === 'b').variants.length, 1);
  assert.equal(out.find((p) => p.id === 'c'), undefined);
  assert.ok(w.length >= 3);
});

test('quantity changes and removal', () => {
  let cart = core.addToCart([], 'sample-silk-square', {}, 1);
  const key = core.lineKey('sample-silk-square', {});
  cart = core.setQty(cart, key, 4);
  assert.equal(cart[0].qty, 4);
  cart = core.setQty(cart, key, 0);
  assert.equal(cart.length, 0);
  assert.equal(core.MAX_QTY, 20);
});

test('postcode and name validation', () => {
  assert.equal(core.validatePostcode('sw1a1aa').value, 'SW1A 1AA');
  assert.equal(core.validatePostcode('W1 2XY').ok, true);
  assert.equal(core.validatePostcode('12345').ok, false);
  assert.equal(core.validatePostcode('').ok, false);
  assert.equal(core.validateName('  Ada   Lovelace ').value, 'Ada Lovelace');
  assert.equal(core.validateName('  ').ok, false);
  assert.equal(core.validateName('123').ok, false);
});

test('quantity and description validation', () => {
  assert.equal(core.validateQuantity('3').value, 3);
  assert.equal(core.validateQuantity('0').ok, false);
  assert.equal(core.validateQuantity('1.5').ok, false);
  assert.equal(core.validateQuantity('21').ok, false);
  assert.equal(core.validateDescription('  silk scarf ').value, 'silk scarf');
  assert.equal(core.validateDescription('').ok, false);
});

test('messaging links are missing until configured and URL-encode the text', () => {
  assert.equal(core.whatsappLink('', 'hi'), '');
  assert.equal(core.telegramLink('', 'hi'), '');
  assert.equal(core.whatsappLink('+44 7700 900000', 'Hi & bye'), 'https://wa.me/447700900000?text=Hi%20%26%20bye');
  assert.equal(core.telegramLink('@high_society', 'Hi'), 'https://t.me/high_society?text=Hi');
  assert.equal(core.telegramLink('https://t.me/high_society/', 'x'), 'https://t.me/high_society?text=x');
});

test('social URLs must be https', () => {
  assert.equal(core.safeWebUrl('https://instagram.com/x'), 'https://instagram.com/x');
  assert.equal(core.safeWebUrl('javascript:alert(1)'), '');
  assert.equal(core.safeWebUrl(''), '');
});

test('request message contains only name, postcode and description', () => {
  const msg = core.buildRequestMessage({
    shopName: 'High Society',
    greeting: shopConfig.request.messageGreeting,
    footer: shopConfig.request.messageFooter,
    labels: shopConfig.request.messageLabels,
    customer: { name: 'Ada', postcode: 'SW1A 1AA' },
    description: 'A green silk scarf',
  });
  assert.match(msg, /Name: Ada/);
  assert.match(msg, /Postcode: SW1A 1AA/);
  assert.match(msg, /Request:\nA green silk scarf/);
});
