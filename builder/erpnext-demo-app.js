/* ERPNext interactive demo — rendering engine. */
(function (global) {
  'use strict';

  var D = global.ERPData;
  var DT = D.DT, MODULES = D.MODULES, TODAY = D.TODAY;
  var TRIAL = 'https://frappecloud.com/dashboard/signup?product=erpnext';

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n) { return (Math.round((+n || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function inr(n) { return '₹ ' + num(n); }
  function inrShort(n) {
    n = +n || 0;
    if (Math.abs(n) >= 1e7) return '₹ ' + (n / 1e7).toFixed(2) + ' Cr';
    if (Math.abs(n) >= 1e5) return '₹ ' + (n / 1e5).toFixed(2) + ' L';
    return '₹ ' + Math.round(n).toLocaleString('en-IN');
  }
  function fdate(d) { if (!d) return ''; var p = d.split('-'); return p[2] + '-' + p[1] + '-' + p[0]; }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function words(n) {
    n = Math.round(+n || 0);
    if (!n) return 'INR Zero Only';
    var a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    var b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function two(x) { return x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''); }
    function three(x) { return x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + two(x % 100) : '') : two(x); }
    var out = [], cr = Math.floor(n / 1e7); n %= 1e7;
    var la = Math.floor(n / 1e5); n %= 1e5;
    var th = Math.floor(n / 1000); n %= 1000;
    if (cr) out.push(three(cr) + ' Crore');
    if (la) out.push(two(la) + ' Lakh');
    if (th) out.push(two(th) + ' Thousand');
    if (n) out.push(three(n));
    return 'INR ' + out.join(' ') + ' Only';
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  global.ERPFmt = { inr: inr, num: num, fdate: fdate, words: words };

  var ICON = {
    sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    calculator: '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
    warehouse: '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>',
    listtree: '<path d="M21 12h-8"/><path d="M21 6H8"/><path d="M21 18h-8"/><path d="M3 6v4c0 1.1.9 2 2 2h3"/><path d="M3 10v6c0 1.1.9 2 2 2h3"/>',
    handbox: '<path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"/><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 15 6 6"/><rect x="13" y="2" width="8" height="6" rx="1"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    dash: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M8 17v-3"/><path d="M13 17V9"/><path d="M18 17V5"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    msg: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    sort: '<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h10"/><path d="M11 8h7"/><path d="M11 12h4"/>',
    listv: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
    updown: '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
    gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    table: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    calcheck: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    clip: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    swap: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    cash: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>',
    squarex: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    bank: '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
    percent: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="M9 9h.01"/><path d="M15 15h.01"/>',
    piggy: '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
    box: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 8.7 5 8.7-5"/>',
    factory: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>',
    badge: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
    kanban: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/>',
    buoy: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 13h4"/><path d="M10 17h4"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16v-4"/><path d="M12 16V8"/><path d="M17 16v-7"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'
  };
  function ic(name, size) { return '<svg class="dd-ic" width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[name] || '') + '</svg>'; }
  var LOGO = '<svg class="dd-logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#3E8EF7"/><path fill="#fff" d="M11.6 8.4h9.2v2.8h-9.2zM11.6 14.6h9.2v2.7h-6.4v3.5h6.4v2.8h-9.2z"/></svg>';

  /* v16 desk: icon rail + per-module sidebar (Home, Dashboard, doctypes, collapsible groups) */
  var RAIL = [['home', 'sliders', 'Setup'], ['accounting', 'calculator'], ['sales', 'store'], ['procurement', 'cart'], ['stock', 'warehouse'], ['manufacturing', 'factory'], ['projects', 'listtree'], ['assets', 'handbox'], ['quality', 'badge'], ['support', 'buoy'], ['crm', 'users'], ['pos', 'monitor']];
  function W() { return [{ t: 'ws', ic: 'home', label: 'Home' }, { t: 'dash', ic: 'dash', label: 'Dashboard' }]; }
  function dtI(ic, label, dt) { return { t: 'dt', ic: ic, label: label, dt: dt || label }; }
  function G(ic, label, kids) { return { t: 'g', ic: ic, label: label, kids: kids || [] }; }
  function V(ic, label) { return { t: 'v', ic: ic, label: label }; }
  var SELL_ITEMS = G('box', 'Items', ['dt:Item', 'v:Item Group', 'v:Item Price', 'v:Price List', 'v:Pricing Rule']);
  var SELLING = { h: 'Selling', items: W().concat([dtI('user', 'Customer'), dtI('file', 'Quotation'), dtI('cart', 'Sales Order'), dtI('truck', 'Delivery Note'), dtI('file', 'Sales Invoice'),
    G('table', 'Reports', ['r:Accounts Receivable', 'v:Sales Analytics', 'v:Sales Order Analysis']), SELL_ITEMS,
    G('monitor', 'POS', ['pos:Point of Sale', 'dt:POS Opening Entry', 'dt:POS Closing Entry', 'dt:POS Invoice', 'v:POS Profile']),
    G('database', 'Setup', ['v:Selling Settings', 'v:Customer Group', 'v:Territory', 'v:Sales Person', 'v:Terms and Conditions'])]) };
  var SIDE = {
    home: { h: 'Setup', items: [{ t: 'home', ic: 'home', label: 'Home' }, V('building', 'Company'), { t: 'v', ic: 'users', label: 'Users', view: 'User' },
      G('building', 'Organization', ['v:Branch', 'v:Department', 'v:Designation']), G('shield', 'Access', ['v:Role', 'v:Role Profile', 'v:User Permission']),
      G('print', 'Printing', ['v:Print Format', 'v:Letter Head', 'v:Print Settings']), G('mail', 'Email', ['v:Email Account', 'v:Email Template', 'v:Notification']),
      G('database', 'Data', ['v:Data Import', 'v:Data Export']), G('plug', 'Integrations', ['v:Webhook', 'v:Social Login Key', 'v:Google Settings']),
      G('gear', 'Settings', ['v:System Settings', 'v:Website Settings', 'v:Global Defaults'])] },
    accounting: { h: 'Accounts', items: W().concat([dtI('squarex', 'Chart of Accounts', 'Account'), dtI('file', 'Sales Invoice'), dtI('file', 'Purchase Invoice'), dtI('cash', 'Payment Entry'), dtI('pencil', 'Journal Entry'),
      G('table', 'Reports', ['r:General Ledger', 'r:Accounts Receivable', 'v:Accounts Payable', 'v:Trial Balance', 'v:Balance Sheet', 'v:Profit and Loss Statement']),
      G('bank', 'Banking', ['v:Bank Reconciliation Tool', 'v:Bank Account', 'v:Bank']),
      G('percent', 'Taxes', ['v:Sales Taxes and Charges Template', 'v:Purchase Taxes and Charges Template', 'v:Item Tax Template', 'v:Tax Category']),
      G('piggy', 'Budgeting', ['v:Budget', 'v:Cost Center', 'v:Accounting Dimension']),
      G('database', 'Setup', ['dt:Customer', 'dt:Supplier', 'v:Accounts Settings', 'v:Fiscal Year', 'v:Mode of Payment', 'v:Payment Terms Template'])]) },
    sales: SELLING, pos: SELLING,
    procurement: { h: 'Buying', items: W().concat([dtI('user', 'Supplier'), dtI('clip', 'Material Request'), V('file', 'Request for Quotation'), V('file', 'Supplier Quotation'), dtI('cart', 'Purchase Order'), dtI('truck', 'Purchase Receipt'), dtI('file', 'Purchase Invoice'),
      G('table', 'Reports', ['v:Purchase Analytics', 'v:Purchase Order Analysis', 'v:Procurement Tracker']), G('box', 'Items', ['dt:Item', 'v:Item Price', 'v:Price List']),
      G('database', 'Setup', ['v:Buying Settings', 'v:Supplier Group', 'v:Supplier Scorecard'])]) },
    stock: { h: 'Stock', items: W().concat([dtI('box', 'Item'), dtI('swap', 'Stock Entry'), dtI('truck', 'Purchase Receipt'), dtI('truck', 'Delivery Note'), dtI('clip', 'Material Request'), V('calcheck', 'Stock Reconciliation'), V('clip', 'Pick List'),
      G('table', 'Reports', ['r:Stock Balance', 'v:Stock Ledger', 'v:Stock Projected Qty', 'v:Stock Ageing']),
      G('database', 'Setup', ['v:Warehouse', 'v:UOM', 'v:Item Group', 'v:Batch', 'v:Serial No', 'v:Stock Settings'])]) },
    manufacturing: { h: 'Manufacturing', items: W().concat([dtI('listtree', 'BOM'), V('calcheck', 'Production Plan'), dtI('factory', 'Work Order'), dtI('clip', 'Job Card'), dtI('swap', 'Stock Entry'),
      G('table', 'Reports', ['r:Stock Balance', 'v:Work Order Summary', 'v:Production Planning Report', 'v:BOM Search']),
      G('bag', 'Subcontracting', ['v:Subcontracting Order', 'v:Subcontracting Receipt', 'v:Subcontracting BOM']), G('wrench', 'Tools', ['v:BOM Update Tool', 'v:BOM Comparison Tool']),
      G('database', 'Setup', ['v:Workstation', 'v:Operation', 'v:Routing', 'v:Plant Floor', 'v:Manufacturing Settings|Settings'])]) },
    projects: { h: 'Projects', items: W().concat([dtI('listtree', 'Project'), dtI('clip', 'Task'), dtI('calcheck', 'Timesheet'), V('file', 'Project Template'),
      G('table', 'Reports', ['r:Project Summary', 'v:Timesheet Billing Summary', 'v:Delayed Tasks Summary']),
      G('database', 'Setup', ['v:Activity Type', 'v:Activity Cost', 'v:Project Type', 'v:Projects Settings'])]) },
    assets: { h: 'Assets', items: W().concat([dtI('handbox', 'Asset'), dtI('swap', 'Asset Movement'), V('wrench', 'Asset Maintenance'), V('wrench', 'Asset Repair'), V('pencil', 'Asset Value Adjustment'),
      G('table', 'Reports', ['v:Fixed Asset Register', 'v:Asset Depreciation Ledger']), G('database', 'Setup', ['v:Asset Category', 'v:Location'])]) },
    quality: { h: 'Quality', items: W().concat([dtI('badge', 'Quality Inspection'), dtI('file', 'Non Conformance'), dtI('clip', 'Quality Action'), V('calcheck', 'Quality Review'), V('users', 'Quality Meeting'),
      G('database', 'Setup', ['v:Quality Inspection Template', 'v:Quality Procedure', 'v:Quality Goal'])]) },
    support: { h: 'Support', items: W().concat([dtI('buoy', 'Issue'), dtI('wrench', 'Maintenance Visit'), V('calcheck', 'Maintenance Schedule'), V('shield', 'Warranty Claim'),
      G('database', 'Setup', ['v:Service Level Agreement', 'v:Issue Type', 'v:Issue Priority', 'v:Support Settings'])]) },
    crm: { h: 'CRM', items: W().concat([dtI('users', 'Lead'), dtI('file', 'Opportunity'), dtI('user', 'Customer'), V('building', 'Prospect'), V('user', 'Contact'), V('mail', 'Campaign'),
      G('table', 'Reports', ['v:Lead Details', 'v:Opportunity Summary by Sales Stage']), G('database', 'Setup', ['v:CRM Settings', 'v:Lead Source', 'v:Sales Stage'])]) }
  };
  /* sidebars as they ship in ERPNext v16 (scraped into desk-real.js); the hand-made ones above are the fallback */
  (function () {
    var RS = (global.ERPReal || {}).side || {};
    Object.keys(RS).forEach(function (k) { SIDE[k] = { h: SIDE[k] ? SIDE[k].h : k, items: RS[k] }; });
    if (RS.sales) {
      SIDE.sales = { h: 'Selling', items: RS.sales };
      SIDE.pos = { h: 'Selling', items: RS.sales.map(function (it) { return it.t === 'g' && it.label === 'POS' ? { t: 'g', ic: it.ic, label: it.label, kids: ['pos:Point of Sale', 'dt:POS Opening Entry', 'dt:POS Closing Entry'].concat(it.kids) } : it; }) };
    }
  })();
  var WS_LIST = [['Home', 'home', null]].concat(MODULES.map(function (m) { return [m.ws, m.icon, m.key]; }));

  function pillClass(s) {
    var l = String(s).toLowerCase();
    if (/not saved/.test(l)) return 'orange';
    if (/^draft|overdue|rejected|mismatch|cancelled/.test(l)) return 'red';
    if (/not started|^lead$/.test(l)) return 'gray';
    if (/unpaid|^to |pending|^open|working|in process|replied|interested|opportunity|on hold/.test(l)) return 'orange';
    if (/completed|paid|ordered|submitted|accepted|resolved|converted|active|billed|closed|quotation|shift open/.test(l)) return 'green';
    return 'blue';
  }
  function pill(s) { return '<span class="dd-pill dd-' + pillClass(s) + '">' + esc(s) + '</span>'; }

  /* ---------- Demo instance ---------- */
  function Demo(root, opts) {
    this.root = root;
    this.opts = opts || {};
    this.handlers = {};
    this.S = D.seed(this.opts.profile);
    this.calcAll();
    this.S.module = this.opts.module || 'sales';
    this.S.routes = {};
    this.route = { view: 'workspace' };
    this.listFilter = {};
    this.mount();
    this.go({ view: this.opts.start || 'workspace' });
  }

  var P = Demo.prototype;

  P.on = function (evt, fn) { (this.handlers[evt] || (this.handlers[evt] = [])).push(fn); var h = this.handlers[evt]; return function () { var i = h.indexOf(fn); if (i >= 0) h.splice(i, 1); }; };
  P.emit = function (evt, a, b) { (this.handlers[evt] || []).slice().forEach(function (fn) { try { fn(a, b); } catch (e) { setTimeout(function () { throw e; }); } }); };
  P.mod = function () { var k = this.S.module; return MODULES.filter(function (m) { return m.key === k; })[0]; };
  P.find = function (dt, name) { return this.S.docs[dt].filter(function (d) { return d.name === name; })[0]; };

  /* ----- calculations ----- */
  P.partyState = function (d) {
    var S = this.S, name = d.customer || d.supplier;
    var c = S.docs.Customer.concat(S.docs.Supplier).filter(function (x) { return x.name === name; })[0];
    if (c) return c.state;
    var l = S.docs.Lead.filter(function (x) { return x.company_name === name; })[0];
    return l ? l.state : this.S.state;
  };
  P.calc = function (dt, d) {
    var def = DT[dt];
    if (!def.items) return;
    var self = this, net = 0, byRate = {};
    (d.items || []).forEach(function (r) {
      r.amount = Math.round((+r.qty || 0) * (+r.rate || 0) * 100) / 100;
      net += r.amount;
      var it = D.itemDoc(self.S, r.item_code);
      var rate = it ? +it.gst_rate : 18;
      if (!r.fg) byRate[rate] = (byRate[rate] || 0) + r.amount;
    });
    d.net_total = Math.round(net * 100) / 100;
    d.taxes = [];
    if (def.taxes) {
      var inter = this.partyState(d) !== this.S.state;
      var side = def.taxes === 'in' ? 'Input Tax' : 'Output Tax';
      Object.keys(byRate).sort().forEach(function (rt) {
        var base = byRate[rt];
        if (inter) d.taxes.push({ head: side + ' IGST @ ' + rt + '%', rate: +rt, amount: Math.round(base * rt) / 100 });
        else {
          var h = Math.round(base * rt / 2) / 100;
          d.taxes.push({ head: side + ' CGST @ ' + (rt / 2) + '%', rate: rt / 2, amount: h });
          d.taxes.push({ head: side + ' SGST @ ' + (rt / 2) + '%', rate: rt / 2, amount: h });
        }
      });
    }
    var tax = d.taxes.reduce(function (s, t) { return s + t.amount; }, 0);
    d.total_taxes = Math.round(tax * 100) / 100;
    d.grand_total = Math.round((net + tax) * 100) / 100;
    d.rounded_total = Math.round(d.grand_total);
  };
  P.acc = function (n) { return n + ' - ' + this.S.abbr; };
  P.calcAll = function () {
    var S = this.S, self = this;
    Object.keys(DT).forEach(function (dt) { if (DT[dt].items) S.docs[dt].forEach(function (d) { self.calc(dt, d); }); });
  };
  P.status = function (dt, d) {
    var def = DT[dt];
    if (d.__new || d.__dirty) return 'Not Saved';
    if (def.submit && d.docstatus === 0) return 'Draft';
    if (def.status) return def.status(d);
    if (def.submit) return 'Submitted';
    return d.status || '';
  };
  P.amountOf = function (dt, d) {
    if (d.rounded_total != null) return d.rounded_total;
    if (d.paid_amount != null) return d.paid_amount;
    if (d.amount != null) return d.amount;
    return null;
  };

  /* ----- doc lifecycle ----- */
  P.newDoc = function (dt, sample) {
    var def = DT[dt], S = this.S;
    var d = { __new: true, docstatus: 0, name: 'new-' + slug(dt) + '-' + (S.tick++) };
    def.fields.forEach(function (f) {
      if (f.def != null) d[f.key] = typeof f.def === 'function' ? f.def(S) : f.def;
    });
    if (def.items) d.items = [];
    if (sample && def.sample && !this.touring) { def.sample(d, S); S.fix(d); }
    if (def.items && !d.items.length) d.items.push({ item_code: '', qty: 1, rate: 0 });
    this.calc(dt, d);
    return d;
  };
  P.createFrom = function (srcDt, src, dt) {
    var def = DT[dt], d = this.newDoc(dt, false);
    def.fields.forEach(function (f) {
      if (f.type === 'ro' || f.type === 'date') return;
      if (src[f.key] != null && f.key !== 'status') d[f.key] = clone(src[f.key]);
    });
    if (def.items && src.items) d.items = src.items.filter(function (r) { return !r.fg; }).map(function (r) { return { item_code: r.item_code, qty: r.qty, rate: r.rate }; });
    d.from = { dt: srcDt, name: src.name };
    var m = def.sources && def.sources[srcDt];
    if (typeof m === 'function') { m(src, d, this.S); this.S.fix(d); }
    if (def.items && !d.items.length) d.items.push({ item_code: '', qty: 1, rate: 0 });
    this.calc(dt, d);
    return d;
  };
  P.ancestors = function (d) {
    var out = [], cur = d, guard = 0;
    while (cur && cur.from && guard++ < 10) {
      var p = this.find(cur.from.dt, cur.from.name);
      if (!p) break;
      out.push(p); cur = p;
    }
    return out;
  };
  P.children = function (dt, name) {
    var out = [], S = this.S;
    Object.keys(S.docs).forEach(function (k) {
      S.docs[k].forEach(function (x) { if (x.from && x.from.dt === dt && x.from.name === name && !x.__new) out.push([k, x]); });
    });
    return out;
  };
  P.applyMark = function (dt, d) {
    var m = DT[dt].mark;
    if (typeof m === 'function') m = m(d);
    if (!m) return;
    this.ancestors(d).forEach(function (a) { a[m] = true; });
  };
  P.label = function (f) { return typeof f.label === 'function' ? f.label(this.S) : f.label; };
  P.validate = function (dt, d) {
    var def = DT[dt], missing = [], self = this;
    def.fields.forEach(function (f) {
      if (f.req && (d[f.key] == null || d[f.key] === '' || (f.type !== 'data' && f.type !== 'link' && f.type !== 'select' && +d[f.key] === 0 && f.type !== 'date'))) missing.push(self.label(f));
    });
    if (def.items) {
      var ok = (d.items || []).filter(function (r) { return r.item_code && +r.qty > 0; });
      if (!ok.length) missing.push((def.itemsLabel || 'Items') + ': add at least one row');
    }
    if (def.master && !d.__new) return missing;
    if (def.master) {
      var nm = def.naming(d, this.S);
      if (this.S.docs[dt].some(function (x) { return x.name === nm && !x.__new; })) missing.push(dt + ' "' + nm + '" already exists. Use a different ' + self.label(def.fields[0]));
    }
    return missing;
  };
  P.save = function () {
    clearTimeout(this._dr);
    var r = this.route, dt = r.dt, d = r.doc, def = DT[dt], S = this.S;
    if (def.items) d.items = d.items.filter(function (x) { return x.item_code; });
    this.calc(dt, d);
    var missing = this.validate(dt, d);
    if (missing.length) {
      if (def.items && !d.items.length) d.items.push({ item_code: '', qty: 1, rate: 0 });
      this.modal('Missing Fields', '<p>Mandatory fields required in ' + esc(dt) + '</p><ul>' + missing.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>');
      return;
    }
    if (d.__new) {
      if (def.master || def.naming) d.name = def.naming(d, S);
      else { S.counters[dt] = (S.counters[dt] || 0) + 1; d.name = def.prefix + String(S.counters[dt]).padStart(def.pad || 5, '0'); }
      d.created = S.tick++;
      delete d.__new;
      S.docs[dt].push(d);
    }
    d.__dirty = false;
    if (def.onSave) def.onSave(d, S);
    if (!def.submit) this.applyMark(dt, d);
    this.toast('Saved');
    this.route = { view: 'form', dt: dt, doc: d };
    this.S.routes[this.S.module] = this.route;
    this.render();
    this.emit('saved', dt, d);
  };
  P.submit = function () {
    var r = this.route, dt = r.dt, d = r.doc, def = DT[dt];
    if (d.__dirty || d.__new) { this.save(); if (d.__new || d.__dirty) return; }
    d.docstatus = 1;
    if (def.onSubmit) def.onSubmit(d, this.S);
    this.applyMark(dt, d);
    this.toast('Submitted ' + d.name);
    this.render();
    this.emit('submitted', dt, d);
  };

  /* ----- steps & guide ----- */
  /* A doc counts for step i only if it belongs to this module's own chain:
     chained steps must come from a doc that counts for the source step, and
     fresh steps must be made after the previous step was first completed. */
  P.stepMatch = function (i, d) {
    var steps = this.mod().steps, st = steps[i], def = DT[st.dt];
    if (!d || d.seed || d.__new) return false;
    if (def.submit && d.docstatus !== 1) return false;
    if (st.test && !st.test(d)) return false;
    if (st.src) {
      if (!(d.from && d.from.dt === st.src)) return false;
      var j = -1;
      for (var k = i - 1; k >= 0; k--) if (steps[k].dt === st.src) { j = k; break; }
      if (j >= 0 && !this.stepMatch(j, this.find(d.from.dt, d.from.name))) return false;
    } else if (i > 0) {
      var anchor = this.stepAnchor(i - 1);
      if (anchor == null || (d.created || 0) <= anchor) return false;
    }
    return true;
  };
  P.stepAnchor = function (i) {
    var st = this.mod().steps[i], S = this.S, self = this;
    if (st.report) return S.viewed[st.report] || null;
    var best = null;
    S.docs[st.dt].forEach(function (d) { if (self.stepMatch(i, d) && (best == null || d.created < best)) best = d.created; });
    return best;
  };
  P.stepDone = function (st) {
    var steps = this.mod().steps, i = steps.indexOf(st), S = this.S, self = this;
    if (st.report) {
      var v = S.viewed[st.report];
      if (!v) return false;
      var prev = i > 0 ? this.stepAnchor(i - 1) : 0;
      return prev != null && v > prev;
    }
    return S.docs[st.dt].some(function (d) { return self.stepMatch(i, d); });
  };
  P.stepLabel = function (st) { return st.label || st.report || st.dt; };
  P.currentStep = function () {
    var steps = this.mod().steps;
    for (var i = 0; i < steps.length; i++) if (!this.stepDone(steps[i])) return i;
    return steps.length;
  };
  P.sourceFor = function (st) {
    if (!st.src) return null;
    var steps = this.mod().steps, i = steps.indexOf(st), j = -1, self = this;
    for (var k = i - 1; k >= 0; k--) if (steps[k].dt === st.src) { j = k; break; }
    var list = this.S.docs[st.src].filter(function (d) { return j >= 0 ? self.stepMatch(j, d) : (!d.seed && !d.__new && (!DT[st.src].submit || d.docstatus === 1)); });
    return list[list.length - 1] || null;
  };
  P.guide = function () {
    var r = this.route, mod = this.mod(), steps = mod.steps, i = this.currentStep();
    if (r.view === 'form' && r.doc && !DT[r.dt].readonly) {
      var d = r.doc, def = DT[r.dt];
      if (d.__new || d.__dirty) return { text: d.__new ? 'Sample values are filled in. Change anything you like, then save.' : 'You have unsaved changes.', btn: 'Save', act: 'save', key: 'Ctrl+S' };
      if (def.submit && d.docstatus === 0) return { text: 'Saved as a draft. Submit it to confirm the ' + r.dt + '.', btn: 'Submit', act: 'submit' };
    }
    if (i >= steps.length) return { done: true, text: 'You ran the full ' + mod.cycle + ' flow. Every step updated stock, ledgers and statuses on its own.', btn: 'Start free trial', href: TRIAL };
    var st = steps[i], label = this.stepLabel(st);
    if (st.report) return { text: 'Every entry you made has posted. Open the ' + st.report + ' to see it.', btn: 'Open ' + st.report, act: 'step' };
    if (st.pos) return { text: 'Your shift is open. Ring up a sale at the counter.', btn: 'Open Point of Sale', act: 'step' };
    if (st.src) {
      var src = this.sourceFor(st);
      if (src) {
        var here = r.view === 'form' && r.doc === src;
        return { text: (here ? 'Next, open Create and pick ' : 'Next: create a ') + st.dt + ' from ' + src.name + '.', btn: 'Create ' + st.dt, act: 'step' };
      }
    }
    return { text: i === 0 ? 'Start the ' + mod.cycle + ' flow by creating a ' + label + '.' : 'Next up: ' + label + '.', btn: 'New ' + (st.dt || label), act: 'step' };
  };
  P.runStep = function () {
    var steps = this.mod().steps, i = this.currentStep(), st = steps[i];
    if (!st) return;
    if (st.report) return this.go({ view: 'report', report: st.report });
    if (st.pos) return this.go({ view: 'pos' });
    var src = st.src && this.sourceFor(st);
    if (src) return this.go({ view: 'form', dt: st.dt, doc: this.createFrom(st.src, src, st.dt) });
    this.go({ view: 'form', dt: st.dt, doc: this.newDoc(st.dt, true) });
  };

  /* ----- routing ----- */
  P.go = function (route) {
    if (route.view === 'report') this.S.viewed[route.report] = this.S.tick++;
    this.route = route;
    this.S.routes[this.S.module] = route;
    this.closeAB();
    this.render(true);
    this.emit('route', route);
  };
  P.setModule = function (key, silent) {
    if (key === this.S.module) { if (this.route.view === 'home') this.go({ view: 'workspace' }); return; }
    this.S.module = key;
    this.route = this.S.routes[key] || { view: 'workspace' };
    if (this.route.view === 'form' && this.route.doc && this.route.doc.__new && !this.route.doc.__dirty) this.route = { view: 'workspace' };
    this.render(true);
    if (!silent && this.opts.onModule) this.opts.onModule(key);
  };
  P.reset = function () {
    var m = this.S.module;
    this.S = D.seed(this.S.personal ? this.S.profile : null); this.calcAll(); this.S.module = m; this.S.routes = {};
    this.listFilter = {}; this.cart = null; this.posQ = '';
    this.go(this.S.personal ? { view: 'home' } : { view: 'workspace' });
    this.toast('Demo reset');
  };
  var WS_SLUG = { home: 'setup', accounting: 'accounts', procurement: 'buying', sales: 'selling', pos: 'selling', stock: 'stock', assets: 'assets', manufacturing: 'manufacturing', quality: 'quality', projects: 'projects', support: 'support', crm: 'crm' };
  P.path = function () {
    var r = this.route, ws = '/desk/' + (WS_SLUG[r.view === 'home' ? 'home' : this.S.module] || 'setup');
    var REALR = (global.ERPReal || {}).reports || {};
    if (r.view === 'home') return '/desk/setup';
    if (r.view === 'workspace') return ws + '/' + slug(this.mod().ws);
    if (r.view === 'dash') return ws + '/dashboard-view/' + encodeURIComponent(this.mod().ws);
    if (r.view === 'list') return ws + '/' + slug(r.dt);
    if (r.view === 'form') return '/desk/' + slug(r.dt) + '/' + (r.doc.__new ? 'new' : encodeURIComponent(r.doc.name));
    if (r.view === 'report') return ws + '/query-report/' + encodeURIComponent(r.report);
    if (r.view === 'pos') return '/desk/point-of-sale';
    if (r.view === 'print') return '/desk/print/' + slug(r.dt) + '/' + encodeURIComponent(r.doc.name);
    if (r.view === 'v') { var vw = VIEWS()[r.name]; return (vw && vw.kind === 'report') || (!vw && REALR[r.name]) ? ws + '/query-report/' + encodeURIComponent(r.name) : ws + '/' + slug(r.name); }
    return '/desk';
  };

  /* ---------- mount & chrome ---------- */
  P.mount = function () {
    var self = this;
    this.root.classList.add('dd');
    if (this.opts.experience) this.root.classList.add('dd-exp');
    this.root.innerHTML =
      '<div class="dd-browser">' +
        '<span class="dd-dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
        (this.opts.experience ? '<span class="dd-apptitle">Frappe Experience Center</span>' : '<span class="dd-url"><span class="dd-url-host">demo-industries.frappe.cloud</span><span class="dd-url-path"></span></span>') +
        '<span class="dd-badge">Live demo · sample data</span>' +
        (this.opts.experience && this.opts.tourModules ? '<span class="dd-twrap"><button type="button" class="dd-tbtn" data-act="tours-menu" aria-haspopup="dialog" aria-expanded="false">' + ic('play', 13) + '<span>Guided tours</span></button><div class="dd-tpop" role="dialog" aria-label="Guided tours" hidden></div></span>' : '') +
        '<button type="button" class="dd-reset" data-act="reset" title="Reset demo">' + ic('reset', 14) + '<span>Reset</span></button>' +
      '</div>' +
      '<div class="dd-body">' +
        '<nav class="dd-rail" aria-label="Apps"></nav>' +
        '<aside class="dd-side"></aside>' +
        '<main class="dd-main" tabindex="-1"></main>' +
      '</div>' +
      '<div class="dd-abwrap" hidden><div class="dd-abbox" role="dialog" aria-label="Search">' +
        '<form class="dd-search" data-form="search" role="search"><span>' + ic('search', 17) + '</span><input id="dd-search-' + (this.opts.id || 'x') + '" type="text" placeholder="Search or type a command" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="dd-ab-' + (this.opts.id || 'x') + '" aria-label="Awesome bar"/></form>' +
        '<div class="dd-ab" id="dd-ab-' + (this.opts.id || 'x') + '" role="listbox" hidden></div>' +
        '<div class="dd-ab-foot"><kbd>↑</kbd><kbd>↓</kbd><span>to navigate</span><kbd>↵</kbd><span>to select</span><kbd>Esc</kbd><span>to close</span></div>' +
      '</div></div>' +
      '<div class="dd-guide"></div>' +
      '<div class="dd-toasts" aria-live="polite"></div>' +
      '<div class="dd-modal" hidden></div>' +
      '<div class="dd-railtip" role="tooltip" hidden></div>';
    this.$ = function (s) { return self.root.querySelector(s); };
    this.root.addEventListener('mouseover', function (e) {
      var r = e.target.closest && e.target.closest('.dd-rail [data-label]'), tip = self.$('.dd-railtip');
      if (!r) { tip.hidden = true; return; }
      var R = self.root.getBoundingClientRect(), b = r.getBoundingClientRect();
      tip.textContent = r.getAttribute('data-label');
      tip.style.left = (b.right - R.left + 8) + 'px'; tip.style.top = (b.top - R.top + b.height / 2) + 'px';
      tip.hidden = false;
    });
    this.root.addEventListener('mouseleave', function () { self.$('.dd-railtip').hidden = true; });
    this.root.addEventListener('click', function (e) { if (e.target.classList && e.target.classList.contains('dd-abwrap') && !self.touring) return self.closeAB(); self.onClick(e); });
    this.root.addEventListener('change', function (e) { self.onChange(e); });
    this.root.addEventListener('input', function (e) { self.onInput(e); });
    this.root.addEventListener('submit', function (e) { e.preventDefault(); self.onSubmitForm(e); });
    this.root.addEventListener('focusout', function (e) { if (e.target.matches && e.target.matches('.dd-search input')) setTimeout(function () { if (!self.touring && document.activeElement !== e.target) self.closeAB(); }, 160); });
    this.root.addEventListener('mousedown', function (e) {
      if (e.target.closest('.dd-ab-i')) e.preventDefault();
      var f = e.target.closest('.dd-main input, .dd-main select, .dd-main textarea');
      if (f && self.guarded(f)) { e.preventDefault(); self.nudge(self.route.dt); }
    }, true);
    this.root.addEventListener('focusin', function (e) {
      var f = e.target.closest && e.target.closest('.dd-main input, .dd-main select, .dd-main textarea');
      if (f && self.guarded(f) && e.isTrusted) { f.blur(); }
    });
    this.root.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S') && self.route.view === 'form') { e.preventDefault(); var t = document.activeElement; if (t && t.blur) t.blur(); self.save(); }
      if ((e.ctrlKey || e.metaKey) && /^[gGkK]$/.test(e.key)) { e.preventDefault(); if (!self.touring) { if (self.abIsOpen()) self.closeAB(); else self.focusSearch(); } }
      if (e.target.matches && e.target.matches('.dd-search input')) self.abKey(e);
      if (e.key === 'Escape') { self.closeMenus(); self.closeModal(); self.closeAB(); self.closeTours(); }
    });
    document.addEventListener('click', function (e) { if (!self.root.contains(e.target)) self.closeMenus(); var tw = self.$('.dd-twrap'); if (tw && e.target.isConnected && !tw.contains(e.target)) self.closeTours(); });
  };

  P.render = function (navigated) {
    var main = this.$('.dd-main'), keep = navigated ? 0 : main.scrollTop;
    var up = this.$('.dd-url-path'), uh = this.$('.dd-url-host');
    if (up) up.textContent = this.path();
    if (uh) uh.textContent = slug(this.S.company).replace(/-(pvt|private|ltd|limited|llp)\b/g, '') + '.frappe.cloud';
    this.tourBadge();
    this.$('.dd-badge').textContent = this.S.personal ? 'Set up for ' + this.S.company + ' · sample data' : 'Live demo · sample data';
    this.root.classList.toggle('dd-touring', !!this.touring);
    this.root.classList.toggle('dd-on-home', this.route.view === 'home');
    this.$('.dd-rail').innerHTML = this.rail();
    this.$('.dd-side').innerHTML = this.sidebar();
    var v = this.route.view;
    main.innerHTML = '<div class="dd-page dd-v-' + v + '">' + (v === 'home' ? this.vHome() : v === 'workspace' ? this.vWorkspace() : v === 'dash' ? this.vDash() : v === 'list' ? this.vList() : v === 'form' ? this.vForm() : v === 'report' ? this.vReport() : v === 'v' ? this.vView() : v === 'print' ? this.vPrint() : this.vPOS()) + '</div>';
    main.scrollTop = keep;
    this.$('.dd-guide').innerHTML = this.vGuide();
    this.root.classList.remove('dd-side-open');
  };

  P.crumbs = function () {
    var r = this.route, ws = this.mod().ws, out = ['<a href="#" data-act="ws-home">' + esc(ws) + '</a>'];
    if (r.view === 'home') return '<span>Home</span>';
    if (r.view === 'list' || r.view === 'form') out.push('<a href="#" data-act="list" data-dt="' + esc(r.dt) + '">' + esc(r.dt) + '</a>');
    if (r.view === 'form') out.push('<span>' + esc(r.doc.__new ? 'New ' + r.dt : r.doc.name) + '</span>');
    if (r.view === 'report') out.push('<span>' + esc(r.report) + '</span>');
    if (r.view === 'pos') out.push('<span>Point of Sale</span>');
    return out.join('<i>/</i>');
  };

  P.rail = function () {
    var cur = this.route.view === 'home' ? 'home' : this.S.module;
    if (cur === 'pos') cur = 'sales';
    var mods = RAIL.map(function (r) {
      var m = MODULES.filter(function (x) { return x.key === r[0]; })[0], label = r[2] || (m ? m.ws : r[0]);
      return '<a href="#" class="dd-rail-i' + (r[0] === cur ? ' is-on' : '') + '" data-act="' + (r[0] === 'home' ? 'home' : 'module') + '" data-mod="' + r[0] + '" data-label="' + esc(label) + '" aria-label="' + esc(label) + '">' + ic(r[1], 19) + '</a>';
    }).join('');
    return '<a href="#" class="dd-rail-logo" data-act="home" aria-label="Home" data-label="Home">' + LOGO + '</a>' +
      '<button type="button" class="dd-rail-i dd-burger" data-act="toggle-side" aria-label="Toggle sidebar">' + ic('menu', 19) + '</button>' +
      '<button type="button" class="dd-rail-i dd-rail-search" data-act="ab-open" data-label="Search" aria-label="Search">' + ic('search', 19) + '</button>' +
      '<span class="dd-rail-i dd-rail-bell" data-label="Notifications">' + ic('bell', 19) + '</span><hr>' + mods +
      '<span class="dd-rail-sp"></span><span class="dd-avatar" title="Priya Nair">pn</span>';
  };
  P.sidebar = function () {
    var self = this, r = this.route, key = r.view === 'home' ? 'home' : this.S.module, sd = SIDE[key] || SIDE.home;
    var open = this.sideOpen || (this.sideOpen = {});
    function on(spec) {
      var p = spec.split(':'), t = p[0], v = p.slice(1).join(':');
      if (t === 'dt') return (r.view === 'list' || r.view === 'form') && r.dt === v.split('|')[0];
      if (t === 'r') return r.view === 'report' && r.report === v;
      if (t === 'pos') return r.view === 'pos';
      if (t === 'v') return r.view === 'v' && r.name === v.split('|')[0];
      return false;
    }
    function leaf(spec, label, icon) {
      var p = spec.split(':'), t = p[0], v = p.slice(1).join(':'), a;
      if (t === 'dt') { var dp = v.split('|'); a = 'data-act="list" data-dt="' + esc(dp[0]) + '"'; if (!label || label === v) label = dp[1] || dp[0]; }
      else if (t === 'r') a = 'data-act="report" data-report="' + esc(v) + '"';
      else if (t === 'pos') a = 'data-act="pos"';
      else if (t === 'v') { var vp = v.split('|'); a = 'data-act="view" data-view="' + esc(vp[0]) + '"'; if (!label || label === v) label = vp[1] || vp[0]; }
      else { a = 'data-act="soon" data-what="' + esc(v) + '"'; }
      return '<a href="#" class="dd-side-i' + (on(spec) ? ' is-on' : '') + '" ' + a + '>' + (icon ? ic(icon, 16) : '') + '<span>' + esc(label || v) + '</span></a>';
    }
    var items = sd.items.map(function (it) {
      if (it.t === 'home') return '<a href="#" class="dd-side-i' + (r.view === 'home' ? ' is-on' : '') + '" data-act="home">' + ic(it.ic, 16) + '<span>' + esc(it.label) + '</span></a>';
      if (it.t === 'ws') return '<a href="#" class="dd-side-i' + (r.view === 'workspace' ? ' is-on' : '') + '" data-act="ws-home">' + ic(it.ic, 16) + '<span>' + esc(it.label) + '</span></a>';
      if (it.t === 'dash') return '<a href="#" class="dd-side-i' + (r.view === 'dash' ? ' is-on' : '') + '" data-act="dash">' + ic(it.ic, 16) + '<span>' + esc(it.label) + '</span></a>';
      if (it.t === 'dt') return leaf('dt:' + it.dt, it.label, it.ic);
      if (it.t === 'x') return leaf('x:' + it.label, it.label, it.ic);
      if (it.t === 'v') return leaf('v:' + (it.view || it.label), it.label, it.ic);
      var gk = key + ':' + it.label, isOpen = open[gk] != null ? open[gk] : it.kids.some(on);
      return '<button type="button" class="dd-side-i dd-side-g' + (isOpen ? ' is-open' : '') + '" data-act="' + (it.kids.length ? 'side-grp' : 'soon') + '" data-g="' + esc(gk) + '" data-what="' + esc(it.label) + '" aria-expanded="' + isOpen + '">' + ic(it.ic, 16) + '<span>' + esc(it.label) + '</span>' + ic(isOpen ? 'down' : 'right', 15) + '</button>' +
        (isOpen && it.kids.length ? '<div class="dd-side-sub">' + it.kids.map(function (k) { var p = k.split(':'), lb = p.slice(1).join(':'); return leaf(k, lb.split('|').pop()); }).join('') + '</div>' : '');
    }).join('');
    return '<div class="dd-side-h"><span>' + esc(sd.h) + '</span>' + ic('down', 16) + '</div><div class="dd-side-l">' + items + '</div>';
  };
  /* page header and content wrapper, v16 style */
  P.head = function (title, acts) { return '<header class="dd-head"><div class="dd-title">' + title + '</div><div class="dd-actions">' + (acts || '') + '</div></header>'; };
  P.wrap = function (html, wide) { return '<div class="dd-wrap' + (wide ? ' is-wide' : '') + '">' + html + '</div>'; };
  P.iconBtn = function (name, act, label) { return '<button type="button" class="dd-btn dd-btn-icon" data-act="' + (act || 'soon') + '" aria-label="' + esc(label || name) + '" data-what="' + esc(label || '') + '">' + ic(name, 16) + '</button>'; };

  P.vGuide = function () {
    if (this.opts.experience) return '';
    var self = this, steps = this.mod().steps, cur = this.currentStep(), g = this.guide();
    var chips = steps.map(function (st, i) {
      var done = self.stepDone(st), state = done ? 'done' : (i === cur ? 'now' : 'todo');
      return '<li class="dd-step is-' + state + '"><span class="dd-step-n">' + (done ? ic('check', 11) : (i + 1)) + '</span><span class="dd-step-l">' + esc(self.stepLabel(st)) + '</span></li>';
    }).join('');
    var btn = g.href
      ? '<a class="dd-btn dd-btn-dark dd-glow" href="' + g.href + '" target="_blank" rel="noopener">' + esc(g.btn) + ' ' + ic('arrow', 14) + '</a>'
      : '<button type="button" class="dd-btn dd-btn-dark dd-glow" data-act="' + g.act + '">' + esc(g.btn) + (g.key ? '<kbd>' + g.key + '</kbd>' : '') + '</button>';
    return '<ol class="dd-steps" aria-label="Guided flow">' + chips + '</ol>' +
      '<div class="dd-hint' + (g.done ? ' is-done' : '') + '"><span class="dd-progress">' + Math.min(cur, steps.length) + '/' + steps.length + '</span><p>' + esc(g.text) + '</p>' + btn + '</div>';
  };

  /* ---------- views ---------- */
  P.cards = function () {
    var S = this.S, k = this.route.view === 'home' ? 'home' : this.S.module;
    function sum(dt, f, t) { return S.docs[dt].filter(function (d) { return d.docstatus === 1 && (!t || t(d)); }).reduce(function (s, d) { return s + (+d[f] || 0); }, 0); }
    function count(dt, t) { return S.docs[dt].filter(function (d) { return !d.__new && (!t || t(d)); }).length; }
    var self = this;
    function st(dt) { return function (d) { return self.status(dt, d); }; }
    var oct = function (d) { return (d.posting_date || '').slice(0, 7) === '2026-10'; };
    var stock = this.stockRows();
    var C = {
      home: [['Annual Sales', inr(sum('Sales Invoice', 'rounded_total'))], ['Annual Purchase', inr(sum('Purchase Invoice', 'rounded_total'))], ['Total Stock Value', inr(stock.reduce(function (s, r) { return s + r.value; }, 0))]],
      accounting: [['Total Outgoing Bills', inr(sum('Sales Invoice', 'rounded_total'))], ['Total Incoming Bills', inr(sum('Purchase Invoice', 'rounded_total'))], ['Total Incoming Payment', inr(sum('Payment Entry', 'paid_amount', function (d) { return d.payment_type === 'Receive'; }))]],
      procurement: [['Purchase Orders to Receive', count('Purchase Order', function (d) { return d.docstatus === 1 && /Receive/.test(st('Purchase Order')(d)); })], ['Purchase Orders to Bill', count('Purchase Order', function (d) { return d.docstatus === 1 && /Bill/.test(st('Purchase Order')(d)); })], ['Annual Purchase', inr(sum('Purchase Invoice', 'rounded_total'))]],
      sales: [['Sales Orders to Deliver', count('Sales Order', function (d) { return d.docstatus === 1 && !d.delivered; })], ['Sales Orders to Bill', count('Sales Order', function (d) { return d.docstatus === 1 && !d.billed; })], ['Annual Sales', inr(sum('Sales Invoice', 'rounded_total'))]],
      crm: [['Open Leads', count('Lead', function (d) { return !d.ordered; })], ['Open Opportunities', count('Opportunity', function (d) { return !d.ordered; })], ['Pipeline Value', inrShort(S.docs.Opportunity.filter(function (d) { return !d.__new; }).reduce(function (s, d) { return s + (d.net_total || 0); }, 0))]],
      stock: [['Total Stock Value', inr(stock.reduce(function (s, r) { return s + r.value; }, 0))], ['Total Warehouses', 4], ['Total Active Items', count('Item')]],
      assets: [['Total Assets', count('Asset', function (d) { return d.docstatus === 1; })], ['Asset Value', inr(sum('Asset', 'gross_purchase_amount'))], ['New Assets (This Year)', count('Asset', function (d) { return d.docstatus === 1 && (d.purchase_date || '') >= '2026-04-01'; })]],
      manufacturing: [['Open Work Orders', count('Work Order', function (d) { return d.docstatus === 1 && !d.manufactured && !d.jc; })], ['WIP Work Orders', count('Work Order', function (d) { return d.docstatus === 1 && !d.manufactured && d.jc; })], ['Monthly Completed Work Order', S.docs['Stock Entry'].filter(function (d) { return d.docstatus === 1 && d.stock_entry_type === 'Manufacture'; }).reduce(function (s, d) { return s + d.items.filter(function (r) { return r.fg; }).reduce(function (a, r) { return a + (+r.qty || 0); }, 0); }, 0)]],
      projects: [['Open Projects', count('Project', function (d) { return d.status === 'Open'; })], ['Open Tasks', count('Task', function (d) { return d.status !== 'Completed'; })], ['Hours Logged', sum('Timesheet', 'hours')]],
      pos: [['Sales Today', inrShort(sum('POS Invoice', 'rounded_total'))], ['Orders Today', count('POS Invoice')], ['Shift', S.docs['POS Opening Entry'].some(function (d) { return d.docstatus === 1 && !d.closed; }) ? 'Open' : 'Closed']],
      quality: [['Inspections', count('Quality Inspection', function (d) { return d.docstatus === 1; })], ['Rejected', count('Quality Inspection', function (d) { return d.docstatus === 1 && d.status === 'Rejected'; })], ['Open Non Conformances', count('Non Conformance', function (d) { return d.status === 'Open'; })]],
      support: [['Open Issues', count('Issue', function (d) { return !d.resolved && d.status !== 'Resolved'; })], ['Resolved', count('Issue', function (d) { return d.resolved || d.status === 'Resolved'; })], ['High Priority Open', count('Issue', function (d) { return !d.resolved && /High|Urgent/.test(d.priority); })]]
    };
    return C[k] || [];
  };

  var CHARTS = {
    home: ['Profit and Loss', 'bars', 'accounting'], accounting: ['Profit and Loss', 'bars', 'accounting'], sales: ['Sales Order Analysis', 'bars', 'sales'], procurement: ['Purchase Order Analysis', 'bars', 'procurement'],
    pos: ['Sales Order Analysis', 'bars', 'sales'],
    manufacturing: ['Work Order Analysis', 'pie', 'Your work orders by status, from planned to completed.'], stock: ['Stock Value by Item Group', 'dash', 'The value of stock held in each item group.'],
    projects: ['Project Summary', 'dash', 'Open and completed tasks across your projects.'], assets: ['Asset Value Analytics', 'dash', 'Asset value by category, net of depreciation.'],
    quality: ['Quality Inspection Analysis', 'pie', 'Accepted and rejected inspections over time.'], support: ['Issue Analytics', 'dash', 'Issues opened and resolved each week.'], crm: ['Opportunity Trends', 'dash', 'New opportunities by month and stage.']
  };
  P.chart = function (key) {
    var S = this.S, k = key || this.S.module, cfg = CHARTS[k] || ['Overview', 'dash', ''];
    var acts = '<span class="dd-chart-acts">' + this.iconBtn('filter', 'soon', 'Chart filters') + this.iconBtn('more', 'soon', 'Chart options') + '</span>';
    if (cfg[1] !== 'bars') return '<section class="dd-card dd-chart is-empty"><header><h4>' + esc(cfg[0]) + '</h4>' + acts + '</header><div class="dd-chart-empty"><span>' + ic(cfg[1] === 'pie' ? 'pie' : 'dash', 20) + '</span><p>' + esc(cfg[2]) + '</p></div></section>';
    var months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    var base = { sales: [18.4, 21.2, 19.8, 24.6, 23.1, 27.9], accounting: [14.2, 17.9, 16.1, 20.4, 19.7, 22.3], procurement: [9.6, 11.2, 10.4, 12.8, 13.5, 14.1] }[cfg[2]];
    var dt = cfg[2] === 'procurement' ? 'Purchase Invoice' : 'Sales Invoice';
    var mine = S.docs[dt].filter(function (d) { return !d.seed && d.docstatus === 1; }).reduce(function (s, d) { return s + d.rounded_total; }, 0) / 1e5;
    var vals = base.concat([Math.round((base[5] * 0.68 + mine) * 10) / 10]);
    var max = Math.max.apply(null, vals) * 1.12;
    var bars = vals.map(function (v, i) {
      return '<div class="dd-col"><span class="dd-val dd-tn">' + v.toFixed(1) + '</span><span class="dd-bar' + (i === 6 ? ' is-now' : '') + '" style="height:' + Math.max(2, v / max * 100).toFixed(1) + '%"></span><span class="dd-axis">' + months[i] + '</span></div>';
    }).join('');
    return '<section class="dd-card dd-chart"><header><h4>' + esc(cfg[0]) + '</h4>' + acts + '</header><p class="dd-chart-sub">₹ lakh, FY 2026-27 · October includes what you create here</p>' +
      '<div class="dd-bars" role="img" aria-label="' + esc(cfg[0]) + ': ' + vals.map(function (v, i) { return months[i] + ' ' + v.toFixed(1); }).join(', ') + '">' + bars + '</div></section>';
  };
  P.numCards = function () { return '<div class="dd-nums">' + this.cards().map(function (c) { return '<div class="dd-card dd-num"><span>' + esc(c[0]) + '</span><strong class="dd-tn">' + esc(c[1]) + '</strong></div>'; }).join('') + '</div>'; };

  /* module Dashboard: charts and number cards, like ERPNext's dashboard view */
  P.vDash = function () {
    var m = this.mod();
    return this.head('<h2>' + esc(m.ws) + ' Dashboard</h2>', '<button type="button" class="dd-btn" data-act="soon" data-what="dashboard filters">' + ic('filter', 15) + ' Filter</button>' + this.iconBtn('refresh', 'refresh', 'Reload') + this.iconBtn('more', 'soon', 'Menu')) +
      this.wrap(this.numCards() + '<div class="dd-dash-gap"></div>' + this.chart());
  };
  var WSREAL = (global.ERPReal || {}).ws || {};
  P.wsLink = function (l) {
    var R = global.ERPReal || {}, label = l[0], type = l[1], to = l[2];
    if (type === 'DocType' && DT[to]) return '<a href="#" data-act="list" data-dt="' + esc(to) + '">' + esc(label) + '</a>';
    if ((R.lists && R.lists[to]) || (R.reports && R.reports[to]) || (R.singles && R.singles[to]) || VIEWS()[to] || (type === 'Report' && this.liveReport && this.liveReport(to)))
      return '<a href="#" data-act="view" data-view="' + esc(to) + '">' + esc(label) + '</a>';
    return '<a href="#" data-act="soon" data-what="' + esc(label) + '">' + esc(label) + '</a>';
  };
  /* (unused) old dashboard tours card; tours now live in the top-bar menu */
  P.dashTours = function () {
    var k = this.S.module, only = this.opts.tourModules;
    if (!this.opts.experience || !only || only.indexOf(k) < 0 || !this.tours(k).length) return '';
    var c = this.tourCount(k);
    return '<section class="dd-card dd-getstarted dd-ws-tours dd-dash-tours"><header><div><h3>Guided tours</h3><p class="dd-muted">Watch ERPNext run ' + esc(this.mod().ws) + ' work end to end. Each step plays on its own; press Next to move on.</p></div><span class="dd-muted dd-tn">' + c.done + ' of ' + c.all + ' done</span></header>' + this.tourRows(k) + '</section>';
  };
  P.vWorkspace = function () {
    var m = this.mod(), self = this, real = WSREAL[m.ws];
    var links = real ? '<div class="dd-wslinks">' + real.cards.map(function (g) {
      return '<div><h5>' + esc(g[0]) + '</h5>' + g[1].map(function (l) { return self.wsLink(l); }).join('') + '</div>';
    }).join('') + '</div>' : '<div class="dd-wslinks">' + m.links.map(function (g) {
      return '<div><h5>' + esc(g[0]) + '</h5>' + g[1].map(function (l) {
        if (l.indexOf('report:') === 0) return '<a href="#" data-act="report" data-report="' + esc(l.slice(7)) + '">' + esc(l.slice(7)) + '</a>';
        if (l.indexOf('pos:') === 0) return '<a href="#" data-act="pos">' + esc(l.slice(4)) + '</a>';
        return '<a href="#" data-act="list" data-dt="' + esc(l) + '">' + esc(l) + '</a>';
      }).join('') + '</div>';
    }).join('') + '</div>';
    var acts = (m.key === 'pos' ? '<button type="button" class="dd-btn dd-btn-dark" data-act="pos">Point of Sale</button>' : '') + this.iconBtn('more', 'soon', 'Workspace options');
    return this.head('<h2>' + esc(m.ws) + '</h2>', acts) +
      this.wrap(this.chart() + this.numCards() + links + (this.opts.experience ? '' : this.tourStrip(m.key)));
  };

  P.vList = function () {
    if (this.route.dt === 'Account' && this.vTree) return this.vTree({ key: 'coa', title: 'Chart of Accounts', dt: 'Account', nodes: this.coaNodes(), balances: true, company: true });
    var self = this, dt = this.route.dt, def = DT[dt], f = this.listFilter[dt] || {};
    var all = this.S.docs[dt].filter(function (d) { return !d.__new; }).slice().sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
    var statuses = []; all.forEach(function (d) { var s = self.status(dt, d); if (s && statuses.indexOf(s) < 0) statuses.push(s); });
    var rows = all.filter(function (d) {
      if (f.q && (d.name + ' ' + (def.title(d) || '')).toLowerCase().indexOf(f.q.toLowerCase()) < 0) return false;
      if (f.status && self.status(dt, d) !== f.status) return false;
      return true;
    });
    var cols = def.listCols || (def.items ? [['Date', def.fields.filter(function (x) { return x.type === 'date'; })[0].key, 'date'], ['Grand Total', 'rounded_total', 'currency']] : []);
    var showStatus = !def.master;
    var idFirst = !!def.listIdFirst;
    var tlabel = idFirst ? 'ID' : def.listTitle || (def.master ? (dt === 'Account' ? 'Account Name' : dt + ' Name') : this.label(def.fields[0]));
    var S0 = this.S;
    function cellv(c, d) {
      var v = c[1] === '__company' ? S0.company : c[1] === 'is_active' ? d.docstatus === 1 : d[c[1]];
      if (c[2] === 'check') return '<td><input type="checkbox" tabindex="-1" disabled' + (v ? ' checked' : '') + ' aria-label="' + esc(c[0]) + '"/></td>';
      return '<td' + (c[2] === 'currency' ? ' class="dd-r dd-tn"' : '') + '>' + (c[2] === 'currency' ? (v != null ? inr(v) : '') : c[2] === 'date' ? fdate(v) : esc(v == null ? '' : v)) + '</td>';
    }
    var head = '<tr><th class="dd-cb"><input type="checkbox" aria-label="Select all" tabindex="-1"/></th><th>' + esc(tlabel) + '</th>' + (showStatus ? '<th>Status</th>' : '') + cols.map(function (c) { return '<th' + (c[2] === 'currency' ? ' class="dd-r"' : '') + '>' + esc(c[0]) + '</th>'; }).join('') + (idFirst ? '' : '<th>ID</th>') + '<th class="dd-r dd-lcount">' + rows.length + ' of ' + all.length + ' ' + ic('heart', 14) + '</th></tr>';
    var body = rows.map(function (d) {
      return '<tr data-act="open" data-dt="' + esc(dt) + '" data-name="' + esc(d.name) + '" tabindex="0"><td class="dd-cb"><input type="checkbox" aria-label="Select" tabindex="-1"/></td><td class="dd-strong">' + esc(idFirst ? d.name : def.title(d) || d.name) + '</td>' +
        (showStatus ? '<td>' + pill(self.status(dt, d)) + '</td>' : '') +
        cols.map(function (c) { return cellv(c, d); }).join('') +
        (idFirst ? '' : '<td class="dd-tn dd-lid">' + esc(d.name) + '</td>') + '<td class="dd-r dd-lmeta"><span>' + (d.seed ? '1 d' : 'now') + '</span>' + ic('msg', 14) + '<span>0</span><span>·</span>' + ic('heart', 14) + '</td></tr>';
    }).join('');
    var empty = '<div class="dd-empty">' + ic('file', 28) + '<p>No ' + esc(dt) + ' found</p><button type="button" class="dd-btn dd-btn-dark" data-act="new" data-dt="' + esc(dt) + '">Create your first ' + esc(dt) + '</button></div>';
    var add = def.readonly
      ? '<button type="button" class="dd-btn dd-btn-dark" data-act="pos">' + ic('monitor', 14) + ' Open Point of Sale</button>'
      : '<button type="button" class="dd-btn dd-btn-dark" data-act="new" data-dt="' + esc(dt) + '">' + ic('plus', 14) + ' Add ' + esc(dt) + '</button>';
    var acts = '<button type="button" class="dd-btn" data-act="soon" data-what="other views">' + ic(dt === 'Account' ? 'listtree' : 'listv', 15) + (dt === 'Account' ? ' Tree View ' : ' List View ') + ic('updown', 14) + '</button>' + this.iconBtn('refresh', 'refresh', 'Reload') + this.iconBtn('more', 'soon', 'Menu') + add;
    var filters = '<div class="dd-filters"><span class="dd-lf-id"><input id="dd-f-q" class="dd-ctl" type="text" placeholder="ID" data-filter="q" value="' + esc(f.q || '') + '"/><i aria-hidden="true">≈</i></span>' +
      (showStatus ? '<select id="dd-f-status" class="dd-ctl" data-filter="status"><option value="">Status</option>' + statuses.map(function (s) { return '<option' + (s === f.status ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>' : '') +
      '<span class="dd-lf-sp"></span><span class="dd-seg"><button type="button" class="dd-btn" data-act="soon" data-what="filters">' + ic('filter', 15) + ' Filter</button><button type="button" class="dd-btn dd-btn-icon" data-act="soon" data-what="filters" aria-label="Clear filters">' + ic('x', 15) + '</button></span>' +
      '<span class="dd-seg"><button type="button" class="dd-btn dd-btn-icon" data-act="soon" data-what="sorting" aria-label="Sort order">' + ic('sort', 15) + '</button><button type="button" class="dd-btn" data-act="soon" data-what="sorting">Created On ' + ic('down', 14) + '</button></span></div>';
    var pager = '<div class="dd-pager"><span class="dd-seg"><button type="button" class="dd-btn is-on">20</button><button type="button" class="dd-btn" data-act="soon" data-what="paging">100</button><button type="button" class="dd-btn" data-act="soon" data-what="paging">500</button><button type="button" class="dd-btn" data-act="soon" data-what="paging">2500</button></span></div>';
    return this.head('<h2>' + esc(dt === 'Account' ? 'Chart of Accounts' : dt) + '</h2>', acts) +
      this.wrap(filters + (rows.length ? '<div class="dd-tablewrap"><table class="dd-table dd-list">' + head + body + '</table></div>' + pager : empty), true);
  };

  P.field = function (f, d, locked) {
    var S = this.S, v = d[f.key], id = 'dd-' + f.key;
    if (f.show && !f.show(d, S)) return '';
    if (f.hideEmpty && !v && locked) return '';
    var lab = '<label for="' + id + '">' + esc(this.label(f)) + (f.req && !locked ? '<b>*</b>' : '') + '</label>';
    if (f.type === 'ro') return '<div class="dd-fld">' + lab + '<div class="dd-ro" id="' + id + '">' + esc(f.get(d, S)) + '</div></div>';
    if (locked) {
      var shown = f.type === 'date' ? fdate(v) : f.type === 'currency' ? inr(v) : f.type === 'check' ? (v ? 'Yes' : 'No') : (v == null ? '' : v);
      var extra = f.party ? this.partyMeta(v) : '';
      return '<div class="dd-fld' + (f.type === 'text' ? ' dd-wide' : '') + '">' + lab + '<div class="dd-ro dd-locked" id="' + id + '">' + esc(shown) + '</div>' + extra + '</div>';
    }
    var ctl;
    if (f.type === 'select' || f.type === 'link') {
      var opts = typeof f.options === 'function' ? f.options(S, d) : f.options;
      if (v && opts.indexOf(v) < 0) opts = opts.concat([v]);
      ctl = '<select id="' + id + '" class="dd-ctl" data-field="' + f.key + '">' + (f.type === 'link' ? '<option value="">' + (f.req ? 'Select…' : '') + '</option>' : '') + opts.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
    } else if (f.type === 'text') {
      ctl = '<textarea id="' + id + '" class="dd-ctl" rows="3" data-field="' + f.key + '">' + esc(v || '') + '</textarea>';
    } else if (f.type === 'check') {
      return '<div class="dd-fld dd-checkf"><label class="dd-check"><input id="' + id + '" type="checkbox" data-field="' + f.key + '"' + (v ? ' checked' : '') + '/> ' + esc(this.label(f)) + '</label></div>';
    } else {
      if (f.type === 'date') ctl = '<input id="' + id + '" class="dd-ctl dd-tn" type="text" inputmode="numeric" placeholder="dd-mm-yyyy" data-date="1" data-field="' + f.key + '" value="' + esc(v ? fdate(v) : '') + '"/>';
      else {
        var t = (f.type === 'int' || f.type === 'float' || f.type === 'currency') ? 'number' : 'text';
        ctl = '<input id="' + id + '" class="dd-ctl' + (t === 'number' ? ' dd-tn' : '') + '" type="' + t + '"' + (t === 'number' ? ' step="any" min="0"' : '') + ' data-field="' + f.key + '" value="' + esc(v == null ? '' : v) + '"/>';
      }
    }
    return '<div class="dd-fld' + (f.type === 'text' ? ' dd-wide' : '') + '">' + lab + ctl + (f.party ? this.partyMeta(v) : '') + '</div>';
  };
  P.partyMeta = function (name) {
    if (!name) return '';
    var c = this.S.docs.Customer.concat(this.S.docs.Supplier).filter(function (x) { return x.name === name; })[0];
    if (!c) return '<small class="dd-help">New customer. It is created when you save.</small>';
    var inter = c.state !== this.S.state;
    return '<small class="dd-help">' + esc(c.gstin || 'Unregistered') + ' · ' + esc(c.state) + ' · ' + (inter ? 'Inter-state, IGST applies' : 'Intra-state, CGST + SGST apply') + '</small>';
  };

  P.vForm = function () {
    var self = this, r = this.route, dt = r.dt, d = r.doc, def = DT[dt], S = this.S;
    var locked = (def.submit && d.docstatus === 1) || def.readonly;
    var status = this.status(dt, d);
    var title = d.__new ? 'New ' + dt : (def.master ? def.title(d) : d.name);
    var acts = [];
    if (!locked) {
      if (d.__new || d.__dirty || !def.submit) acts.push('<button type="button" class="dd-btn dd-btn-dark" data-act="save">Save</button>');
      else acts.push('<button type="button" class="dd-btn dd-btn-dark" data-act="submit">Submit</button>');
    }
    if (d.__new && def.items && def.taxes) acts.unshift('<button type="button" class="dd-btn" data-act="soon" data-what="Get Items From">Get Items From ' + ic('updown', 14) + '</button>');
    var targets = [];
    if (!d.__new && !d.__dirty && (!def.submit || d.docstatus === 1)) {
      Object.keys(DT).forEach(function (k) { if (DT[k].sources && DT[k].sources[dt]) targets.push(k); });
      var cur = this.mod().steps[this.currentStep()];
      var hot = !this.opts.experience && cur && cur.src === dt ? cur.dt : null;
      targets.sort(function (a, b) { return (b === hot) - (a === hot); });
      if (dt === 'POS Opening Entry' && !d.closed) acts.unshift('<button type="button" class="dd-btn dd-btn-dark" data-act="pos">' + ic('monitor', 14) + ' Open Point of Sale</button>');
      if (targets.length) {
        acts.unshift('<div class="dd-menu"><button type="button" class="dd-btn' + (hot ? ' dd-btn-dark dd-glow' : '') + '" data-act="menu" aria-haspopup="true" aria-expanded="false">Create ' + ic('down', 14) + '</button><div class="dd-menu-pop" hidden>' +
          targets.map(function (k) { return '<button type="button" data-act="create" data-dt="' + esc(k) + '">' + esc(k) + (k === hot ? '<em>Next</em>' : '') + '</button>'; }).join('') + '</div></div>');
      }
      if (def.submit && !def.master) acts.unshift(this.iconBtn('print', 'print', 'Print'));
      if (def.submit && !def.master && (d.customer || d.supplier)) acts.unshift(this.iconBtn('mail', 'email', 'Email'));
      acts.unshift(this.iconBtn('more', 'soon', 'Menu'));
    }
    function ro(label, val, wide, id) { return '<div class="dd-fld' + (wide ? ' dd-wide' : '') + '"><label>' + esc(label) + '</label><div class="dd-ro"' + (id ? ' id="' + id + '"' : '') + '>' + esc(val) + '</div></div>'; }
    var fields = def.fields.map(function (f) { return self.field(f, d, locked); }).join('');
    var items = '';
    if (def.items) {
      var iopts = S.docs.Item.map(function (i) { return i.name; });
      var tq = 0;
      var rows = d.items.map(function (row, i) {
        var it = D.itemDoc(S, row.item_code);
        tq += +row.qty || 0;
        var itemCell = locked ? '<span class="dd-strong">' + esc(row.item_code) + '</span>' + (it ? '<small>' + esc(it.item_name) + '</small>' : '') + (row.fg ? '<span class="dd-pill dd-blue">Finished Good</span>' : '')
          : '<select class="dd-ctl dd-cell" aria-label="Item" data-row="' + i + '" data-col="item_code"><option value=""></option>' + iopts.map(function (o) { return '<option' + (o === row.item_code ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>' + (row.fg ? '<span class="dd-pill dd-blue">Finished Good</span>' : '');
        var q = locked ? num(row.qty) + ' <small class="dd-uom">' + esc(it ? it.stock_uom : '') + '</small>' : '<input class="dd-ctl dd-cell dd-tn dd-r" type="number" step="any" min="0" aria-label="Quantity" data-row="' + i + '" data-col="qty" value="' + esc(row.qty) + '"/>';
        var rt = locked ? inr(row.rate) : '<input class="dd-ctl dd-cell dd-tn dd-r" type="number" step="any" min="0" aria-label="Rate" data-row="' + i + '" data-col="rate" value="' + esc(row.rate) + '"/>';
        return '<tr><td class="dd-cb"><input type="checkbox" tabindex="-1" aria-label="Select row"/></td><td class="dd-tn dd-gno">' + (i + 1) + '</td><td>' + itemCell + '</td><td class="dd-r dd-tn">' + q + '</td><td class="dd-r dd-tn">' + rt + '</td><td class="dd-r dd-tn">' + inr(row.amount) + '</td><td class="dd-gico">' + ic('pencil', 14) + '</td></tr>';
      }).join('');
      var gbtns = locked ? '' : '<div class="dd-gbtns"><span><button type="button" class="dd-btn" data-act="addrow">Add row</button><button type="button" class="dd-btn" data-act="soon" data-what="Add multiple">Add multiple</button></span><span><button type="button" class="dd-btn" data-act="soon" data-what="Download">Download</button><button type="button" class="dd-btn" data-act="soon" data-what="Upload">Upload</button></span></div>';
      items = '<section class="dd-sec"><div class="dd-glabel">' + esc(def.itemsLabel || 'Items') + '</div><div class="dd-tablewrap"><table class="dd-table dd-grid"><tr><th class="dd-cb"><input type="checkbox" tabindex="-1" aria-label="Select all rows"/></th><th class="dd-gno">No.</th><th>Item Code</th><th class="dd-r">Quantity<b>*</b></th><th class="dd-r">Rate</th><th class="dd-r">Amount</th><th class="dd-gico">' + ic('gear', 14) + '</th></tr>' + rows + '</table></div>' + gbtns +
        '<div class="dd-fields dd-fields-3 dd-tot1">' + ro('Total Quantity', num(tq)) + ro(def.taxes ? 'Total (INR)' : (dt === 'BOM' ? 'Raw Material Cost (INR)' : 'Total (INR)'), inr(d.net_total)) + (def.taxes ? ro('Net Total (INR)', inr(d.net_total)) : '') + '</div></section>';
      if (def.taxes) {
        var inState = !(d.taxes || []).some(function (t) { return /IGST/.test(t.head); });
        var runTotal = +d.net_total || 0;
        var tax = (d.taxes || []).map(function (t, i) { runTotal += +t.amount || 0; var m = /@ ([\d.]+)%/.exec(t.head); return '<tr><td class="dd-cb"><input type="checkbox" tabindex="-1" aria-label="Select row"/></td><td class="dd-tn dd-gno">' + (i + 1) + '</td><td>On Net Total</td><td>' + esc(t.head.replace(/ @ [\d.]+%$/, '') + ' - ' + S.abbr) + '</td><td class="dd-r dd-tn">' + (m ? m[1] : '') + '</td><td class="dd-r dd-tn">' + inr(t.amount) + '</td><td class="dd-r dd-tn">' + inr(runTotal) + '</td></tr>'; }).join('');
        var tplName = (def.taxes === 'in' ? 'Input GST ' : 'Output GST ') + (inState ? 'In-state' : 'Out-state') + ' - ' + S.abbr;
        items += '<section class="dd-sec dd-totals"><h4>Taxes and Charges</h4><div class="dd-fields dd-fields-3">' + ro((def.taxes === 'in' ? 'Purchase' : 'Sales') + ' Taxes and Charges Template', d.items.some(function (x) { return x.item_code; }) ? tplName : '') + ro('Tax Category', inState ? 'In-State' : 'Out-State') + ro('Shipping Rule', '') + '</div>' +
          '<div class="dd-glabel">' + (def.taxes === 'in' ? 'Purchase' : 'Sales') + ' Taxes and Charges</div><div class="dd-tablewrap"><table class="dd-table dd-grid dd-taxes"><tr><th class="dd-cb"><input type="checkbox" tabindex="-1" aria-label="Select all rows"/></th><th class="dd-gno">No.</th><th>Type<b>*</b></th><th>Account Head<b>*</b></th><th class="dd-r">Tax Rate</th><th class="dd-r">Amount</th><th class="dd-r">Total</th></tr>' + (tax || '<tr><td colspan="7" class="dd-norows">No rows</td></tr>') + '</table></div>' +
          '<div class="dd-fields dd-fields-2">' + ro('Total Taxes and Charges (INR)', inr(d.total_taxes)) + '</div></section>' +
          '<section class="dd-sec"><h4>Totals</h4><div class="dd-fields dd-fields-3">' + ro('Grand Total (INR)', inr(d.grand_total)) + ro('Rounding Adjustment (INR)', inr(Math.round(((d.rounded_total || 0) - (d.grand_total || 0)) * 100) / 100)) + ro('Rounded Total (INR)', inr(d.rounded_total)) + ro('In Words (INR)', words(d.rounded_total), true) + '</div></section>';
      } else items = items.replace('<section class="dd-sec">', '<section class="dd-sec dd-totals">');
    }
    var conns = '';
    if (!d.__new) {
      var links = [];
      if (d.from) links.push(['From', d.from.dt, d.from.name]);
      this.children(dt, d.name).forEach(function (c) { links.push(['Created', c[0], c[1].name]); });
      if (links.length) conns = '<section class="dd-sec"><h4>Connections</h4><div class="dd-conns">' + links.map(function (l) { return '<a href="#" class="dd-conn" data-act="open" data-dt="' + esc(l[1]) + '" data-name="' + esc(l[2]) + '">' + ic('link', 13) + '<span class="dd-muted">' + esc(l[1]) + '</span> ' + esc(l[2]) + '</a>'; }).join('') + '</div></section>';
    }
    var tabs = '<nav class="dd-tabs"><span class="is-on">Details</span>' + (def.taxes ? '<span>Address &amp; Contact</span><span>Terms</span>' : '') + (conns ? '<span>Connections</span>' : '') + '<span>More Info</span></nav>';
    return this.head('<a href="#" class="dd-hcrumb" data-act="list" data-dt="' + esc(dt) + '">' + esc(dt === 'Account' ? 'Chart of Accounts' : dt) + '</a><i>/</i><h2>' + esc(title) + '</h2>' + (status ? pill(status) : ''), acts.join('')) + tabs +
      '<div class="dd-form' + (locked ? ' is-locked' : '') + '">' + this.wrap('<section class="dd-sec"><div class="dd-fields dd-fields-3">' + fields + '</div></section>' + items + conns) + '</div>';
  };

  /* ---------- reports ---------- */
  P.glRows = function () {
    var S = this.S, rows = [], self = this;
    function add(date, acc, dr, cr, vt, vn, party) { rows.push({ date: date, acc: acc, dr: dr, cr: cr, vt: vt, vn: vn, party: party || '' }); }
    function bank(mode) { return mode === 'Cash' ? self.acc('Cash') : self.acc('HDFC Bank'); }
    var vouchers = [];
    ['Sales Invoice', 'POS Invoice', 'Purchase Invoice', 'Payment Entry', 'Journal Entry'].forEach(function (dt) {
      S.docs[dt].forEach(function (d) { if (d.docstatus === 1) vouchers.push([dt, d]); });
    });
    vouchers.sort(function (a, b) { return (a[1].posting_date || '').localeCompare(b[1].posting_date || '') || (a[1].created - b[1].created); });
    vouchers.forEach(function (v) {
      var dt = v[0], d = v[1];
      if (dt === 'Sales Invoice' || dt === 'POS Invoice') {
        self.calc(dt, d);
        add(d.posting_date, dt === 'POS Invoice' ? bank(d.mode_of_payment) : self.acc('Debtors'), d.rounded_total, 0, dt, d.name, d.customer);
        add(d.posting_date, self.acc('Sales'), 0, d.net_total, dt, d.name);
        d.taxes.forEach(function (t) { add(d.posting_date, t.head.replace(/ @ [\d.]+%$/, '') + ' - ' + S.abbr, 0, t.amount, dt, d.name); });
        var ro = Math.round((d.rounded_total - d.grand_total) * 100) / 100;
        if (ro) add(d.posting_date, self.acc('Round Off'), ro < 0 ? -ro : 0, ro > 0 ? ro : 0, dt, d.name);
      } else if (dt === 'Purchase Invoice') {
        self.calc(dt, d);
        add(d.posting_date, self.acc('Stock Received But Not Billed'), d.net_total, 0, dt, d.name);
        d.taxes.forEach(function (t) { add(d.posting_date, t.head.replace(/ @ [\d.]+%$/, '') + ' - ' + S.abbr, t.amount, 0, dt, d.name); });
        var ro2 = Math.round((d.rounded_total - d.grand_total) * 100) / 100;
        if (ro2) add(d.posting_date, self.acc('Round Off'), ro2 > 0 ? ro2 : 0, ro2 < 0 ? -ro2 : 0, dt, d.name);
        add(d.posting_date, self.acc('Creditors'), 0, d.rounded_total, dt, d.name, d.supplier);
      } else if (dt === 'Payment Entry') {
        if (d.payment_type === 'Receive') { add(d.posting_date, bank(d.mode_of_payment), d.paid_amount, 0, dt, d.name); add(d.posting_date, self.acc('Debtors'), 0, d.paid_amount, dt, d.name, d.party); }
        else { add(d.posting_date, self.acc('Creditors'), d.paid_amount, 0, dt, d.name, d.party); add(d.posting_date, bank(d.mode_of_payment), 0, d.paid_amount, dt, d.name); }
      } else {
        add(d.posting_date, d.debit_account, +d.amount, 0, dt, d.name);
        add(d.posting_date, d.credit_account, 0, +d.amount, dt, d.name);
      }
    });
    return rows;
  };
  P.stockRows = function () {
    var S = this.S, m = {};
    function mv(code, q, rate) {
      var it = D.itemDoc(S, code);
      if (!it || !it.is_stock_item) return;
      var r = m[code] || (m[code] = { code: code, name: it.item_name, uom: it.stock_uom, inq: 0, outq: 0, val: 0, vq: 0 });
      if (q > 0) { r.inq += q; r.val += q * rate; r.vq += q; } else r.outq += -q;
    }
    Object.keys(DT).forEach(function (dt) {
      S.docs[dt].forEach(function (d) {
        if (d.docstatus !== 1 || !d.items) return;
        if (dt === 'Stock Entry') {
          d.items.forEach(function (r) {
            var t = d.stock_entry_type;
            if (t === 'Material Receipt') mv(r.item_code, +r.qty, +r.rate);
            else if (t === 'Material Issue') mv(r.item_code, -r.qty, 0);
            else if (t === 'Manufacture') mv(r.item_code, r.fg ? +r.qty : -r.qty, +r.rate);
          });
        } else if (DT[dt].stock) d.items.forEach(function (r) { mv(r.item_code, DT[dt].stock * r.qty, +r.rate); });
      });
    });
    return Object.keys(m).map(function (k) { var r = m[k]; r.bal = r.inq - r.outq; r.rate = r.vq ? r.val / r.vq : 0; r.value = r.bal * r.rate; return r; });
  };
  P.vReport = function () {
    var self = this, name = this.route.report, S = this.S, cols, rows, foot = null, note = '';
    if (name === 'General Ledger') {
      var g = this.glRows(), dr = 0, cr = 0;
      cols = [['Posting Date'], ['Account'], ['Debit (INR)', 1], ['Credit (INR)', 1], ['Voucher Type'], ['Voucher No'], ['Party']];
      rows = g.map(function (r) { dr += r.dr; cr += r.cr; return [fdate(r.date), r.acc, r.dr ? num(r.dr) : '', r.cr ? num(r.cr) : '', r.vt, { link: r.vn, dt: r.vt }, r.party]; });
      foot = ['', 'Total', num(dr), num(cr), '', '', ''];
      note = 'Every submitted invoice, payment and journal posts double-entry rows here. Debits always equal credits.';
    } else if (name === 'Accounts Receivable') {
      cols = [['Posting Date'], ['Customer'], ['Voucher No'], ['Due Date'], ['Invoiced (INR)', 1], ['Outstanding (INR)', 1], ['Age (Days)', 1]];
      var tot = 0;
      rows = S.docs['Sales Invoice'].filter(function (d) { return d.docstatus === 1 && !d.paid; }).map(function (d) {
        tot += d.rounded_total;
        var age = Math.round((new Date(D.TODAY) - new Date(d.posting_date)) / 864e5);
        return [fdate(d.posting_date), d.customer, { link: d.name, dt: 'Sales Invoice' }, fdate(d.due_date), num(d.rounded_total), num(d.rounded_total), String(age)];
      });
      foot = ['', 'Total', '', '', '', num(tot), ''];
    } else if (name === 'Stock Balance') {
      cols = [['Item'], ['Item Name'], ['UOM'], ['In Qty', 1], ['Out Qty', 1], ['Balance Qty', 1], ['Valuation Rate', 1], ['Balance Value (INR)', 1]];
      var tv = 0;
      rows = this.stockRows().map(function (r) { tv += r.value; return [r.code, r.name, r.uom, num(r.inq), num(r.outq), num(r.bal), num(r.rate), num(r.value)]; });
      foot = ['Total', '', '', '', '', '', '', num(tv)];
      note = 'Receipts, deliveries, POS sales and manufacture entries move stock in real time, valued at moving average.';
    } else {
      cols = [['Project'], ['Customer'], ['Status'], ['Tasks Done', 1], ['Hours Logged', 1], ['Billed (INR)', 1]];
      rows = S.docs.Project.filter(function (p) { return !p.__new; }).map(function (p) {
        var tasks = S.docs.Task.filter(function (t) { return t.project === p.name && !t.__new; });
        var ts = S.docs.Timesheet.filter(function (t) { return t.project === p.name && t.docstatus === 1; });
        var billed = S.docs['Sales Invoice'].filter(function (s) { return s.project === p.name && s.docstatus === 1; }).reduce(function (a, s) { return a + s.rounded_total; }, 0);
        return [{ link: p.name, dt: 'Project' }, p.customer || '', p.status, tasks.filter(function (t) { return t.status === 'Completed'; }).length + '/' + tasks.length, num(ts.reduce(function (a, t) { return a + (+t.hours || 0); }, 0)), num(billed)];
      });
    }
    var head = '<tr>' + cols.map(function (c) { return '<th' + (c[1] ? ' class="dd-r"' : '') + '>' + esc(c[0]) + '</th>'; }).join('') + '</tr>';
    var body = rows.map(function (r) { return '<tr>' + r.map(function (v, i) {
      var cell = v && typeof v === 'object' && v.link ? '<a href="#" data-act="open" data-dt="' + esc(v.dt) + '" data-name="' + esc(v.link) + '">' + esc(v.link) + '</a>' : esc(v);
      return '<td' + (cols[i][1] ? ' class="dd-r dd-tn"' : '') + '>' + cell + '</td>'; }).join('') + '</tr>'; }).join('');
    var ft = foot ? '<tr class="dd-foot">' + foot.map(function (v, i) { return '<td' + (cols[i][1] ? ' class="dd-r dd-tn"' : '') + '>' + esc(v) + '</td>'; }).join('') + '</tr>' : '';
    return this.head('<h2>' + esc(name) + '</h2>', '<button type="button" class="dd-btn" data-act="soon" data-what="report actions">Actions ' + ic('down', 14) + '</button>' + this.iconBtn('refresh', 'refresh', 'Reload') + this.iconBtn('more', 'soon', 'Menu')) +
      this.wrap('<div class="dd-filters dd-rfilters"><span class="dd-ctl dd-fake">' + esc(S.company) + '</span><span class="dd-ctl dd-fake">01-04-2026</span><span class="dd-ctl dd-fake">31-03-2027</span></div>' + (note ? '<p class="dd-note">' + esc(note) + '</p>' : '') +
      '<div class="dd-tablewrap"><table class="dd-table dd-report">' + head + (body || '<tr><td colspan="' + cols.length + '" class="dd-muted">Nothing to show yet</td></tr>') + ft + '</table></div>', true);
  };

  /* ---------- read-only pages (sidebar sub-sections) ---------- */
  function VIEWS() { return global.ERPViews || {}; }
  P.fill = function (str) {
    var S = this.S, R = S.R, it = function (c) { return D.itemDoc(S, c) || { item_name: c, standard_rate: 0 }; };
    var map = { C: S.company, A: S.abbr, S: S.state, C1: R.C1, C2: R.C2, C3: R.C3, C4: R.C4, S1: R.S1, S2: R.S2, S3: R.S3,
      FG1: it(R.FG1).item_name, FG2: it(R.FG2).item_name, RM1: it(R.RM1).item_name, RM2: it(R.RM2).item_name, RM3: it(R.RM3).item_name,
      FG1C: R.FG1, FG2C: R.FG2, FG1R: num(it(R.FG1).standard_rate), FG2R: num(it(R.FG2).standard_rate), RM1R: num(it(R.RM1).standard_rate) };
    return String(str).replace(/\{([A-Z0-9]+)\}/g, function (m, k) { return map[k] != null ? map[k] : m; });
  };
  P.vView = function () {
    var self = this, name = this.route.name, vw = VIEWS()[name];
    if (!vw) return this.head('<h2>' + esc(name) + '</h2>') + this.wrap('<div class="dd-empty"><p>Nothing here yet.</p></div>');
    function col(c) { var p = c.split(':'); return { label: p[0], t: p[1] || '' }; }
    function cell(v, c) {
      v = self.fill(v);
      if (c.t === 'pill') return '<td>' + pill(v) + '</td>';
      if (c.t === 'check') return '<td><input type="checkbox" tabindex="-1" disabled' + (v === '1' ? ' checked' : '') + ' aria-label="' + esc(c.label) + '"/></td>';
      return '<td' + (c.t === 'r' ? ' class="dd-r dd-tn"' : '') + '>' + esc(v) + '</td>';
    }
    if (vw.kind === 'report' && this.viewReport) { var live = this.liveReport && this.liveReport(name); return live ? this[live]() : this.viewReport(name, vw); }
    if (vw.kind === 'tree' && this.vTree) {
      var conv = function (list) { return list.map(function (n) { return { label: self.fill(n[0]), kids: conv(n[1] || []) }; }); };
      return this.vTree({ key: 'v:' + name, title: name, dt: name, nodes: conv(vw.nodes), company: !!vw.company });
    }
    if (vw.kind === 'single') {
      var secs = vw.secs.map(function (sc, i) {
        return '<section class="dd-sec">' + (i || vw.secs.length > 1 ? '<h4>' + esc(sc[0]) + '</h4>' : '') + '<div class="dd-fields dd-fields-3">' + sc[1].map(function (f) {
          var val = self.fill(f[1]), yes = val === 'Yes' || val === 'No';
          return yes ? '<div class="dd-fld dd-checkf"><label class="dd-check"><input type="checkbox" tabindex="-1" data-act="vsave" data-what="' + esc(name) + '"' + (val === 'Yes' ? ' checked' : '') + '/> ' + esc(f[0]) + '</label></div>'
            : '<div class="dd-fld"><label>' + esc(f[0]) + '</label><div class="dd-ro dd-vfield" data-act="vsave" data-what="' + esc(name) + '">' + esc(val) + '</div></div>';
        }).join('') + '</div></section>';
      }).join('');
      return this.head('<h2>' + esc(name) + '</h2>', '<button type="button" class="dd-btn dd-btn-dark" data-act="vsave" data-what="' + esc(name) + '">Save</button>') +
        '<nav class="dd-tabs"><span class="is-on">Details</span></nav><div class="dd-form">' + this.wrap(secs) + '</div>';
    }
    var cols = vw.cols.map(col);
    var rows = vw.rows.map(function (r) {
      return '<tr' + (vw.kind === 'list' ? ' data-act="vopen" data-dt="' + esc(name) + '" tabindex="0"' : '') + '>' + (vw.kind === 'list' ? '<td class="dd-cb"><input type="checkbox" aria-label="Select" tabindex="-1"/></td>' : '') +
        r.map(function (v, i) { var c = cols[i]; return i === 0 && c.t === '' && vw.kind === 'list' ? '<td class="dd-strong">' + esc(self.fill(v)) + '</td>' : cell(v, c); }).join('') +
        (vw.kind === 'list' ? '<td class="dd-r dd-lmeta"><span>' + (r.length % 2 ? '2 d' : '5 d') + '</span>' + ic('msg', 14) + '<span>0</span></td>' : '') + '</tr>';
    }).join('');
    var head = '<tr>' + (vw.kind === 'list' ? '<th class="dd-cb"><input type="checkbox" aria-label="Select all" tabindex="-1"/></th>' : '') + cols.map(function (c) { return '<th' + (c.t === 'r' ? ' class="dd-r"' : '') + '>' + esc(c.label) + '</th>'; }).join('') +
      (vw.kind === 'list' ? '<th class="dd-r dd-lcount">' + vw.rows.length + ' of ' + vw.rows.length + ' ' + ic('heart', 14) + '</th>' : '') + '</tr>';
    if (vw.kind === 'report') {
      return this.head('<h2>' + esc(name) + '</h2>', '<button type="button" class="dd-btn" data-act="soon" data-what="report actions">Actions ' + ic('down', 14) + '</button>' + this.iconBtn('refresh', 'refresh', 'Reload') + this.iconBtn('more', 'soon', 'Menu')) +
        this.wrap('<div class="dd-filters dd-rfilters"><span class="dd-ctl dd-fake">' + esc(this.S.company) + '</span><span class="dd-ctl dd-fake">01-04-2026</span><span class="dd-ctl dd-fake">31-03-2027</span></div>' +
          '<div class="dd-tablewrap"><table class="dd-table dd-report">' + head + rows + '</table></div>', true);
    }
    var acts = '<button type="button" class="dd-btn" data-act="soon" data-what="other views">' + ic('listv', 15) + ' List View ' + ic('updown', 14) + '</button>' + this.iconBtn('refresh', 'refresh', 'Reload') + this.iconBtn('more', 'soon', 'Menu') +
      '<button type="button" class="dd-btn dd-btn-dark" data-act="vnew" data-what="' + esc(name) + '">' + ic('plus', 14) + ' Add ' + esc(name) + '</button>';
    var filters = '<div class="dd-filters"><span class="dd-lf-id"><input class="dd-ctl" type="text" placeholder="ID" aria-label="Filter by ID"/><i aria-hidden="true">≈</i></span><span class="dd-lf-sp"></span>' +
      '<span class="dd-seg"><button type="button" class="dd-btn" data-act="soon" data-what="filters">' + ic('filter', 15) + ' Filter</button><button type="button" class="dd-btn dd-btn-icon" data-act="soon" data-what="filters" aria-label="Clear filters">' + ic('x', 15) + '</button></span>' +
      '<span class="dd-seg"><button type="button" class="dd-btn dd-btn-icon" data-act="soon" data-what="sorting" aria-label="Sort order">' + ic('sort', 15) + '</button><button type="button" class="dd-btn" data-act="soon" data-what="sorting">Created On ' + ic('down', 14) + '</button></span></div>';
    var pager = '<div class="dd-pager"><span class="dd-seg"><button type="button" class="dd-btn is-on">20</button><button type="button" class="dd-btn" data-act="soon" data-what="paging">100</button><button type="button" class="dd-btn" data-act="soon" data-what="paging">500</button><button type="button" class="dd-btn" data-act="soon" data-what="paging">2500</button></span></div>';
    return this.head('<h2>' + esc(name) + '</h2>', acts) + this.wrap(filters + '<div class="dd-tablewrap"><table class="dd-table dd-list">' + head + rows + '</table></div>' + pager, true);
  };

  /* ---------- point of sale ---------- */
  P.session = function () { return this.S.docs['POS Opening Entry'].filter(function (d) { return d.docstatus === 1 && !d.closed; }).slice(-1)[0]; };
  P.vPOS = function () {
    var S = this.S, self = this, ses = this.session();
    if (!ses) return this.head('<h2>Point of Sale</h2>') + '<div class="dd-wrap"><div class="dd-card dd-empty">' + ic('store', 28) + '<p>Open a shift before you start billing.</p><button type="button" class="dd-btn dd-btn-dark" data-act="new" data-dt="POS Opening Entry">New POS Opening Entry</button></div></div>';
    var cart = this.cart || (this.cart = { customer: 'Walk In Customer', items: [], stage: 'cart', mode: 'UPI' });
    var stock = {}; this.stockRows().forEach(function (r) { stock[r.code] = r.bal; });
    var q = (this.posQ || '').toLowerCase();
    var items = S.docs.Item.filter(function (i) { return i.is_stock_item && (!q || (i.item_name + i.name).toLowerCase().indexOf(q) >= 0); });
    var grid = items.map(function (i) {
      var initials = i.item_name.split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('');
      return '<button type="button" class="dd-pos-item" data-act="pos-add" data-code="' + esc(i.name) + '"><span class="dd-pos-thumb">' + esc(initials) + '</span><span class="dd-pos-name">' + esc(i.item_name) + '</span><span class="dd-pos-meta"><b class="dd-tn">' + inr(i.standard_rate) + '</b><span class="dd-muted">' + num(stock[i.name] || 0).replace(/\.00$/, '') + ' ' + esc(i.stock_uom) + '</span></span></button>';
    }).join('');
    var doc = { customer: cart.customer, items: cart.items };
    this.calc('POS Invoice', doc);
    var right;
    if (cart.stage === 'done') {
      right = '<div class="dd-pos-done">' + '<span class="dd-ok">' + ic('check', 22) + '</span><h3>Order complete</h3><p class="dd-tn">' + inr(cart.last.rounded_total) + ' paid by ' + esc(cart.last.mode_of_payment) + '</p><p class="dd-muted">' + esc(cart.last.name) + '</p>' +
        '<div class="dd-row"><button type="button" class="dd-btn" data-act="open" data-dt="POS Invoice" data-name="' + esc(cart.last.name) + '">View Invoice</button><button type="button" class="dd-btn dd-btn-dark" data-act="pos-new">New Order</button></div>' +
        '<button type="button" class="dd-link" data-act="open" data-dt="POS Opening Entry" data-name="' + esc(ses.name) + '">Close shift from ' + esc(ses.name) + '</button></div>';
    } else {
      var lines = cart.items.map(function (r, i) {
        var it = D.itemDoc(S, r.item_code);
        return '<li><span class="dd-li-name">' + esc(it.item_name) + '<small class="dd-muted dd-tn">' + inr(r.rate) + ' / ' + esc(it.stock_uom) + '</small></span><span class="dd-qty"><button type="button" data-act="pos-qty" data-row="' + i + '" data-d="-1" aria-label="Decrease">' + ic('minus', 12) + '</button><b class="dd-tn">' + r.qty + '</b><button type="button" data-act="pos-qty" data-row="' + i + '" data-d="1" aria-label="Increase">' + ic('plus', 12) + '</button></span><span class="dd-tn dd-r">' + num(r.amount) + '</span></li>';
      }).join('');
      var custOpts = S.docs.Customer.map(function (c) { return '<option' + (c.name === cart.customer ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('');
      var pay = cart.stage === 'pay'
        ? '<div class="dd-modes">' + ['UPI', 'Cash', 'Card'].map(function (m) { return '<button type="button" class="dd-mode' + (cart.mode === m ? ' is-on' : '') + '" data-act="pos-mode" data-mode="' + m + '">' + m + '</button>'; }).join('') + '</div><button type="button" class="dd-btn dd-btn-dark dd-btn-block dd-glow" data-act="pos-complete">Complete Order · ' + inr(doc.rounded_total) + '</button><button type="button" class="dd-link" data-act="pos-back">Edit cart</button>'
        : '<button type="button" class="dd-btn dd-btn-dark dd-btn-block' + (cart.items.length ? ' dd-glow' : '') + '" data-act="pos-checkout"' + (cart.items.length ? '' : ' disabled') + '>Checkout</button>';
      right = '<label class="dd-fld"><span class="dd-lab">Customer</span><select id="dd-pos-cust" class="dd-ctl" data-pos="customer">' + custOpts + '</select></label>' +
        (lines ? '<ul class="dd-cart">' + lines + '</ul>' : '<p class="dd-muted dd-cart-empty">Tap an item to add it to the cart.</p>') +
        '<dl class="dd-sum"><div><dt>Net Total</dt><dd class="dd-tn">' + inr(doc.net_total) + '</dd></div>' + doc.taxes.map(function (t) { return '<div><dt>' + esc(t.head.replace('Output Tax ', '')) + '</dt><dd class="dd-tn">' + inr(t.amount) + '</dd></div>'; }).join('') + '<div class="dd-gt"><dt>Grand Total</dt><dd class="dd-tn">' + inr(doc.rounded_total) + '</dd></div></dl>' + pay;
    }
    return '<header class="dd-head"><div class="dd-title"><h2>Point of Sale</h2>' + pill('Shift open') + '</div><div class="dd-actions"><span class="dd-chip">' + esc(ses.pos_profile) + '</span><span class="dd-chip">' + esc(ses.user) + '</span></div></header>' +
      '<div class="dd-wrap is-wide"><div class="dd-pos"><div class="dd-card dd-pos-l"><input id="dd-pos-q" class="dd-ctl" type="search" placeholder="Search by item code or name" data-pos="q" value="' + esc(this.posQ || '') + '"/><div class="dd-pos-grid">' + grid + '</div></div><div class="dd-card dd-pos-r">' + right + '</div></div></div>';
  };
  P.posComplete = function () {
    var S = this.S, ses = this.session(), cart = this.cart;
    var d = this.newDoc('POS Invoice', false);
    d.customer = cart.customer; d.items = cart.items.map(function (r) { return { item_code: r.item_code, qty: r.qty, rate: r.rate }; });
    d.mode_of_payment = cart.mode; d.pos_profile = ses.pos_profile; d.session = ses.name;
    d.from = { dt: 'POS Opening Entry', name: ses.name };
    this.calc('POS Invoice', d);
    S.counters['POS Invoice'] = (S.counters['POS Invoice'] || 0) + 1;
    d.name = DT['POS Invoice'].prefix + String(S.counters['POS Invoice']).padStart(5, '0');
    delete d.__new; d.docstatus = 1; d.created = S.tick++;
    S.docs['POS Invoice'].push(d);
    this.cart = { customer: 'Walk In Customer', items: [], stage: 'done', mode: cart.mode, last: d };
    this.toast('Paid ' + inr(d.rounded_total) + ' by ' + d.mode_of_payment);
    this.render();
    this.emit('pos-paid', 'POS Invoice', d);
  };

  /* ---------- events ---------- */
  var EDIT_ACTS = { open: 1, 'new': 1, save: 1, submit: 1, step: 1, menu: 1, create: 1, addrow: 1, delrow: 1, 'pos-add': 1, 'pos-qty': 1, 'pos-checkout': 1, 'pos-complete': 1, 'pos-mode': 1 };
  P.guarded = function (el) {
    return this.opts.experience && !this.touring && el && !el.closest('.dt-layer, .dd-setup, .dd-modal, .dd-filters, .dd-search, .dd-browser');
  };
  /* Experience Center: outside a tour, nothing is edited for real. Show the screen, then point to a tour or the trial. */
  P.nudge = function (dt, what0, mode) {
    var self = this, all = global.ERPTours ? global.ERPTours.list : [];
    dt = dt || (what0 ? '' : this.route.dt) || '';
    var t = all.filter(function (x) { return x.dt === dt; })[0] || this.tours(this.S.module)[0];
    var an = function (w) { return (/^[AEIOU]/.test(w) ? 'an ' : 'a ') + w; };
    var what = mode === 'open' ? 'open ' + (dt ? 'this ' + dt : 'this record') + ' and work with it'
      : dt ? 'create and edit ' + an(dt) : what0 ? 'create and edit ' + an(what0) : 'work with your own data';
    this.modal('Try this in your free trial',
      '<p class="dd-nudge-p">You can browse every ERPNext screen here with sample data. To ' + esc(what) + ', start a free trial. It is the full ERPNext, with your own company.</p>' +
      (t ? '<div class="dd-nudge-t"><span>' + ic('play', 13) + '</span><div><b>' + esc(t.title) + '</b><small>' + esc(t.blurb(self.S)) + '</small></div></div>' : '') +
      '<div class="dd-modal-foot">' + (t ? '<button type="button" class="dd-btn" data-act="tour" data-tour="' + t.id + '">Watch the guided tour</button>' : '') +
      '<a class="dd-btn dd-btn-dark" href="' + (this.opts.trialUrl || 'https://frappecloud.com/dashboard/signup?product=erpnext') + '" target="_blank" rel="noopener">Start free trial</a></div>');
  };
  P.onClick = function (e) {
    if (e.target.classList && e.target.classList.contains('dd-modal')) return this.closeModal();
    var a = e.target.closest('[data-act]');
    if (!a || !this.root.contains(a)) { if (!e.target.closest('.dd-menu')) this.closeMenus(); return; }
    var act = a.getAttribute('data-act');
    if (EDIT_ACTS[act] && this.guarded(a)) { e.preventDefault(); this.closeMenus(); return this.nudge(a.getAttribute('data-dt') || (act === 'new' ? '' : this.route.dt), '', act === 'open' ? 'open' : ''); }
    if (a.tagName === 'A') e.preventDefault();
    var r = this.route, S = this.S, self = this;
    switch (act) {
      case 'reset': return this.reset();
      case 'toggle-side': this.root.classList.toggle('dd-side-open'); return;
      case 'ab-open': return this.touring ? null : this.focusSearch();
      case 'view': return this.go({ view: 'v', name: a.getAttribute('data-view') });
      case 'vopen': case 'vnew': case 'vsave': return this.nudge(a.getAttribute('data-dt') || '', a.getAttribute('data-what') || '', act === 'vopen' ? 'open' : '');
      case 'side-grp': { var gk = a.getAttribute('data-g'), so = this.sideOpen || (this.sideOpen = {}); so[gk] = a.getAttribute('aria-expanded') !== 'true'; this.$('.dd-side').innerHTML = this.sidebar(); return; }
      case 'soon': return this.toast('Works in your free trial');
      case 'refresh': return this.render();
      case 'ws-home': return this.go({ view: 'workspace' });
      case 'dash': return this.go({ view: 'dash' });
      case 'home': return this.go({ view: 'home' });
      case 'tour': this.closeModal(); this.closeTours(); return this.startTour && this.startTour(a.getAttribute('data-tour'));
      case 'tours-menu': return this.toggleTours();
      case 'tours-tab': this.toursTab = a.getAttribute('data-mod'); return this.fillTours();
      case 'tour-mod': this.S.tourMod = a.getAttribute('data-mod'); return this.render();
      case 'ab': return this.abRun(this.ab.items[+a.getAttribute('data-i')]);
      case 'su-next': return this.suNext();
      case 'su-back': this.setup.step = Math.max(0, this.setup.step - 1); return this.suRender();
      case 'su-close': return this.closeSetup();
      case 'su-sector': this.setup.sector = a.getAttribute('data-k'); return this.suRender();
      case 'su-add': return this.suAddProduct(a.getAttribute('data-p'));
      case 'su-del': this.setup.products.splice(+a.getAttribute('data-i'), 1); return this.suRender();
      case 'open-setup': return this.openSetup();
      case 'module': this.S.tourMod = a.getAttribute('data-mod'); return this.setModule(a.getAttribute('data-mod'));
      case 'list': return this.go({ view: 'list', dt: a.getAttribute('data-dt') });
      case 'new': return this.go({ view: 'form', dt: a.getAttribute('data-dt'), doc: this.newDoc(a.getAttribute('data-dt'), true) });
      case 'open': {
        var dt = a.getAttribute('data-dt'), d = this.find(dt, a.getAttribute('data-name'));
        if (d) this.go({ view: 'form', dt: dt, doc: d });
        return;
      }
      case 'report': return this.go({ view: 'report', report: a.getAttribute('data-report') });
      case 'pos': if (this.cart && this.cart.stage === 'done') this.cart.stage = 'cart'; return this.go({ view: 'pos' });
      case 'save': return this.save();
      case 'submit': return this.submit();
      case 'step': return this.runStep();
      case 'print': return this.toast('Print preview opens the GST tax invoice format');
      case 'menu': {
        var pop = a.parentNode.querySelector('.dd-menu-pop'), open = pop.hidden;
        this.closeMenus();
        pop.hidden = !open; a.setAttribute('aria-expanded', String(open));
        if (open) { var first = pop.querySelector('button'); if (first) first.focus({ preventScroll: true }); }
        return;
      }
      case 'create': {
        var tdt = a.getAttribute('data-dt');
        return this.go({ view: 'form', dt: tdt, doc: this.createFrom(r.dt, r.doc, tdt) });
      }
      case 'addrow': r.doc.items.push({ item_code: '', qty: 1, rate: 0 }); r.doc.__dirty = !r.doc.__new; return this.render();
      case 'delrow': r.doc.items.splice(+a.getAttribute('data-row'), 1); if (!r.doc.items.length) r.doc.items.push({ item_code: '', qty: 1, rate: 0 }); r.doc.__dirty = !r.doc.__new; this.calc(r.dt, r.doc); return this.render();
      case 'modal-close': return this.closeModal();
      case 'pos-add': {
        var c = this.cart, code = a.getAttribute('data-code'), it = D.itemDoc(S, code);
        if (c.stage !== 'cart') c.stage = 'cart';
        var ex = c.items.filter(function (x) { return x.item_code === code; })[0];
        if (ex) ex.qty += 1; else c.items.push({ item_code: code, qty: 1, rate: it.standard_rate });
        return this.render();
      }
      case 'pos-qty': {
        var rowi = +a.getAttribute('data-row'), line = this.cart.items[rowi];
        line.qty += +a.getAttribute('data-d');
        if (line.qty <= 0) this.cart.items.splice(rowi, 1);
        return this.render();
      }
      case 'pos-checkout': this.cart.stage = 'pay'; return this.render();
      case 'pos-back': this.cart.stage = 'cart'; return this.render();
      case 'pos-mode': this.cart.mode = a.getAttribute('data-mode'); return this.render();
      case 'pos-complete': return this.posComplete();
      case 'pos-new': this.cart = null; return this.render();
    }
  };
  P.onChange = function (e) {
    var t = e.target, r = this.route;
    if (t.hasAttribute('data-filter')) {
      var f = this.listFilter[r.dt] || (this.listFilter[r.dt] = {});
      f[t.getAttribute('data-filter')] = t.value;
      if (t.tagName === 'SELECT') this.render();
      return;
    }
    if (t.getAttribute('data-pos') === 'customer') { this.cart.customer = t.value; return this.render(); }
    if (r.view !== 'form') return;
    var d = r.doc, def = DT[r.dt];
    if (t.hasAttribute('data-field')) {
      var key = t.getAttribute('data-field'), f2 = def.fields.filter(function (x) { return x.key === key; })[0];
      var v = t.type === 'checkbox' ? (t.checked ? 1 : 0) : t.value;
      if (t.hasAttribute('data-date')) { var dm = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/.exec(v.trim()); if (!dm) return this.render(); v = dm[3] + '-' + ('0' + dm[2]).slice(-2) + '-' + ('0' + dm[1]).slice(-2); }
      if (f2 && /int|float|currency/.test(f2.type)) v = v === '' ? '' : +v;
      d[key] = v;
      if (key === 'party_type') d.party = '';
      if (def.onChange) def.onChange(d, key, this.S);
    } else if (t.hasAttribute('data-row')) {
      var row = d.items[+t.getAttribute('data-row')], col = t.getAttribute('data-col');
      if (!row) return;
      row[col] = col === 'item_code' ? t.value : (t.value === '' ? 0 : +t.value);
      if (col === 'item_code') { var it = D.itemDoc(this.S, t.value); row.rate = it ? it.standard_rate : 0; }
    } else return;
    if (!d.__new) d.__dirty = true;
    this.calc(r.dt, d);
    this.deferRender();
  };
  P.setField = function (key, v) {
    var r = this.route, d = r.doc, def = DT[r.dt];
    var f = def.fields.filter(function (x) { return x.key === key; })[0];
    if (f && /int|float|currency/.test(f.type)) v = v === '' ? '' : +v;
    d[key] = v;
    if (key === 'party_type') d.party = '';
    if (def.onChange) def.onChange(d, key, this.S);
    if (!d.__new) d.__dirty = true;
    this.calc(r.dt, d);
    this.render();
  };
  P.setRow = function (i, col, v) {
    var r = this.route, d = r.doc;
    while (d.items.length <= i) d.items.push({ item_code: '', qty: 1, rate: 0 });
    var row = d.items[i];
    if (col === 'item_code') { row.item_code = v; var it = D.itemDoc(this.S, v); row.rate = it ? it.standard_rate : 0; }
    else row[col] = +v || 0;
    if (!d.__new) d.__dirty = true;
    this.calc(r.dt, d);
    this.render();
  };
  P.addRow = function () { this.route.doc.items.push({ item_code: '', qty: 1, rate: 0 }); this.render(); };
  P.deferRender = function () {
    var self = this;
    clearTimeout(this._dr);
    this._dr = setTimeout(function () {
      var a = document.activeElement, sel = null;
      if (a && self.root.contains(a)) {
        if (a.id) sel = '#' + CSS.escape(a.id);
        else if (a.hasAttribute('data-row') && a.hasAttribute('data-col')) sel = '[data-row="' + a.getAttribute('data-row') + '"][data-col="' + a.getAttribute('data-col') + '"]';
      }
      if (self.route.view !== 'form') return;
      self.render();
      if (sel) { var n = self.root.querySelector(sel); if (n) { try { n.focus({ preventScroll: true }); } catch (x) { } } }
    }, 0);
  };
  P.onInput = function (e) {
    var t = e.target;
    if (t.matches('.dd-search input')) { this.abOpen(t.value); return; }
    if (t.hasAttribute('data-su')) { this.suInput(t); return; }
    if (t.getAttribute('data-filter') === 'q') {
      var f = this.listFilter[this.route.dt] || (this.listFilter[this.route.dt] = {});
      f.q = t.value;
      clearTimeout(this._qt); var self = this;
      this._qt = setTimeout(function () { self.render(); var i = self.$('#dd-f-q'); if (i) { i.focus({ preventScroll: true }); i.setSelectionRange(i.value.length, i.value.length); } }, 180);
    }
    if (t.getAttribute('data-pos') === 'q') {
      this.posQ = t.value;
      clearTimeout(this._pq); var me = this;
      this._pq = setTimeout(function () { me.render(); var i = me.$('#dd-pos-q'); if (i) { i.focus({ preventScroll: true }); i.setSelectionRange(i.value.length, i.value.length); } }, 180);
    }
  };
  P.onSubmitForm = function (e) {
    if (e.target.getAttribute('data-form') === 'search' && this.ab && this.ab.items.length) { this.abRun(this.ab.items[this.ab.i]); return; }
    if (e.target.getAttribute('data-form') !== 'search') return;
    var inp = e.target.querySelector('input'), q = inp.value.trim().toLowerCase();
    var hit = Object.keys(DT).filter(function (k) { return k.toLowerCase() === q; })[0] || Object.keys(DT).filter(function (k) { return k.toLowerCase().indexOf(q) >= 0; })[0];
    if (!q) return;
    if (/^(point of sale|pos)$/.test(q)) { inp.value = ''; return this.go({ view: 'pos' }); }
    var rep = ['General Ledger', 'Accounts Receivable', 'Stock Balance', 'Project Summary'].filter(function (k) { return k.toLowerCase().indexOf(q) >= 0; })[0];
    inp.value = ''; inp.blur();
    if (hit) return this.go({ view: 'list', dt: hit });
    if (rep) return this.go({ view: 'report', report: rep });
    this.toast('Nothing matches "' + q + '"');
  };
  P.closeMenus = function () {
    this.root.querySelectorAll('.dd-menu-pop').forEach(function (p) { p.hidden = true; });
    this.root.querySelectorAll('[data-act="menu"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
  };
  P.toast = function (msg) {
    var box = this.$('.dd-toasts'), el = document.createElement('div');
    el.className = 'dd-toast'; el.innerHTML = ic('check', 14) + '<span>' + esc(msg) + '</span>';
    box.appendChild(el);
    while (box.children.length > 2) box.removeChild(box.firstChild);
    setTimeout(function () { el.classList.add('is-out'); }, 2200);
    setTimeout(function () { el.remove(); }, 2600);
  };
  P.modal = function (title, html) {
    var m = this.$('.dd-modal');
    m.innerHTML = '<div class="dd-modal-box" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><header><h3>' + esc(title) + '</h3><button type="button" class="dd-x" data-act="modal-close" aria-label="Close">' + ic('x', 16) + '</button></header><div class="dd-modal-body">' + html + '</div></div>';
    m.hidden = false;
    var b = m.querySelector('button'); if (b) b.focus({ preventScroll: true });
  };
  P.closeModal = function () { var m = this.$('.dd-modal'); if (m) m.hidden = true; };


  /* ---------- guided tour lists (tour runner lives in desk-tour.js) ---------- */
  P.tours = function (mod) {
    var T = global.ERPTours ? global.ERPTours.list : [], only = this.opts.tourModules;
    return T.filter(function (t) { return (!mod || t.module === mod) && (!only || only.indexOf(t.module) >= 0); });
  };
  P.tourMod = function () {
    var k = this.S.tourMod || this.opts.tourModule || null;
    return k && MODULES.some(function (m) { return m.key === k; }) ? k : null;
  };
  /* checklist of one module's guided tours: used on Home (with the module picker) and on each workspace */
  /* guided tours live in one menu in the top bar, grouped by module */
  P.tourBadge = function () {
    /* the per-module counts inside the menu remain; the button itself carries no total */
  };
  P.fillTours = function () {
    var pop = this.$('.dd-tpop'), only = this.opts.tourModules || [], self = this; if (!pop) return;
    var cur = this.toursTab && only.indexOf(this.toursTab) >= 0 ? this.toursTab : (only.indexOf(this.S.module) >= 0 ? this.S.module : only[0]);
    this.toursTab = cur;
    var tabs = only.map(function (k) {
      var m = MODULES.filter(function (x) { return x.key === k; })[0] || {}, c = self.tourCount(k), lab = { procurement: 'Buying', sales: 'Selling' }[k] || m.tab || m.ws || k;
      return '<button type="button" role="tab" class="dd-ttab' + (k === cur ? ' is-on' : '') + '" aria-selected="' + (k === cur) + '" data-act="tours-tab" data-mod="' + k + '"><span>' + esc(lab) + '</span><small>' + c.done + '/' + c.all + '</small></button>';
    }).join('');
    pop.innerHTML = '<div class="dd-tpop-h"><b>Guided tours</b><span>Pick a tour and watch ERPNext do the work. Each step plays on its own; press Next to move on.</span></div>' +
      '<div class="dd-tpop-b"><div class="dd-ttabs" role="tablist" aria-label="Modules">' + tabs + '</div><div class="dd-tpop-l">' + this.tourRows(cur) + '</div></div>';
  };
  P.toggleTours = function () {
    var pop = this.$('.dd-tpop'); if (!pop) return;
    if (!pop.hidden) return this.closeTours();
    if (this.touring) return this.toast('Finish or end this tour first');
    this.toursTab = null; this.fillTours(); pop.hidden = false;
    this.$('.dd-tbtn').setAttribute('aria-expanded', 'true');
  };
  P.closeTours = function () {
    var pop = this.$('.dd-tpop'); if (!pop || pop.hidden) return;
    pop.hidden = true; this.$('.dd-tbtn').setAttribute('aria-expanded', 'false');
  };
  P.tourRows = function (mod) {
    var S = this.S, list = this.tours(mod), firstOpen = -1;
    list.forEach(function (t, i) { if (firstOpen < 0 && !(S.toursDone && S.toursDone[t.id])) firstOpen = i; });
    return '<ol class="dd-trows">' + list.map(function (t, i) {
      var done = S.toursDone && S.toursDone[t.id], rec = false;
      return '<li class="dd-trow' + (done ? ' is-done' : '') + (rec ? ' is-rec' : '') + '"><span class="dd-tdot">' + (done ? ic('check', 12) : (i + 1)) + '</span>' +
        '<span class="dd-tmain"><b>' + esc(t.title) + '</b><span>' + esc(t.blurb(S)) + '</span></span>' +
        '<button type="button" class="dd-btn' + (rec ? ' dd-btn-dark dd-glow' : '') + '" data-act="tour" data-tour="' + t.id + '">' + (done ? 'Replay' : 'Start') + ' ' + ic('play', 12) + '</button></li>';
    }).join('') + '</ol>';
  };
  P.tourCount = function (mod) {
    var S = this.S, l = this.tours(mod);
    return { done: l.filter(function (t) { return S.toursDone && S.toursDone[t.id]; }).length, all: l.length };
  };
  P.tourStrip = function (mod) {
    if (!this.tours(mod).length) return '';
    var c = this.tourCount(mod);
    return '<section class="dd-card dd-getstarted dd-ws-tours"><header><div><h3>Guided tours: ' + esc(this.mod().ws) + '</h3><p class="dd-muted">Each tour starts from Home and moves one step at a time when you click Next.</p></div><span class="dd-muted dd-tn">' + c.done + ' of ' + c.all + ' done</span></header>' + this.tourRows(mod) + '</section>';
  };
  P.vHome = function () {
    if (this.opts.experience) return this.head('<h2>Home</h2>', this.iconBtn('more', 'soon', 'Workspace options')) + this.wrap(this.chart('home') + this.numCards());
    var self = this, S = this.S, cur = this.tourMod(), m = cur && MODULES.filter(function (x) { return x.key === cur; })[0];
    var picker = MODULES.filter(function (x) { return self.tours(x.key).length; }).map(function (x) {
      var c = self.tourCount(x.key), on = x.key === cur;
      return '<button type="button" class="dd-mpick' + (on ? ' is-on' : '') + (c.done === c.all ? ' is-done' : '') + '" role="tab" aria-selected="' + on + '" data-act="tour-mod" data-mod="' + x.key + '">' + ic(x.icon, 15) + '<span>' + esc(x.ws) + '</span><small class="dd-tn">' + c.done + '/' + c.all + '</small></button>';
    }).join('');
    var c = cur ? this.tourCount(cur) : null;
    var setupCta = S.personal ? '' : '<div class="dd-card dd-setupcta"><div><b>See this with your own company</b><span>Answer three questions and every tour uses your company, products and GST state.</span></div><button type="button" class="dd-btn dd-btn-dark" data-act="open-setup">Set up my company</button></div>';
    var tours = '<section class="dd-card dd-getstarted"><header><div><h3>Guided tours' + (S.personal ? ' for ' + esc(S.company) : '') + '</h3><p class="dd-muted">Pick a module, then a task. Each tour starts here and moves one step at a time: click Next when you are ready. You finish the last step yourself.</p></div></header>' +
        '<div class="dd-mpicks" role="tablist" aria-label="Modules">' + picker + '</div>' +
        (cur ? '<div class="dd-mpanel" role="tabpanel"><div class="dd-mpanel-h"><b>' + esc(m.ws) + '</b><span class="dd-muted dd-tn">' + c.done + ' of ' + c.all + ' done</span></div>' + this.tourRows(cur) + '</div>'
          : '<div class="dd-mpanel dd-mpanel-empty"><p>Choose a module above to see its guided tours.</p></div>') + '</section>';
    return this.head('<h2>Home</h2>', this.iconBtn('more', 'soon', 'Workspace options')) + this.wrap(setupCta + tours + this.chart('home') + this.numCards());
  };

  /* ---------- awesome bar ---------- */
  P.abIsOpen = function () { var w = this.$('.dd-abwrap'); return w && !w.hidden; };
  P.focusSearch = function () { this.$('.dd-abwrap').hidden = false; var i = this.$('.dd-search input'); i.focus({ preventScroll: true }); i.select(); if (i.value) this.abOpen(i.value); };
  P.abResults = function (q) {
    var S = this.S, self = this;
    q = String(q || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!q) return [];
    var wantsNew = /^new\b/.test(q), qn = q.replace(/^new\s*/, '');
    var out = [];
    function score(label) { var l = label.toLowerCase(); if (l.indexOf(qn) === 0) return 0; if (l.split(' ').some(function (w) { return w.indexOf(qn) === 0; })) return 1; return l.indexOf(qn) >= 0 ? 2 : 9; }
    Object.keys(DT).forEach(function (k) {
      var sc = qn ? score(k) : 3;
      if (sc > 2 && !(wantsNew && !qn)) return;
      if (!DT[k].readonly) out.push({ kind: 'new', dt: k, label: 'New ' + k, sub: 'Create a new ' + k, rank: (wantsNew ? 0 : 2) + sc / 10 });
      if (!wantsNew) out.push({ kind: 'list', dt: k, label: k + ' List', sub: 'Open the ' + k + ' list', rank: 1 + sc / 10 });
    });
    if (!wantsNew) {
      ['General Ledger', 'Accounts Receivable', 'Stock Balance', 'Project Summary'].forEach(function (r) { var sc = score(r); if (sc <= 2) out.push({ kind: 'report', report: r, label: r, sub: 'Report', rank: 1.5 + sc / 10 }); });
      if ('point of sale'.indexOf(q) === 0 || q === 'pos') out.push({ kind: 'pos', label: 'Point of Sale', sub: 'Page', rank: 1 });
      Object.keys(VIEWS()).forEach(function (n) { var sc = score(n); if (sc <= 1) { var k = VIEWS()[n].kind; out.push({ kind: 'view', name: n, label: k === 'list' ? n + ' List' : n, sub: k === 'report' ? 'Report' : k === 'single' ? 'Settings' : 'Open the ' + n + ' list', rank: 1.3 + sc / 10 }); } });
      MODULES.forEach(function (m) { if (score(m.ws) <= 1) out.push({ kind: 'ws', mod: m.key, label: m.ws, sub: 'Workspace', rank: 1.2 }); });
      if (q.length >= 3) {
        Object.keys(S.docs).forEach(function (k) {
          S.docs[k].forEach(function (d) {
            if (d.__new) return;
            var t = String(DT[k].title(d) || '');
            if (d.name.toLowerCase().indexOf(q) >= 0 || t.toLowerCase().indexOf(q) >= 0) out.push({ kind: 'doc', dt: k, name: d.name, label: d.name === t ? t : d.name, sub: k + (t && t !== d.name ? ' · ' + t : ''), rank: d.name.toLowerCase().indexOf(q) === 0 ? 0.5 : 3 });
          });
        });
      }
    }
    out.sort(function (a, b) { return a.rank - b.rank; });
    return out.slice(0, 8);
  };
  P.abOpen = function (q) {
    var box = this.$('.dd-ab'), input = this.$('.dd-search input');
    var items = this.abResults(q);
    this.ab = { q: q, items: items, i: 0 };
    if (!q.trim()) { box.hidden = true; box.innerHTML = ''; return; }
    var self = this;
    box.innerHTML = items.length ? items.map(function (it, i) {
      var tag = { new: 'New', list: 'List', report: 'Report', doc: 'Document', pos: 'Page', ws: 'Workspace', view: VIEWS()[it.name] && VIEWS()[it.name].kind === 'report' ? 'Report' : VIEWS()[it.name] && VIEWS()[it.name].kind === 'single' ? 'Page' : 'List' }[it.kind];
      return '<button type="button" class="dd-ab-i' + (i === 0 ? ' is-on' : '') + '" role="option" aria-selected="' + (i === 0) + '" data-act="ab" data-i="' + i + '" data-label="' + esc(it.label) + '"><span class="dd-ab-l"><b>' + self.hl(it.label, q) + '</b><small>' + esc(it.sub) + '</small></span><span class="dd-ab-k">' + tag + '</span></button>';
    }).join('') : '<p class="dd-ab-empty">No results for "' + esc(q) + '"</p>';
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };
  P.hl = function (label, q) {
    var l = label.toLowerCase(), qq = String(q).trim().toLowerCase().replace(/^new\s+/, '');
    var i = qq ? l.indexOf(qq) : -1;
    if (i < 0) return esc(label);
    return esc(label.slice(0, i)) + '<mark>' + esc(label.slice(i, i + qq.length)) + '</mark>' + esc(label.slice(i + qq.length));
  };
  P.abKey = function (e) {
    if (!this.ab || !this.ab.items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.ab.i = (this.ab.i + (e.key === 'ArrowDown' ? 1 : -1) + this.ab.items.length) % this.ab.items.length;
      var i = this.ab.i;
      this.root.querySelectorAll('.dd-ab-i').forEach(function (b, k) { b.classList.toggle('is-on', k === i); b.setAttribute('aria-selected', String(k === i)); });
    }
  };
  P.closeAB = function () {
    var box = this.$('.dd-ab'); if (!box) return;
    box.hidden = true; box.innerHTML = '';
    this.$('.dd-abwrap').hidden = true;
    var input = this.$('.dd-search input'); input.setAttribute('aria-expanded', 'false');
  };
  P.abRun = function (it) {
    if (!it) return;
    var input = this.$('.dd-search input');
    input.value = ''; input.blur(); this.closeAB(); this.ab = null;
    if (it.kind === 'new') { if (this.opts.experience && !this.touring) return this.nudge(it.dt); return this.go({ view: 'form', dt: it.dt, doc: this.newDoc(it.dt, true) }); }
    if (it.kind === 'list') return this.go({ view: 'list', dt: it.dt });
    if (it.kind === 'report') return this.go({ view: 'report', report: it.report });
    if (it.kind === 'pos') return this.go({ view: 'pos' });
    if (it.kind === 'ws') { this.setModule(it.mod); if (this.route.view !== 'workspace') this.go({ view: 'workspace' }); return; }
    if (it.kind === 'view') return this.go({ view: 'v', name: it.name });
    if (it.kind === 'doc') { if (this.opts.experience && !this.touring) return this.nudge(it.dt, '', 'open'); var d = this.find(it.dt, it.name); if (d) this.go({ view: 'form', dt: it.dt, doc: d }); }
  };

  /* ---------- setup wizard ("Try it for your company") ---------- */
  P.openSetup = function () {
    if (this.stopTour) this.stopTour(true);
    var p = this.S.personal ? this.S.profile : {};
    this.setup = { step: 0, company: p.company || '', abbr: p.abbr || '', abbrEdited: false, state: p.state || 'Maharashtra', sector: p.sector || '', products: (p.products || []).slice() };
    var el = this.$('.dd-setup');
    if (!el) { el = document.createElement('div'); el.className = 'dd-setup'; this.root.appendChild(el); }
    el.hidden = false;
    this.root.classList.add('dd-in-setup');
    if (this.$('.dd-url-path')) this.$('.dd-url-path').textContent = '/desk/setup-wizard';
    this.suRender();
    var f = el.querySelector('input'); if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { } }, 60);
  };
  P.closeSetup = function () { var el = this.$('.dd-setup'), was = el && !el.hidden; if (el) el.hidden = true; if (was) { var me = this; setTimeout(function () { me.emit('setup-closed'); }, 0); } this.root.classList.remove('dd-in-setup'); if (this.$('.dd-url-path')) this.$('.dd-url-path').textContent = this.path(); };
  P.suInput = function (t) {
    var k = t.getAttribute('data-su'), su = this.setup;
    if (k === 'company') { su.company = t.value; if (!su.abbrEdited) { su.abbr = D.abbrOf(t.value); var a = this.$('#dd-su-abbr'); if (a) a.value = su.abbr; } }
    if (k === 'abbr') { su.abbr = t.value.toUpperCase().slice(0, 5); su.abbrEdited = true; }
    if (k === 'state') su.state = t.value;
    var next = this.$('.dd-setup [data-act="su-next"]');
    if (next) next.disabled = !this.suValid();
  };
  P.suValid = function () {
    var su = this.setup;
    if (su.step === 0) return su.company.trim().length > 1 && su.abbr.trim().length > 0;
    if (su.step === 1) return !!su.sector;
    return true;
  };
  P.suAddProduct = function (name) {
    var su = this.setup;
    if (name == null) { var i = this.$('#dd-su-prod'); name = i ? i.value : ''; }
    name = String(name).trim().replace(/\s+/g, ' ');
    if (name && su.products.length < 6 && su.products.map(function (x) { return x.toLowerCase(); }).indexOf(name.toLowerCase()) < 0) su.products.push(name);
    this.suRender();
    var inp = this.$('#dd-su-prod'); if (inp) inp.focus({ preventScroll: true });
  };
  P.suNext = function () {
    var su = this.setup;
    if (!this.suValid()) return;
    if (su.step === 2) { var i = this.$('#dd-su-prod'); if (i && i.value.trim()) { this.suAddProduct(i.value); } return this.suFinish(); }
    su.step++;
    this.suRender();
    var f = this.$('.dd-setup input'); if (f) f.focus({ preventScroll: true });
  };
  P.suRender = function () {
    var su = this.setup, el = this.$('.dd-setup'), self = this;
    var dots = [0, 1, 2].map(function (i) { return '<i class="' + (i < su.step ? 'is-done' : i === su.step ? 'is-on' : '') + '"></i>'; }).join('');
    var body = '', title = '', sub = '';
    if (su.step === 0) {
      title = 'Let’s set up your company';
      sub = 'This is ERPNext’s setup wizard. Your answers shape the demo; nothing leaves this page.';
      body = '<div class="dd-fld"><label for="dd-su-company">Company name</label><input id="dd-su-company" class="dd-ctl" data-su="company" type="text" placeholder="e.g. Zorvane Foods Pvt Ltd" value="' + esc(su.company) + '" autocomplete="organization"/></div>' +
        '<div class="dd-su-2"><div class="dd-fld"><label for="dd-su-abbr">Abbreviation</label><input id="dd-su-abbr" class="dd-ctl" data-su="abbr" type="text" value="' + esc(su.abbr) + '"/><small class="dd-help">Added to accounts and warehouses, like Cash - ' + esc(su.abbr || 'ZF') + '</small></div>' +
        '<div class="dd-fld"><label for="dd-su-state">State (for GST)</label><select id="dd-su-state" class="dd-ctl" data-su="state">' + D.STATES.map(function (x) { return '<option' + (x === su.state ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="dd-su-fixed"><span>Country: India</span><span>Currency: INR</span><span>Financial year: Apr 2026 to Mar 2027</span></div>';
    } else if (su.step === 1) {
      title = 'What does ' + esc(su.company.trim() || 'your company') + ' do?';
      sub = 'We’ll load a matching catalog of raw materials, customers and suppliers.';
      body = '<div class="dd-sectors" role="radiogroup" aria-label="Sector">' + D.SECTOR_KEYS.map(function (k) {
        var on = su.sector === k;
        return '<button type="button" role="radio" aria-checked="' + on + '" class="dd-sector' + (on ? ' is-on' : '') + '" data-act="su-sector" data-k="' + k + '">' + esc(D.SECTORS[k].label) + '</button>';
      }).join('') + '</div>';
    } else if (su.step === 2) {
      title = 'What do you sell?';
      sub = 'Add up to six products. The first two become your main items in every tour.';
      var sug = (D.SECTORS[su.sector] || {}).suggest || [];
      sug = sug.filter(function (x) { return su.products.map(function (p) { return p.toLowerCase(); }).indexOf(x.toLowerCase()) < 0; });
      body = '<div class="dd-tags">' + (su.products.length ? su.products.map(function (p, i) { return '<span class="dd-tag">' + esc(p) + '<button type="button" data-act="su-del" data-i="' + i + '" aria-label="Remove ' + esc(p) + '">' + ic('x', 12) + '</button></span>'; }).join('') : '<span class="dd-muted">No products yet</span>') + '</div>' +
        '<div class="dd-su-add"><input id="dd-su-prod" class="dd-ctl" data-su="prod" type="text" placeholder="Type a product and press Enter"/><button type="button" class="dd-btn" data-act="su-add">Add</button></div>' +
        (sug.length ? '<div class="dd-su-sug"><span class="dd-muted">Suggestions</span>' + sug.map(function (x) { return '<button type="button" class="dd-sugchip" data-act="su-add" data-p="' + esc(x) + '">' + ic('plus', 12) + esc(x) + '</button>'; }).join('') + '</div>' : '');
    } else {
      title = 'Setting up ' + esc(su.company);
      sub = 'This takes a few seconds in ERPNext too.';
      body = '<ul class="dd-su-prog">' + (su.prog || []).map(function (p) { return '<li class="' + (p.done ? 'is-done' : 'is-run') + '">' + (p.done ? ic('check', 13) : '<i class="dd-spin"></i>') + '<span>' + esc(p.t) + '</span></li>'; }).join('') + '</ul>';
    }
    var foot = su.step < 3 ? '<div class="dd-su-foot">' + (su.step > 0 ? '<button type="button" class="dd-btn" data-act="su-back">Back</button>' : '<span></span>') +
      '<button type="button" class="dd-btn dd-btn-dark" data-act="su-next"' + (this.suValid() ? '' : ' disabled') + '>' + (su.step === 2 ? 'Complete Setup' : 'Next') + '</button></div>' : '';
    el.innerHTML = '<div class="dd-su-card" role="dialog" aria-modal="true" aria-label="Set up your company">' +
      '<header><span class="dd-su-logo">' + LOGO + '</span><span class="dd-su-dots" aria-label="Step ' + Math.min(su.step + 1, 3) + ' of 3">' + dots + '</span>' + (su.step < 3 ? '<button type="button" class="dd-x" data-act="su-close" aria-label="Close setup">' + ic('x', 16) + '</button>' : '') + '</header>' +
      '<h3>' + title + '</h3><p class="dd-muted">' + sub + '</p><div class="dd-su-body">' + body + '</div>' + foot + '</div>';
    var prod = el.querySelector('#dd-su-prod');
    if (prod) prod.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (prod.value.trim()) self.suAddProduct(prod.value); else self.suNext(); } });
    var co = el.querySelector('#dd-su-company');
    if (co) co.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); self.suNext(); } });
  };
  P.suFinish = function () {
    var su = this.setup, self = this;
    var sec = D.SECTORS[su.sector] || D.SECTORS.textiles;
    var prods = su.products.length ? su.products : [];
    su.step = 3;
    var tasks = ['Creating company ' + su.company.trim() + ' (India, INR)', 'Setting up chart of accounts with abbreviation ' + su.abbr.trim(), 'Configuring GST: CGST, SGST and IGST templates for ' + su.state, 'Adding items: ' + (prods.length ? prods.slice(0, 3).join(', ') : sec.label + ' catalog'), 'Adding sample customers and suppliers', 'Setting financial year 2026-2027'];
    su.prog = [];
    var i = 0;
    var fast = global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    (function tick() {
      if (i > 0) su.prog[i - 1].done = true;
      if (i < tasks.length) { su.prog.push({ t: tasks[i], done: false }); i++; self.suRender(); setTimeout(tick, fast ? 60 : 520); return; }
      self.suRender();
      setTimeout(function () {
        self.personalize({ company: su.company.trim(), abbr: su.abbr.trim().toUpperCase(), state: su.state, sector: su.sector, products: prods });
        self.closeSetup();
        self.emit('setup-done', self.S.profile);
      }, fast ? 60 : 450);
    })();
  };
  P.personalize = function (profile) {
    var m = this.S.module;
    this.S = D.seed(profile); this.calcAll();
    this.S.module = m; this.S.routes = {};
    this.listFilter = {}; this.cart = null; this.posQ = '';
    this.go({ view: 'home' });
  };

  global.ERPDemo = Demo;
  global.ERPUI = { ic: ic, pill: pill, pillClass: pillClass, VIEWS: VIEWS, SIDE: SIDE };
})(window);

/* ERPNext interactive demo — guided tours.
   Each tour starts on Home, opens the awesome bar, types the command, fills the
   document slowly with the visitor's own company data, saves, and then hands the
   final step (Submit / Save) to the visitor. */
(function (global) {
  'use strict';
  var D = global.ERPData, Demo = global.ERPDemo, P = Demo.prototype, DT = D.DT;
  var REDUCE = global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CANCEL = { cancelled: true };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inr(n) { return global.ERPFmt.inr(n); }
  function cssq(s) { return String(s).replace(/"/g, '\\"'); }

  /* ---------------- tour library ---------------- */
  function item(S, code) { return D.itemDoc(S, code) || { item_name: code, standard_rate: 0, stock_uom: 'Nos' }; }
  function qtyFor(S, code, budget) {
    var it = item(S, code), q = budget / (it.standard_rate || 1);
    if (it.stock_uom === 'Nos') return q >= 50 ? Math.round(q / 10) * 10 : Math.max(1, Math.round(q));
    return q >= 50 ? Math.round(q / 50) * 50 : Math.max(1, Math.round(q));
  }
  function stateOf(S, name) { var c = S.docs.Customer.concat(S.docs.Supplier).filter(function (x) { return x.name === name; })[0]; return c ? c.state : S.state; }
  function interCustomer(S) { var R = S.R; return [R.C2, R.C1, R.C3].filter(function (c) { return stateOf(S, c) !== S.state; })[0] || R.C2; }
  function latest(S, dt, test) {
    var l = S.docs[dt].filter(function (d) { return !d.__new && (!test || test(d)); });
    l.sort(function (a, b) { return (b.seed ? 0 : 1) - (a.seed ? 0 : 1) || b.created - a.created; });
    return l[0];
  }
  function uniqueName(list, base) { var n = base, i = 2; while (list.indexOf(n) >= 0) n = base + ' ' + (i++); return n; }

  var WATCH = '<span class="dt-watch">You just watch: each step plays out on screen, then <b>Next</b> unlocks. <b>Back</b> replays a step.</span>';
  function intro(story) { return { start: 1, title: 'Watch ERPNext do it', text: esc(story) + ' ' + WATCH, raw: 1 }; }
  /* every tour reaches its document the way people do in ERPNext: module sidebar, then the list */
  function sideStep(dt) {
    return { side: dt, title: 'Open ' + dt + ' from the sidebar', text: 'The sidebar on the left holds everything this module handles. ' + dt + ' opens its list.' };
  }
  function openNew(dt, why, story) {
    return [
      intro(story || 'Let’s create a new ' + dt + ' together.'),
      sideStep(dt),
      { click: '[data-act="new"][data-dt="' + cssq(dt) + '"]', title: 'Add a new ' + dt, text: why || 'A blank ' + dt + ' opens, with today’s date and your company already filled in.' }
    ];
  }
  function openDoc(dt, doc, why, story, rowText) {
    return [
      intro(story || 'Let’s pick up a ' + dt + '.'),
      sideStep(dt),
      { click: '[data-act="open"][data-dt="' + cssq(dt) + '"][data-name="' + cssq(doc.name) + '"]', title: 'Open the ' + dt, text: rowText || why || 'It’s at the top of the list. One click opens it.' }
    ];
  }
  function createFrom(target, why) {
    return [
      { click: '[data-act="menu"]', title: 'Open the Create menu', text: 'In ERPNext one document leads to the next. The Create menu lists what can follow this one.' },
      { click: '[data-act="create"][data-dt="' + target + '"]', title: 'Pick ' + target, text: why || 'Customer, items and rates are copied across, so nothing is typed twice.' }
    ];
  }
  function saveStep(dt) { return { save: 1, title: 'Save the ' + dt, text: 'Saved as a draft first, so it’s still easy to change.' }; }
  function submitYou(dt, why) { return { you: 'submit', target: '[data-act="submit"]', event: 'submitted', title: 'Submit the ' + dt, text: why || 'Submitting makes the ' + dt + ' final and posts it to your books.' }; }
  function saveYou(dt, why) { return { you: 'save', target: '[data-act="save"]', event: 'saved', title: 'Save the ' + dt, text: why || 'Saving finishes the ' + dt + '.' }; }
  function printSteps(dt, who) {
    return [
      { click: '[data-act="print"]', title: 'Open the print view', text: 'Now the part ' + who + ' actually sees. The print icon opens the document as it will be sent.' },
      { look: '.dd-sheet', title: 'An A4, GST-ready ' + dt.toLowerCase(), text: 'Both GSTINs, bill-to and ship-to addresses, place of supply, HSN-wise tax, the e-invoice IRN and QR, and the total in words. Download it as a PDF or email it from here.' }
    ];
  }
  function emailSteps(dt, party) {
    return [
      { click: '[data-act="email"]', title: 'Email it to ' + party, text: 'The ' + dt + ' is final, so let’s send it. The email button sits right on the document.' },
      { look: '.dd-email', title: 'The email is drafted for you', text: party + '’s address, a subject with the order number, a short note, and the ' + dt + ' attached as a PDF.' },
      { click: '[data-act="email-send"]', title: 'Send it', text: 'One click and it’s in their inbox. A copy is kept on the ' + dt + '’s timeline, so anyone can see it went out.' }
    ];
  }

  /* 2–3 of the most basic use cases per module, picked from the ERPNext user manual (docs.frappe.io).
     A tour with `requires` continues from another tour's document when the sample data has none. */
  function created(dt, why) { return function (S, d) { return dt + ' ' + d.name + ' ' + why; }; }
  var TOURS = [
    /* ---- Accounting ---- */
    { id: 'sales-invoice', module: 'accounting', title: 'Create a sales invoice',
      blurb: function (S) { return 'Bill ' + interCustomer(S) + ' with GST and the e-invoice IRN worked out for you.'; },
      next: ['payment', 'journal'],
      build: function (S) {
        var R = S.R, cust = interCustomer(S), inter = stateOf(S, cust) !== S.state, fg = item(S, R.FG1).item_name;
        return openNew('Sales Invoice', 'A blank invoice opens, already set up for your company and today’s date.', cust + ' took delivery of your ' + fg + ' last week and is waiting for the bill. Let’s send it.').concat([
          { field: 'customer', value: cust, title: 'Choose the customer', text: 'Pick ' + cust + '. Their billing address, GSTIN and payment terms come along with the name.' },
          { row: 0, item: R.FG1, qty: qtyFor(S, R.FG1, 80000), title: 'Add what they bought', text: 'The ' + fg + ' and the quantity go in. The rate is filled from your price list, and you can still change it on the line if you’ve agreed a different price.' },
          { field: 'due_date', value: D.addDays(D.TODAY, 30), title: 'Set the due date', text: 'They pay in 30 days. If it slips, the invoice shows up in your overdue receivables on its own.' },
          { look: '.dd-totals', title: 'The taxes table fills itself', text: cust + ' is in ' + stateOf(S, cust) + ' and you are in ' + S.state + (inter ? ', so ERPNext applies IGST on its own. Nobody has to remember the rule.' : ', so CGST and SGST apply. ERPNext knows that from their address.') + ' Rounding and the total in words are done too.' },
          saveStep('Sales Invoice'),
          submitYou('Sales Invoice', 'Submitting makes it final. It posts to your books and generates the e-invoice IRN with the government.')
        ], printSteps('Invoice', cust), [
          { done: 1, text: function (S, d) { return 'Invoice ' + d.name + ' for ' + inr(d.rounded_total) + ' is posted, e-invoiced and ready to send.'; } }
        ]);
      } },
    { id: 'payment', module: 'accounting', title: 'Record a customer payment', requires: 'sales-invoice',
      blurb: function () { return 'Receive money against an invoice with a payment entry.'; },
      next: ['journal', 'sales-invoice'],
      build: function (S) {
        var si = latest(S, 'Sales Invoice', function (d) { return d.docstatus === 1 && !d.paid; });
        if (!si) return null;
        return openDoc('Sales Invoice', si, 'Here’s ' + si.customer + '’s invoice, still unpaid. One click opens it.', 'Good news: ' + si.customer + ' just paid their invoice by UPI. Let’s record it.').concat(createFrom('Payment Entry', 'The customer and the exact amount come across from the invoice.'), [
          { field: 'mode_of_payment', value: 'UPI', title: 'How they paid', text: 'They paid by UPI, so the money is recorded straight into your bank account.' },
          { field: 'reference_no', value: 'UTR6127' + String(si.rounded_total).slice(-5), title: 'Note the UTR', text: 'We keep their UTR number. When the bank statement comes in, the match takes one click.' },
          saveStep('Payment Entry'),
          submitYou('Payment Entry', 'Submitting marks the invoice Paid and takes it off your list of money to chase.'),
          { done: 1, text: function (S, d) { return 'Payment ' + d.name + ' of ' + inr(d.paid_amount) + ' is recorded. The invoice now shows Paid.'; } }
        ]);
      } },
    { id: 'journal', module: 'accounting', title: 'Post a journal entry',
      blurb: function () { return 'Pay office rent from the bank and see both sides reach the ledger.'; },
      next: ['sales-invoice', 'payment'],
      build: function (S) {
        return openNew('Journal Entry', 'A blank journal entry opens.', 'It’s the 1st, and ₹85,000 of office rent just left your HDFC account. Rent has no form of its own, and that’s exactly what a journal entry is for.').concat([
          { field: 'voucher_type', value: 'Bank Entry', title: 'Pick the entry type', text: 'A bank entry, because the money went out of the bank.' },
          { field: 'debit_account', value: 'Rent Expense - ' + S.abbr, title: 'Debit the expense', text: 'Rent is an expense, so that side is debited…' },
          { field: 'credit_account', value: 'HDFC Bank - ' + S.abbr, title: 'Credit the bank', text: '…and the bank is credited, because that’s where the money came from.' },
          { field: 'amount', value: 85000, title: 'Enter the amount', text: '₹85,000. Both sides use the same figure, so the books always balance.' },
          { field: 'user_remark', value: 'Office rent for October 2026', title: 'Add a remark', text: 'A short note, so anyone reading the ledger next year knows what this was.' },
          saveStep('Journal Entry'),
          submitYou('Journal Entry', 'Submitting posts both sides to the General Ledger.'),
          { done: 1, text: function (S, d) { return 'Journal Entry ' + d.name + ' for ' + inr(d.amount) + ' is in the ledger.'; } }
        ]);
      } },
    { id: 'purchase-order', module: 'procurement', title: 'Create a purchase order',
      blurb: function (S) { return 'Order ' + item(S, S.R.RM1).item_name + ' from ' + S.R.S1 + ' and email it to them.'; },
      next: ['purchase-receipt', 'purchase-invoice'],
      build: function (S) {
        var R = S.R, rm = item(S, R.RM1).item_name;
        return openNew('Purchase Order', 'A blank purchase order opens.', 'Stores just flagged that ' + rm + ' is running low, and ' + R.S1 + ' has the best rate. Let’s place the order and email it to them.').concat([
          { field: 'supplier', value: R.S1, title: 'Choose the supplier', text: R.S1 + ' is in ' + stateOf(S, R.S1) + '. ERPNext tracks the GST you pay them so you can claim it back.' },
          { field: 'schedule_date', value: D.addDays(D.TODAY, 10), title: 'Say when you need it', text: 'You need it within 10 days. That date shows on every line, so stores knows what’s coming.' },
          { row: 0, item: R.RM1, qty: qtyFor(S, R.RM1, 90000), title: 'Add ' + rm, text: 'The quantity stores asked for, at the rate from your buying price list.' },
          { row: 1, item: R.RM3, qty: qtyFor(S, R.RM3, 40000), title: 'Add ' + item(S, R.RM3).item_name, text: 'While we’re at it, one more item from the same supplier. One order can carry everything.' },
          saveStep('Purchase Order'),
          submitYou('Purchase Order', 'Submitting confirms the order. Stock and accounts don’t move yet: that happens when the goods arrive.')
        ], emailSteps('Purchase Order', R.S1), [
          { done: 1, text: function (S, d) { return 'Purchase Order ' + d.name + ' for ' + inr(d.rounded_total) + ' is placed and emailed to ' + d.supplier + '.'; } }
        ]);
      } },
    { id: 'purchase-receipt', module: 'procurement', title: 'Receive goods against the order', requires: 'purchase-order',
      blurb: function () { return 'Record what arrived at the warehouse. Stock goes up.'; },
      next: ['purchase-invoice', 'purchase-order'],
      build: function (S) {
        var po = latest(S, 'Purchase Order', function (d) { return d.docstatus === 1 && !d.received; });
        if (!po) return null;
        return openDoc('Purchase Order', po, 'Here’s the order the goods belong to.', 'A truck from ' + po.supplier + ' just pulled in at the gate. Let’s receive the goods against your order.').concat(createFrom('Purchase Receipt', 'Supplier, items, quantities and rates come across from the order.'), [
          { field: 'set_warehouse', value: 'Stores - ' + S.abbr, title: 'Choose the warehouse', text: 'Everything goes into Stores, and that warehouse’s balance goes up the moment we submit.' },
          { field: 'supplier_delivery_note', value: 'DC/' + S.abbr + '/0' + (300 + po.name.length), title: 'Note their challan', text: 'We keep the supplier’s delivery challan number, in case anything needs checking later.' },
          saveStep('Purchase Receipt'),
          submitYou('Purchase Receipt', 'Submitting adds the stock and marks the order as received.'),
          { done: 1, text: function (S, d) { return 'Purchase Receipt ' + d.name + ' is posted. The goods are in ' + d.set_warehouse + '.'; } }
        ]);
      } },
    { id: 'purchase-invoice', module: 'procurement', title: 'Book the supplier’s bill', requires: 'purchase-receipt',
      blurb: function () { return 'Turn a receipt into a purchase invoice. The payable is created.'; },
      next: ['purchase-order', 'payment'],
      build: function (S) {
        var pr = latest(S, 'Purchase Receipt', function (d) { return d.docstatus === 1 && !d.billed; });
        if (!pr) return null;
        return openDoc('Purchase Receipt', pr, 'Here’s what we actually received.', pr.supplier + '’s bill just landed in the inbox. Let’s book it against what actually arrived.').concat(createFrom('Purchase Invoice', 'Items and rates come from the receipt, so you only pay for what you got.'), [
          { field: 'bill_no', value: 'INV/26-27/0' + (400 + pr.name.length * 3), title: 'Enter their invoice number', text: 'Their bill number. If the same bill is ever entered twice, ERPNext stops you.' },
          { field: 'due_date', value: D.addDays(D.TODAY, 45), title: 'Set the due date', text: 'You pay in 45 days. It shows up in Accounts Payable so it’s never missed.' },
          { look: '.dd-totals', title: 'Input GST, ready to claim', text: 'The GST on this bill goes to your input tax accounts, ready to set off against what you collect.' },
          saveStep('Purchase Invoice'),
          submitYou('Purchase Invoice', 'Submitting records what you owe the supplier in your books.'),
          { done: 1, text: function (S, d) { return 'Purchase Invoice ' + d.name + ' for ' + inr(d.rounded_total) + ' is booked against ' + d.supplier + '.'; } }
        ]);
      } },
    { id: 'quotation', module: 'sales', title: 'Send a quotation',
      blurb: function (S) { return 'Quote ' + item(S, S.R.FG1).item_name + ' to ' + interCustomer(S) + ' and print a branded PDF.'; },
      next: ['sales-order', 'delivery-note'],
      build: function (S) {
        var R = S.R, cust = interCustomer(S), inter = stateOf(S, cust) !== S.state, fg = item(S, R.FG1).item_name, fg2 = item(S, R.FG2).item_name;
        return openNew('Quotation', 'A blank quotation opens, ready to fill.', cust + ' from ' + stateOf(S, cust) + ' just called asking for a price on ' + fg + ' and ' + fg2 + '. Let’s get them a quote before they call anyone else.').concat([
          { field: 'customer', value: cust, title: 'Choose the customer', text: 'They’re in ' + stateOf(S, cust) + ' and you’re in ' + S.state + (inter ? ', so IGST applies instead of CGST and SGST. ERPNext handles that for you.' : ', so CGST and SGST apply. ERPNext handles that for you.') },
          { row: 0, item: R.FG1, qty: qtyFor(S, R.FG1, 120000), title: 'Add ' + fg, text: 'The quantity they asked for. The rate comes from your price list, so every salesperson quotes the same price.' },
          { row: 1, item: R.FG2, qty: qtyFor(S, R.FG2, 60000), title: 'Add ' + fg2, text: 'And the second product. A quote can carry as many lines as the deal needs.' },
          { look: '.dd-totals', title: 'GST is calculated for you', text: 'Tax on each item from its HSN, rounding, and the total in words. Ready to send.' },
          saveStep('Quotation'),
          submitYou('Quotation', 'Submitting makes the quote final, so it can be sent and later turned into a sales order.')
        ], printSteps('Quotation', cust), [
          { done: 1, text: function (S, d) { return 'Quotation ' + d.name + ' for ' + inr(d.rounded_total) + ' is ready to send to ' + d.customer + '.'; } }
        ]);
      } },
    { id: 'sales-order', module: 'sales', title: 'Turn a quotation into a sales order', requires: 'quotation',
      blurb: function () { return 'The customer said yes. Convert the quotation and set a delivery date.'; },
      next: ['delivery-note', 'sales-invoice'],
      build: function (S) {
        var q = latest(S, 'Quotation', function (d) { return d.docstatus === 1 && !d.ordered; });
        if (!q) return null;
        return openDoc('Quotation', q, 'Here’s the quote they accepted.', q.customer + ' said yes to your quote! Let’s confirm the order without typing a single line again.').concat(createFrom('Sales Order', 'Everything from the quote comes across: customer, items, prices and taxes.'), [
          { field: 'delivery_date', value: D.addDays(D.TODAY, 10), title: 'Promise a delivery date', text: 'You promise delivery in 10 days. The order appears on your “to deliver” list until it ships.' },
          { field: 'po_no', value: 'PO/' + S.abbr + '/2026/0418', title: 'Add their PO number', text: 'Their purchase order number travels with every document that follows, so their accounts team can match it.' },
          saveStep('Sales Order'),
          submitYou('Sales Order', 'Submitting confirms the order, and the quotation is marked Ordered on its own.'),
          { done: 1, text: function (S, d) { return 'Sales Order ' + d.name + ' is confirmed. It now waits to be delivered and billed.'; } }
        ]);
      } },
    { id: 'delivery-note', module: 'sales', title: 'Deliver the order', requires: 'sales-order',
      blurb: function () { return 'Create a delivery note from the sales order. Stock goes out.'; },
      next: ['sales-invoice', 'quotation'],
      build: function (S) {
        var so = latest(S, 'Sales Order', function (d) { return d.docstatus === 1 && !d.delivered; });
        if (!so) return null;
        return openDoc('Sales Order', so, 'Here’s the order going out today.', 'The order for ' + so.customer + ' is packed and the truck is waiting. Let’s ship it.').concat(createFrom('Delivery Note', 'Customer, items and quantities come straight from the order.'), [
          { field: 'set_warehouse', value: 'Stores - ' + S.abbr, title: 'Choose where it ships from', text: 'The goods leave Stores, and that stock goes down the moment we submit.' },
          { field: 'lr_no', value: '3412 8890 ' + (1200 + so.name.length), title: 'Add the e-Way Bill', text: 'Goods over ₹50,000 on the road need an e-Way Bill, and its number goes right on the delivery note.' },
          saveStep('Delivery Note'),
          submitYou('Delivery Note', 'Submitting reduces stock and marks the order delivered.'),
          { done: 1, text: function (S, d) { return 'Delivery Note ' + d.name + ' is posted. The order now waits only for its invoice.'; } }
        ]);
      } },
    { id: 'item', module: 'stock', title: 'Add an item',
      blurb: function () { return 'Create a product with its HSN code, unit and selling rate.'; },
      next: ['stock-receipt', 'stock-transfer'],
      build: function (S) {
        var fg = item(S, S.R.FG1);
        var name = (S.profile.products || [])[2] || fg.item_name + ' (Bulk Pack)';
        var codes = S.docs.Item.map(function (i) { return i.name; });
        var code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 18);
        var c = code, n = 2; while (codes.indexOf(c) >= 0) c = code + '-' + (n++);
        return openNew('Item', 'A blank item opens.', 'You’re launching ' + name + '. Before you can buy, stock or sell it, it needs a place in ERPNext.').concat([
          { field: 'item_code', value: c, title: 'Give it a code', text: 'A short, unique code that will appear on every order and invoice.' },
          { field: 'item_name', value: name, title: 'Name it', text: 'The name your customers will see on quotes and bills.' },
          { field: 'item_group', value: 'Products', title: 'Pick its group', text: 'It goes under Products, which keeps reports and pricing rules tidy.' },
          { field: 'stock_uom', value: fg.stock_uom, title: 'Choose the unit', text: 'Stock is counted in ' + fg.stock_uom + '.' },
          { field: 'standard_rate', value: Math.round(fg.standard_rate * 1.8), title: 'Set the selling price', text: 'This becomes its price in your Standard Selling price list, so every quote picks it up.' },
          { field: 'gst_hsn_code', value: fg.gst_hsn_code, title: 'Add the HSN code', text: 'The HSN code decides the GST rate and is printed on every tax invoice.' },
          saveYou('Item', 'Once saved, the item is ready to buy, stock and sell.'),
          { done: 1, text: function (S, d) { return d.item_name + ' (' + d.name + ') is in your item list.'; } }
        ]);
      } },
    { id: 'stock-receipt', module: 'stock', title: 'Receive stock into a warehouse',
      blurb: function (S) { return 'Add ' + item(S, S.R.RM1).item_name + ' to Stores - ' + S.abbr + ' with a stock entry.'; },
      next: ['stock-transfer', 'item'],
      build: function (S) {
        var R = S.R, it = item(S, R.RM1);
        return openNew('Stock Entry', 'A blank stock entry opens.', 'You’re moving to ERPNext mid-year, and there’s ' + it.item_name + ' already sitting on your shelves. Let’s bring that stock in.').concat([
          { field: 'stock_entry_type', value: 'Material Receipt', title: 'Pick the movement', text: 'Material Receipt adds stock that didn’t come from a purchase order, like opening stock.' },
          { field: 'to_warehouse', value: 'Stores - ' + S.abbr, title: 'Choose the warehouse', text: 'It all goes into Stores. Each warehouse keeps its own count.' },
          { row: 0, item: R.RM1, qty: qtyFor(S, R.RM1, 50000), title: 'Add what’s on the shelf', text: 'The ' + it.item_name + ' and how much of it there is, valued at what you paid.' },
          saveStep('Stock Entry'),
          submitYou('Stock Entry', 'Submitting updates the stock ledger and the stock value in your books.'),
          { done: 1, text: function (S, d) { return 'Stock Entry ' + d.name + ' is posted. Stock Balance shows the new quantity.'; } }
        ]);
      } },
    { id: 'stock-transfer', module: 'stock', title: 'Move stock between warehouses',
      blurb: function (S) { return 'Transfer ' + item(S, S.R.RM1).item_name + ' from Stores to Work In Progress.'; },
      next: ['item', 'stock-receipt'],
      build: function (S) {
        var R = S.R, it = item(S, R.RM1);
        return openNew('Stock Entry', 'A blank stock entry opens.', 'The production floor needs ' + it.item_name + ' today. Let’s move it out of Stores so everyone knows where it is.').concat([
          { field: 'stock_entry_type', value: 'Material Transfer', title: 'Pick Material Transfer', text: 'A transfer moves stock between places without changing what it’s worth.' },
          { field: 'from_warehouse', value: 'Stores - ' + S.abbr, title: 'Where it leaves from', text: 'It leaves Stores…' },
          { field: 'to_warehouse', value: 'Work In Progress - ' + S.abbr, title: 'Where it goes', text: '…and lands in Work In Progress, right where production needs it.' },
          { row: 0, item: R.RM1, qty: qtyFor(S, R.RM1, 20000), title: 'Add what’s moving', text: 'The ' + it.item_name + ' and how much of it goes to the floor.' },
          saveStep('Stock Entry'),
          submitYou('Stock Entry', 'Submitting updates both warehouses at once.'),
          { done: 1, text: function (S, d) { return 'Stock Entry ' + d.name + ' moved stock from ' + d.from_warehouse + ' to ' + d.to_warehouse + '.'; } }
        ]);
      } },
    { id: 'asset', module: 'assets', title: 'Register a fixed asset',
      blurb: function () { return 'Add a laptop to your asset register and see its depreciation.'; },
      next: ['asset-movement', 'journal'],
      build: function (S) {
        return openNew('Asset', 'A blank asset opens.', 'Your accounts team just got a new ₹78,000 laptop. It isn’t an expense, it’s an asset, and it should lose value over three years. Let’s set that up.').concat([
          { field: 'item_code', value: 'Laptop - Dell Latitude 5440', title: 'Pick the asset item', text: 'The laptop model, which is marked as a fixed asset in your item list.' },
          { field: 'asset_name', value: 'Laptop for Accounts Team', title: 'Name it', text: 'A name your team will recognise when they see it in the register.' },
          { field: 'asset_category', value: 'Computers', title: 'Choose the category', text: 'Computers. The category carries the accounts and the depreciation rules, so nobody sets them each time.' },
          { field: 'location', value: 'Head Office', title: 'Say where it is', text: 'It sits at Head Office, so you can count assets site by site.' },
          { field: 'gross_purchase_amount', value: 78000, title: 'Enter what it cost', text: '₹78,000. Depreciation is worked out from this amount.' },
          { look: '#dd-depreciation', title: 'Depreciation is planned', text: 'ERPNext lays out the schedule and posts the depreciation every month. Nobody has to remember.' },
          saveStep('Asset'),
          submitYou('Asset', 'Submitting puts it in your asset register and starts the schedule.'),
          { done: 1, text: function (S, d) { return 'Asset ' + d.name + ' (' + d.asset_name + ') is in your register.'; } }
        ]);
      } },
    { id: 'asset-movement', module: 'assets', title: 'Move an asset to another location',
      blurb: function () { return 'Transfer an asset to a new site and person, with a full history.'; },
      next: ['asset', 'stock-transfer'],
      build: function (S) {
        var a = latest(S, 'Asset', function (d) { return d.docstatus === 1; });
        if (!a) return null;
        var to = a.location === 'Factory' ? 'Warehouse' : 'Factory';
        return openDoc('Asset', a, 'Here’s the asset that’s moving.', a.asset_name + ' is moving to the ' + to + ', and Farhan will be responsible for it. Let’s record that so the register stays true.').concat(createFrom('Asset Movement', 'The asset and where it is now are filled in.'), [
          { field: 'purpose', value: 'Transfer', title: 'Pick the purpose', text: 'A transfer, because it’s moving between locations.' },
          { field: 'target_location', value: to, title: 'Choose the new location', text: 'It’s headed to the ' + to + '.' },
          { field: 'to_employee', value: 'Farhan Shaikh', title: 'Choose the new custodian', text: 'Farhan takes charge of it from today.' },
          saveStep('Asset Movement'),
          submitYou('Asset Movement', 'Submitting updates where the asset is and who has it. Its value doesn’t change.'),
          { done: 1, text: function (S, d) { return 'Asset Movement ' + d.name + ' is recorded. ' + d.asset + ' is now at ' + d.target_location + '.'; } }
        ]);
      } },
    { id: 'bom', module: 'manufacturing', title: 'Create a bill of materials',
      blurb: function (S) { return 'List what goes into one ' + item(S, S.R.FG1).item_name + '.'; },
      next: ['work-order', 'manufacture'],
      build: function (S) {
        var R = S.R, a = D.bomRows(S)[0], b = D.bomRows(S)[1], fg = item(S, R.FG1).item_name;
        return openNew('BOM', 'A blank bill of materials opens.', 'Every ' + fg + ' you make uses the same materials. Let’s write the recipe down once, and ERPNext will use it for every order, cost and plan.').concat([
          { field: 'item', value: R.FG1, title: 'Choose what you make', text: fg + ' is the finished product.' },
          { field: 'quantity', value: 1, title: 'Say for how many', text: 'The recipe is for one unit. ERPNext scales it for any batch size.' },
          { row: 0, item: a.item_code, qty: a.qty, title: 'Add the main material', text: 'How much ' + item(S, a.item_code).item_name + ' goes into one unit.' },
          { row: 1, item: b.item_code, qty: b.qty, title: 'Add the consumables', text: 'Packing and consumables go in too, so the cost per unit is complete.' },
          saveStep('BOM'),
          submitYou('BOM', 'Submitting makes the BOM active, so work orders can use it.'),
          { done: 1, text: function (S, d) { return 'BOM ' + d.name + ' is active. Material cost per unit is ' + inr(d.net_total) + '.'; } }
        ]);
      } },
    { id: 'work-order', module: 'manufacturing', title: 'Plan production with a work order', requires: 'bom',
      blurb: function (S) { return 'Tell the shop floor to make 50 ' + item(S, S.R.FG1).item_name + '.'; },
      next: ['manufacture', 'bom'],
      build: function (S) {
        var b = latest(S, 'BOM', function (d) { return d.docstatus === 1; });
        if (!b) return null;
        return openDoc('BOM', b, 'Here’s the recipe we’ll make from.', 'Sales needs 50 ' + item(S, b.item).item_name + ' by next week. Let’s tell the shop floor, starting from the recipe.').concat(createFrom('Work Order', 'The product, its BOM and every material are filled in.'), [
          { field: 'qty', value: 50, title: 'Say how many to make', text: '50 units. Watch the materials list below scale up to match.' },
          { field: 'planned_start_date', value: D.addDays(D.TODAY, 1), title: 'Pick a start date', text: 'Production starts tomorrow, and it shows on the planning calendar.' },
          { field: 'fg_warehouse', value: 'Finished Goods - ' + S.abbr, title: 'Choose where finished units go', text: 'Finished units go into Finished Goods, ready to ship.' },
          saveStep('Work Order'),
          submitYou('Work Order', 'Submitting releases the work order to the shop floor.'),
          { done: 1, text: function (S, d) { return 'Work Order ' + d.name + ' for ' + d.qty + ' units is released to the floor.'; } }
        ]);
      } },
    { id: 'manufacture', module: 'manufacturing', title: 'Finish production', requires: 'work-order',
      blurb: function () { return 'Consume raw materials and add finished goods to stock.'; },
      next: ['bom', 'stock-transfer'],
      build: function (S) {
        var wo = latest(S, 'Work Order', function (d) { return d.docstatus === 1 && !d.manufactured; });
        if (!wo) return null;
        return openDoc('Work Order', wo, 'Here’s the work order that just finished.', 'The shop floor finished the batch. Let’s record it: materials out, finished products in.').concat(createFrom('Stock Entry', 'A Manufacture entry is filled in from the work order.'), [
          { look: '.dd-totals, .dd-itemsec, table', title: 'Materials out, product in', text: 'Raw materials are used up and the finished product is added, all in one entry.' },
          saveStep('Stock Entry'),
          submitYou('Stock Entry', 'Submitting updates stock and marks the work order Completed.'),
          { done: 1, text: function (S, d) { return 'Stock Entry ' + d.name + ' is posted. Work Order ' + d.work_order + ' is Completed.'; } }
        ]);
      } },
    { id: 'inspection', module: 'quality', title: 'Inspect incoming material',
      blurb: function (S) { return 'Check ' + item(S, S.R.RM1).item_name + ' against your ' + S.qc.param + ' spec.'; },
      next: ['non-conformance', 'purchase-receipt'],
      build: function (S) {
        var R = S.R;
        return openNew('Quality Inspection').concat([
          { field: 'inspection_type', value: 'Incoming', title: 'Inspection type', text: 'Incoming checks happen when goods are received.' },
          { field: 'item_code', value: R.RM1, title: 'What you are checking', text: item(S, R.RM1).item_name + ' from the latest delivery.' },
          { field: 'sample_size', value: 10, title: 'Sample size', text: 'Inspection templates can set this for you.' },
          { field: 'reading_gsm', value: S.qc.reading, title: 'Record the reading', text: S.qc.param + ' should be ' + S.qc.spec + '. This sample reads ' + S.qc.reading + '.' },
          { field: 'status', value: 'Rejected', title: 'Reject the lot', text: 'The reading is out of spec.' },
          saveStep('Quality Inspection'),
          submitYou('Quality Inspection', 'Submitting records the result against the item.'),
          { done: 1, text: function (S, d) { return 'Quality Inspection ' + d.name + ' is recorded as ' + d.status + '.'; } }
        ]);
      } },
    { id: 'non-conformance', module: 'quality', title: 'Log a non-conformance', requires: 'inspection',
      blurb: function () { return 'Raise a non-conformance from a failed inspection and assign an owner.'; },
      next: ['inspection', 'issue'],
      build: function (S) {
        var qi = latest(S, 'Quality Inspection', function (d) { return d.docstatus === 1 && !d.nc; });
        if (!qi) return null;
        return openDoc('Quality Inspection', qi, 'This inspection needs follow-up.').concat(createFrom('Non Conformance', 'The subject and details come from the inspection.'), [
          { field: 'procedure', value: 'Incoming Material Inspection', title: 'Which procedure', text: 'It is linked to the quality procedure that was breached.' },
          { field: 'process_owner', value: 'Vikram Mehta', title: 'Who owns the fix', text: 'The process owner tracks it to closure.' },
          saveYou('Non Conformance', 'Saving opens the non-conformance.'),
          { done: 1, text: function (S, d) { return 'Non Conformance ' + d.name + ' is open and assigned to ' + d.process_owner + '.'; } }
        ]);
      } },

    /* ---- Projects ---- */
    { id: 'project', module: 'projects', title: 'Create a project',
      blurb: function (S) { return 'Track tasks, time and costs for ' + S.R.C3 + '.'; },
      next: ['task', 'timesheet'],
      build: function (S) {
        var R = S.R;
        return openNew('Project', 'Projects collect tasks, timesheets, purchases and invoices in one place.').concat([
          { field: 'project_name', value: 'Rollout for ' + R.C3, title: 'Name the project', text: 'A name your team will recognise.' },
          { field: 'customer', value: R.C3, title: 'Link the customer', text: 'Billing from timesheets goes to this customer.' },
          { field: 'expected_end_date', value: D.addDays(D.TODAY, 45), title: 'Target end date', text: 'Shown on the Gantt view.' },
          { field: 'estimated_costing', value: 450000, title: 'Estimated cost', text: 'It is compared with actual costs as the project runs.' },
          saveYou('Project', 'Once saved, tasks can be added to it.'),
          { done: 1, text: function (S, d) { return 'Project ' + d.name + ' is open.'; } }
        ]);
      } },
    { id: 'task', module: 'projects', title: 'Add a task to the project', requires: 'project',
      blurb: function () { return 'Break the project into tasks with priorities and deadlines.'; },
      next: ['timesheet', 'project'],
      build: function (S) {
        var p = latest(S, 'Project');
        if (!p) return null;
        return openDoc('Project', p, 'Add the first piece of work to this project.').concat(createFrom('Task', 'The task is linked to the project.'), [
          { field: 'subject', value: 'Kick-off meeting and requirements', title: 'What needs doing', text: 'Tasks can be nested into a tree for bigger projects.' },
          { field: 'priority', value: 'High', title: 'Priority', text: 'Tasks can be sorted and filtered by priority.' },
          { field: 'expected_time', value: 6, title: 'Expected hours', text: 'Planned time is compared with timesheets.' },
          { field: 'exp_end_date', value: D.addDays(D.TODAY, 5), title: 'Due date', text: 'Overdue tasks are flagged.' },
          saveYou('Task', 'Once saved, the task appears on the project.'),
          { done: 1, text: function (S, d) { return 'Task ' + d.name + ' is added to ' + d.project + '.'; } }
        ]);
      } },
    { id: 'timesheet', module: 'projects', title: 'Log time on a task', requires: 'task',
      blurb: function () { return 'Record hours against a task. Cost and billing update on the project.'; },
      next: ['project', 'sales-invoice'],
      build: function (S) {
        var t = latest(S, 'Task', function (d) { return d.status !== 'Completed'; });
        if (!t) return null;
        return openDoc('Task', t, 'Your team worked on this task today.').concat(createFrom('Timesheet', 'The project and task are linked.'), [
          { field: 'employee', value: 'Ananya Rao', title: 'Who worked', text: 'Each employee logs their own time.' },
          { field: 'activity_type', value: 'Consulting', title: 'Activity type', text: 'Activity types carry default costing and billing rates.' },
          { field: 'hours', value: 6, title: 'Hours', text: 'Hours roll up to the project.' },
          saveStep('Timesheet'),
          submitYou('Timesheet', 'Submitting adds the cost and billable amount to the project.'),
          { done: 1, text: function (S, d) { return 'Timesheet ' + d.name + ' logs ' + d.hours + ' hours on ' + d.project + '.'; } }
        ]);
      } },

    /* ---- Support ---- */
    { id: 'issue', module: 'support', title: 'Log a customer issue',
      blurb: function (S) { return 'Record a complaint from ' + S.R.C1 + ' with an SLA clock.'; },
      next: ['maintenance-visit', 'project'],
      build: function (S) {
        var R = S.R;
        return openNew('Issue', 'Issues can also be created automatically from support emails.').concat([
          { field: 'subject', value: 'Short delivery on last order', title: 'What went wrong', text: 'A clear subject helps the team triage.' },
          { field: 'customer', value: R.C1, title: 'Which customer', text: 'Their orders and invoices are one click away.' },
          { field: 'priority', value: 'High', title: 'Set priority', text: 'Priority sets the response time from your SLA.' },
          { look: '#dd-sla', title: 'The SLA starts counting', text: 'Response and resolution times are tracked on the issue.' },
          { field: 'description', value: '12 units short against the delivery note. Customer needs them before Friday.', title: 'Details', text: 'Your team sees the full context.' },
          saveYou('Issue', 'Once saved, the issue is open for your support team.'),
          { done: 1, text: function (S, d) { return 'Issue ' + d.name + ' is open with ' + d.priority + ' priority.'; } }
        ]);
      } },
    { id: 'maintenance-visit', module: 'support', title: 'Record a maintenance visit', requires: 'issue',
      blurb: function () { return 'Send a technician and record the work done against the issue.'; },
      next: ['issue', 'sales-invoice'],
      build: function (S) {
        var is = latest(S, 'Issue', function (d) { return !d.resolved; });
        if (!is) return null;
        return openDoc('Issue', is, 'A technician visited ' + (is.customer || 'the customer') + ' for this issue.').concat(createFrom('Maintenance Visit', 'The customer is filled from the issue.'), [
          { field: 'maintenance_type', value: 'Breakdown', title: 'Type of visit', text: 'Breakdown, scheduled or unscheduled.' },
          { field: 'service_person', value: 'Farhan Shaikh', title: 'Who went', text: 'Visits are tracked per service person.' },
          { field: 'completion_status', value: 'Fully Completed', title: 'Was it fixed?', text: 'Partly completed visits stay open for follow-up.' },
          saveStep('Maintenance Visit'),
          submitYou('Maintenance Visit', 'Submitting records the visit against the customer.'),
          { done: 1, text: function (S, d) { return 'Maintenance Visit ' + d.name + ' is recorded for ' + d.customer + '.'; } }
        ]);
      } },

    /* ---- CRM ---- */
    { id: 'lead', module: 'crm', title: 'Capture a lead',
      blurb: function () { return 'Log a new enquiry and start your sales pipeline.'; },
      next: ['opportunity', 'quotation'],
      build: function (S) {
        return openNew('Lead').concat([
          { field: 'lead_name', value: 'Rohan Desai', title: 'Who enquired', text: 'The person’s name comes first.' },
          { field: 'company_name', value: 'Desai Enterprises', title: 'Their organisation', text: 'When they buy, this becomes the customer name.' },
          { field: 'source', value: 'IndiaMART', title: 'Where it came from', text: 'Sources show which channels bring business.' },
          { field: 'mobile_no', value: '+91 98200 41177', title: 'Contact number', text: 'Calls and follow-ups are logged on the lead.' },
          { field: 'state', value: 'Karnataka', title: 'Their state', text: 'Used for GST when you quote them.' },
          saveYou('Lead', 'Once saved, the lead is in your pipeline.'),
          { done: 1, text: function (S, d) { return 'Lead ' + d.name + ' (' + d.company_name + ') is in your pipeline.'; } }
        ]);
      } },
    { id: 'opportunity', module: 'crm', title: 'Turn a lead into an opportunity', requires: 'lead',
      blurb: function () { return 'Qualify a lead into a deal with value, stage and closing date.'; },
      next: ['quotation', 'lead'],
      build: function (S) {
        var l = latest(S, 'Lead', function (d) { return !d.opp && !d.ordered; });
        if (!l) return null;
        return openDoc('Lead', l, l.lead_name + ' from ' + l.company_name + ' is a real prospect.').concat(createFrom('Opportunity', 'The party and items of interest are filled in.'), [
          { field: 'sales_stage', value: 'Needs Analysis', title: 'Sales stage', text: 'Stages show where every deal is in the pipeline.' },
          { field: 'probability', value: 60, title: 'Probability', text: 'Used to weigh your forecast.' },
          { field: 'expected_closing', value: D.addDays(D.TODAY, 21), title: 'Expected closing', text: 'Shows up in the pipeline report.' },
          saveYou('Opportunity', 'Once saved, a quotation can be created from it.'),
          { done: 1, text: function (S, d) { return 'Opportunity ' + d.name + ' for ' + d.party + ' is open.'; } }
        ]);
      } },

    /* ---- Point of Sale ---- */
    { id: 'pos', module: 'pos', title: 'Open a shift and bill a sale',
      blurb: function (S) { return 'Open the counter and sell ' + item(S, S.R.FG1).item_name + ' over the counter.'; },
      next: ['pos-close', 'item'],
      build: function (S) {
        var R = S.R;
        return openNew('POS Opening Entry', 'Each cashier opens a shift with the cash in the drawer.').concat([
          { field: 'opening_amount', value: 5000, title: 'Opening cash', text: 'The cashier counts the drawer before the first sale.' },
          saveStep('POS Opening Entry'),
          submitYou('POS Opening Entry', 'Submitting opens the shift.'),
          { click: '[data-act="pos"]', title: 'Open Point of Sale', text: 'The POS screen works on touch screens and with barcode scanners.' },
          { click: '.dd-pos-item[data-code="' + cssq(R.FG1) + '"]', title: 'Tap a product', text: 'Items go into the cart with a tap or a barcode scan.' },
          { click: '.dd-pos-item[data-code="' + cssq(R.FG1) + '"]', title: 'Tap again for one more', text: 'Quantity goes up with each tap.' },
          { click: '[data-act="pos-checkout"]', title: 'Checkout', text: 'GST is already on the bill.' },
          { click: '[data-mode="UPI"]', title: 'Pick UPI', text: 'Split payments across UPI, cash and card are supported.' },
          { you: 'click', target: '[data-act="pos-complete"]', event: 'pos-paid', title: 'Complete the order', text: 'This creates the POS invoice and reduces stock.' },
          { done: 1, text: function (S, d) { return 'Sale ' + d.name + ' is paid by ' + d.mode_of_payment + '.'; } }
        ]);
      } },
    { id: 'pos-close', module: 'pos', title: 'Close the shift', requires: 'pos',
      blurb: function () { return 'Count the drawer and close the day with totals by payment mode.'; },
      next: ['pos', 'stock-receipt'],
      build: function (S) {
        var o = latest(S, 'POS Opening Entry', function (d) { return d.docstatus === 1 && !d.closed; });
        if (!o) return null;
        return openDoc('POS Opening Entry', o, 'It is the end of the day.').concat(createFrom('POS Closing Entry', 'Sales in this shift are totalled for you.'), [
          { look: '#dd-by_mode', title: 'Collections by mode', text: 'Cash, UPI and card totals for the shift.' },
          { field: 'closing_amount', value: (+o.opening_amount || 0) + 1200, title: 'Cash counted', text: 'The cash counted in the drawer. Any difference is shown.' },
          saveStep('POS Closing Entry'),
          submitYou('POS Closing Entry', 'Submitting closes the shift and consolidates its invoices.'),
          { done: 1, text: function (S, d) { return 'POS Closing Entry ' + d.name + ' closed the shift.'; } }
        ]);
      } }
  ];

  var TOUR_DT = { 'sales-invoice': 'Sales Invoice', payment: 'Payment Entry', journal: 'Journal Entry', 'purchase-order': 'Purchase Order', 'purchase-receipt': 'Purchase Receipt', 'purchase-invoice': 'Purchase Invoice',
    quotation: 'Quotation', 'sales-order': 'Sales Order', 'delivery-note': 'Delivery Note', item: 'Item', 'stock-receipt': 'Stock Entry', 'stock-transfer': 'Stock Entry', asset: 'Asset', 'asset-movement': 'Asset Movement',
    bom: 'BOM', 'work-order': 'Work Order', manufacture: 'Stock Entry', inspection: 'Quality Inspection', 'non-conformance': 'Non Conformance', project: 'Project', task: 'Task', timesheet: 'Timesheet',
    issue: 'Issue', 'maintenance-visit': 'Maintenance Visit', lead: 'Lead', opportunity: 'Opportunity', pos: 'POS Opening Entry', 'pos-close': 'POS Closing Entry' };
  TOURS.forEach(function (t) { t.dt = TOUR_DT[t.id]; });
  global.ERPTours = { list: TOURS, byId: function (id) { return TOURS.filter(function (t) { return t.id === id; })[0]; } };

  /* ---------------- runner ---------------- */
  P.tourLayer = function () {
    var L = this.root.querySelector('.dt-layer');
    if (L) return L;
    L = document.createElement('div');
    L.className = 'dt-layer';
    L.innerHTML = '<div class="dt-block"></div><div class="dt-spot" hidden></div><div class="dt-keys" hidden></div>' +
      '<div class="dt-cursor" hidden><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2l15 9.5-6.5 1.4L16 21l-3 1.3-3.6-8.1L4 18z" fill="#171717" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg><i></i></div>' +
      '<div class="dt-tip" role="dialog" aria-live="polite" hidden></div>';
    this.root.appendChild(L);
    var self = this;
    L.querySelector('.dt-block').addEventListener('click', function () { var t = L.querySelector('.dt-tip'); t.classList.remove('dt-shake'); void t.offsetWidth; t.classList.add('dt-shake'); });
    L.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tt]'); if (!b) return;
      var a = b.getAttribute('data-tt'), T = self._tour;
      if (a === 'next' && T && T.advance && !b.disabled) T.advance();
      if (a === 'back' && T && !b.disabled) self.tourBack();
      if (a === 'pause' && T) { T.paused = !T.paused; b.textContent = T.paused ? 'Resume' : 'Pause'; self.root.classList.toggle('dt-paused', T.paused); }
      if (a === 'skip') self.stopTour();
      if (a === 'doit' && T && T.doit) T.doit();
      if (a === 'next-tour') self.startTour(b.getAttribute('data-id'));
      if (a === 'home') { self.stopTour(true); self.hideLayer(); self.go({ view: 'home' }); }
      if (a === 'dash') { self.stopTour(true); self.hideLayer(); self.go({ view: 'dash' }); }
      if (a === 'fb-rate') {
        var box = b.closest('.dt-fb'), r = +b.getAttribute('data-r');
        box.setAttribute('data-r', r);
        box.querySelectorAll('[data-r]').forEach(function (x) { if (x.tagName === 'BUTTON') x.setAttribute('aria-pressed', String(+x.getAttribute('data-r') === r)); });
        box.querySelector('.dt-fb-send').disabled = false;
      }
      if (a === 'fb-send' && !b.disabled) {
        var bx = b.closest('.dt-fb');
        self.emit('tour-feedback', { tour: self._fbTour || '', rating: +bx.getAttribute('data-r'), comment: bx.querySelector('textarea').value.trim().slice(0, 800) });
        bx.innerHTML = '<div class="dt-fb-done"><i>✓</i><span>Thanks! Your feedback helps us improve these tours.</span></div>';
      }
      if (a === 'close') { self.stopTour(true); self.hideLayer(); }
    });
    return L;
  };

  /* one click-away handler at a time; real (trusted) clicks only, and never while a tour runs */
  P.armAway = function (fn) {
    var self = this;
    this.disarmAway();
    this._away = function (e) {
      if (self._tour || !e.isTrusted) return;
      if (fn(e)) self.disarmAway();
    };
    setTimeout(function () { if (self._away) document.addEventListener('click', self._away, true); }, 50);
  };
  P.disarmAway = function () { if (this._away) document.removeEventListener('click', this._away, true); this._away = null; };
  P.hideLayer = function () {
    this.disarmAway();
    var L = this.root.querySelector('.dt-layer'); if (!L) return;
    L.hidden = true;
    ['.dt-spot', '.dt-keys', '.dt-cursor', '.dt-tip'].forEach(function (s) { var e = L.querySelector(s); e.hidden = true; e.classList && e.classList.remove('is-done'); });
  };
  P.startTour = function (id) {
    var t = TOURS.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    if (this._tour) this.stopTour(true);
    this.disarmAway();
    this.closeSetup && this.closeSetup();
    if (this.S.module !== t.module) this.setModule(t.module);
    var steps = t.build(this.S);
    if (!steps) {
      var need = t.requires && global.ERPTours.byId(t.requires);
      var L0 = this.tourLayer(); L0.hidden = false; L0.querySelector('.dt-block').hidden = true;
      this.tip({ head: false, title: 'Start with “' + (need ? need.title : 'the previous tour') + '”', text: esc('“' + t.title + '” continues from the document that tour creates, the same way it works in ERPNext.'),
        foot: '<div class="dt-ctl">' + (need ? '<button type="button" class="dd-btn dd-btn-dark" data-tt="next-tour" data-id="' + need.id + '">Start “' + esc(need.title) + '”</button>' : '') + '<button type="button" class="dt-skip" data-tt="close">Close</button></div>' });
      var me0 = this, tip0 = L0.querySelector('.dt-tip');
      this.armAway(function (e) { if (!tip0.contains(e.target)) { me0.hideLayer(); return true; } });
      return;
    }
    var S0 = this.S;
    var snap = { docs: JSON.stringify(S0.docs), counters: JSON.stringify(S0.counters), tick: S0.tick, cart: this.cart ? JSON.stringify(this.cart) : null };
    var T = this._tour = { id: id, tour: t, steps: steps, i: 0, paused: false, cancelled: false, cursor: null, snap: snap };
    this.touring = true;
    this.root.classList.add('dd-touring');
    var L = this.tourLayer();
    L.hidden = false;
    var self = this;
    this.emit('tour-start', t);
    this.runSteps(T).then(function () { }, function (e) { if (e !== CANCEL && global.console) console.error(e); });
    this._onKey = this._onKey || function (e) {
      var T0 = self._tour; if (!T0) return;
      if (e.key === 'Escape') self.stopTour();
      else if ((e.key === 'Enter' || e.key === 'ArrowRight') && T0.advance) { e.preventDefault(); T0.advance(); }
      else if (e.key === 'ArrowLeft' && T0.waiting && T0.i > 0) { e.preventDefault(); self.tourBack(); }
    };
    document.addEventListener('keydown', this._onKey);
  };

  function fastNow(T) { return T && T.fastTo != null && T.i < T.fastTo; }
  P.tourBack = function () {
    var T = this._tour;
    if (!T || !T.waiting || T.i < 1) return;
    var target = T.i - 1;
    T.cancelled = true;
    if (T.release) T.release();
    clearInterval(this._spotTimer);
    var S = this.S, snap = T.snap;
    S.docs = JSON.parse(snap.docs); S.counters = JSON.parse(snap.counters); S.tick = snap.tick; S.routes = {};
    this.cart = snap.cart ? JSON.parse(snap.cart) : null;
    this.closeAB(); this.closeModal();
    this.root.classList.remove('dt-you');
    var L = this.tourLayer();
    L.querySelector('.dt-cursor').hidden = true; this.hideKeys(); this.spot(null);
    var N = this._tour = { id: T.id, tour: T.tour, steps: T.steps, i: 0, paused: false, cancelled: false, snap: snap, fastTo: target };
    this.root.classList.add('dt-fast');
    var self = this;
    this.runSteps(N).then(function () { }, function (e) { if (e !== CANCEL && global.console) console.error(e); });
  };

  P.stopTour = function (silent) {
    var T = this._tour;
    if (!T) return;
    T.cancelled = true;
    if (T.release) T.release();
    this._tour = null;
    this.touring = false;
    this.root.classList.remove('dd-touring', 'dt-paused', 'dt-you', 'dt-fast');
    var L = this.root.querySelector('.dt-layer');
    if (L) {
      L.hidden = true;
      ['.dt-spot', '.dt-keys', '.dt-cursor', '.dt-tip'].forEach(function (s) { L.querySelector(s).hidden = true; });
    }
    clearInterval(this._spotTimer);
    document.removeEventListener('keydown', this._onKey);
    this.render();
    if (!silent) this.toast('Tour stopped');
  };

  /* timing that respects pause and cancel */
  P.twait = function (ms) {
    var T = this._tour, left = ms * (REDUCE ? 0.25 : 1);
    if (fastNow(T)) return T.cancelled ? Promise.reject(CANCEL) : Promise.resolve();
    return new Promise(function (res, rej) {
      (function tick() {
        if (!T || T.cancelled) return rej(CANCEL);
        if (left <= 0) return res();
        if (!T.paused) left -= 40;
        setTimeout(tick, 40);
      })();
    });
  };

  P.rel = function (el) {
    var R = this.root.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - R.left, y: r.top - R.top, w: r.width, h: r.height, W: R.width, H: R.height };
  };
  P.q = function (sel) { return typeof sel === 'string' ? this.root.querySelector(sel) : sel; };

  P.ensureVisible = function (el) {
    var main = this.root.querySelector('.dd-main');
    if (!el || !main.contains(el)) return Promise.resolve();
    var mr = main.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (r.top >= mr.top + 50 && r.bottom <= mr.bottom - 60) return Promise.resolve();
    main.scrollTo({ top: Math.max(0, main.scrollTop + (r.top - mr.top) - mr.height * 0.3), behavior: REDUCE || fastNow(this._tour) ? 'auto' : 'smooth' });
    return this.twait(420);
  };

  P.spot = function (el, pulse) {
    var L = this.tourLayer(), s = L.querySelector('.dt-spot');
    if (!el) { s.hidden = true; return; }
    var b = this.rel(el), pad = 6;
    s.hidden = false;
    s.style.left = (b.x - pad) + 'px'; s.style.top = (b.y - pad) + 'px';
    s.style.width = (b.w + pad * 2) + 'px'; s.style.height = (b.h + pad * 2) + 'px';
    s.classList.toggle('is-pulse', !!pulse);
  };

  var GERUND = { Open: 'Opening', Type: 'Typing', Find: 'Finding', Pick: 'Picking', Choose: 'Choosing', Add: 'Adding', Set: 'Setting', Note: 'Noting', Enter: 'Entering',
    Debit: 'Debiting', Credit: 'Crediting', Promise: 'Promising', Name: 'Naming', Record: 'Recording', Reject: 'Rejecting', Link: 'Linking', Tap: 'Tapping',
    Save: 'Saving', Submit: 'Submitting', Complete: 'Completing', Checkout: 'Checking out', Give: 'Giving', Say: 'Saying', Email: 'Emailing', Send: 'Sending' };
  function narrate(title) {
    var m = /^(\w+)(.*)$/.exec(title || ''); if (!m || !GERUND[m[1]]) return title;
    return GERUND[m[1]] + m[2];
  }
  P.tip = function (opts) {
    var L = this.tourLayer(), tip = L.querySelector('.dt-tip'), T = this._tour;
    var n = T ? T.steps.filter(function (s) { return !s.done; }).length : 0;
    var idx = T ? Math.min(T.i + 1, n) : 0;
    var foot = opts.foot != null ? opts.foot :
      '<div class="dt-ctl">' + ((opts.next || opts.doit) && idx > 1 ? '<button type="button" class="dd-btn dt-back" data-tt="back"' + (opts.doit ? '' : ' disabled') + '>← Back</button>' : '') +
        (opts.doit ? '' : opts.next ? '<button type="button" class="dd-btn dd-btn-dark dt-nextstep" data-tt="next" disabled>' + (idx === 1 ? 'Start' : 'Next') + ' →</button>' : '') + '<button type="button" class="dt-skip" data-tt="skip">End tour</button></div>' + (opts.next && idx > 1 && idx <= 3 ? '<p class="dt-hint">Each step plays on its own. Press Next when you’re ready.</p>' : '');
    tip.innerHTML = (opts.head === false ? '' : '<div class="dt-head"><span>' + esc(T ? T.tour.title : 'Tour') + '</span><span class="dd-tn">' + idx + ' / ' + n + '</span></div><div class="dt-bar"><i style="width:' + (n ? Math.round(idx / n * 100) : 0) + '%"></i></div>') +
      '<h4>' + esc(T && opts.head !== false ? narrate(opts.title) : (opts.title || '')) + '</h4>' + (opts.text ? '<p>' + opts.text + '</p>' : '') + (opts.keys ? '<p class="dt-keyrow"><span class="dt-kl">Shortcut</span>' + opts.keys.map(function (k) { return '<kbd>' + esc(k) + '</kbd>'; }).join('<span>+</span>') + '</p>' : '') + foot;
    tip.hidden = false;
    tip.classList.toggle('is-center', !opts.el && !opts.corner && !opts.stay);
    var W = this.root.clientWidth, H = this.root.clientHeight;
    var tw = Math.min(320, W - 24);
    tip.style.width = tw + 'px';
    tip.classList.toggle('is-done', !!opts.done);
    tw = tip.offsetWidth;
    var th = tip.offsetHeight;
    var x, y;
    var px0 = parseFloat(tip.style.left), py0 = parseFloat(tip.style.top);
    if (opts.stay && !isNaN(px0) && !isNaN(py0)) { x = Math.min(Math.max(12, px0), W - tw - 12); y = Math.min(Math.max(12, py0), H - th - 12); }
    else if (opts.corner) { x = W - tw - 16; y = H - th - 16; }
    else if (!opts.el) { x = (W - tw) / 2; y = Math.max(12, (H - th) / 2); }
    else {
      var b = this.rel(opts.el);
      x = Math.min(Math.max(12, b.x + b.w / 2 - tw / 2), W - tw - 12);
      y = b.y + b.h + 14;
      if (y + th > H - 12) y = b.y - th - 14;
      if (y < 12) { y = Math.min(H - th - 12, Math.max(12, b.y + 20)); x = b.x + b.w + 14 + tw < W ? b.x + b.w + 14 : Math.max(12, b.x - tw - 14); }
    }
    tip.style.left = Math.round(x) + 'px';
    tip.style.top = Math.round(y) + 'px';
  };

  P.cursorTo = function (el, click) {
    var L = this.tourLayer(), c = L.querySelector('.dt-cursor'), T = this._tour;
    var b = this.rel(el);
    var tx = b.x + Math.min(b.w * 0.5, 40), ty = b.y + b.h * 0.6;
    if (c.hidden) { c.hidden = false; c.style.transition = 'none'; c.style.left = (b.W * 0.55) + 'px'; c.style.top = (b.H - 40) + 'px'; void c.offsetWidth; }
    var px = parseFloat(c.style.left) || 0, py = parseFloat(c.style.top) || 0;
    var dist = Math.hypot(tx - px, ty - py), dur = fastNow(T) ? 0 : Math.max(420, Math.min(900, dist * 1.4)) * (REDUCE ? 0.2 : 1);
    c.style.transition = 'left ' + dur + 'ms cubic-bezier(.3,.7,.2,1), top ' + dur + 'ms cubic-bezier(.3,.7,.2,1)';
    c.style.left = tx + 'px'; c.style.top = ty + 'px';
    var self = this;
    return this.twait(dur + 80).then(function () {
      if (!click) return;
      c.classList.remove('is-click'); void c.offsetWidth; c.classList.add('is-click');
      return self.twait(220);
    });
  };

  P.showKeys = function (el, keys) {
    var L = this.tourLayer(), k = L.querySelector('.dt-keys'), b = this.rel(el);
    k.innerHTML = keys.map(function (x) { return '<kbd>' + esc(x) + '</kbd>'; }).join('');
    k.hidden = false;
    k.style.left = Math.max(12, Math.min(b.x + b.w / 2 - 50, b.W - 130)) + 'px';
    k.style.top = Math.min(b.y + b.h + 12, b.H - 70) + 'px';
    k.classList.remove('is-press'); void k.offsetWidth; k.classList.add('is-press');
  };
  P.hideKeys = function () { var k = this.tourLayer().querySelector('.dt-keys'); k.hidden = true; };

  P.typeInto = function (el, text, perChar, fire) {
    var self = this, i = 0;
    el.value = '';
    if (fire) el.dispatchEvent(new Event('input', { bubbles: true }));
    return (function next() {
      if (i >= text.length) return Promise.resolve();
      return self.twait(perChar + (Math.random() * perChar * 0.6)).then(function () {
        el.value = text.slice(0, ++i);
        if (fire) el.dispatchEvent(new Event('input', { bubbles: true }));
        return next();
      });
    })();
  };

  P.runSteps = function (T) {
    var self = this;
    return (function loop() {
      if (T.cancelled) return Promise.reject(CANCEL);
      if (T.i >= T.steps.length) return Promise.resolve();
      var st = T.steps[T.i];
      return self.runTourStep(T, st).then(function () { T.i++; return loop(); });
    })();
  };

  /* Visitor-paced tours: each step shows what will happen and waits for Next (or Enter / →).
     Clicking Next plays that one action at a calm pace, then the next step waits again. */
  P.gate = function (T) {
    var self = this, tip = this.tourLayer().querySelector('.dt-tip');
    return new Promise(function (res, rej) {
      if (!T || T.cancelled) return rej(CANCEL);
      if (fastNow(T)) return res();
      if (T.fastTo != null && T.i >= T.fastTo) { T.fastTo = null; self.root.classList.remove('dt-fast'); }
      var btn = tip.querySelector('[data-tt="next"]'), bk = tip.querySelector('[data-tt="back"]');
      T.waiting = true;
      if (bk) bk.disabled = false;
      if (btn) { btn.disabled = false; btn.classList.add('is-ready'); btn.title = 'Next (Enter)'; }
      T.advance = function () {
        T.advance = null; T.release = null; T.waiting = false;
        var b = tip.querySelector('[data-tt="next"]'), b2 = tip.querySelector('[data-tt="back"]');
        if (b) { b.disabled = true; b.classList.remove('is-ready'); }
        if (b2) b2.disabled = true;
        res();
      };
      T.release = function () { T.advance = null; T.waiting = false; rej(CANCEL); };
    });
  };
  P.stepTip = function (el, st, extra) {
    var o = { el: el, title: st.title, text: st.raw ? st.text : esc(st.text), next: true };
    if (extra) for (var k in extra) o[k] = extra[k];
    this.tip(o);
  };
  /* Each step plays its action on its own (cursor, typing, clicks); Next and Back unlock once it has finished. */
  P.settleTip = function (st) {
    var a = st.click || st.pick ? null : null;
    this.spot(null);
    /* the action is done: keep the tip where it is rather than sliding it to a corner and back */
    this.stepTip(null, st, { stay: true });
  };
  P.runTourStep = function (T, st) {
    var self = this, L = this.tourLayer();
    L.querySelector('.dt-block').hidden = false;
    this.root.classList.remove('dt-you');
    if (!fastNow(T)) this.root.classList.remove('dt-fast');
    clearInterval(this._spotTimer);
    var PACE = 350;
    function gate() { return self.gate(T); }
    function lead() { return self.twait(fastNow(T) ? 0 : 650); }

    if (st.start) {
      /* tours begin on the module's own dashboard, with its sidebar in view */
      var mod = T.tour.module;
      this.closeAB && this.closeAB();
      if (this.S.module !== mod) this.setModule(mod, true);
      this.go({ view: 'dash' });
      var side = this.q('.dd-side');
      this.spot(side);
      this.stepTip(side, st);
      return this.cursorTo(side).then(gate);
    }
    if (st.side) {
      var dt = st.side, S = this.S, SIDE = (global.ERPUI && global.ERPUI.SIDE) || {};
      var leafSel = '.dd-side .dd-side-i[data-act="list"][data-dt="' + cssq(dt) + '"]';
      function has(key) {
        var sd = SIDE[key]; if (!sd) return null;
        for (var i = 0; i < sd.items.length; i++) {
          var it = sd.items[i];
          if (it.t === 'dt' && it.dt === dt) return { top: true };
          if (it.t === 'g' && it.kids.some(function (k) { return k.split('|')[0] === 'dt:' + dt; })) return { group: key + ':' + it.label };
        }
        return null;
      }
      var modKey = has(S.module) ? S.module : (has(T.tour.module) ? T.tour.module : Object.keys(SIDE).filter(function (k) { return k !== 'home' && has(k); })[0]);
      var spotTip = function (el) { self.spot(el); self.stepTip(el, st); };
      var clickEl = function (sel) {
        var el = self.q(sel);
        if (!el) return Promise.reject(new Error('missing ' + sel));
        spotTip(el);
        return self.ensureVisible(el).then(function () { return self.cursorTo(self.q(sel), true); }).then(function () {
          var e2 = self.q(sel); if (e2) e2.click();
          return self.twait(fastNow(T) ? 0 : PACE);
        });
      };
      var chain = lead();
      if (!modKey) return this.tourFail('Could not find ' + dt + ' in any sidebar.');
      if (modKey !== S.module) chain = chain.then(function () { return clickEl('.dd-rail-i[data-act="module"][data-mod="' + modKey + '"]'); });
      chain = chain.then(function () {
        if (self.q(leafSel)) return;
        var g = has(modKey); if (!g || !g.group) return;
        return clickEl('.dd-side-g[data-g="' + cssq(g.group) + '"]');
      });
      return chain.then(function () { return clickEl(leafSel); }).then(function () { self.settleTip(st); }).then(gate, function (e) {
        if (e === CANCEL) throw e;
        return self.tourFail('Could not find ' + dt + ' in the sidebar.');
      });
    }
    if (st.home) {
      this.go({ view: 'home' });
      var home = this.q('.dd-rail-logo') || this.q('.dd-side-i[data-act="home"]');
      this.spot(home);
      this.stepTip(home, st);
      return this.cursorTo(home).then(gate);
    }
    if (st.keys) {
      var bar = this.q('.dd-rail-search');
      this.spot(bar);
      this.stepTip(bar, st);
      return lead().then(function () { return self.cursorTo(bar, true); }).then(function () {
        var i = self.q('.dd-search input'); i.value = '';
        self.focusSearch();
        return self.twait(PACE);
      }).then(gate);
    }
    if (st.type != null) {
      var inp = this.q('.dd-search input'), box = this.q('.dd-abbox');
      this.spot(box);
      this.stepTip(box, st);
      return lead().then(function () { return self.typeInto(inp, st.type, 70, true); }).then(function () { return self.twait(PACE); }).then(gate);
    }
    if (st.pick) {
      var opt = this.q('.dd-ab-i[data-label="' + cssq(st.pick) + '"]');
      if (!opt) { this.abOpen(this.q('.dd-search input').value); opt = this.q('.dd-ab-i[data-label="' + cssq(st.pick) + '"]'); }
      if (!opt) return this.tourFail('Could not find “' + st.pick + '” in the awesome bar.');
      this.spot(opt);
      this.stepTip(opt, st);
      return lead().then(function () { return self.cursorTo(opt, true); }).then(function () {
        self.abRun(self.ab.items[+opt.getAttribute('data-i')]);
        return self.twait(PACE);
      }).then(function () { self.settleTip(st); }).then(gate);
    }
    if (st.click) {
      var el = this.q(st.click);
      if (!el) return this.tourFail('Could not find the next button.');
      /* a menu item: pressing Next closed its menu, so open it again before pointing at the item */
      var pop = el.closest('.dd-menu-pop');
      if (pop && pop.hidden) {
        pop.hidden = false;
        var mb = pop.parentNode.querySelector('[data-act="menu"]'); if (mb) mb.setAttribute('aria-expanded', 'true');
      }
      return this.ensureVisible(el).then(function () {
        el = self.q(st.click);
        self.spot(el);
        self.stepTip(el, st);
        return lead();
      }).then(function () { return self.cursorTo(self.q(st.click), true); }).then(function () {
        el = self.q(st.click); if (el) el.click();
        return self.twait(PACE + 200);
      }).then(function () { self.settleTip(st); }).then(gate);
    }
    if (st.field) {
      var sel = '[data-field="' + st.field + '"]';
      var f = this.q(sel);
      if (!f) return this.tourFail('Field ' + st.field + ' is not on this form.');
      return this.ensureVisible(f).then(function () {
        f = self.q(sel);
        var wrap = f.closest('.dd-fld') || f;
        self.spot(wrap);
        self.stepTip(wrap, st);
        return lead();
      }).then(function () { return self.cursorTo(self.q(sel), true); }).then(function () {
        f = self.q(sel);
        f.focus({ preventScroll: true });
        if (f.tagName === 'SELECT' || f.type === 'date' || f.type === 'checkbox' || f.hasAttribute('data-date')) {
          f.classList.add('dt-flash');
          return self.twait(450).then(function () { self.setField(st.field, st.value); });
        }
        return self.typeInto(f, String(st.value), 55, false).then(function () { self.setField(st.field, st.value); });
      }).then(function () {
        var n = self.q(sel); if (n) n.classList.add('dt-done');
        var wrap = n && (n.closest('.dd-fld') || n);
        if (wrap) { self.spot(wrap); self.stepTip(wrap, st); }
        return self.twait(200);
      }).then(gate);
    }
    if (st.row != null) {
      var rsel = '[data-row="' + st.row + '"][data-col="item_code"]';
      var qsel = '[data-row="' + st.row + '"][data-col="qty"]';
      var anchor = this.q(rsel) ? rsel : '[data-act="addrow"]';
      return this.ensureVisible(this.q(anchor)).then(function () {
        var a = self.q(anchor), spotEl = anchor === rsel ? a.closest('tr') : a;
        self.spot(spotEl);
        self.stepTip(spotEl, st);
        return lead();
      }).then(function () {
        if (self.q(rsel)) return;
        return self.cursorTo(self.q('[data-act="addrow"]'), true).then(function () { self.addRow(); return self.twait(250); });
      }).then(function () {
        var c = self.q(rsel);
        return self.ensureVisible(c).then(function () {
          c = self.q(rsel);
          self.spot(c.closest('tr'));
          self.stepTip(c.closest('tr'), st);
          return self.cursorTo(c, true);
        });
      }).then(function () {
        var c = self.q(rsel); c.classList.add('dt-flash');
        return self.twait(400).then(function () { self.setRow(st.row, 'item_code', st.item); return self.twait(350); });
      }).then(function () {
        var qn = self.q(qsel);
        return self.cursorTo(qn, true).then(function () {
          qn = self.q(qsel); qn.focus({ preventScroll: true });
          return self.typeInto(qn, String(st.qty), 90, false);
        }).then(function () { self.setRow(st.row, 'qty', st.qty); return self.twait(250); });
      }).then(function () {
        var r = self.q(rsel); if (r) { self.spot(r.closest('tr')); self.stepTip(r.closest('tr'), st); }
      }).then(gate);
    }
    if (st.look) {
      var lk = this.q(st.look);
      if (!lk) return Promise.resolve();
      return this.ensureVisible(lk).then(function () {
        lk = self.q(st.look);
        self.spot(lk);
        self.stepTip(lk, st);
        return self.cursorTo(lk);
      }).then(gate);
    }
    if (st.save) {
      var sv = this.q('[data-act="save"]');
      if (!sv) return Promise.resolve();
      this.spot(sv);
      this.stepTip(sv, st);
      return lead().then(function () { return self.cursorTo(sv, true); }).then(function () {
        var before = self.route.doc;
        self.save();
        if (before.__new || before.__dirty) return self.tourFail('The document could not be saved. Check the message and try again.');
        return self.twait(PACE).then(function () {
          var nb = self.q('[data-act="submit"]') || self.q('.dd-head');
          self.spot(nb); self.stepTip(nb, st);
        });
      }).then(gate);
    }
    if (st.you) return this.youStep(T, st);
    if (st.done) return this.doneStep(T, st);
    return Promise.resolve();
  };

  /* Final action (Submit / Save / Complete) plays like any other step, then Next unlocks. */
  P.youStep = function (T, st) {
    var self = this;
    return this.ensureVisible(this.q(st.target)).then(function () {
      var el = self.q(st.target);
      self.spot(el, true);
      self.stepTip(el, st);
      return self.twait(fastNow(T) ? 0 : 650);
    }).then(function () {
      return new Promise(function (res, rej) {
        var off = self.on(st.event, function (dt, doc) { off(); T.result = doc; T.release = null; res(); });
        T.release = function () { off(); rej(CANCEL); };
        self.cursorTo(self.q(st.target), true).then(function () { var e = self.q(st.target); if (e) e.click(); }, function () { });
      });
    }).then(function () { return self.twait(fastNow(T) ? 0 : 350); }).then(function () {
      var h = self.q('.dd-head .dd-pill') || self.q('.dd-head');
      self.spot(h); self.stepTip(h, st);
      return self.gate(T);
    });
  };

  P.doneStep = function (T, st) {
    var self = this, t = T.tour, S = this.S;
    var doc = T.result || (this.route.doc || {});
    S.toursDone = S.toursDone || {};
    S.toursDone[t.id] = true;
    this.root.classList.remove('dt-you');
    var L = this.tourLayer();
    L.querySelector('.dt-cursor').hidden = true;
    L.querySelector('.dt-block').hidden = true;
    this.spot(null);
    /* tours end on a short feedback screen; no next-tour suggestions */
    var fb = '<div class="dt-fb"><p class="dt-fb-q">How useful was this tour?</p>' +
      '<div class="dt-fb-stars" role="group" aria-label="Rating from 1 to 5">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-tt="fb-rate" data-r="' + n + '" aria-pressed="false">' + n + '</button>'; }).join('') + '</div>' +
      '<div class="dt-fb-scale"><span>Not useful</span><span>Very useful</span></div>' +
      '<textarea class="dt-fb-c" maxlength="800" placeholder="What would make it better? (optional)" aria-label="Comment"></textarea>' +
      '<button type="button" class="dd-btn dd-btn-dark dt-fb-send" data-tt="fb-send" disabled>Send feedback</button></div>';
    var foot = fb + '<div class="dt-ctl dt-ctl-done"><a class="dd-btn" href="https://frappecloud.com/dashboard/signup?product=erpnext" target="_blank" rel="noopener">Start free trial</a><button type="button" class="dd-btn" data-tt="dash">Back to Dashboard</button><button type="button" class="dt-skip" data-tt="close">Close</button></div>';
    this._fbTour = t.id;
    this.tip({ title: 'Done. ' + t.title + '.', text: esc(st.text(S, doc)) + (S.personal ? ' On your free trial, this is how ' + esc(S.company) + ' would work from day one.' : ''), foot: foot, head: false, corner: this.route.view === 'print' || !!this.root.querySelector('.dd-email'), done: true });
    L.querySelector('.dt-tip').classList.add('is-done');
    this.emit('tour-done', t);
    var me = this;
    this._tour = null; this.touring = false;
    this.root.classList.remove('dd-touring');
    me.render();
    var tip = L.querySelector('.dt-tip');
    this.armAway(function (e) { if (!tip.contains(e.target)) { me.hideLayer(); return true; } });
    return Promise.resolve();
  };

  P.tourFail = function (msg) {
    var T = this._tour;
    this.tip({ title: 'The tour got stuck', text: esc(msg), foot: '<div class="dt-ctl"><button type="button" class="dd-btn" data-tt="home">Back to Home</button><button type="button" class="dt-skip" data-tt="close">Close</button></div>' });
    if (T) { T.cancelled = true; this._tour = null; this.touring = false; this.root.classList.remove('dd-touring'); }
    return Promise.reject(CANCEL);
  };

  /* a light coach mark after setup: points at the first recommended tour */
  P.coach = function (sel, title, text) {
    var self = this, L = this.tourLayer();
    var el = this.q(sel); if (!el) return;
    L.hidden = false;
    L.querySelector('.dt-block').hidden = true;
    this.spot(el, true);
    var tid = el.getAttribute('data-tour');
    this.tip({ el: el, title: title, text: esc(text), head: false, foot: '<div class="dt-ctl">' + (tid ? '<button type="button" class="dd-btn dd-btn-dark" data-tt="next-tour" data-id="' + esc(tid) + '">Start this tour</button><button type="button" class="dt-skip" data-tt="close">Not now</button>' : '<button type="button" class="dd-btn dd-btn-dark" data-tt="close">Got it</button>') + '</div>' });
    this.armAway(function (e) { if (!L.querySelector('.dt-tip').contains(e.target)) self.hideLayer(); return true; });
  };
})(window);

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

/* Builder mount: works with the page's HTML block, or builds the stage itself if the block is missing */
function erpnextDemoMount() {
  if (window.erpDemo) return;
  if (!window.ERPData || !window.ERPDemo) return;
  var el = document.getElementById('erp-sandbox');
  if (!el) {
    var main = document.createElement('main'); main.className = 'xstage';
    main.innerHTML = '<div class="xsandbox"><div id="erp-sandbox" role="region" aria-label="ERPNext sandbox"></div></div>';
    document.body.insertBefore(main, document.body.firstChild);
    el = document.getElementById('erp-sandbox');
  }
  if (!el.parentNode.classList.contains('xsandbox')) el.parentNode.classList.add('xsandbox');
  /* remove blocks from the older layout if the page still has them */
  Array.prototype.forEach.call(document.querySelectorAll('header.xbar, header.xhead, nav.xtours'), function (n) { n.remove(); });
  /* hide any leftover big logo / header graphic that sits above the sandbox (older page blocks) */
  function hideStray() {
    var sb = document.getElementById('erp-sandbox'); if (!sb) return;
    Array.prototype.forEach.call(document.querySelectorAll('svg, img'), function (s) {
      if (sb.contains(s) || !(sb.compareDocumentPosition(s) & 2)) return;
      if (s.closest('.xw, .xfb, .dd, [data-keep]')) return;
      var r = s.getBoundingClientRect();
      if (r.width > 120 || r.height > 120) {
        var n = s;
        while (n.parentNode && n.parentNode !== document.body && n.parentNode.children.length === 1 && !n.parentNode.contains(sb)) n = n.parentNode;
        n.style.setProperty('display', 'none', 'important');
      }
    });
  }
  hideStray(); setTimeout(hideStray, 400); setTimeout(hideStray, 1500); setTimeout(hideStray, 4000);

  'use strict';
  var keys = window.ERPData.MODULES.map(function (m) { return m.key; });
  var aliases = { selling: 'sales', buying: 'procurement', 'point-of-sale': 'pos', retail: 'pos' };
  var h = (location.hash || '').replace(/^#/, '').toLowerCase();
  var want = aliases[h] || h;
  var picked = keys.indexOf(want) >= 0 ? want : null;
  var SHOWN = ['accounting', 'procurement', 'sales', 'stock', 'assets', 'manufacturing'];
  if (picked && SHOWN.indexOf(picked) < 0) picked = null;
  var demo = new window.ERPDemo(document.getElementById('erp-sandbox'), { id: 'exp', experience: true, start: picked ? 'dash' : 'home', module: picked || 'sales', tourModule: picked, tourModules: SHOWN });
  window.erpDemo = demo;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* site controls in the sandbox's browser bar: feedback, theme, free trial, tours */
  var bar = demo.root.querySelector('.dd-browser');
  var ctl = document.createElement('span'); ctl.className = 'x-ctl';
  ctl.innerHTML =
    '<button type="button" class="xfb-btn" id="xfb-open" aria-haspopup="dialog"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg><span>Feedback</span></button>' +
    '<button type="button" class="xicon" id="x-theme" aria-label="Switch between light and dark mode" title="Light / dark mode"><svg class="i-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg><svg class="i-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg></button>' +
    '<a class="x-trial" href="https://frappecloud.com/dashboard/signup?product=erpnext" data-trial><span>Start free trial</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>';
  bar.appendChild(ctl);


  /* one welcome note on load, then the visitor is free to explore */
  var hello = document.createElement('div'); hello.className = 'xw'; hello.setAttribute('role', 'dialog'); hello.setAttribute('aria-modal', 'true'); hello.setAttribute('aria-labelledby', 'xw-h');
  hello.innerHTML = '<div class="xw-box"><h2 id="xw-h">Welcome to the ERPNext Experience Center</h2>' +
    '<p>This is a limited version of ERPNext with sample data. Click around anywhere; nothing you do here is saved.</p>' +
    '<p>Six modules come with guided tours: <b>Accounting, Buying, Selling, Stock, Assets</b> and <b>Manufacturing</b>. Find them all under <b>Guided tours</b> in the top bar.</p>' +
    '<div class="xw-foot"><button type="button" class="btn btn-dark" data-xw-ok>Start exploring</button></div></div>';
  document.body.appendChild(hello);
  function closeHello() { if (hello.parentNode) hello.remove(); }
  hello.addEventListener('click', function (e) { if (e.target === hello || e.target.closest('[data-xw-ok]')) closeHello(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeHello(); });
  setTimeout(function () { var b = hello.querySelector('[data-xw-ok]'); if (b) b.focus({ preventScroll: true }); }, 50);

  /* theme switch (shared footer) */
  function setTheme(v) {
    if (v === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', v);
    document.querySelectorAll('[data-theme-set]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-set') === v)); });
    try { localStorage.setItem('erpnext-theme', v); } catch (e) { }
  }
  document.querySelectorAll('[data-theme-set]').forEach(function (b) { b.addEventListener('click', function () { setTheme(b.getAttribute('data-theme-set')); }); });
  try { var saved = localStorage.getItem('erpnext-theme'); if (saved) setTheme(saved); } catch (e) { }
  document.getElementById('x-theme').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme');
    var dark = cur ? cur === 'dark' : (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    setTheme(dark ? 'light' : 'dark');
  });

  /* ---- feedback loop ----
     Opens only from the Feedback button; nothing asks on its own.
     Responses go to the page's shared store when it is available (one per signed-in viewer);
     otherwise they stay in this browser. On frappe.io, point sendFeedback at a Frappe Web Form. */
  var fbBox = null, fbDone = false, fbAsked = false, lastTour = '';
  try { fbDone = localStorage.getItem('erpnext-xc-feedback') === '1'; } catch (e) { }
  var dbP = window.claude && window.claude.use ? Promise.all([window.claude.use('db'), window.claude.use('user')]).catch(function () { return [null, null]; }) : Promise.resolve([null, null]);
  function sendFeedback(rec) {
    try { localStorage.setItem('erpnext-xc-feedback', '1'); } catch (e) { }
    return dbP.then(function (x) {
      var db = x[0], user = x[1];
      if (!db || !user || !user.id) return false;
      return user.id().then(function (id) {
        if (!id) return false;
        /* one doc per viewer: latest response on top, every response kept in entries */
        var ref = db.doc('feedback/' + id);
        return ref.get().then(function (snap) { var prev = snap && snap.exists && snap.data ? (snap.data() || {}) : {}; return prev.entries || []; }, function () { return []; })
          .then(function (entries) { var all = entries.concat([rec]).slice(-50); var out = {}; for (var k in rec) out[k] = rec[k]; out.entries = all; return ref.set(out); })
          .then(function () { return true; });
      });
    }).catch(function () { return false; });
  }
  function closeFb() { if (fbBox) { fbBox.remove(); fbBox = null; } }
  function openFb(context) {
    closeFb();
    var rating = 0;
    fbBox = document.createElement('div'); fbBox.className = 'xfb' + (context === 'button' ? ' is-top' : ''); fbBox.setAttribute('role', 'dialog'); fbBox.setAttribute('aria-label', 'Feedback');
    fbBox.innerHTML = '<button type="button" class="xfb-x" aria-label="Close">×</button><h3>' + (context === 'tour' ? 'How was that tour?' : 'How is the Experience Center?') + '</h3><p>' + (context === 'tour' ? 'One tap helps us make these tours better.' : 'Tell us what worked and what didn’t. It takes ten seconds.') + '</p>' +
      '<div class="xfb-stars" role="group" aria-label="Rating from 1 to 5">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-r="' + n + '" aria-pressed="false">' + n + '</button>'; }).join('') + '</div><div class="xfb-scale"><span>Not useful</span><span>Very useful</span></div>' +
      '<textarea placeholder="What would make it more useful? (optional)" maxlength="800" aria-label="Comment"></textarea>' +
      '<div class="xfb-foot"><button type="button" class="xfb-skip">Not now</button><button type="button" class="btn btn-dark" data-send disabled>Send feedback</button></div>';
    document.body.appendChild(fbBox);
    var send = fbBox.querySelector('[data-send]');
    fbBox.querySelectorAll('[data-r]').forEach(function (b) {
      b.addEventListener('click', function () {
        rating = +b.getAttribute('data-r');
        fbBox.querySelectorAll('[data-r]').forEach(function (x) { x.setAttribute('aria-pressed', String(+x.getAttribute('data-r') === rating)); });
        send.disabled = false;
      });
    });
    fbBox.querySelector('.xfb-x').addEventListener('click', closeFb);
    fbBox.querySelector('.xfb-skip').addEventListener('click', closeFb);
    send.addEventListener('click', function () {
      if (!rating) return;
      var rec = { rating: rating, comment: fbBox.querySelector('textarea').value.trim().slice(0, 800), tour: lastTour, context: context, company: demo.S.personal ? demo.S.company : '', sector: demo.S.personal ? demo.S.sectorLabel : '', toursDone: Object.keys(demo.S.toursDone || {}).length, at: new Date().toISOString() };
      send.disabled = true;
      sendFeedback(rec).then(function () {
        fbDone = true;
        if (!fbBox) return;
        fbBox.innerHTML = '<div class="xfb-done"><i>✓</i><div><h3>Thank you!</h3><p>Your feedback helps us shape the Experience Center.</p></div></div>';
        setTimeout(closeFb, 2600);
      });
    });
  }
  document.getElementById('xfb-open').addEventListener('click', function (e) { e.stopPropagation(); openFb('button'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeFb(); });
  demo.on('tour-done', function (t) { lastTour = t && t.id || ''; });
  demo.on('tour-feedback', function (f) {
    if (!f || !f.rating) return;
    sendFeedback({ rating: f.rating, comment: f.comment || '', tour: f.tour || lastTour, context: 'tour', company: demo.S.personal ? demo.S.company : '', sector: demo.S.personal ? demo.S.sectorLabel : '', toursDone: Object.keys(demo.S.toursDone || {}).length, at: new Date().toISOString() });
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', erpnextDemoMount); else erpnextDemoMount();
