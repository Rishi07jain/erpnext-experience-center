/* ERPNext interactive demo — ERPNext-style query reports, tree views, print view and email composer.
   Loaded after desk-engine.js; extends the Demo prototype. */
(function (global) {
  'use strict';
  var D = global.ERPData, Demo = global.ERPDemo, P = Demo.prototype, DT = D.DT, F = global.ERPFmt;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var inr = F.inr, num = F.num, fdate = F.fdate;
  function svg(p, n) { return '<svg class="dd-ic" width="' + (n || 14) + '" height="' + (n || 14) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var CARET_D = svg('<path d="m6 9 6 6 6-6"/>', 13), CARET_R = svg('<path d="m9 18 6-6-6-6"/>', 13);
  function money(v) { return v ? inr(v) : ''; }
  function drcr(v) { return '₹ ' + num(Math.abs(v || 0)) + ' ' + ((v || 0) >= 0 ? 'Dr' : 'Cr'); }

  /* ---------- account balances from the live ledger ---------- */
  P.ledger = function () {
    var S = this.S, A = S.abbr, bal = {}, byQ = {};
    function q(d) { var m = +((d || '').slice(5, 7)); return m >= 4 && m <= 6 ? 0 : m >= 7 && m <= 9 ? 1 : 2; }
    this.glRows().forEach(function (r) {
      var k = r.acc.replace(new RegExp(' - ' + A + '$'), '');
      bal[k] = (bal[k] || 0) + (r.dr || 0) - (r.cr || 0);
      var qq = byQ[k] || (byQ[k] = [0, 0, 0]); qq[q(r.date)] += (r.dr || 0) - (r.cr || 0);
    });
    return { bal: bal, byQ: byQ };
  };
  /* opening balances (1 Apr) and pre-October activity not in the sandbox ledger */
  var OPEN = { 'HDFC Bank': 1842300, 'Cash': 120000, 'Debtors': 210000, 'Creditors': -150000, 'Capital Stock': -5000000 };
  var PL_BASE = { Sales: [-3840000, -4125000, 0], 'Indirect Income': [-12000, -9500, 0], 'Cost of Goods Sold': [2000000, 2145000, null],
    Salary: [980000, 980000, 0], 'Rent Expense': [255000, 255000, 0], 'Electricity Expense': [110000, 118000, 0], 'Office Expenses': [22000, 19500, 0], Depreciation: [36000, 54000, 22000] };
  P.plData = function () {
    var L = this.ledger(), out = {};
    Object.keys(PL_BASE).forEach(function (k) {
      var b = PL_BASE[k], g = L.byQ[k] || [0, 0, 0];
      out[k] = [b[0] + g[0], b[1] + g[1], b[2] == null ? null : b[2] + g[2]];
    });
    out['Round Off'] = (L.byQ['Round Off'] || [0, 0, 0]).slice();
    var q3sales = -out.Sales[2];
    out['Cost of Goods Sold'][2] = Math.round(q3sales * 0.52);
    return out;
  };

  /* ---------- the query-report page ---------- */
  P.qreport = function (o) {
    var self = this;
    var filters = '<div class="dd-qfilters">' + (o.filters || []).map(function (f) {
      if (f[2] === 'check') return '<label class="dd-qf dd-qf-check"><input type="checkbox" tabindex="-1" data-act="soon" data-what="filters"' + (f[1] ? ' checked' : '') + '/> ' + esc(f[0]) + '</label>';
      return '<span class="dd-qf' + (f[1] ? '' : ' is-empty') + (f[2] === 'select' ? ' is-select' : '') + '" title="' + esc(f[0]) + '" data-act="soon" data-what="filters">' + esc(f[1] || f[0]) + (f[2] === 'select' ? svg('<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>', 12) : '') + '</span>';
    }).join('') + '</div>';
    var summary = o.summary ? '<div class="dd-qsum">' + o.summary.map(function (s) {
      if (typeof s === 'string') return '<span class="dd-qop">' + esc(s) + '</span>';
      return '<div class="dd-qsum-i"><span>' + esc(s[0]) + '</span><b class="dd-tn' + (s[2] ? ' is-' + s[2] : '') + '">' + esc(s[1]) + '</b></div>';
    }).join('') + '</div>' : '';
    var chart = '';
    if (o.chart) {
      var c = o.chart, all = [];
      c.series.forEach(function (s) { s.values.forEach(function (v) { all.push(Math.abs(v)); }); });
      var max = Math.max.apply(null, all.concat([1])) * 1.1;
      chart = '<div class="dd-qchart"><div class="dd-qlegend">' + c.series.map(function (s, i) { return '<span><i class="dd-qc' + i + '"></i>' + esc(s.name) + '</span>'; }).join('') + '</div><div class="dd-qbars">' +
        c.labels.map(function (lb, li) {
          return '<div class="dd-qgrp"><div class="dd-qcols">' + c.series.map(function (s, si) { var v = s.values[li]; return '<span class="dd-qbar dd-qc' + si + (v < 0 ? ' is-neg' : '') + '" style="height:' + Math.max(1.5, Math.abs(v) / max * 100).toFixed(1) + '%" title="' + esc(s.name + ': ' + inr(v)) + '"></span>'; }).join('') + '</div><span class="dd-qlab">' + esc(lb) + '</span></div>';
        }).join('') + '</div></div>';
    }
    var cols = o.cols;
    var head = '<tr><th class="dd-qn"></th>' + cols.map(function (cc) { return '<th' + (cc.num ? ' class="dd-r"' : '') + (cc.w ? ' style="min-width:' + cc.w + 'px"' : '') + '><span>' + esc(cc.label) + '</span></th>'; }).join('') + '</tr>';
    var idx = 0;
    var body = o.rows.map(function (r) {
      if (r.blank) return '<tr class="dd-qblank"><td class="dd-qn"></td>' + cols.map(function () { return '<td></td>'; }).join('') + '</tr>';
      idx++;
      var cells = r.cells.map(function (v, i) {
        var cc = cols[i], inner;
        if (v && typeof v === 'object' && v.link) inner = '<a href="#" data-act="open" data-dt="' + esc(v.dt) + '" data-name="' + esc(v.link) + '">' + esc(v.link) + '</a>';
        else inner = esc(v == null ? '' : v);
        if (i === 0 && r.indent != null) inner = '<span class="dd-qtree" style="padding-left:' + (r.indent * 18) + 'px">' + (r.group ? '<button type="button" class="dd-qcaret" data-act="qr-toggle" aria-label="Toggle">' + CARET_D + '</button>' : '<i class="dd-qleaf"></i>') + inner + '</span>';
        return '<td' + (cc.num ? ' class="dd-r dd-tn"' : '') + '>' + inner + '</td>';
      }).join('');
      return '<tr class="' + (r.bold ? 'is-bold' : '') + (r.total ? ' is-total' : '') + '" data-id="' + (r.id || '') + '" data-anc="' + (r.anc || '') + '"><td class="dd-qn dd-tn">' + idx + '</td>' + cells + '</tr>';
    }).join('');
    var acts = '<button type="button" class="dd-btn" data-act="soon" data-what="report actions">Actions ' + svg('<path d="m6 9 6 6 6-6"/>', 14) + '</button>' + this.iconBtn('refresh', 'refresh', 'Reload') + this.iconBtn('more', 'soon', 'Menu');
    return this.head('<h2>' + esc(o.title) + '</h2>', acts) +
      this.wrap(filters + summary + chart + '<div class="dd-tablewrap dd-qtablewrap"><table class="dd-qtable">' + head + body + '</table></div>' + (o.note ? '<p class="dd-qnote">' + esc(o.note) + '</p>' : ''), true);
  };
  P.qrToggle = function (btn) {
    var tr = btn.closest('tr'), id = tr.getAttribute('data-id'), tb = tr.closest('table');
    tr.classList.toggle('is-collapsed');
    btn.innerHTML = tr.classList.contains('is-collapsed') ? CARET_R : CARET_D;
    var closed = [].slice.call(tb.querySelectorAll('tr.is-collapsed')).map(function (x) { return x.getAttribute('data-id'); });
    tb.querySelectorAll('tr[data-anc]').forEach(function (r) {
      var anc = (r.getAttribute('data-anc') || '').split(' ').filter(Boolean);
      r.hidden = anc.some(function (a) { return closed.indexOf(a) >= 0; });
    });
    void id;
  };

  /* tree rows helper: nodes = [label, cells[], kids[]] */
  function treeRows(nodes, opt) {
    var rows = [], n = 0;
    (function walk(list, depth, anc) {
      list.forEach(function (nd) {
        var id = 'n' + (n++), kids = nd[2] || [];
        rows.push({ id: id, anc: anc.join(' '), indent: depth, group: kids.length > 0, bold: kids.length > 0 && depth < (opt && opt.boldDepth != null ? opt.boldDepth : 1), cells: [nd[0]].concat(nd[1] || []) });
        if (kids.length) walk(kids, depth + 1, anc.concat([id]));
      });
    })(nodes, 0, []);
    return rows;
  }

  /* ---------- financial statements ---------- */
  var QL = ['Apr–Jun 2026', 'Jul–Sep 2026', 'Oct–Dec 2026'];
  function sum3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  P.rptPL = function () {
    var S = this.S, A = S.abbr, d = this.plData();
    function inc(k) { return d[k].map(function (v) { return -v; }); }
    function exp(k) { return d[k]; }
    function cells(v) { return v.map(function (x) { return x ? num(x) : num(0); }).concat([num(v[0] + v[1] + v[2])]); }
    var sales = inc('Sales'), ii = inc('Indirect Income'), totI = sum3(sales, ii);
    var cogs = exp('Cost of Goods Sold'), ie = ['Salary', 'Rent Expense', 'Electricity Expense', 'Office Expenses', 'Depreciation', 'Round Off'].map(function (k) { return [k, exp(k)]; });
    var indirect = ie.reduce(function (a, x) { return sum3(a, x[1]); }, [0, 0, 0]), totE = sum3(cogs, indirect);
    var np = [totI[0] - totE[0], totI[1] - totE[1], totI[2] - totE[2]];
    var nodes = [
      ['Income', cells(totI), [['Direct Income', cells(sales), [['Sales - ' + A, cells(sales)]]], ['Indirect Income', cells(ii), [['Other Income - ' + A, cells(ii)]]]]]
    ];
    var rows = treeRows(nodes);
    rows.push({ bold: true, total: true, cells: ['Total Income (Credit)'].concat(cells(totI)) }, { blank: 1 });
    var nodes2 = [['Expenses', cells(totE), [['Direct Expenses', cells(cogs), [['Cost of Goods Sold - ' + A, cells(cogs)]]], ['Indirect Expenses', cells(indirect), ie.map(function (x) { return [x[0] + ' - ' + A, cells(x[1])]; })]]]];
    treeRows(nodes2).forEach(function (r) { r.id = r.id ? 'e' + r.id : r.id; r.anc = r.anc ? r.anc.split(' ').map(function (a) { return 'e' + a; }).join(' ') : ''; rows.push(r); });
    rows.push({ bold: true, total: true, cells: ['Total Expense (Debit)'].concat(cells(totE)) }, { blank: 1 }, { bold: true, total: true, cells: ['Profit for the year'].concat(cells(np)) });
    var T = function (v) { return v[0] + v[1] + v[2]; };
    return this.qreport({ title: 'Profit and Loss Statement',
      filters: [['Company', S.company, 'select'], ['Filter Based On', 'Fiscal Year', 'select'], ['Start Year', '2026-2027', 'select'], ['End Year', '2026-2027', 'select'], ['Periodicity', 'Quarterly', 'select'], ['Cost Center', ''], ['Project', ''], ['Accumulated Values', 0, 'check']],
      summary: [['Total Income', inr(T(totI)), 'green'], '−', ['Total Expense', inr(T(totE)), 'red'], '=', ['Net Profit', inr(T(np)), T(np) >= 0 ? 'green' : 'red']],
      chart: { labels: QL, series: [{ name: 'Income', values: totI }, { name: 'Expense', values: totE }, { name: 'Net Profit/Loss', values: np }] },
      cols: [{ label: 'Account', w: 280 }].concat(QL.map(function (l) { return { label: l, num: 1, w: 130 }; })).concat([{ label: 'Total', num: 1, w: 130 }]),
      rows: rows });
  };
  P.bsData = function () {
    var S = this.S, L = this.ledger().bal, pl = this.plData();
    function g(k) { return (OPEN[k] || 0) + (L[k] || 0); }
    var stock = this.stockRows().reduce(function (a, r) { return a + r.value; }, 0);
    var fa = {}; S.docs.Asset.filter(function (a) { return a.docstatus === 1; }).forEach(function (a) { fa[a.asset_category] = (fa[a.asset_category] || 0) + (+a.gross_purchase_amount || 0); });
    var taxIn = 0, taxOut = 0; Object.keys(L).forEach(function (k) { if (/^Input Tax/.test(k)) taxIn += L[k]; if (/^Output Tax/.test(k)) taxOut += L[k]; });
    var profit = 0; Object.keys(pl).forEach(function (k) { profit -= (pl[k][0] || 0) + (pl[k][1] || 0) + (pl[k][2] || 0); });
    return { bank: g('HDFC Bank'), cash: g('Cash'), debtors: g('Debtors'), stock: stock, taxIn: taxIn, fa: fa, accDep: -(36000 + 54000 + 22000),
      creditors: g('Creditors'), taxOut: taxOut, srbnb: g('Stock Received But Not Billed'), capital: g('Capital Stock'), profit: profit };
  };
  P.rptBS = function () {
    var S = this.S, A = S.abbr, b = this.bsData();
    function c(v) { return [num(v)]; }
    var faRows = Object.keys(b.fa).map(function (k) { return [k + ' - ' + A, c(b.fa[k])]; }).concat([['Accumulated Depreciation - ' + A, c(b.accDep)]]);
    var faT = Object.keys(b.fa).reduce(function (a, k) { return a + b.fa[k]; }, 0) + b.accDep;
    var ca = b.bank + b.cash + b.debtors + b.stock + b.taxIn, totA = ca + faT;
    var cl = -(b.creditors + b.taxOut + b.srbnb), eq = -b.capital;
    var retained = totA - cl - eq - b.profit;
    var nodes = [['Application of Funds (Assets)', c(totA), [
      ['Current Assets', c(ca), [['Accounts Receivable', c(b.debtors), [['Debtors - ' + A, c(b.debtors)]]], ['Bank Accounts', c(b.bank), [['HDFC Bank - ' + A, c(b.bank)]]], ['Cash In Hand', c(b.cash), [['Cash - ' + A, c(b.cash)]]], ['Stock Assets', c(b.stock), [['Stock In Hand - ' + A, c(b.stock)]]], ['Tax Assets', c(b.taxIn), [['Input Tax - ' + A, c(b.taxIn)]]]]],
      ['Fixed Assets', c(faT), faRows]]]];
    var rows = treeRows(nodes);
    rows.push({ bold: true, total: true, cells: ['Total Asset (Debit)', num(totA)] }, { blank: 1 });
    var n2 = [['Source of Funds (Liabilities)', c(cl), [['Current Liabilities', c(cl), [['Accounts Payable', c(-b.creditors), [['Creditors - ' + A, c(-b.creditors)]]], ['Duties and Taxes', c(-b.taxOut), [['Output Tax - ' + A, c(-b.taxOut)]]], ['Stock Liabilities', c(-b.srbnb), [['Stock Received But Not Billed - ' + A, c(-b.srbnb)]]]]]]]];
    treeRows(n2).forEach(function (r) { r.id = 'l' + r.id; r.anc = r.anc ? r.anc.split(' ').map(function (a) { return 'l' + a; }).join(' ') : ''; rows.push(r); });
    rows.push({ bold: true, total: true, cells: ['Total Liability (Credit)', num(cl)] }, { blank: 1 });
    var n3 = [['Equity', c(eq + retained), [['Capital Stock - ' + A, c(eq)], ['Retained Earnings - ' + A, c(retained)]]]];
    treeRows(n3).forEach(function (r) { r.id = 'q' + r.id; r.anc = r.anc ? r.anc.split(' ').map(function (a) { return 'q' + a; }).join(' ') : ''; rows.push(r); });
    rows.push({ bold: true, total: true, cells: ['Total Equity (Credit)', num(eq + retained)] }, { blank: 1 },
      { bold: true, cells: ['Provisional Profit / Loss (Credit)', num(b.profit)] }, { bold: true, total: true, cells: ['Total (Credit)', num(cl + eq + retained + b.profit)] });
    return this.qreport({ title: 'Balance Sheet',
      filters: [['Company', S.company, 'select'], ['Filter Based On', 'Fiscal Year', 'select'], ['Start Year', '2026-2027', 'select'], ['End Year', '2026-2027', 'select'], ['Periodicity', 'Yearly', 'select'], ['Cost Center', ''], ['Accumulated Values', 1, 'check']],
      summary: [['Total Asset', inr(totA)], '−', ['Total Liability', inr(cl)], '−', ['Total Equity', inr(eq + retained)], '=', ['Provisional Profit / Loss (Credit)', inr(b.profit), b.profit >= 0 ? 'green' : 'red']],
      chart: { labels: ['2026-2027'], series: [{ name: 'Assets', values: [totA] }, { name: 'Liabilities', values: [cl] }, { name: 'Equity', values: [eq + retained] }] },
      cols: [{ label: 'Account', w: 320 }, { label: '2026-2027', num: 1, w: 160 }], rows: rows });
  };
  P.rptTB = function () {
    var S = this.S, A = S.abbr, L = this.ledger(), gl = this.glRows();
    var turn = {}; gl.forEach(function (r) { var k = r.acc.replace(new RegExp(' - ' + A + '$'), ''); var t = turn[k] || (turn[k] = [0, 0]); t[0] += r.dr || 0; t[1] += r.cr || 0; });
    function row(k) { var o = OPEN[k] || 0, t = turn[k] || [0, 0], cl = o + t[0] - t[1]; return [o > 0 ? num(o) : '', o < 0 ? num(-o) : '', num(t[0]), num(t[1]), cl > 0 ? num(cl) : '', cl < 0 ? num(-cl) : '', o, t, cl]; }
    var groups = [['Application of Funds (Assets)', ['HDFC Bank', 'Cash', 'Debtors'].concat(Object.keys(turn).filter(function (k) { return /^Input Tax/.test(k); }))],
      ['Source of Funds (Liabilities)', ['Creditors', 'Stock Received But Not Billed'].concat(Object.keys(turn).filter(function (k) { return /^Output Tax/.test(k); }))],
      ['Equity', ['Capital Stock']], ['Income', ['Sales']], ['Expenses', ['Salary', 'Rent Expense', 'Electricity Expense', 'Office Expenses', 'Round Off']]];
    var rows = [], tot = [0, 0, 0, 0, 0, 0], gi = 0;
    groups.forEach(function (g) {
      var id = 'g' + (gi++), leaves = g[1].filter(function (k, i, a) { return a.indexOf(k) === i; }).map(function (k) { return [k, row(k)]; });
      var s = [0, 0, 0, 0, 0, 0];
      leaves.forEach(function (x) { var r = x[1]; s[0] += Math.max(r[6], 0); s[1] += Math.max(-r[6], 0); s[2] += r[7][0]; s[3] += r[7][1]; s[4] += Math.max(r[8], 0); s[5] += Math.max(-r[8], 0); });
      for (var i = 0; i < 6; i++) tot[i] += s[i];
      rows.push({ id: id, anc: '', indent: 0, group: true, bold: true, cells: [g[0]].concat(s.map(function (v) { return v ? num(v) : ''; })) });
      leaves.forEach(function (x) { rows.push({ anc: id, indent: 1, cells: [x[0] + ' - ' + A].concat(x[1].slice(0, 6)) }); });
    });
    rows.push({ bold: true, total: true, cells: ['Total'].concat(tot.map(num)) });
    return this.qreport({ title: 'Trial Balance',
      filters: [['Company', S.company, 'select'], ['Fiscal Year', '2026-2027', 'select'], ['From Date', '01-04-2026'], ['To Date', '31-03-2027'], ['Cost Center', ''], ['Show zero values', 0, 'check'], ['Show Unclosed FY P&L Balances', 0, 'check']],
      cols: [{ label: 'Account', w: 280 }, { label: 'Opening (Dr)', num: 1 }, { label: 'Opening (Cr)', num: 1 }, { label: 'Debit', num: 1 }, { label: 'Credit', num: 1 }, { label: 'Closing (Dr)', num: 1 }, { label: 'Closing (Cr)', num: 1 }], rows: rows });
  };
  function ageCells(days, amt) { return [days <= 30 ? num(amt) : num(0), days > 30 && days <= 60 ? num(amt) : num(0), days > 60 && days <= 90 ? num(amt) : num(0), days > 90 ? num(amt) : num(0)]; }
  P.rptAR = function (payable) {
    var S = this.S, A = S.abbr, dt = payable ? 'Purchase Invoice' : 'Sales Invoice', paidBy = {};
    S.docs['Payment Entry'].forEach(function (p) { if (p.docstatus === 1 && p.from && p.from.dt === dt) paidBy[p.from.name] = (paidBy[p.from.name] || 0) + (+p.paid_amount || 0); });
    var tot = [0, 0, 0, 0, 0, 0, 0];
    var rows = S.docs[dt].filter(function (d) { return d.docstatus === 1 && !d.paid; }).map(function (d) {
      var paid = paidBy[d.name] || 0, out = d.rounded_total - paid, age = Math.max(0, Math.round((new Date(D.TODAY) - new Date(d.posting_date)) / 864e5));
      var ag = ageCells(age, out);
      tot[0] += d.rounded_total; tot[1] += paid; tot[2] += out; [0, 1, 2, 3].forEach(function (i) { tot[3 + i] += age <= 30 ? (i === 0 ? out : 0) : age <= 60 ? (i === 1 ? out : 0) : age <= 90 ? (i === 2 ? out : 0) : (i === 3 ? out : 0); });
      return { cells: [fdate(d.posting_date), payable ? d.supplier : d.customer, (payable ? 'Creditors - ' : 'Debtors - ') + A, dt, { link: d.name, dt: dt }, fdate(d.due_date), num(d.rounded_total), num(paid), num(out), String(age)].concat(ag) };
    });
    rows.push({ bold: true, total: true, cells: ['', 'Total', '', '', '', '', num(tot[0]), num(tot[1]), num(tot[2]), '', num(tot[3]), num(tot[4]), num(tot[5]), num(tot[6])] });
    return this.qreport({ title: payable ? 'Accounts Payable' : 'Accounts Receivable',
      filters: [['Company', S.company, 'select'], ['Posting Date', fdate(D.TODAY)], ['Ageing Based On', 'Due Date', 'select'], ['Ageing Range', '30, 60, 90, 120'], [payable ? 'Supplier' : 'Customer', ''], [payable ? 'Supplier Group' : 'Customer Group', ''], ['Group By ' + (payable ? 'Supplier' : 'Customer'), 0, 'check']],
      cols: [{ label: 'Posting Date' }, { label: payable ? 'Supplier' : 'Customer', w: 170 }, { label: payable ? 'Payable Account' : 'Receivable Account' }, { label: 'Voucher Type' }, { label: 'Voucher No', w: 150 }, { label: 'Due Date' }, { label: 'Invoiced Amount', num: 1 }, { label: 'Paid Amount', num: 1 }, { label: 'Outstanding Amount', num: 1 }, { label: 'Age (Days)', num: 1 }, { label: '0-30', num: 1 }, { label: '31-60', num: 1 }, { label: '61-90', num: 1 }, { label: '91-Above', num: 1 }],
      rows: rows });
  };
  P.rptGL = function () {
    var S = this.S, A = S.abbr, bal = 0, dr = 0, cr = 0, g = this.glRows();
    var byV = {}; g.forEach(function (r) { (byV[r.vn] || (byV[r.vn] = [])).push(r.acc); });
    var E = ['', '', '', '', '', '', '', '', '', '', ''];
    var rows = [{ bold: true, cells: ['', "'Opening'", num(0), num(0), num(0)].concat(E) }];
    g.forEach(function (r) {
      dr += r.dr || 0; cr += r.cr || 0; bal += (r.dr || 0) - (r.cr || 0);
      var against = (byV[r.vn] || []).filter(function (a) { return a !== r.acc; }).filter(function (a, i, x) { return x.indexOf(a) === i; }).join(', ');
      var pl = /Sales|Cost of Goods|Expense|Salary|Rent|Electricity|Depreciation|Income/.test(r.acc);
      rows.push({ cells: [fdate(r.date), r.acc, num(r.dr || 0), num(r.cr || 0), num(bal), r.vt, r.vt, { link: r.vn, dt: r.vt }, against.length > 40 ? against.slice(0, 38) + '…' : against, r.party ? (/Purchase|Pay/.test(r.vt) && /Creditors/.test(r.acc) ? 'Supplier' : 'Customer') : '', r.party || '', '', pl ? 'Main - ' + A : '', '', '', ''] });
    });
    rows.push({ bold: true, total: true, cells: ['', "'Total'", num(dr), num(cr), num(dr - cr)].concat(E) }, { bold: true, total: true, cells: ['', "'Closing (Opening + Total)'", num(dr), num(cr), num(dr - cr)].concat(E) });
    return this.qreport({ title: 'General Ledger',
      filters: [['Company', S.company, 'select'], ['From Date', '01-10-2026'], ['To Date', fdate(D.TODAY)], ['Account', ''], ['Voucher No', ''], ['Party Type', ''], ['Party', ''], ['Group by', 'Group by Voucher (Consolidated)', 'select']],
      cols: [{ label: 'Posting Date' }, { label: 'Account', w: 200 }, { label: 'Debit (INR)', num: 1 }, { label: 'Credit (INR)', num: 1 }, { label: 'Balance (INR)', num: 1 }, { label: 'Voucher Type' }, { label: 'Voucher Subtype' }, { label: 'Voucher No', w: 160 }, { label: 'Against Account', w: 200 }, { label: 'Party Type' }, { label: 'Party', w: 160 }, { label: 'Project' }, { label: 'Cost Center' }, { label: 'Against Voucher Type' }, { label: 'Against Voucher' }, { label: 'Supplier Invoice No' }],
      rows: rows });
  };
  P.rptStockBalance = function () {
    var S = this.S, A = S.abbr, tv = 0;
    var rows = this.stockRows().map(function (r) {
      var it = D.itemDoc(S, r.code) || {}, wh = it.item_group === 'Products' ? 'Finished Goods - ' + A : 'Stores - ' + A;
      tv += r.value;
      return { cells: [r.code, r.name, it.item_group || '', wh, r.uom, num(r.bal), num(r.value), num(0), num(0), num(r.inq), num(r.val), num(r.outq), num(r.outq * r.rate), num(r.rate)] };
    });
    rows.push({ bold: true, total: true, cells: ['Total', '', '', '', '', '', num(tv), '', '', '', '', '', '', ''] });
    return this.qreport({ title: 'Stock Balance',
      filters: [['Company', S.company, 'select'], ['From Date', '01-04-2026'], ['To Date', fdate(D.TODAY)], ['Item Group', ''], ['Item', ''], ['Warehouse', ''], ['Warehouse Type', ''], ['Include UOM', '']],
      cols: [{ label: 'Item', w: 150 }, { label: 'Item Name', w: 170 }, { label: 'Item Group' }, { label: 'Warehouse', w: 160 }, { label: 'Stock UOM' }, { label: 'Balance Qty', num: 1 }, { label: 'Balance Value', num: 1 }, { label: 'Opening Qty', num: 1 }, { label: 'Opening Value', num: 1 }, { label: 'In Qty', num: 1 }, { label: 'In Value', num: 1 }, { label: 'Out Qty', num: 1 }, { label: 'Out Value', num: 1 }, { label: 'Valuation Rate', num: 1 }],
      rows: rows });
  };
  P.rptProjectSummary = function () {
    var S = this.S;
    var rows = S.docs.Project.filter(function (p) { return !p.__new; }).map(function (p) {
      var tasks = S.docs.Task.filter(function (t) { return t.project === p.name && !t.__new; }), done = tasks.filter(function (t) { return t.status === 'Completed'; }).length;
      var overdue = tasks.filter(function (t) { return t.status !== 'Completed' && t.exp_end_date < D.TODAY; }).length;
      return { cells: [{ link: p.name, dt: 'Project' }, p.project_name, p.status, String(tasks.length), String(done), String(overdue), (tasks.length ? Math.round(done / tasks.length * 100) : 0) + '%'] };
    });
    return this.qreport({ title: 'Project Summary', filters: [['Company', S.company, 'select'], ['Status', '', 'select'], ['Is Active', '', 'select']],
      cols: [{ label: 'Project', w: 120 }, { label: 'Project Name', w: 220 }, { label: 'Status' }, { label: 'Total Tasks', num: 1 }, { label: 'Tasks Completed', num: 1 }, { label: 'Tasks Overdue', num: 1 }, { label: '% Completed', num: 1 }], rows: rows });
  };
  var LIVE = { 'General Ledger': 'rptGL', 'Accounts Receivable': 'rptAR', 'Stock Balance': 'rptStockBalance', 'Project Summary': 'rptProjectSummary',
    'Profit and Loss Statement': 'rptPL', 'Balance Sheet': 'rptBS', 'Trial Balance': 'rptTB', 'Accounts Payable': 'rptAP' };
  P.rptAP = function () { return this.rptAR(true); };
  P.vReport = function () { var fn = LIVE[this.route.report]; return this[fn] ? this[fn]() : this.qreport({ title: this.route.report, cols: [{ label: 'Nothing to show' }], rows: [] }); };
  P.liveReport = function (name) { return LIVE[name]; };

  /* static view reports rendered as ERPNext query reports */
  P.viewReport = function (name, vw) {
    var self = this;
    var cols = vw.cols.map(function (c) { var p = c.split(':'); return { label: p[0], num: p[1] === 'r' }; });
    var rows = vw.rows.map(function (r) { return { cells: r.map(function (v) { return self.fill(v); }) }; });
    var f = (vw.o && vw.o.filters) || [['Company', this.S.company, 'select'], ['From Date', '01-04-2026'], ['To Date', fdate(D.TODAY)]];
    return this.qreport({ title: name, filters: f, cols: cols, rows: rows });
  };

  /* ---------- tree views (Chart of Accounts, groups, warehouses...) ---------- */
  P.coaNodes = function () {
    var S = this.S, A = S.abbr, L = this.ledger().bal, b = this.bsData(), pl = this.plData();
    function v(k) { return (OPEN[k] || 0) + (L[k] || 0); }
    function plv(k) { return pl[k] ? (pl[k][0] || 0) + (pl[k][1] || 0) + (pl[k][2] || 0) : 0; }
    var taxIn = [], taxOut = [];
    Object.keys(L).forEach(function (k) { if (/^Input Tax/.test(k)) taxIn.push([k, L[k]]); if (/^Output Tax/.test(k)) taxOut.push([k, L[k]]); });
    function leaf(n, val) { return { label: n + ' - ' + A, val: val }; }
    function grp(n, kids) { return { label: n, kids: kids, val: kids.reduce(function (a, k) { return a + (k.val || 0); }, 0) }; }
    var fa = Object.keys(b.fa).map(function (k) { return leaf(k, b.fa[k]); }).concat([leaf('Accumulated Depreciation', b.accDep)]);
    return [grp(S.company, [
      grp('Application of Funds (Assets)', [grp('Current Assets', [grp('Accounts Receivable', [leaf('Debtors', v('Debtors'))]), grp('Bank Accounts', [leaf('HDFC Bank', v('HDFC Bank'))]), grp('Cash In Hand', [leaf('Cash', v('Cash'))]), grp('Stock Assets', [leaf('Stock In Hand', b.stock)]), grp('Tax Assets', taxIn.length ? taxIn.map(function (t) { return leaf(t[0], t[1]); }) : [leaf('Input Tax CGST', 0)])]), grp('Fixed Assets', fa)]),
      grp('Source of Funds (Liabilities)', [grp('Current Liabilities', [grp('Accounts Payable', [leaf('Creditors', v('Creditors'))]), grp('Duties and Taxes', taxOut.length ? taxOut.map(function (t) { return leaf(t[0], t[1]); }) : [leaf('Output Tax CGST', 0)]), grp('Stock Liabilities', [leaf('Stock Received But Not Billed', v('Stock Received But Not Billed'))])])]),
      grp('Equity', [leaf('Capital Stock', v('Capital Stock'))]),
      grp('Income', [grp('Direct Income', [leaf('Sales', plv('Sales'))]), grp('Indirect Income', [leaf('Other Income', plv('Indirect Income'))])]),
      grp('Expenses', [grp('Direct Expenses', [leaf('Cost of Goods Sold', plv('Cost of Goods Sold'))]), grp('Indirect Expenses', ['Salary', 'Rent Expense', 'Electricity Expense', 'Office Expenses', 'Depreciation', 'Round Off'].map(function (k) { return leaf(k, plv(k)); }))])
    ])];
  };
  P.treeOpen = function (key, id, depth) { var o = this._treeOpen || (this._treeOpen = {}), k = key + ':' + id; return o[k] != null ? o[k] : depth < 1; };
  P.vTree = function (o) {
    var self = this, key = o.key, n = 0;
    function render(nodes, depth) {
      return nodes.map(function (nd) {
        var id = 't' + (n++), kids = nd.kids || [], open = kids.length && self.treeOpen(key, id, depth);
        var row = '<div class="dd-tree-i' + (kids.length ? ' is-group' : '') + '" style="--d:' + depth + '">' +
          (kids.length ? '<button type="button" class="dd-tree-t" data-act="tree-toggle" data-key="' + esc(key) + '" data-id="' + id + '" data-open="' + (open ? 1 : 0) + '" aria-label="Toggle">' + (open ? CARET_D : CARET_R) + '</button>' : '<span class="dd-tree-t"></span>') +
          '<a href="#" class="dd-tree-l" ' + (kids.length ? 'data-act="tree-toggle" data-key="' + esc(key) + '" data-id="' + id + '" data-open="' + (open ? 1 : 0) + '"' : 'data-act="vopen" data-dt="' + esc(o.dt) + '"') + '>' + esc(nd.label) + '</a>' +
          (o.balances && nd.val != null ? '<span class="dd-tree-v dd-tn">' + drcr(nd.val) + '</span>' : '') + '</div>';
        return row + (open ? '<div class="dd-tree-kids">' + render(kids, depth + 1) + '</div>' : (kids.length ? (n += countAll(kids), '') : ''));
      }).join('');
    }
    function countAll(list) { return list.reduce(function (a, k) { return a + 1 + countAll(k.kids || []); }, 0); }
    var acts = '<button type="button" class="dd-btn" data-act="soon" data-what="other views">' + svg('<path d="M21 12h-8"/><path d="M21 6H8"/><path d="M21 18h-8"/><path d="M3 6v4c0 1.1.9 2 2 2h3"/><path d="M3 10v6c0 1.1.9 2 2 2h3"/>', 15) + ' Tree View ' + svg('<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>', 14) + '</button>' +
      '<button type="button" class="dd-btn" data-act="soon" data-what="other views">View ' + svg('<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>', 14) + '</button>' + this.iconBtn('refresh', 'refresh', 'Reload') + this.iconBtn('more', 'soon', 'Menu') +
      '<button type="button" class="dd-btn dd-btn-dark" data-act="vnew" data-what="' + esc(o.dt) + '">' + svg('<path d="M5 12h14"/><path d="M12 5v14"/>', 14) + ' Add ' + esc(o.dt) + '</button>';
    var filters = '<div class="dd-filters dd-treefilters"><input class="dd-ctl" type="text" placeholder="ID" aria-label="Filter by ID" style="width:240px"/>' +
      (o.company ? '<span class="dd-ctl dd-fake is-select">' + esc(this.S.company) + svg('<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>', 12) + '</span>' : '') +
      '<label class="dd-check dd-tree-all"><input type="checkbox" tabindex="-1" data-act="soon" data-what="filters"/> Show all (including disabled)</label><span class="dd-lf-sp"></span><button type="button" class="dd-btn" data-act="soon" data-what="Expand/Collapse">Expand/Collapse ' + svg('<path d="m6 9 6 6 6-6"/>', 14) + '</button></div>';
    return this.head('<h2>' + esc(o.title) + '</h2>', acts) + this.wrap('<div class="dd-treepage">' + filters + '<div class="dd-tree">' + render(o.nodes, 0) + '</div></div>', true);
  };

  /* ---------- print view ---------- */
  function words(n) { return F.words ? F.words(n) : ''; }
  function qr(seed) {
    var h = 0, s = String(seed), cells = '';
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    for (var y = 0; y < 21; y++) for (var x = 0; x < 21; x++) {
      var finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      var on = finder ? ((x % 6 === 0 || y % 6 === 0 || (x > 13 && (x - 14) % 6 === 0) || (y > 13 && (y - 14) % 6 === 0)) || ((x % 7 >= 2 && x % 7 <= 4) && (y % 7 >= 2 && y % 7 <= 4))) : ((h = (h * 1103515245 + 12345) >>> 0) & 64) > 0;
      if (finder) { var fx = x > 13 ? x - 14 : x, fy = y > 13 ? y - 14 : y; on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4); }
      if (on) cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
    return '<svg viewBox="-1 -1 23 23" width="92" height="92" aria-label="e-invoice QR code"><rect x="-1" y="-1" width="23" height="23" fill="#fff"/><g fill="#111">' + cells + '</g></svg>';
  }
  /* A4 print, laid out as a GST tax invoice (Rule 46): supplier and recipient GSTIN, state codes,
     place of supply, bill-to and ship-to, HSN-wise tax, reverse charge, IRN and signature */
  var STCODE = { Maharashtra: '27', Gujarat: '24', 'Tamil Nadu': '33', Karnataka: '29', Telangana: '36', Delhi: '07' };
  var CAPITAL = { Maharashtra: 'Mumbai', Gujarat: 'Surat', 'Tamil Nadu': 'Chennai', Karnataka: 'Bengaluru', Telangana: 'Hyderabad', Delhi: 'New Delhi' };
  var PIN = { Maharashtra: '400', Gujarat: '395', 'Tamil Nadu': '600', Karnataka: '560', Telangana: '500', Delhi: '110' };
  function hsh(s) { var h = 7; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function addr(name, city, state, ship) {
    var h = hsh(name + (ship ? 'ship' : '')), c = city || CAPITAL[state] || 'Mumbai';
    var st = ship ? ['Godown ' + (h % 9 + 1) + ', Logistics Park Road', 'Warehouse ' + (h % 6 + 1) + ', Transport Nagar', 'Unit ' + (h % 12 + 1) + ', Ring Road Industrial Area'][h % 3]
      : [(h % 80 + 2) + ', ' + ['Gandhi Road', 'Station Road', 'MG Road', 'Market Yard'][h % 4], 'Office ' + (h % 40 + 101) + ', ' + ['Trade Centre', 'Business Park', 'Commerce House'][h % 3]][h % 2];
    return [st, c + ', ' + (state || '') + ' ' + (PIN[state] || '400') + String(h % 100).padStart(3, '0').slice(-3)];
  }
  P.vPrint = function () {
    var r = this.route, d = r.doc, dt = r.dt, S = this.S, A = S.abbr;
    var party = d.customer || d.supplier || '';
    var pc = S.docs.Customer.concat(S.docs.Supplier).filter(function (x) { return x.name === party; })[0] || {};
    var isInv = dt === 'Sales Invoice', title = isInv ? 'TAX INVOICE' : dt === 'Quotation' ? 'QUOTATION' : dt.toUpperCase();
    var pstate = pc.state || S.state, inter = pstate !== S.state;
    var code = STCODE[S.state] || '27', pcode = STCODE[pstate] || code;
    var cgstin = code + 'AAECD4417M1Z2';
    var lines = (d.items || []).filter(function (x) { return x.item_code; });
    var hsn = {}, order = [];
    var rows = lines.map(function (x, i) {
      var it = D.itemDoc(S, x.item_code) || {}, rt = +it.gst_rate || 18, h = it.gst_hsn_code || '—';
      if (!hsn[h]) { hsn[h] = { rate: rt, base: 0 }; order.push(h); }
      hsn[h].base += +x.amount || 0;
      return '<tr><td>' + (i + 1) + '</td><td><b>' + esc(it.item_name || x.item_code) + '</b><small>' + esc(x.item_code) + '</small></td><td>' + esc(h) + '</td><td class="r">' + num(x.qty) + '</td><td>' + esc(it.stock_uom || 'Nos') + '</td><td class="r">' + num(x.rate) + '</td><td class="r">' + num(x.amount) + '</td><td class="r">' + rt + '%</td></tr>';
    }).join('');
    var tHead = inter ? '<th class="r">IGST Rate</th><th class="r">IGST Amount</th>' : '<th class="r">CGST Rate</th><th class="r">CGST Amount</th><th class="r">SGST Rate</th><th class="r">SGST Amount</th>';
    var sumTax = 0, sumBase = 0;
    var hrows = order.map(function (h) {
      var o = hsn[h], t = Math.round(o.base * o.rate) / 100, half = Math.round(o.base * o.rate / 2) / 100;
      sumBase += o.base; sumTax += inter ? t : half * 2;
      return '<tr><td>' + esc(h) + '</td><td class="r">' + num(o.base) + '</td>' + (inter ? '<td class="r">' + o.rate + '%</td><td class="r">' + num(t) + '</td>' : '<td class="r">' + (o.rate / 2) + '%</td><td class="r">' + num(half) + '</td><td class="r">' + (o.rate / 2) + '%</td><td class="r">' + num(half) + '</td>') + '<td class="r">' + num(inter ? t : half * 2) + '</td></tr>';
    }).join('');
    var hsnTable = order.length ? '<table class="ps-hsn"><thead><tr><th>HSN/SAC</th><th class="r">Taxable Value</th>' + tHead + '<th class="r">Total Tax</th></tr></thead><tbody>' + hrows +
      '<tr class="t"><td>Total</td><td class="r">' + num(sumBase) + '</td>' + (inter ? '<td></td><td class="r">' + num(sumTax) + '</td>' : '<td></td><td class="r">' + num(sumTax / 2) + '</td><td></td><td class="r">' + num(sumTax / 2) + '</td>') + '<td class="r">' + num(sumTax) + '</td></tr></tbody></table>' : '';
    var taxRows = (d.taxes || []).map(function (t) { return '<tr><td>' + esc(t.head.replace(/^(Output|Input) Tax /, '')) + '</td><td class="r">' + num(t.amount) + '</td></tr>'; }).join('');
    var round = Math.round(((d.rounded_total || 0) - (d.grand_total || 0)) * 100) / 100;
    var bill = addr(party, pc.city, pstate), ship = addr(party, pc.city, pstate, true), own = addr(S.company, CAPITAL[S.state], S.state);
    function partyBox(label, a) {
      return '<div class="ps-pbox"><span class="ps-lbl">' + label + '</span><b>' + esc(party) + '</b><p>' + esc(a[0]) + '</p><p>' + esc(a[1]) + '</p>' +
        '<p>GSTIN: <b class="ps-g">' + esc(pc.gstin || 'Unregistered') + '</b></p><p>State: ' + esc(pstate) + ' · Code ' + pcode + '</p></div>';
    }
    var mark = '<span class="ps-logo" aria-hidden="true">' + esc(A.slice(0, 2)) + '</span>';
    var sheet = '<article class="dd-sheet ps-a4" aria-label="Print preview, A4">' +
      '<header class="ps-lh">' + mark + '<div class="ps-co"><b>' + esc(S.company) + '</b><span>' + esc(own[0]) + ', ' + esc(own[1]) + '</span><span>GSTIN: <b class="ps-g">' + cgstin + '</b> · PAN: AAECD4417M · State: ' + esc(S.state) + ' (' + code + ')</span><span>accounts@' + esc(A.toLowerCase()) + '.in · +91 22 4093 1188</span></div>' +
      '<div class="ps-title">' + title + (isInv ? '<small>Original for Recipient</small>' : '') + '</div></header>' +
      '<section class="ps-meta"><div><span>' + (isInv ? 'Invoice No.' : dt + ' No.') + '</span><b>' + esc(d.name) + '</b></div><div><span>' + (isInv ? 'Invoice Date' : 'Date') + '</span><b>' + fdate(d.posting_date || d.transaction_date) + '</b></div><div><span>' + (isInv ? 'Due Date' : 'Valid Till') + '</span><b>' + fdate(d.due_date || d.valid_till) + '</b></div>' +
      '<div><span>Place of Supply</span><b>' + esc(pstate) + ' (' + pcode + ')</b></div>' + (isInv ? '<div><span>Reverse Charge</span><b>No</b></div>' : '') + '</section>' +
      '<section class="ps-party">' + partyBox('Bill To', bill) + partyBox('Ship To', ship) +
      (isInv ? '<div class="ps-irn">' + qr(d.irn || d.name) + '<div><span class="ps-lbl">e-Invoice</span><span>IRN</span><b>' + esc(d.irn || '') + '</b><span>Ack No. ' + esc(String(1120002000 + (d.name || '').length * 37)) + '</span><span>Ack Date ' + fdate(d.posting_date) + '</span></div></div>' : '') + '</section>' +
      '<table class="ps-items"><thead><tr><th>#</th><th>Description of Goods</th><th>HSN/SAC</th><th class="r">Qty</th><th>Unit</th><th class="r">Rate (₹)</th><th class="r">Taxable Value (₹)</th><th class="r">GST</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<section class="ps-bottom"><div class="ps-words"><span>Amount chargeable (in words)</span><b>' + esc(words(d.rounded_total)) + '</b>' + hsnTable + '</div>' +
      '<table class="ps-tot"><tr><td>Taxable Value</td><td class="r">' + num(d.net_total) + '</td></tr>' + taxRows + (round ? '<tr><td>Round Off</td><td class="r">' + num(round) + '</td></tr>' : '') + '<tr class="g"><td>Grand Total</td><td class="r">₹ ' + num(d.rounded_total) + '</td></tr></table></section>' +
      '<section class="ps-foot"><div><span class="ps-lbl">Bank details</span><p>HDFC Bank · A/c 50200014482290 · IFSC HDFC0000123</p><span class="ps-lbl">Terms</span><p>' + (isInv ? 'Payment due within 30 days. Interest @18% p.a. on overdue amounts. Subject to ' + esc(CAPITAL[S.state] || 'Mumbai') + ' jurisdiction.' : 'Prices valid for 30 days. Delivery within 10 days of order confirmation.') + '</p>' +
      (isInv ? '<span class="ps-lbl">Declaration</span><p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>' : '') + '</div>' +
      '<div class="ps-sign"><span>For ' + esc(S.company) + '</span><i></i><span>Authorised Signatory</span></div></section>' +
      '<p class="ps-cg">This is a computer-generated invoice.</p></article>';
    var fmt = isInv ? 'GST Tax Invoice' : dt === 'Quotation' ? 'Quotation with Letterhead' : 'Standard';
    var acts = '<span class="dd-ctl dd-fake is-select">' + fmt + svg('<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>', 12) + '</span><span class="dd-ctl dd-fake is-select">' + esc(S.company) + ' Letter Head' + svg('<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>', 12) + '</span>' +
      '<button type="button" class="dd-btn" data-act="soon" data-what="PDF">PDF</button><button type="button" class="dd-btn dd-btn-dark" data-act="soon" data-what="Print">Print</button>';
    return this.head('<a href="#" class="dd-hcrumb" data-act="back-to-doc">' + esc(d.name) + '</a><i>/</i><h2>Print</h2>', acts) + '<div class="dd-printbg">' + sheet + '</div>';
  };

  /* ---------- email composer ---------- */
  P.openEmail = function () {
    var r = this.route, d = r.doc, dt = r.dt, S = this.S;
    var party = d.supplier || d.customer || '', slug = party.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18);
    var to = (d.supplier ? 'purchase@' : 'accounts@') + slug + '.in';
    var body = 'Dear ' + party + ' team,\n\nPlease find attached ' + dt + ' ' + d.name + ' for ' + inr(d.rounded_total) + '.\n' + (d.schedule_date ? 'Kindly confirm delivery by ' + fdate(d.schedule_date) + '.\n' : '') + '\nRegards,\nPriya Nair\n' + S.company;
    this.modal('New Email', '<div class="dd-email">' +
      '<label class="dd-em-f"><span>To</span><span class="dd-chipin"><b>' + esc(to) + '</b></span></label>' +
      '<label class="dd-em-f"><span>CC</span><span class="dd-chipin"></span></label>' +
      '<label class="dd-em-f"><span>Subject</span><span class="dd-chipin dd-em-subj">' + esc(dt + ' ' + d.name + ' from ' + S.company) + '</span></label>' +
      '<div class="dd-em-body">' + esc(body).replace(/\n/g, '<br>') + '</div>' +
      '<div class="dd-em-att"><label class="dd-check"><input type="checkbox" checked tabindex="-1"/> Attach Document Print</label><span class="dd-em-file">' + svg('<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>', 13) + esc(d.name) + '.pdf</span></div>' +
      '<div class="dd-modal-foot"><button type="button" class="dd-btn" data-act="modal-close">Discard</button><button type="button" class="dd-btn dd-btn-dark" data-act="email-send">Send</button></div></div>');
    var box = this.$('.dd-modal-box'); if (box) box.classList.add('is-wide');
  };
  P.sendEmail = function () {
    var d = this.route.doc;
    this.closeModal();
    if (d) d.emailed = true;
    var party = d && (d.supplier || d.customer);
    this.toast('Email sent to ' + (party || 'the party'));
    this.emit('email-sent', d);
  };

  /* ---------- wire into the engine ---------- */
  var baseClick = P.onClick;
  P.onClick = function (e) {
    var a = e.target.closest && e.target.closest('[data-act]');
    if (a && this.root.contains(a)) {
      var act = a.getAttribute('data-act');
      if (act === 'qr-toggle') { e.preventDefault(); return this.qrToggle(a); }
      if (act === 'tree-toggle') { e.preventDefault(); var o = this._treeOpen || (this._treeOpen = {}); o[a.getAttribute('data-key') + ':' + a.getAttribute('data-id')] = a.getAttribute('data-open') !== '1'; return this.render(); }
      if (act === 'print' && this.route.view === 'form') { e.preventDefault(); this._printFrom = this.route; return this.go({ view: 'print', dt: this.route.dt, doc: this.route.doc }); }
      if (act === 'back-to-doc') { e.preventDefault(); return this.go(this._printFrom || { view: 'form', dt: this.route.dt, doc: this.route.doc }); }
      if (act === 'email') { e.preventDefault(); if (this.opts.experience && !this.touring) return this.nudge(this.route.dt); return this.openEmail(); }
      if (act === 'email-send') { e.preventDefault(); if (this.opts.experience && !this.touring) return this.nudge(this.route.dt); return this.sendEmail(); }
    }
    return baseClick.call(this, e);
  };
})(window);
