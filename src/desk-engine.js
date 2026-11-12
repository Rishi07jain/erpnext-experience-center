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
