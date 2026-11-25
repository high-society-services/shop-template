# Shop template: start here

This template is a complete shop front with an empty catalogue. To use it for a new client, follow these steps in order.

## Step 1: Set the brand details

Open `shopConfig.js`. Each field has a comment above it. Replace the lines marked `TODO`:

1. **Shop name**: find `name: 'Your Shop Name'` near the top and type your business name between the quotes.
2. **Tagline**: find `tagline: 'Your tagline here'` and replace the text in the quotes.
3. **About text**: find `paragraphs:` and replace the TODO line. Put one sentence on each line, with a comma at the end of each line and quotes around it.
4. **FAQ**: find `faq:` and replace each question and answer.

Keep the quote marks and commas. A missing one will stop the shop from loading.

## Step 2: Add the contact details

In `shopConfig.js`, find `contact:`.

- **WhatsApp**: type the number with the country code and no `+`, spaces or leading 0, for example `'447700900000'`. Until this is filled in, the WhatsApp button is hidden.
- **Telegram**: type the username without the `@`, for example `'yourname'`. Until this is filled in, the Telegram button is hidden.

Social links: for each one you use, paste the full address starting with `https://` between the quotes. Leave the others as `url: ''` and they will be hidden.

## Step 3: Add logos (optional)

1. Put your logo files in the same folder as `index.html`. Use PNG, JPG, WebP or SVG.
2. In `shopConfig.js`, find `logo:`.
   - `header`: the small logo in the top bar, for example `'logo-header.png'`.
   - `hero`: the large logo on the home page, for example `'logo-hero.png'`.
3. Leave a logo as `''` to show your shop name as text instead.

The browser tab icon is `icon-180.png`. Replace the file with a 180 × 180 PNG using the same name, or update the link in `index.html`.

## Step 4: Choose the look

There are 14 ready-made looks. Each one changes the whole site: background, cards, text, accents, borders, gradients and corner rounding.

1. Open `shopConfig.js` and find `theme:` near the top.
2. Type one name from the list between the quotes, for example `theme: 'ocean-teal',`.
3. Save the file. The whole site changes to that look.

**Dark looks:** `black-gold`, `midnight-silver`, `charcoal-copper`, `emerald-gold`, `burgundy-rose`, `ocean-teal`, `royal-violet`, `slate-minimal`

**Light looks:** `ivory-bronze`, `blush-rose`, `sage-olive`, `marble-monochrome`, `sand-terracotta`, `sky-navy`

### Changing one colour of a look

Find `themeOverrides:` in `shopConfig.js` and type the change, for example:

```js
themeOverrides: { accent: '#b8860b' },
```

Leave it as `{}` to use the look exactly as it is. You can change several colours at once, separated by commas. The colour fields are:

- `bg`: page background
- `panel` and `panelAlt`: card and box backgrounds
- `text` and `muted`: main and secondary text
- `accentLight`, `accent`, `accentMid`, `accentDeep`: the highlight colours used for headings and gradients
- `line`: thin borders
- `radius`: corner rounding in pixels (0 is square, 24 is very round)

Colours are written as six-digit codes such as `#b8860b`. Pick colours with any colour picker that shows the code.

### Making a new look

Open `themes.js`, copy one of the entries under `palettes`, give it a new name, and change its colours. Set `scheme` to `'dark'` or `'light'`, so the scrollbars and form fields match.

The fonts are the two bundled with the template: Fraunces for headings and Montserrat for body text.

## Step 5: Add products

Products go in the `products: [ ]` list in `shopConfig.js`. Each product is one block between `{` and `},`:

```js
{
  id: 'unique-id-no-spaces',
  name: 'Product name',
  description: 'What the product is.',
  image: 'product-photo.jpg',   // file in the same folder, or '' for none
  imageAlt: 'Short description of the photo',
  categories: ['Category'],
  tags: ['tag'],
  options: [],                  // or e.g. [{ name: 'Size', values: ['S', 'M'] }]
  price: 25,                    // pounds, used when options is empty
  stock: 5,                     // 0 shows "Out of stock · enquire"
},
```

- Prices are plain numbers in pounds.
- If you add options, list each combination you sell under `variants`, each with its own price and stock.
- Every `id` must be different.

## Step 6: Check before going live

- [ ] The shop name, tagline and About text are replaced.
- [ ] WhatsApp or Telegram is filled in, and clicking it opens the chat.
- [ ] Every logo and product image path matches a file that exists.
- [ ] At least one product is listed, and its price and stock are correct.
- [ ] A test order works: add an item, press Checkout, and check the message that opens.
- [ ] You have checked the site on a phone and on a computer.

To see the site on your computer, run `python3 -m http.server 8000` in the folder and open `http://localhost:8000`. Press F12 to open the browser console, which lists any problems in `shopConfig.js` in plain English.

## Publishing

Use GitHub Pages: in the repo settings, under Pages, choose the `main` branch. The site goes live a few minutes after each commit.
