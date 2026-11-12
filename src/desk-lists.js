/* ERPNext interactive demo — list views, settings pages and report layouts matched to a real ERPNext v16 site.
   Columns, standard filters, sidebars, settings fields and report filters come from desk-real.js.
   Loaded after desk-reports.js; extends the Demo prototype. */
(function (global) {
  'use strict';
  var D = global.ERPData, Demo = global.ERPDemo, P = Demo.prototype, DT = D.DT, F = global.ERPFmt, UI = global.ERPUI;
  var REAL = global.ERPReal || { lists: {}, reports: {}, singles: {}, side: {} };
  var ic = UI.ic, pill = UI.pill, VIEWS = UI.VIEWS;
  var inr = F.inr, num = F.num, fdate = F.fdate;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9%]+/g, ' ').trim(); }
  function money(v) { return v == null || v === '' ? '' : inr(+v || 0); }

  /* sample rows for list pages the sandbox only shows (no forms behind them) */
  var SAMPLE = {
    'Account Category': [['Cash and Cash Equivalents', 'Cash and Cash Equivalents', 'Asset'], ['Trade Receivables', 'Trade Receivables', 'Asset'], ['Trade Payables', 'Trade Payables', 'Liability']],
    'Asset Capitalization': [['Capitalise CNC machine', 'Submitted', '12-08-2026', 'ACC-ASC-2026-00001'], ['Capitalise office fit-out', 'Draft', '21-10-2026', 'ACC-ASC-2026-00002']],
    'Asset Depreciation Schedule': [['ACC-ADS-2026-00001', 'Active', 'ACC-ASS-2026-00001'], ['ACC-ADS-2026-00002', 'Active', 'ACC-ASS-2026-00002'], ['ACC-ADS-2026-00003', 'Draft', 'ACC-ASS-2026-00003']],
    'Asset Maintenance Log': [['ACC-AML-2026-00001', 'Completed', '15-09-2026', '14-09-2026'], ['ACC-AML-2026-00002', 'Planned', '15-11-2026', '']],
    'Asset Maintenance Team': [['Plant Maintenance', 'Plant Maintenance'], ['IT Support', 'IT Support']],
    'BOM Creator': [['{FG1} – Rev B', 'Submitted', '{FG1C}', '8,640.00', '2', '{FG1} – Rev B'], ['{FG2} concept', 'Draft', '{FG2C}', '5,120.00', '1', '{FG2} concept']],
    'Brand': [['{C}', 'Our own brand'], ['Generic', 'Unbranded items']],
    'Cost Center Allocation': [['CC-ALLOC-0001', 'Submitted', 'Main - {A}', '01-04-2026'], ['CC-ALLOC-0002', 'Draft', 'Production - {A}', '01-10-2026']],
    'Currency Exchange': [['01-11-2026-USD-INR-Selling', '01-11-2026', 'USD', 'INR', '88.42'], ['01-11-2026-EUR-INR-Selling', '01-11-2026', 'EUR', 'INR', '102.15'], ['01-11-2026-AED-INR-Selling', '01-11-2026', 'AED', 'INR', '24.07']],
    'Downtime Entry': [['Assembly Line 1', 'Vikram Mehta', '14-10-2026 10:30:00', '14-10-2026 11:45:00', 'DT-00001'], ['Paint Booth', 'Ravi Kumar', '22-10-2026 15:00:00', '22-10-2026 15:40:00', 'DT-00002']],
    'Financial Report Template': [['Standard Profit and Loss', 'Enabled', 'Profit and Loss Statement', 'Standard Profit and Loss'], ['Standard Balance Sheet', 'Enabled', 'Balance Sheet', 'Standard Balance Sheet']],
    'Inventory Dimension': [['Rack', 'Rack', 'Rack'], ['Shelf', 'Shelf', 'Shelf']],
    'Item Attribute': [['Size', 'Enabled', 'Size'], ['Colour', 'Enabled', 'Colour']],
    'Landed Cost Voucher': [['MAT-LCV-2026-00001', 'Submitted', '{C}'], ['MAT-LCV-2026-00002', 'Draft', '{C}']],
    'Monthly Distribution': [['Festive Season', 'Festive Season', '2026-2027'], ['Even Split', 'Even Split', '2026-2027']],
    'Packing Slip': [['MAT-PAC-2026-00001', 'Submitted', 'MAT-DN-2026-00001', '1', '4'], ['MAT-PAC-2026-00002', 'Draft', 'MAT-DN-2026-00002', '1', '2']],
    'Serial and Batch Bundle': [['{FG1C}', 'Submitted', '{C}', 'Finished Goods - {A}', 'Delivery Note', 'SABB-00000001'], ['{FG2C}', 'Submitted', '{C}', 'Stores - {A}', 'Purchase Receipt', 'SABB-00000002']],
    'Subcontracting Inward Order': [['{C2}', 'In Process', '08-10-2026', '100%', '60%', '40%', '0%', '0%', '0%', 'SCIO-2026-00001'], ['{C3}', 'Draft', '27-10-2026', '0%', '0%', '0%', '0%', '0%', '0%', 'SCIO-2026-00002']],
    'Tax Rule': [['Sales - Intra State', 'Sales'], ['Purchase - Inter State', 'Purchase']],
    'Tax Withholding Category': [['194C - Contractor', '194C - Contractor'], ['194J - Professional Fees', '194J - Professional Fees']]
  };

  /* ---------- list view (the v16 div layout: subject column, fixed columns, activity on the right) ---------- */
  function badge(s) { return s ? pill(s) : ''; }
  function check(v, label) { return '<input type="checkbox" class="dd-lv-cb" tabindex="-1" disabled' + (v ? ' checked' : '') + ' aria-label="' + esc(label) + '"/>'; }
  function isNum(c) { return c.align === 'r' || /^(Currency|Float|Int|Percent)$/.test(c.ft); }
  P.lvFilters = function (dt, spec, f) {
    f = f || {};
    var self = this;
    var ctl = (spec || [['name', 'Data', 'ID']]).map(function (x) {
      var field = x[0], ft = x[1], label = x[2];
      if (field === 'name') return '<span class="dd-lvf dd-lvf-data"><input id="dd-f-q" class="dd-ctl" type="text" placeholder="ID" data-filter="q" value="' + esc(f.q || '') + '" aria-label="ID"/><i aria-hidden="true">≈</i></span>';
      if (field === 'status' && ft === 'Select' && DT[dt]) {
        var st = []; (self.S.docs[dt] || []).forEach(function (d) { var s = self.status(dt, d); if (s && st.indexOf(s) < 0) st.push(s); });
        return '<span class="dd-lvf"><select id="dd-f-status" class="dd-ctl" data-filter="status" aria-label="Status"><option value="">Status</option>' + st.map(function (s) { return '<option' + (s === f.status ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></span>';
      }
      if (ft === 'Check') return '<label class="dd-lvf dd-lvf-check" data-act="soon" data-what="filters"><input type="checkbox" tabindex="-1"/> ' + esc(label) + '</label>';
      if (ft === 'Select') return '<span class="dd-lvf" data-act="soon" data-what="filters"><span class="dd-ctl dd-lvf-sel">' + esc(label) + ic('updown', 13) + '</span></span>';
      if (ft === 'Data') return '<span class="dd-lvf dd-lvf-data" data-act="soon" data-what="filters"><span class="dd-ctl dd-lvf-ph">' + esc(label) + '</span><i aria-hidden="true">≈</i></span>';
      return '<span class="dd-lvf" data-act="soon" data-what="filters"><span class="dd-ctl dd-lvf-ph">' + esc(label) + '</span></span>';
    }).join('');
    return '<div class="dd-filters dd-lvfilters"><div class="dd-lvf-std">' + ctl + '</div><span class="dd-lf-sp"></span>' +
      '<span class="dd-seg"><button type="button" class="dd-btn" data-act="soon" data-what="filters">' + ic('filter', 15) + ' Filter</button><button type="button" class="dd-btn dd-btn-icon" data-act="soon" data-what="filters" aria-label="Clear filters">' + ic('x', 15) + '</button></span>' +
      '<span class="dd-seg"><button type="button" class="dd-btn dd-btn-icon" data-act="soon" data-what="sorting" aria-label="Sort order">' + ic('sort', 15) + '</button><button type="button" class="dd-btn" data-act="soon" data-what="sorting">' + esc((REAL.lists[dt] && REAL.lists[dt].s) || 'Created On') + ' ' + ic('down', 14) + '</button></span></div>';
  };
  /* o: {dt, title, cols:[{f,label,align,ft}], rows:[{attrs, subj, cells:[html], when}], total, add, filters} */
  P.lvPage = function (o) {
    var cols = o.cols, subj = cols[0], rest = cols.slice(1);
    var colw = function (c) { return '<div class="dd-lv-col' + (isNum(c) ? ' is-num' : '') + '">'; };
    var head = '<div class="dd-lv-head"><div class="dd-lv-l"><div class="dd-lv-col dd-lv-subj"><input type="checkbox" class="dd-lv-cb" tabindex="-1" aria-label="Select all"/><span>' + esc(subj.label) + '</span></div>' +
      rest.map(function (c) { return colw(c) + '<span>' + esc(c.label) + '</span></div>'; }).join('') + '</div><div class="dd-lv-r"><span class="dd-tn">' + o.rows.length + ' of ' + (o.total != null ? o.total : o.rows.length) + '</span>' + ic('heart', 14) + '</div></div>';
    var body = o.rows.map(function (r) {
      return '<div class="dd-lv-row" ' + r.attrs + ' tabindex="0"><div class="dd-lv-l"><div class="dd-lv-col dd-lv-subj"><input type="checkbox" class="dd-lv-cb" tabindex="-1" aria-label="Select"/><b title="' + esc(r.subjText || '') + '">' + r.subj + '</b></div>' +
        r.cells.map(function (h, i) { return colw(rest[i]) + h + '</div>'; }).join('') + '</div>' +
        '<div class="dd-lv-r dd-lv-meta"><span>' + esc(r.when || '1 d') + '</span>' + ic('msg', 14) + '<span>0</span><span>·</span>' + ic('heart', 14) + '</div></div>';
    }).join('');
    var add = o.addHtml || '<button type="button" class="dd-btn dd-btn-dark" data-act="' + (o.newAct || 'new') + '" data-dt="' + esc(o.dt) + '" data-what="' + esc(o.dt) + '">' + ic('plus', 14) + ' Add ' + esc(o.dt) + '</button>';
    var acts = this.iconBtn('search', 'ab-open', 'Search') + '<button type="button" class="dd-btn" data-act="soon" data-what="other views">' + ic('listv', 15) + ' List View ' + ic('updown', 14) + '</button>' + this.iconBtn('refresh', 'refresh', 'Reload') + this.iconBtn('more', 'soon', 'Menu') + add;
    var pager = '<div class="dd-pager"><span class="dd-seg"><button type="button" class="dd-btn is-on">20</button><button type="button" class="dd-btn" data-act="soon" data-what="paging">100</button><button type="button" class="dd-btn" data-act="soon" data-what="paging">500</button><button type="button" class="dd-btn" data-act="soon" data-what="paging">2500</button></span></div>';
    var empty = '<div class="dd-empty">' + ic('file', 28) + '<p>No ' + esc(o.dt) + ' found</p></div>';
    var n = Math.max(rest.length, 1);
    return this.head('<h2>' + esc(o.title) + '</h2>', acts) +
      this.wrap(o.filters + (o.rows.length ? '<div class="dd-lv" style="--dd-lv-n:' + n + '">' + head + body + '</div>' + pager : empty), true);
  };

  /* value of one real list column for a sandbox document */
  P.lvDocValue = function (dt, d, c) {
    var S = this.S, def = DT[dt], k = c.f, A = S.abbr;
    var party = d.customer || d.supplier || d.party || '';
    switch (k) {
      case 'name': return esc(d.name);
      case 'status_field': return badge(this.status(dt, d) || 'Enabled');
      case 'title': return esc(def.title ? def.title(d) : d.name);
      case 'customer_name': return esc(d.customer_name || d.customer || '');
      case 'supplier_name': return esc(d.supplier_name || d.supplier || '');
      case 'company': return esc(S.company);
      case 'default_currency': case 'currency': return 'INR';
      case 'country': return 'India';
      case 'customer_type': case 'supplier_type': return 'Company';
      case 'territory': return 'India';
      case 'grand_total': return money(d.grand_total != null ? d.grand_total : d.rounded_total);
      case 'total_debit': return money(d.amount);
      case 'per_delivered': return (d.delivered ? 100 : 0) + '%';
      case 'per_billed': return (d.billed ? 100 : 0) + '%';
      case 'per_received': return (d.received ? 100 : 0) + '%';
      case 'per_returned': case 'per_transferred': return '0%';
      case 'is_fixed_asset': return d.is_stock_item ? 'Stock' : 'Service';
      case 'is_sales_item': return 'Sales &amp; Purchase';
      case 'paid_from': return esc(d.payment_type === 'Pay' ? 'HDFC Bank - ' + A : 'Debtors - ' + A);
      case 'paid_to': return esc(d.payment_type === 'Pay' ? 'Creditors - ' + A : 'HDFC Bank - ' + A);
      case 'naming_series': return esc(String(d.name).replace(/\d+$/, '').replace(/2026-$/, '.YYYY.-'));
      case 'purpose': return esc(d.purpose || d.stock_entry_type || '');
      case 'is_active': return check(d.docstatus === 1, c.label);
      case 'total_cost': return money(d.total_cost != null ? d.total_cost : d.raw_material_cost);
      case 'employee_name': return esc(d.employee_name || d.employee || '');
      case 'start_date': return fdate(d.start_date || d.posting_date || D.TODAY);
      case 'report_date': return fdate(d.report_date || D.TODAY);
      case 'reference_name': return esc(d.from || d.reference_name || '');
      case 'opening_date': return fdate(d.opening_date || D.TODAY);
      case 'percent_complete': return (d.status === 'Completed' ? 100 : d.percent_complete || 40) + '%';
      case 'priority': return esc(d.priority || 'Medium');
      case 'item_group': return esc(d.item_group || '');
      case 'stock_uom': return esc(d.stock_uom || 'Nos');
      case 'period_end_date': return d.closed ? fdate(d.period_end_date || D.TODAY) : '';
      case 'status': return esc(this.status(dt, d) || d.status || '');
    }
    var v = d[k];
    if (c.ft === 'Check') return check(!!v, c.label);
    if (v == null || v === '') return k === 'customer' || k === 'supplier' ? esc(party) : '';
    if (c.ft === 'Currency') return money(v);
    if (c.ft === 'Percent') return num(v).replace(/\.00$/, '') + '%';
    if (c.ft === 'Date' || c.ft === 'Datetime') return fdate(v);
    if (c.ft === 'Float' || c.ft === 'Int') return num(v).replace(/\.00$/, '');
    return esc(v);
  };
  function realCols(name) {
    var rl = REAL.lists[name];
    return rl ? rl.c.map(function (c) { return { f: c[0], label: c[1], align: c[2], ft: c[3] }; }) : null;
  }

  var baseList = P.vList;
  P.vList = function () {
    var dt = this.route.dt, cols = realCols(dt);
    if (dt === 'Account' || !cols) return baseList.call(this);
    var self = this, def = DT[dt], f = this.listFilter[dt] || {};
    var all = this.S.docs[dt].filter(function (d) { return !d.__new; }).slice().sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
    var rows = all.filter(function (d) {
      if (f.q && (d.name + ' ' + (def.title(d) || '')).toLowerCase().indexOf(f.q.toLowerCase()) < 0) return false;
      if (f.status && self.status(dt, d) !== f.status) return false;
      return true;
    }).map(function (d) {
      var s = self.lvDocValue(dt, d, cols[0]);
      return { attrs: 'data-act="open" data-dt="' + esc(dt) + '" data-name="' + esc(d.name) + '"', subj: s, subjText: d.name, when: d.seed ? '1 d' : 'now',
        cells: cols.slice(1).map(function (c) { return self.lvDocValue(dt, d, c); }) };
    });
    var addHtml = def.readonly ? '<button type="button" class="dd-btn dd-btn-dark" data-act="pos">' + ic('monitor', 14) + ' Open Point of Sale</button>' : null;
    return this.lvPage({ dt: dt, title: dt, cols: cols, rows: rows, total: all.length, addHtml: addHtml, filters: this.lvFilters(dt, REAL.lists[dt].f, f) });
  };

  /* read-only list pages: map the sandbox's sample rows onto the real columns */
  P.lvViewRows = function (name, vw, cols) {
    var self = this;
    if (!vw || vw.kind !== 'list') {
      return (SAMPLE[name] || []).map(function (r) { return cols.map(function (c, i) { return self.fill(r[i] == null ? '' : r[i]); }); });
    }
    var mine = vw.cols.map(function (c) { var p = c.split(':'); return { label: p[0], t: p[1] || '' }; });
    var syn = { 'default': 'is default', 'default letter head': 'is default', 'item to manufacture': 'item', 'role name': 'role profile', 'designation': 'designation', 'dimension name': 'label', 'email address': 'email id', 'year name': 'year name',
      'company account': 'account name', 'item to manufacture': 'item', 'swift number': 'swift number', 'evaluation period': 'period', 'provider name': 'social login provider',
      'quality inspection template name': 'template name', 'quality procedure': 'procedure', 'monitoring frequency': 'frequency', 'asset category name': 'asset category name',
      'service level name': 'service level', 'job worker name': 'supplier', 'current asset value': 'current value', 'new asset value': 'new value', 'rate': 'rate',
      'document type': 'reference doctype', 'doc event': 'doc event', 'default workstation': 'default workstation', 'workstation name': 'workstation name',
      'sales person name': 'sales person name', 'parent sales person': 'parent sales person', 'uom name': 'uom name', 'batch quantity': 'qty', 'item name': 'item' };
    return vw.rows.map(function (r) {
      var byLabel = {};
      mine.forEach(function (m, i) { byLabel[norm(m.label)] = { v: self.fill(r[i]), t: m.t }; });
      var first = self.fill(r[0]);
      return cols.map(function (c) {
        var key = norm(c.label), hit = byLabel[key] || byLabel[syn[key] || '#'];
        if (c.f === 'name') return (byLabel.id || {}).v || first;
        if (c.f === 'status_field') return (byLabel.status || {}).v || (byLabel.enabled ? (byLabel.enabled.v === '1' ? 'Enabled' : 'Disabled') : 'Enabled');
        if (hit) return hit.v;
        if (c.f === 'company') return self.S.company;
        if (c.ft === 'Link:Currency' || c.f === 'currency' || c.f === 'default_currency') return 'INR';
        if (c.f === 'country') return 'India';
        if (/Link:Company/.test(c.ft)) return self.S.company;
        if (c.ft === 'Check') return '0';
        if (/_name$/.test(c.f) || c.label === c.f) return first;
        return '';
      });
    });
  };
  P.lvView = function (name, vw) {
    var cols = realCols(name), self = this;
    var data = this.lvViewRows(name, vw, cols);
    var rows = data.map(function (r, ri) {
      var cells = cols.map(function (c, i) {
        var v = r[i];
        if (c.f === 'status_field') return badge(v);
        if (c.ft === 'Check') return check(v === '1' || v === 'Yes' || v === true, c.label);
        if (c.ft === 'Currency' && v && !/₹/.test(v)) return '₹ ' + esc(v);
        return esc(v);
      });
      var id = data[ri][cols.map(function (c) { return c.f; }).indexOf('name')] || r[0];
      return { attrs: 'data-act="vopen" data-dt="' + esc(name) + '" data-what="' + esc(name) + '"', subj: cells[0], subjText: id, when: ri % 2 ? '2 d' : '5 d', cells: cells.slice(1) };
    });
    return this.lvPage({ dt: name, title: name, cols: cols, rows: rows, newAct: 'vnew', filters: this.lvFilters(name, REAL.lists[name].f) });
  };

  /* ---------- settings pages: real tabs, sections and fields ---------- */
  P.singleReal = function (name, secs) {
    var self = this, tabs = [];
    secs.forEach(function (s) { if (tabs.indexOf(s[1]) < 0) tabs.push(s[1]); });
    var cur = (this._stab && this._stab[name]) || tabs[0];
    var shown = secs.filter(function (s) { return s[1] === cur; });
    function fld(f) {
      var label = f[0], ft = f[1], v = String(f[2] == null ? '' : f[2]).replace(/ARAIS/g, self.S.company);
      if (ft === 'Check') return '<div class="dd-fld dd-checkf"><label class="dd-check"><input type="checkbox" tabindex="-1" data-act="vsave" data-what="' + esc(name) + '"' + (v === '1' ? ' checked' : '') + '/> ' + esc(label) + '</label></div>';
      if (/Date/.test(ft) && /^\d{4}-\d\d-\d\d/.test(v)) v = fdate(v.slice(0, 10));
      return '<div class="dd-fld"><label>' + esc(label) + '</label><div class="dd-ro dd-vfield' + (/Text|Code/.test(ft) ? ' is-text' : '') + (ft === 'Select' ? ' is-select' : '') + '" data-act="vsave" data-what="' + esc(name) + '">' + esc(v) + (ft === 'Select' ? ic('updown', 13) : '') + '</div></div>';
    }
    var html = shown.map(function (s, i) {
      var colsH = [[]];
      s[2].forEach(function (f) { if (f[0] === '|') { colsH.push([]); return; } if (f[3] && !f[2]) return; colsH[colsH.length - 1].push(f); });
      colsH = colsH.filter(function (c) { return c.length; });
      if (!colsH.length) return '';
      return '<section class="dd-sec dd-ssec">' + (s[0] ? '<h4>' + esc(s[0]) + '</h4>' : '') + '<div class="dd-scols" style="--dd-sc:' + colsH.length + '">' +
        colsH.map(function (c) { return '<div class="dd-scol">' + c.map(fld).join('') + '</div>'; }).join('') + '</div></section>';
    }).join('');
    return this.head('<h2>' + esc(name) + '</h2>', '<button type="button" class="dd-btn dd-btn-dark" data-act="vsave" data-what="' + esc(name) + '">Save</button>') +
      (tabs.length > 1 || tabs[0] !== 'Details' ? '<nav class="dd-tabs">' + tabs.map(function (t) { return '<span class="' + (t === cur ? 'is-on' : '') + '" data-act="stab" data-tab="' + esc(t) + '" role="tab" tabindex="0">' + esc(t) + '</span>'; }).join('') + '</nav>' : '') +
      '<div class="dd-form">' + this.wrap(html) + '</div>';
  };

  /* ---------- query reports without a live model: real columns + filters, sample rows ---------- */
  var MONTHS = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
  P.sampleCell = function (label, i) {
    var l = label.toLowerCase(), A = this.S.abbr;
    var pick = function (arr) { return arr[i % arr.length]; };
    if (/posting date|date|due|from time|to time/.test(l)) return pick(['05-09-2026', '18-09-2026', '07-10-2026', '21-10-2026']);
    if (/^currency$/.test(l)) return 'INR';
    if (/company/.test(l)) return '{C}';
    if (/customer group/.test(l)) return 'Commercial';
    if (/supplier group/.test(l)) return 'Raw Material';
    if (/customer|party(?! type)/.test(l)) return pick(['{C1}', '{C2}', '{C3}', '{C4}']);
    if (/supplier|job worker/.test(l)) return pick(['{S1}', '{S2}', '{S3}']);
    if (/party type/.test(l)) return 'Customer';
    if (/item group/.test(l)) return pick(['Products', 'Raw Material']);
    if (/item name|^item$|item code|finished good|production item|^item to/.test(l)) return pick(['{FG1}', '{FG2}', '{RM1}', '{RM2}']);
    if (/warehouse/.test(l)) return pick(['Stores - {A}', 'Finished Goods - {A}', 'Work In Progress - {A}']);
    if (/cost center/.test(l)) return 'Main - ' + A;
    if (/^account|account$/.test(l)) return pick(['Sales - {A}', 'Debtors - {A}', 'HDFC Bank - {A}']);
    if (/voucher type|reference type/.test(l)) return pick(['Sales Invoice', 'Purchase Invoice', 'Journal Entry']);
    if (/invoice|voucher no|voucher|reference/.test(l)) return pick(['ACC-SINV-2026-00001', 'ACC-SINV-2026-00002', 'ACC-PINV-2026-00001']);
    if (/work order/.test(l)) return pick(['MFG-WO-2026-00001', 'MFG-WO-2026-00002']);
    if (/job card/.test(l)) return pick(['PO-JOB00001', 'PO-JOB00002']);
    if (/bom/.test(l)) return pick(['BOM-{FG1C}-001', 'BOM-{FG2C}-001']);
    if (/asset category/.test(l)) return pick(['Plant and Machinery', 'Computers', 'Furniture']);
    if (/^asset/.test(l)) return pick(['ACC-ASS-2026-00001', 'ACC-ASS-2026-00002', 'ACC-ASS-2026-00003']);
    if (/status/.test(l)) return pick(['Completed', 'In Process', 'Not Started']);
    if (/uom/.test(l)) return 'Nos';
    if (/section|^name$/.test(l)) return pick(['Cash Flow from Operations', 'Cash Flow from Investing', 'Cash Flow from Financing']);
    if (/%|percent|margin/.test(l)) return pick(['42.50', '38.10', '55.00']);
    if (/age|days/.test(l)) return pick(['12', '27', '45']);
    if (/qty|quantity|count|no\. of/.test(l)) return pick(['120.00', '45.00', '300.00', '80.00']);
    if (/amount|total|value|rate|debit|credit|balance|cost|revenue|profit|outstanding|invoiced|paid|price|budget|actual|variance|income|expense|inr|\d{4}/.test(l) || MONTHS.test(l)) return pick(['1,24,500.00', '86,240.00', '2,10,000.00', '58,900.00']);
    return '';
  };
  var NUMFT = /^(Currency|Float|Int|Percent)$/;
  P.realReport = function (name, rep, vw) {
    var self = this;
    var cols = rep.c.filter(function (c) { return c[0] && !/^(GL Entry|Account Name|Account Number)$/.test(c[0]); }).map(function (c) {
      var x = c[0].toLowerCase(); return { label: c[0], num: NUMFT.test(c[1]) || (!c[1] && (/amount|debit|credit|balance|qty|\(inr\)/.test(x) || MONTHS.test(x))) };
    });
    var mine = vw && vw.kind === 'report' ? vw.cols.map(function (c) { return norm(c.split(':')[0]); }) : null;
    var src = mine ? vw.rows : [0, 1, 2];
    var SYN = { 'item code': 'item', 'item': 'item code', 'date': 'posting date', 'posting date': 'date', 'voucher': 'voucher no', 'asset id': 'asset', 'qty to manufacture': 'qty' };
    function find(label) {
      var n = norm(label), k = mine.indexOf(n);
      if (k < 0 && SYN[n]) k = mine.indexOf(SYN[n]);
      if (k < 0 && MONTHS.test(n)) k = mine.indexOf(n.slice(0, 3));
      return k;
    }
    var rows = src.map(function (r, i) {
      var cells = cols.map(function (c) {
        if (mine) { var k = find(c.label); if (k >= 0) return self.fill(r[k]); }
        return null;
      });
      cols.forEach(function (c, ci) {
        if (cells[ci] != null) return;
        var base = c.label.replace(/ Name$/, ''), bi = cols.map(function (x) { return x.label; }).indexOf(base);
        if (base !== c.label && bi >= 0 && cells[bi] != null) { cells[ci] = cells[bi]; return; }
        cells[ci] = mine && MONTHS.test(c.label) ? '0.00' : self.fill(self.sampleCell(c.label, i));
      });
      return { cells: cells };
    });
    return this.qreport({ title: name, cols: cols, rows: rows });
  };
  /* filters as the real report shows them */
  P.realReportFilters = function (name) {
    var rep = REAL.reports[name], S = this.S;
    if (!rep) return null;
    return rep.f.map(function (f) {
      var v = String(f[2] || '').replace(/^ARAIS$/, S.company).replace(/^select$/, '');
      if (/^\d{4}-\d\d-\d\d$/.test(v)) v = fdate(v);
      if (f[1] === 'Check') return [f[0], v === '1', 'check'];
      return [f[0], v, f[1] === 'Select' || (f[1] === 'Link' && v) ? 'select' : ''];
    });
  };
  var baseQ = P.qreport;
  P.qreport = function (o) {
    var real = REAL.reports[o.title];
    if (real) {
      o = Object.assign({}, o, { filters: this.realReportFilters(o.title) });
      if (!real.chart) o.chart = null;
    }
    var html = baseQ.call(this, o);
    var frow = '<tr class="dd-qfrow"><td class="dd-qn"></td>' + o.cols.map(function () { return '<td><span></span></td>'; }).join('') + '</tr>';
    html = html.replace(/(<table class="dd-qtable"><tr>[\s\S]*?<\/tr>)/, '$1' + frow);
    var foot = '<div class="dd-qfoot"><span>For comparison, use &gt;5, &lt;10 or =324. For ranges, use 5:10 (for values between 5 &amp; 10).</span><span>Execution Time: 0.0' + (3 + (o.title.length % 6)) + ' sec</span></div>';
    return html.replace(/<\/table><\/div>/, '</table></div>' + foot);
  };

  /* ---------- route read-only pages through the real layouts ---------- */
  var baseView = P.vView;
  P.vView = function () {
    var name = this.route.name, vw = VIEWS()[name], live = this.liveReport && this.liveReport(name);
    if (live && this[live]) return this[live]();
    if (REAL.singles[name] && (!vw || vw.kind === 'single')) return this.singleReal(name, REAL.singles[name]);
    if (REAL.lists[name] && (!vw || vw.kind === 'list')) return this.lvView(name, vw);
    if (REAL.reports[name] && REAL.reports[name].c.length && !(this.liveReport && this.liveReport(name)) && (!vw || vw.kind === 'report')) return this.realReport(name, REAL.reports[name], vw);
    return baseView.call(this);
  };

  var baseClick = P.onClick;
  P.onClick = function (e) {
    var a = e.target.closest && e.target.closest('[data-act]');
    if (a && this.root.contains(a) && a.getAttribute('data-act') === 'stab') {
      e.preventDefault();
      var st = this._stab || (this._stab = {});
      st[this.route.name] = a.getAttribute('data-tab');
      return this.render();
    }
    return baseClick.call(this, e);
  };
})(window);
