# ERPNext Experience Center

A browser-only replica of ERPNext v16 with guided "watch-along" tours, built for the ERPNext India page on frappe.io. Visitors can click around a sandbox with sample data, then pick a guided tour from the top bar and watch ERPNext create real documents: invoices, payments, orders, stock entries, assets and work orders. Nothing is saved; refreshing the page or pressing **Reset** starts over.

Plain HTML, CSS and JavaScript. No framework, no build dependencies beyond Python 3.

## What's inside

| Path | What it is |
| --- | --- |
| `experience-center.html` | The Experience Center page (built output) |
| `experience-center-standalone.html` | Same page with nothing loaded from other sites, used for embedding |
| `erpnext-india.html`, `erpnext-india-standalone.html` | Revamped ERPNext India landing page (built output) |
| `src/` | Source files the pages are built from |
| `real/` | Metadata copied from a real ERPNext v16 site: list columns, filters, sidebars, settings and report layouts |
| `builder/` | The Experience Center split into three Frappe Builder page scripts (style, data, app) plus an HTML block |
| `build.py` | Builds every page and the Builder files from `src/` |
| `gen_real.py` | Turns `real/*.json` into `src/desk-real.js` |

### Source files (`src/`)

- `desk-data.js`: sample company, customers, suppliers, items, documents and sector variants
- `desk-real.js`: generated from `real/` (do not edit by hand)
- `desk-views.js`: view definitions
- `desk-engine.js`: the desk shell: top bar, module rail, sidebars, workspaces, dashboards, forms, guided-tours menu
- `desk-lists.js`: v16 list views, filters, settings pages, query reports
- `desk-reports.js`: ledgers, trees, financial statements, A4 GST tax-invoice print, email composer
- `desk-tour.js`: the guided tours (steps, pacing, Back/Next, end-of-tour feedback)
- `desk.css`: desk styling (light and dark)
- `experience.html`: Experience Center page shell (welcome note, feedback, theme toggle, free-trial card)
- `page.html`: landing page shell

## Build

```bash
python3 gen_real.py   # only after changing anything in real/
python3 build.py
```

This rewrites the HTML pages in the repo root and the files in `builder/`.

## Using it on Frappe Builder

The live page uses three **Builder Client Scripts**, attached to the page in this order:

1. `erpnext-demo-style` ← `builder/erpnext-demo-style.css`
2. `erpnext-demo-data` ← `builder/erpnext-demo-data.js`
3. `erpnext-demo-app` ← `builder/erpnext-demo-app.js`

The page needs a block containing `<div id="erp-sandbox"></div>` (see `builder/page-html-block.html`). The app script mounts the sandbox there and removes the old header and tours bar if the page still has them.

## Guided tours

Six modules have guided tours: Accounting, Buying, Selling, Stock, Assets and Manufacturing. They're all reached from **Guided tours** in the top bar. Each tour starts from the module's sidebar, opens the list, then adds or opens a record, the way people work in ERPNext. Each one ends with a short feedback form.
