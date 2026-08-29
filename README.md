# sujo-engineering.com

Public website of **SUJO Engineering Consulting SARL** — engineering
consulting, technical studies, cost estimation, project development and
industrial sourcing in Kinshasa, Democratic Republic of the Congo.

Served by GitHub Pages from the root of `main`, on the custom domain in
`CNAME`.

## This repository holds generated output

The files here are a **build artefact**. Editing `index.html` or `style.css`
directly will work until the next build overwrites it.

The site is generated from a small static-site generator kept with the rest of
the company's working files, under `04 IT/Website/11.00.00/`. Content lives in
bilingual data modules (`src/content/`), so changing a phone number or a service
description is one edit that propagates to every page, the footer and the
structured data together.

To publish a change:

```bash
cd "04 IT/Website/11.00.00"
npm run all
```

then copy the contents of `dist/` over the root of this repository and push.

## What is in here

| Path | Purpose |
|---|---|
| `*.html` | 42 pages — services, sectors, products, case studies, legal, contact, quote |
| `img/` | Responsive WebP with JPEG fallbacks |
| `style.css`, `app.js` | Single stylesheet and script, no dependencies |
| `CNAME` | Custom domain. Removing it drops the domain back to `*.github.io` |
| `.nojekyll` | Stops Pages running the output through Jekyll |
| `sitemap.xml`, `robots.txt` | Submitted to Google Search Console and Bing |
| `404.html` | Custom not-found page |

## Languages

Every page ships French and English together and switches client-side; the
choice is remembered per visitor.

The generator can also emit `/fr/` and `/en/` as separate URL trees with
`hreflang` tags (`npm run build:split`), which is what search engines need to
index the English pages independently. That switch has not been made yet.

## Forms

The contact and quotation forms post to FormSubmit, which relays to
`contact@sujo-engineering.com`. Note that FormSubmit's free tier does not
reliably forward file attachments — the quote page tells people to email large
drawings separately, quoting their inquiry number.

## Licence

MIT — see `LICENSE`. This covers the site code. Photographs, the SUJO name and
the SUJO logo are not covered and remain the property of SUJO Engineering
Consulting SARL.
