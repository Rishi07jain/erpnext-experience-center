/* ERPNext interactive demo — data model, doctypes and module flows.
   Everything runs in the browser on sample data; nothing is sent anywhere. */
(function (global) {
  'use strict';

  var TODAY = '2026-10-19';
  function addDays(d, n) {
    var t = new Date(d + 'T00:00:00Z');
    t.setUTCDate(t.getUTCDate() + n);
    return t.toISOString().slice(0, 10);
  }
  function F(key, label, type, o) {
    var f = { key: key, label: label, type: type };
    if (o) for (var k in o) f[k] = o[k];
    return f;
  }

  var COMPANY = 'Demo Industries Pvt Ltd';
  var COMPANY_STATE = 'Maharashtra';
  var STATES = ['Maharashtra', 'Gujarat', 'Tamil Nadu', 'Karnataka', 'Telangana', 'Delhi', 'West Bengal', 'Rajasthan', 'Uttar Pradesh'];
  var EMPLOYEES = ['Ananya Rao', 'Vikram Mehta', 'Farhan Shaikh', 'Priya Nair'];
  var MODES = ['UPI', 'Bank Transfer', 'Cash', 'Cheque'];
  var WH_BASE = ['Stores', 'Finished Goods', 'Work In Progress'];
  function wh(S) { return WH_BASE.map(function (w) { return w + ' - ' + S.abbr; }); }
  function whd(n) { return function (S) { return n + ' - ' + S.abbr; }; }
  function accts(S) { return S.docs.Account.filter(function (a) { return !a.is_group; }).map(function (a) { return a.name; }); }
  function acd(n) { return function (S) { return n + ' - ' + S.abbr; }; }

  var opt = {
    customers: function (S) { return S.docs.Customer.map(function (d) { return d.name; }); },
    suppliers: function (S) { return S.docs.Supplier.map(function (d) { return d.name; }); },
    items: function (S) { return S.docs.Item.map(function (d) { return d.name; }); },
    projects: function (S) { return S.docs.Project.filter(function (d) { return !d.__new; }).map(function (d) { return d.name; }); },
    customersAndLeads: function (S) {
      var out = opt.customers(S);
      S.docs.Lead.forEach(function (l) { if (!l.__new && l.company_name && out.indexOf(l.company_name) < 0) out.push(l.company_name); });
      return out;
    }
  };

  function latestUser(S, dt, test) {
    var list = S.docs[dt].filter(function (d) { return !d.seed && !d.__new && (!test || test(d)); });
    return list[list.length - 1];
  }
  function itemDoc(S, code) { return S.docs.Item.filter(function (i) { return i.name === code; })[0]; }
  function row(S, code, qty, rate) {
    var m = S.codeMap && S.codeMap[code];
    if (m) {
      code = m.code;
      if (rate != null) rate = Math.round(rate * m.ratio * 100) / 100;
      qty = niceQty(qty / m.ratio, m.uom);
    }
    var it = itemDoc(S, code);
    return { item_code: code, qty: qty, rate: rate != null ? rate : (it ? it.standard_rate : 0) };
  }
  /* Raw-material quantities for one unit of FG1, sized so materials are roughly half its price. */
  function bomRows(S) {
    var fg = itemDoc(S, S.R.FG1), a = itemDoc(S, S.R.RM1), b = itemDoc(S, S.R.CONS2);
    function q(share, it) { var x = fg.standard_rate * share / (it.standard_rate || 1); return x >= 10 ? Math.round(x) : Math.max(0.001, Math.round(x * 1000) / 1000); }
    return [{ item_code: a.name, qty: q(0.42, a), rate: a.standard_rate }, { item_code: b.name, qty: q(0.06, b), rate: b.standard_rate }];
  }
  function niceQty(q, uom) {
    if (uom === 'Nos') return Math.max(1, Math.round(q));
    if (q >= 50) return Math.round(q / 5) * 5;
    return Math.max(0.01, Math.round(q * 100) / 100);
  }
  function userItemOr(S, fallback) {
    var it = latestUser(S, 'Item', function (d) { return d.is_stock_item; });
    return it ? it.name : fallback;
  }

  /* ---------- DocTypes ---------- */
  var DT = {};

  DT['Customer'] = {
    master: true, ws: 'Selling', naming: function (d) { return d.customer_name; },
    title: function (d) { return d.customer_name; },
    fields: [
      F('customer_name', 'Customer Name', 'data', { req: 1 }),
      F('customer_group', 'Customer Group', 'select', { options: ['Commercial', 'Retail', 'Individual'], def: 'Commercial' }),
      F('gstin', 'GSTIN / UIN', 'data'),
      F('state', 'State', 'select', { options: STATES, def: 'Maharashtra' }),
      F('city', 'City', 'data')
    ],
    listCols: [['Customer Group', 'customer_group'], ['State', 'state'], ['GSTIN', 'gstin']],
    sample: function (d) { d.customer_name = 'Mehra Boutique'; d.customer_group = 'Retail'; d.state = 'Delhi'; d.city = 'New Delhi'; d.gstin = '07AAPFM3871D1ZQ'; }
  };

  DT['Supplier'] = {
    master: true, ws: 'Buying', naming: function (d) { return d.supplier_name; },
    title: function (d) { return d.supplier_name; },
    fields: [
      F('supplier_name', 'Supplier Name', 'data', { req: 1 }),
      F('supplier_group', 'Supplier Group', 'select', { options: ['Raw Material', 'Services', 'Hardware'], def: 'Raw Material' }),
      F('gstin', 'GSTIN / UIN', 'data'),
      F('state', 'State', 'select', { options: STATES, def: 'Maharashtra' })
    ],
    listCols: [['Supplier Group', 'supplier_group'], ['State', 'state'], ['GSTIN', 'gstin']],
    sample: function (d) { d.supplier_name = 'Ludhiana Knit Works'; d.state = 'Rajasthan'; d.gstin = '08AAKCL5520E1Z7'; }
  };

  DT['Item'] = {
    master: true, ws: 'Stock', naming: function (d) { return d.item_code; },
    title: function (d) { return d.item_name; },
    fields: [
      F('item_code', 'Item Code', 'data', { req: 1 }),
      F('item_name', 'Item Name', 'data', { req: 1 }),
      F('item_group', 'Item Group', 'select', { options: ['Raw Material', 'Products', 'Services', 'Consumable'], def: 'Raw Material' }),
      F('stock_uom', 'Default Unit of Measure', 'select', { options: ['Nos', 'Mtr', 'Kg', 'Ltr', 'Hour'], def: 'Nos' }),
      F('standard_rate', 'Standard Selling Rate', 'currency', { def: 0 }),
      F('gst_hsn_code', 'HSN/SAC', 'data'),
      F('gst_rate', 'GST Rate (%)', 'select', { options: ['5', '18'], def: '5' }),
      F('is_stock_item', 'Maintain Stock', 'check', { def: 1 })
    ],
    listCols: [['Item Group', 'item_group'], ['HSN/SAC', 'gst_hsn_code'], ['Rate', 'standard_rate', 'currency']],
    sample: function (d, S) {
      var fg = itemDoc(S, S.R.FG1);
      var name = (S.profile.products || [])[2] || (fg.item_name + ' (Bulk Pack)');
      d.item_name = name; d.item_code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 18);
      d.item_group = 'Products'; d.stock_uom = fg.stock_uom; d.standard_rate = Math.round(fg.standard_rate * 1.8);
      d.gst_hsn_code = fg.gst_hsn_code; d.gst_rate = fg.gst_rate; d.is_stock_item = 1;
    }
  };

  DT['Account'] = {
    master: true, ws: 'Accounting',
    naming: function (d, S) { return (d.account_number ? d.account_number + ' - ' : '') + d.account_name + ' - ' + S.abbr; },
    title: function (d) { return d.account_name; },
    fields: [
      F('account_name', 'Account Name', 'data', { req: 1 }),
      F('account_number', 'Account Number', 'data'),
      F('parent_account', 'Parent Account', 'select', { options: function (S) { return S.docs.Account.filter(function (a) { return a.is_group; }).map(function (a) { return a.name; }); }, def: acd('Indirect Expenses'), req: 1 }),
      F('root_type', 'Root Type', 'select', { options: ['Asset', 'Liability', 'Income', 'Expense', 'Equity'], def: 'Expense' }),
      F('account_type', 'Account Type', 'select', { options: ['', 'Bank', 'Cash', 'Chargeable', 'Expense Account', 'Income Account', 'Tax', 'Receivable', 'Payable'], def: '' }),
      F('account_currency', 'Currency', 'ro', { get: function () { return 'INR'; } }),
      F('is_group', 'Is Group', 'check', { def: 0 })
    ],
    listCols: [['Parent Account', 'parent_account'], ['Root Type', 'root_type'], ['Type', 'account_type']],
    sample: function (d) { d.account_name = 'Freight Inward'; d.account_type = 'Chargeable'; }
  };

  /* --- Selling --- */
  var partyCustomer = F('customer', 'Customer', 'link', { options: opt.customers, req: 1, party: 1 });

  DT['Quotation'] = {
    ws: 'Selling', prefix: 'SAL-QTN-2026-', submit: true, items: true, taxes: 'out',
    title: function (d) { return d.customer; },
    fields: [
      F('customer', 'Customer', 'link', { options: opt.customersAndLeads, req: 1, party: 1 }),
      F('transaction_date', 'Date', 'date', { def: TODAY }),
      F('valid_till', 'Valid Till', 'date', { def: addDays(TODAY, 30) }),
      F('order_type', 'Order Type', 'select', { options: ['Sales', 'Maintenance'], def: 'Sales' })
    ],
    sources: { Opportunity: function (src, d) { d.customer = src.party; } },
    mark: 'quoted',
    status: function (d) { return d.ordered ? 'Ordered' : 'Open'; },
    listTitle: 'Customer Name',
    listCols: [['Date', 'transaction_date', 'date'], ['Company', '__company'], ['Grand Total', 'rounded_total', 'currency']],
    onSave: ensureCustomer,
    sample: function (d, S) { d.customer = 'Kaveri Textiles'; d.items = [row(S, 'COT-FAB-60', 500), row(S, 'BTN-PACK-100', 20)]; }
  };

  DT['Sales Order'] = {
    ws: 'Selling', prefix: 'SAL-ORD-2026-', submit: true, items: true, taxes: 'out',
    title: function (d) { return d.customer; },
    fields: [
      F('customer', 'Customer', 'link', { options: opt.customersAndLeads, req: 1, party: 1 }),
      F('transaction_date', 'Date', 'date', { def: TODAY }),
      F('delivery_date', 'Delivery Date', 'date', { def: addDays(TODAY, 7), req: 1 }),
      F('po_no', "Customer's Purchase Order", 'data')
    ],
    sources: { Quotation: function (src, d) { d.po_no = 'PO/' + (src.customer || '').slice(0, 3).toUpperCase() + '/2026/118'; } },
    mark: 'ordered',
    status: function (d) {
      if (d.delivered && d.billed) return 'Completed';
      if (d.delivered) return 'To Bill';
      if (d.billed) return 'To Deliver';
      return 'To Deliver and Bill';
    },
    onSave: ensureCustomer,
    sample: function (d, S) { d.customer = 'Sharma Garments'; d.items = [row(S, 'DNM-FAB-12', 250)]; }
  };

  DT['Delivery Note'] = {
    ws: 'Stock', prefix: 'MAT-DN-2026-', submit: true, items: true, taxes: 'out', stock: -1,
    title: function (d) { return d.customer; },
    fields: [
      partyCustomer,
      F('posting_date', 'Date', 'date', { def: TODAY }),
      F('set_warehouse', 'Source Warehouse', 'select', { options: wh, def: whd('Stores') }),
      F('lr_no', 'Transport Receipt No (e-Way Bill)', 'data')
    ],
    sources: { 'Sales Order': function (src, d) { d.lr_no = '3412 8890 1276'; } },
    mark: 'delivered',
    status: function (d) { return d.billed ? 'Completed' : 'To Bill'; },
    sample: function (d, S) { d.customer = 'Patel Fashion House'; d.items = [row(S, userItemOr(S, 'COT-FAB-60'), 100)]; }
  };

  DT['Sales Invoice'] = {
    ws: 'Accounting', prefix: 'ACC-SINV-2026-', submit: true, items: true, taxes: 'out',
    title: function (d) { return d.customer; },
    fields: [
      partyCustomer,
      F('posting_date', 'Date', 'date', { def: TODAY }),
      F('due_date', 'Payment Due Date', 'date', { def: addDays(TODAY, 30) }),
      F('project', 'Project', 'link', { options: opt.projects, hideEmpty: 1 }),
      F('gst_category', 'GST Category', 'select', { options: ['Registered Regular', 'Unregistered', 'Overseas'], def: 'Registered Regular' }),
      F('irn', 'IRN (e-Invoice)', 'ro', { get: function (d) { return d.docstatus === 1 ? d.irn : 'Generated on submit'; } })
    ],
    sources: {
      'Sales Order': true,
      'Delivery Note': true,
      Timesheet: function (src, d, S) {
        var p = S.docs.Project.filter(function (x) { return x.name === src.project; })[0];
        d.customer = p ? p.customer : 'Patel Fashion House';
        d.project = src.project;
        d.items = [{ item_code: 'SRV-CONSULT', qty: +src.hours || 0, rate: +src.billing_rate || 0 }];
      },
      'Maintenance Visit': function (src, d) {
        d.customer = src.customer;
        d.items = [{ item_code: 'SRV-AMC', qty: 1, rate: 2500 }];
      }
    },
    mark: 'billed',
    status: function (d) { return d.paid ? 'Paid' : (d.due_date < TODAY ? 'Overdue' : 'Unpaid'); },
    onSubmit: function (d) {
      var h = 0, s = d.name + d.grand_total;
      for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      d.irn = (h.toString(16) + 'a3f9c2e17b4d').slice(0, 12) + '…' + (h % 9973).toString(16);
    },
    sample: function (d, S) { d.customer = 'Sharma Garments'; d.items = [row(S, 'DNM-FAB-12', 300), row(S, 'BTN-PACK-100', 15)]; }
  };

  DT['Payment Entry'] = {
    ws: 'Accounting', prefix: 'ACC-PAY-2026-', submit: true,
    title: function (d) { return d.party; },
    fields: [
      F('payment_type', 'Payment Type', 'select', { options: ['Receive', 'Pay'], def: 'Receive' }),
      F('posting_date', 'Posting Date', 'date', { def: TODAY }),
      F('party_type', 'Party Type', 'select', { options: ['Customer', 'Supplier'], def: 'Customer' }),
      F('party', 'Party', 'link', { options: function (S, d) { return d.party_type === 'Supplier' ? opt.suppliers(S) : opt.customers(S); }, req: 1 }),
      F('mode_of_payment', 'Mode of Payment', 'select', { options: MODES, def: 'UPI' }),
      F('paid_amount', 'Paid Amount (INR)', 'currency', { req: 1 }),
      F('reference_no', 'Reference No (UTR)', 'data'),
      F('reference', 'Against', 'ro', { get: function (d) { return d.from ? d.from.dt + ' ' + d.from.name : '—'; } })
    ],
    sources: {
      'Sales Invoice': function (src, d) { d.payment_type = 'Receive'; d.party_type = 'Customer'; d.party = src.customer; d.paid_amount = src.rounded_total; d.reference_no = 'UTR' + String(src.rounded_total).replace(/\D/g, '').slice(0, 6) + '4417'; },
      'Purchase Invoice': function (src, d) { d.payment_type = 'Pay'; d.party_type = 'Supplier'; d.party = src.supplier; d.paid_amount = src.rounded_total; d.mode_of_payment = 'Bank Transfer'; d.reference_no = 'NEFT' + String(src.rounded_total).replace(/\D/g, '').slice(0, 6); }
    },
    mark: 'paid',
    listCols: [['Payment Type', 'payment_type'], ['Mode', 'mode_of_payment'], ['Amount', 'paid_amount', 'currency']],
    sample: function (d) { d.party = 'Deccan Retail Co.'; d.paid_amount = 50000; }
  };

  /* --- CRM --- */
  DT['Lead'] = {
    ws: 'CRM', prefix: 'CRM-LEAD-2026-', submit: false,
    title: function (d) { return d.lead_name; },
    fields: [
      F('lead_name', 'Person Name', 'data', { req: 1 }),
      F('company_name', 'Organization Name', 'data', { req: 1 }),
      F('source', 'Source', 'select', { options: ['Website', 'IndiaMART', 'Trade Show', 'Referral', 'Cold Calling'], def: 'Website' }),
      F('mobile_no', 'Mobile No', 'data'),
      F('state', 'State', 'select', { options: STATES, def: 'Karnataka' }),
      F('status', 'Status', 'select', { options: ['Lead', 'Open', 'Replied', 'Interested'], def: 'Lead' })
    ],
    status: function (d) { return d.ordered ? 'Converted' : d.quoted ? 'Quotation' : d.opp ? 'Opportunity' : (d.status || 'Lead'); },
    listCols: [['Organization', 'company_name'], ['Source', 'source']],
    sample: function (d) { d.lead_name = 'Rohan Desai'; d.company_name = 'Desai Enterprises'; d.source = 'IndiaMART'; d.mobile_no = '+91 98200 41177'; d.state = 'Karnataka'; }
  };

  DT['Opportunity'] = {
    ws: 'CRM', prefix: 'CRM-OPP-2026-', submit: false, items: true,
    title: function (d) { return d.party; },
    fields: [
      F('opportunity_from', 'Opportunity From', 'select', { options: ['Lead', 'Customer'], def: 'Lead' }),
      F('party', 'Party', 'data', { req: 1 }),
      F('opportunity_type', 'Opportunity Type', 'select', { options: ['Sales', 'Support', 'Maintenance'], def: 'Sales' }),
      F('sales_stage', 'Sales Stage', 'select', { options: ['Prospecting', 'Qualification', 'Needs Analysis', 'Proposal/Price Quote', 'Negotiation/Review'], def: 'Needs Analysis' }),
      F('expected_closing', 'Expected Closing Date', 'date', { def: addDays(TODAY, 21) }),
      F('probability', 'Probability (%)', 'int', { def: 60 })
    ],
    sources: { Lead: function (src, d, S) { d.party = src.company_name; d.items = [row(S, 'COT-FAB-60', 1200), row(S, 'DNM-FAB-12', 400)]; } },
    mark: 'opp',
    status: function (d) { return d.ordered ? 'Converted' : d.quoted ? 'Quotation' : 'Open'; },
    listCols: [['Sales Stage', 'sales_stage'], ['Opportunity Amount', 'net_total', 'currency']],
    sample: function (d, S) { d.opportunity_from = 'Customer'; d.party = 'Deccan Retail Co.'; d.items = [row(S, 'SHIRT-CTN-M', 300)]; }
  };

  /* --- Buying --- */
  DT['Material Request'] = {
    ws: 'Buying', prefix: 'MAT-MR-2026-', submit: true, items: true,
    title: function (d) { return d.material_request_type; },
    fields: [
      F('material_request_type', 'Purpose', 'select', { options: ['Purchase', 'Material Transfer', 'Manufacture'], def: 'Purchase' }),
      F('transaction_date', 'Transaction Date', 'date', { def: TODAY }),
      F('schedule_date', 'Required By', 'date', { def: addDays(TODAY, 10), req: 1 }),
      F('set_warehouse', 'Set Target Warehouse', 'select', { options: wh, def: whd('Stores') })
    ],
    status: function (d) { return d.ordered ? 'Ordered' : 'Pending'; },
    listCols: [['Required By', 'schedule_date', 'date'], ['Warehouse', 'set_warehouse']],
    sample: function (d, S) { d.items = [row(S, 'POLY-YRN-30', 200, 185), row(S, 'COT-FAB-60', 600, 205)]; }
  };

  var partySupplier = F('supplier', 'Supplier', 'link', { options: opt.suppliers, req: 1, party: 1 });

  DT['Purchase Order'] = {
    ws: 'Buying', prefix: 'PUR-ORD-2026-', submit: true, items: true, taxes: 'in',
    title: function (d) { return d.supplier; },
    fields: [
      partySupplier,
      F('transaction_date', 'Date', 'date', { def: TODAY }),
      F('schedule_date', 'Required By', 'date', { def: addDays(TODAY, 10), req: 1 }),
      F('set_warehouse', 'Set Target Warehouse', 'select', { options: wh, def: whd('Stores') })
    ],
    sources: { 'Material Request': function (src, d) { d.supplier = 'Gujarat Yarn Mills'; d.schedule_date = src.schedule_date; } },
    mark: 'ordered',
    status: function (d) {
      if (d.received && d.billed) return 'Completed';
      if (d.received) return 'To Bill';
      if (d.billed) return 'To Receive';
      return 'To Receive and Bill';
    },
    sample: function (d, S) { d.supplier = 'Gujarat Yarn Mills'; d.items = [row(S, 'POLY-YRN-30', 300, 185)]; }
  };

  DT['Purchase Receipt'] = {
    ws: 'Stock', prefix: 'MAT-PRE-2026-', submit: true, items: true, taxes: 'in', stock: 1,
    title: function (d) { return d.supplier; },
    fields: [
      partySupplier,
      F('posting_date', 'Date', 'date', { def: TODAY }),
      F('set_warehouse', 'Accepted Warehouse', 'select', { options: wh, def: whd('Stores') }),
      F('supplier_delivery_note', 'Supplier Delivery Note', 'data')
    ],
    sources: { 'Purchase Order': function (src, d) { d.supplier_delivery_note = 'DC-' + (src.name || '').slice(-3) + '/26'; } },
    mark: 'received',
    status: function (d) { return d.billed ? 'Completed' : 'To Bill'; },
    sample: function (d, S) { d.supplier = 'Coimbatore Cotton Co.'; d.items = [row(S, 'COT-FAB-60', 800, 205)]; d.supplier_delivery_note = 'CCC/DC/4471'; }
  };

  DT['Purchase Invoice'] = {
    ws: 'Accounting', prefix: 'ACC-PINV-2026-', submit: true, items: true, taxes: 'in',
    title: function (d) { return d.supplier; },
    fields: [
      partySupplier,
      F('posting_date', 'Date', 'date', { def: TODAY }),
      F('bill_no', 'Supplier Invoice No', 'data', { req: 1 }),
      F('due_date', 'Due Date', 'date', { def: addDays(TODAY, 45) })
    ],
    sources: {
      'Purchase Receipt': function (src, d) { d.bill_no = 'INV/26-27/' + (100 + (src.name || '').length * 7); },
      'Purchase Order': function (src, d) { d.bill_no = 'INV/26-27/' + (210 + (src.name || '').length * 3); }
    },
    mark: 'billed',
    status: function (d) { return d.paid ? 'Paid' : (d.due_date < TODAY ? 'Overdue' : 'Unpaid'); },
    sample: function (d, S) { d.supplier = 'Shree Dyes & Chemicals'; d.bill_no = 'SDC/26-27/0912'; d.items = [row(S, 'DYE-RED-25', 40, 680)]; }
  };

  DT['Journal Entry'] = {
    ws: 'Accounting', prefix: 'ACC-JV-2026-', submit: true,
    title: function (d) { return d.voucher_type; },
    fields: [
      F('voucher_type', 'Entry Type', 'select', { options: ['Journal Entry', 'Bank Entry', 'Cash Entry', 'Contra Entry'], def: 'Bank Entry' }),
      F('posting_date', 'Posting Date', 'date', { def: TODAY }),
      F('debit_account', 'Debit Account', 'select', { options: accts, def: acd('Rent Expense') }),
      F('credit_account', 'Credit Account', 'select', { options: accts, def: acd('HDFC Bank') }),
      F('amount', 'Amount (INR)', 'currency', { req: 1 }),
      F('user_remark', 'User Remark', 'text')
    ],
    listCols: [['Debit', 'debit_account'], ['Credit', 'credit_account'], ['Amount', 'amount', 'currency']],
    sample: function (d) { d.amount = 85000; d.user_remark = 'Office rent for October 2026, Andheri East'; }
  };

  /* --- Stock --- */
  DT['Stock Entry'] = {
    ws: 'Stock', prefix: 'MAT-STE-2026-', submit: true, items: true,
    title: function (d) { return d.stock_entry_type; },
    fields: [
      F('stock_entry_type', 'Stock Entry Type', 'select', { options: ['Material Receipt', 'Material Issue', 'Material Transfer', 'Manufacture'], def: 'Material Receipt' }),
      F('posting_date', 'Posting Date', 'date', { def: TODAY }),
      F('from_warehouse', 'Default Source Warehouse', 'select', { options: wh, def: whd('Stores'), show: function (d) { return d.stock_entry_type === 'Material Transfer' || d.stock_entry_type === 'Material Issue'; } }),
      F('to_warehouse', 'Default Target Warehouse', 'select', { options: wh, def: whd('Stores'), show: function (d) { return d.stock_entry_type !== 'Material Issue'; } }),
      F('work_order', 'Work Order', 'ro', { get: function (d) { return d.work_order || '—'; }, show: function (d) { return d.stock_entry_type === 'Manufacture'; } })
    ],
    sources: {
      'Work Order': function (src, d, S) {
        d.stock_entry_type = 'Manufacture';
        d.to_warehouse = 'Finished Goods - DI';
        d.work_order = src.name;
        d.items = (src.items || []).map(function (r) { return { item_code: r.item_code, qty: r.qty, rate: r.rate }; });
        var fg = itemDoc(S, src.production_item);
        d.items.push({ item_code: src.production_item, qty: +src.qty || 0, rate: fg ? Math.round(fg.standard_rate * 0.62) : 0, fg: 1 });
      }
    },
    mark: function (d) { return d.stock_entry_type === 'Manufacture' ? 'manufactured' : null; },
    listCols: [['Type', 'stock_entry_type'], ['Warehouse', 'to_warehouse']],
    sample: function (d, S) {
      var mine = latestUser(S, 'Item', function (x) { return x.is_stock_item; });
      d.items = [mine ? row(S, mine.name, 250, Math.round(mine.standard_rate * 0.8)) : row(S, 'COT-FAB-60', 250, 192)];
    }
  };

  /* --- Manufacturing --- */
  DT['BOM'] = {
    ws: 'Manufacturing', submit: true, items: true,
    naming: function (d, S) {
      var n = S.docs.BOM.filter(function (b) { return b.item === d.item && !b.__new; }).length + 1;
      return 'BOM-' + d.item + '-' + String(n).padStart(3, '0');
    },
    title: function (d) { return d.item; },
    itemsLabel: 'Raw Materials',
    fields: [
      F('item', 'Item To Manufacture', 'link', { options: opt.items, req: 1 }),
      F('quantity', 'Quantity', 'int', { def: 1, req: 1 }),
      F('is_default', 'Is Default', 'check', { def: 1 }),
      F('routing', 'Routing (operations)', 'ro', { get: function () { return 'Cutting → Stitching → Finishing'; } })
    ],
    status: function () { return 'Active'; },
    listIdFirst: true,
    listCols: [['Item to Manufacture', 'item'], ['Is Active', 'is_active', 'check'], ['Is Default', 'is_default', 'check'], ['Total Cost', 'net_total', 'currency']],
    sample: function (d, S) { d.item = S.R.FG1; d.items = bomRows(S); }
  };

  DT['Work Order'] = {
    ws: 'Manufacturing', prefix: 'MFG-WO-2026-', submit: true, items: true,
    title: function (d) { return d.production_item; },
    itemsLabel: 'Required Items',
    fields: [
      F('production_item', 'Item To Manufacture', 'link', { options: opt.items, req: 1 }),
      F('bom_no', 'BOM No', 'ro', { get: function (d) { return d.bom_no || '—'; } }),
      F('qty', 'Qty To Manufacture', 'int', { def: 100, req: 1 }),
      F('planned_start_date', 'Planned Start Date', 'date', { def: TODAY }),
      F('wip_warehouse', 'Work-in-Progress Warehouse', 'select', { options: wh, def: whd('Work In Progress') }),
      F('fg_warehouse', 'Target Warehouse', 'select', { options: wh, def: whd('Finished Goods') })
    ],
    sources: {
      BOM: function (src, d) {
        d.production_item = src.item; d.bom_no = src.name; d.qty = 100;
        var f = 100 / (+src.quantity || 1);
        d.items = (src.items || []).map(function (r) { return { item_code: r.item_code, qty: Math.round(r.qty * f * 100) / 100, rate: r.rate }; });
      }
    },
    onChange: function (d, key, S) {
      if (key !== 'qty' || !d.bom_no) return;
      var b = S.docs.BOM.filter(function (x) { return x.name === d.bom_no; })[0];
      if (!b) return;
      var f = (+d.qty || 0) / (+b.quantity || 1);
      d.items = (b.items || []).map(function (r) { return { item_code: r.item_code, qty: Math.round(r.qty * f * 100) / 100, rate: r.rate }; });
    },
    mark: 'wo',
    status: function (d) { return d.manufactured ? 'Completed' : d.jc ? 'In Process' : 'Not Started'; },
    listCols: [['BOM No', 'bom_no'], ['Qty To Manufacture', 'qty']]
  };

  DT['Job Card'] = {
    ws: 'Manufacturing', prefix: 'PO-JOB2026-', submit: true,
    title: function (d) { return d.operation; },
    fields: [
      F('work_order', 'Work Order', 'ro', { get: function (d) { return d.work_order || '—'; } }),
      F('operation', 'Operation', 'select', { options: ['Cutting', 'Stitching', 'Finishing', 'Packing'], def: 'Cutting' }),
      F('workstation', 'Workstation', 'select', { options: ['Cutting Table 1', 'Juki Line A', 'Juki Line B', 'Finishing Bay'], def: 'Cutting Table 1' }),
      F('employee', 'Employee', 'select', { options: EMPLOYEES, def: 'Vikram Mehta' }),
      F('for_quantity', 'Qty To Manufacture', 'int', { def: 100 }),
      F('time_in_mins', 'Time Logged (mins)', 'int', { def: 240, req: 1 }),
      F('total_completed_qty', 'Completed Qty', 'int', { def: 100 })
    ],
    sources: { 'Work Order': function (src, d) { d.work_order = src.name; d.for_quantity = src.qty; d.total_completed_qty = src.qty; } },
    mark: 'jc',
    status: function () { return 'Completed'; },
    listCols: [['Work Order', 'work_order'], ['Workstation', 'workstation'], ['Mins', 'time_in_mins']]
  };

  /* --- Projects --- */
  DT['Project'] = {
    ws: 'Projects', prefix: 'PROJ-', pad: 4, submit: false,
    title: function (d) { return d.project_name; },
    fields: [
      F('project_name', 'Project Name', 'data', { req: 1 }),
      F('customer', 'Customer', 'link', { options: opt.customers }),
      F('expected_start_date', 'Expected Start Date', 'date', { def: TODAY }),
      F('expected_end_date', 'Expected End Date', 'date', { def: addDays(TODAY, 45) }),
      F('estimated_costing', 'Estimated Cost', 'currency', { def: 0 }),
      F('status', 'Status', 'select', { options: ['Open', 'Completed', 'Cancelled'], def: 'Open' })
    ],
    status: function (d) { return d.status || 'Open'; },
    listCols: [['Customer', 'customer'], ['Expected End', 'expected_end_date', 'date']],
    sample: function (d) { d.project_name = 'Showroom Fit-out - Patel Fashion House'; d.customer = 'Patel Fashion House'; d.estimated_costing = 450000; }
  };

  DT['Task'] = {
    ws: 'Projects', prefix: 'TASK-2026-', submit: false,
    title: function (d) { return d.subject; },
    fields: [
      F('subject', 'Subject', 'data', { req: 1 }),
      F('project', 'Project', 'link', { options: opt.projects }),
      F('priority', 'Priority', 'select', { options: ['Low', 'Medium', 'High', 'Urgent'], def: 'High' }),
      F('expected_time', 'Expected Time (in hours)', 'float', { def: 6 }),
      F('exp_end_date', 'Expected End Date', 'date', { def: addDays(TODAY, 5) }),
      F('status', 'Status', 'select', { options: ['Open', 'Working', 'Pending Review', 'Completed'], def: 'Working' })
    ],
    sources: { Project: function (src, d) { d.project = src.name; d.subject = 'Finalise floor plan with client'; } },
    status: function (d) { return d.status || 'Open'; },
    listCols: [['Project', 'project'], ['Priority', 'priority']],
    sample: function (d, S) { var p = latestUser(S, 'Project'); d.subject = 'Finalise floor plan with client'; d.project = p ? p.name : ''; }
  };

  DT['Timesheet'] = {
    ws: 'Projects', prefix: 'TS-2026-', submit: true,
    title: function (d) { return d.employee; },
    fields: [
      F('employee', 'Employee', 'select', { options: EMPLOYEES, def: 'Ananya Rao' }),
      F('project', 'Project', 'link', { options: opt.projects }),
      F('task', 'Task', 'ro', { get: function (d) { return d.task || '—'; } }),
      F('activity_type', 'Activity Type', 'select', { options: ['Consulting', 'Planning', 'Execution', 'Site Visit'], def: 'Consulting' }),
      F('hours', 'Hours', 'float', { def: 6, req: 1 }),
      F('billing_rate', 'Billing Rate', 'currency', { def: 1500 }),
      F('billing_amount', 'Billing Amount', 'ro', { get: function (d) { return global.ERPFmt.inr((+d.hours || 0) * (+d.billing_rate || 0)); } })
    ],
    sources: {
      Task: function (src, d) { d.project = src.project; d.task = src.name; d.hours = +src.expected_time || 6; },
      Project: function (src, d) { d.project = src.name; }
    },
    status: function (d) { return d.billed ? 'Billed' : 'Submitted'; },
    listCols: [['Project', 'project'], ['Hours', 'hours'], ['Activity', 'activity_type']]
  };

  /* --- Quality --- */
  DT['Quality Inspection'] = {
    ws: 'Quality', prefix: 'MAT-QA-2026-', submit: true,
    title: function (d) { return d.item_code; },
    fields: [
      F('inspection_type', 'Inspection Type', 'select', { options: ['Incoming', 'In Process', 'Outgoing'], def: 'Incoming' }),
      F('reference', 'Reference', 'ro', { get: function (d) { return d.from ? d.from.dt + ' ' + d.from.name : '—'; } }),
      F('item_code', 'Item Code', 'link', { options: function (S, d) {
        var src = d.from && S.docs[d.from.dt] && S.docs[d.from.dt].filter(function (x) { return x.name === d.from.name; })[0];
        return src && src.items ? src.items.map(function (r) { return r.item_code; }) : opt.items(S);
      }, req: 1 }),
      F('sample_size', 'Sample Size', 'int', { def: 10 }),
      F('reading_gsm', function (S) { return 'Reading: ' + S.qc.param + ' (spec ' + S.qc.spec + ')'; }, 'float', { def: function (S) { return S.qc.reading; } }),
      F('shade', 'Reading: Visual Check', 'select', { options: ['Match', 'Minor variation', 'Mismatch'], def: 'Minor variation' }),
      F('inspected_by', 'Inspected By', 'select', { options: EMPLOYEES, def: 'Priya Nair' }),
      F('status', 'Status', 'select', { options: ['Accepted', 'Rejected'], def: 'Rejected' })
    ],
    sources: { 'Purchase Receipt': function (src, d) { d.item_code = src.items && src.items[0] ? src.items[0].item_code : ''; } },
    status: function (d) { return d.status; },
    listCols: [['Type', 'inspection_type'], ['Sample', 'sample_size']]
  };

  DT['Non Conformance'] = {
    ws: 'Quality', prefix: 'QA-NC-2026-', submit: false,
    title: function (d) { return d.subject; },
    fields: [
      F('subject', 'Subject', 'data', { req: 1 }),
      F('procedure', 'Procedure', 'select', { options: ['Incoming Material Inspection', 'In-line Stitching Check', 'Final Audit'], def: 'Incoming Material Inspection' }),
      F('process_owner', 'Process Owner', 'select', { options: EMPLOYEES, def: 'Priya Nair' }),
      F('details', 'Details', 'text'),
      F('status', 'Status', 'select', { options: ['Open', 'Resolved', 'Cancelled'], def: 'Open' })
    ],
    sources: { 'Quality Inspection': function (src, d, S) {
      d.subject = S.qc.param + ' out of spec on ' + src.item_code;
      d.details = 'Sample of ' + src.sample_size + ' read ' + src.reading_gsm + ' against a spec of ' + S.qc.spec + '. Appearance: ' + (src.shade || '').toLowerCase() + '.';
    } },
    mark: 'nc',
    status: function (d) { return d.status; },
    listCols: [['Procedure', 'procedure'], ['Owner', 'process_owner']]
  };

  DT['Quality Action'] = {
    ws: 'Quality', prefix: 'QA-ACT-2026-', submit: false,
    title: function (d) { return d.corrective_preventive; },
    fields: [
      F('corrective_preventive', 'Corrective/Preventive', 'select', { options: ['Corrective', 'Preventive'], def: 'Corrective' }),
      F('non_conformance', 'Non Conformance', 'ro', { get: function (d) { return d.from ? d.from.name : '—'; } }),
      F('assigned_to', 'Assigned To', 'select', { options: EMPLOYEES, def: 'Vikram Mehta' }),
      F('description', 'Action', 'text', { req: 1 }),
      F('status', 'Status', 'select', { options: ['Open', 'Completed'], def: 'Open' })
    ],
    sources: { 'Non Conformance': function (src, d) { d.description = 'Return the batch to the supplier, raise a debit note, and add a GSM check to the supplier scorecard.'; } },
    status: function (d) { return d.status; },
    listCols: [['Assigned To', 'assigned_to']]
  };

  /* --- Support --- */
  var SLA_HOURS = { Low: 24, Medium: 8, High: 4, Urgent: 2 };
  DT['Issue'] = {
    ws: 'Support', prefix: 'ISS-2026-', submit: false,
    title: function (d) { return d.subject; },
    fields: [
      F('subject', 'Subject', 'data', { req: 1 }),
      F('customer', 'Customer', 'link', { options: opt.customers }),
      F('priority', 'Priority', 'select', { options: ['Low', 'Medium', 'High', 'Urgent'], def: 'High' }),
      F('issue_type', 'Issue Type', 'select', { options: ['Machine Breakdown', 'Billing', 'Training', 'Delivery'], def: 'Machine Breakdown' }),
      F('sla', 'Service Level Agreement', 'ro', { get: function (d) {
        var h = SLA_HOURS[d.priority] || 8;
        return 'Respond within ' + h + ' working hour' + (h > 1 ? 's' : '') + ' · Default SLA';
      } }),
      F('description', 'Description', 'text'),
      F('status', 'Status', 'select', { options: ['Open', 'Replied', 'On Hold', 'Resolved'], def: 'Open' })
    ],
    status: function (d) { return d.resolved ? 'Resolved' : (d.status || 'Open'); },
    listCols: [['Customer', 'customer'], ['Priority', 'priority']],
    sample: function (d) { d.subject = 'Cutting machine stopped mid-batch'; d.customer = 'Sharma Garments'; d.description = 'Blade motor trips after 10 minutes. 300 pieces pending for dispatch on Friday.'; }
  };

  DT['Maintenance Visit'] = {
    ws: 'Support', prefix: 'MAT-MVS-2026-', submit: true,
    title: function (d) { return d.customer; },
    fields: [
      F('customer', 'Customer', 'link', { options: opt.customers, req: 1 }),
      F('mntc_date', 'Maintenance Date', 'date', { def: TODAY }),
      F('maintenance_type', 'Maintenance Type', 'select', { options: ['Breakdown', 'Scheduled', 'Unscheduled'], def: 'Breakdown' }),
      F('service_person', 'Service Person', 'select', { options: EMPLOYEES, def: 'Farhan Shaikh' }),
      F('completion_status', 'Completion Status', 'select', { options: ['Fully Completed', 'Partially Completed'], def: 'Fully Completed' }),
      F('work_done', 'Work Done', 'text')
    ],
    sources: { Issue: function (src, d) { d.customer = src.customer || 'Sharma Garments'; d.work_done = 'Replaced worn drive belt and recalibrated the blade guard. Test cut of 50 pieces passed.'; } },
    mark: 'resolved',
    status: function () { return 'Submitted'; },
    listCols: [['Type', 'maintenance_type'], ['Service Person', 'service_person']]
  };

  /* --- Assets --- */
  var ASSET_ITEMS = ['Laptop - Dell Latitude 5440', 'Delivery Van - Tata Ace', 'CNC Lathe Machine', 'Office Furniture Set'];
  var LOCATIONS = ['Head Office', 'Factory', 'Warehouse', 'Branch Office'];
  DT['Asset'] = {
    ws: 'Assets', prefix: 'ACC-ASS-2026-', submit: true,
    title: function (d) { return d.asset_name; },
    fields: [
      F('item_code', 'Item Code', 'link', { options: ASSET_ITEMS, req: 1 }),
      F('asset_name', 'Asset Name', 'data', { req: 1 }),
      F('asset_category', 'Asset Category', 'select', { options: ['Computers', 'Vehicles', 'Plant and Machinery', 'Furniture'], def: 'Computers' }),
      F('location', 'Location', 'select', { options: LOCATIONS, def: 'Head Office', req: 1 }),
      F('custodian', 'Custodian', 'select', { options: [''].concat(EMPLOYEES), def: '' }),
      F('purchase_date', 'Purchase Date', 'date', { def: TODAY, req: 1 }),
      F('available_for_use_date', 'Available-for-use Date', 'date', { def: TODAY }),
      F('gross_purchase_amount', 'Net Purchase Amount', 'currency', { req: 1 }),
      F('depreciation', 'Depreciation', 'ro', { get: function (d) {
        var yrs = { Computers: 3, Vehicles: 8, 'Plant and Machinery': 10, Furniture: 10 }[d.asset_category] || 5;
        var amt = +d.gross_purchase_amount || 0;
        return 'Straight Line over ' + yrs + ' years (from Asset Category)' + (amt ? ' · ' + global.ERPFmt.inr(Math.round(amt / yrs / 12)) + ' a month' : '');
      } })
    ],
    status: function (d) { return d.docstatus === 1 ? 'Submitted' : 'Draft'; },
    listCols: [['Category', 'asset_category'], ['Location', 'location'], ['Amount', 'gross_purchase_amount', 'currency']],
    sample: function (d) { d.item_code = ASSET_ITEMS[0]; d.asset_name = 'Laptop for Accounts Team'; d.gross_purchase_amount = 78000; }
  };
  DT['Asset Movement'] = {
    ws: 'Assets', prefix: 'ACC-ASM-2026-', submit: true,
    title: function (d) { return d.purpose; },
    fields: [
      F('purpose', 'Purpose', 'select', { options: ['Transfer', 'Issue', 'Receipt'], def: 'Transfer' }),
      F('transaction_date', 'Transaction Date', 'date', { def: TODAY }),
      F('asset', 'Asset', 'ro', { get: function (d) { return d.asset || '—'; } }),
      F('source_location', 'Source Location', 'ro', { get: function (d) { return d.source_location || '—'; } }),
      F('target_location', 'Target Location', 'select', { options: LOCATIONS, def: 'Factory', req: 1 }),
      F('to_employee', 'To Employee', 'select', { options: [''].concat(EMPLOYEES), def: '' })
    ],
    sources: { Asset: function (src, d) { d.asset = src.name; d.source_location = src.location; d.target_location = src.location === 'Factory' ? 'Warehouse' : 'Factory'; } },
    mark: 'moved',
    onSubmit: function (d, S) { var a = S.docs.Asset.filter(function (x) { return x.name === d.asset; })[0]; if (a) { a.location = d.target_location; if (d.to_employee) a.custodian = d.to_employee; } },
    status: function () { return 'Submitted'; },
    listCols: [['Purpose', 'purpose'], ['Target', 'target_location']]
  };

  /* --- Retail / POS --- */
  DT['POS Opening Entry'] = {
    ws: 'Retail', prefix: 'POS-OPE-2026-', submit: true,
    title: function (d) { return d.pos_profile; },
    fields: [
      F('pos_profile', 'POS Profile', 'select', { options: ['Andheri Store', 'Surat Outlet'], def: 'Andheri Store' }),
      F('user', 'Cashier', 'select', { options: EMPLOYEES, def: 'Priya Nair' }),
      F('period_start_date', 'Period Start Date', 'date', { def: TODAY }),
      F('opening_amount', 'Opening Cash (INR)', 'currency', { def: 5000, req: 1 })
    ],
    status: function (d) { return d.closed ? 'Closed' : 'Open'; },
    listCols: [['Cashier', 'user'], ['Opening Cash', 'opening_amount', 'currency']]
  };

  DT['POS Invoice'] = {
    ws: 'Retail', prefix: 'ACC-PSINV-2026-', submit: true, items: true, taxes: 'out', stock: -1, readonly: true,
    title: function (d) { return d.customer; },
    fields: [
      partyCustomer,
      F('posting_date', 'Date', 'date', { def: TODAY }),
      F('pos_profile', 'POS Profile', 'ro', { get: function (d) { return d.pos_profile || 'Andheri Store'; } }),
      F('mode_of_payment', 'Mode of Payment', 'ro', { get: function (d) { return d.mode_of_payment || '—'; } })
    ],
    status: function () { return 'Paid'; },
    listCols: [['Mode', 'mode_of_payment'], ['Grand Total', 'rounded_total', 'currency']]
  };

  DT['POS Closing Entry'] = {
    ws: 'Retail', prefix: 'POS-CLO-2026-', submit: true,
    title: function (d) { return d.pos_profile; },
    fields: [
      F('pos_opening_entry', 'POS Opening Entry', 'ro', { get: function (d) { return d.from ? d.from.name : '—'; } }),
      F('pos_profile', 'POS Profile', 'ro', { get: function (d) { return d.pos_profile || '—'; } }),
      F('total_invoices', 'Invoices in Session', 'ro', { get: function (d) { return String(d.total_invoices || 0); } }),
      F('grand_total', 'Session Sales (incl. GST)', 'ro', { get: function (d) { return global.ERPFmt.inr(d.session_total || 0); } }),
      F('by_mode', 'Collected By Mode', 'ro', { get: function (d) { return d.by_mode || '—'; } }),
      F('closing_amount', 'Closing Cash Counted (INR)', 'currency', { req: 1 })
    ],
    sources: { 'POS Opening Entry': function (src, d, S) {
      var inv = S.docs['POS Invoice'].filter(function (i) { return i.session === src.name; });
      var tot = 0, modes = {};
      inv.forEach(function (i) { tot += i.rounded_total; modes[i.mode_of_payment] = (modes[i.mode_of_payment] || 0) + i.rounded_total; });
      d.pos_profile = src.pos_profile; d.total_invoices = inv.length; d.session_total = tot;
      d.by_mode = Object.keys(modes).map(function (m) { return m + ' ' + global.ERPFmt.inr(modes[m]); }).join(' · ') || 'No sales yet';
      d.closing_amount = (+src.opening_amount || 0) + (modes.Cash || 0);
    } },
    mark: 'closed',
    status: function () { return 'Submitted'; },
    listCols: [['POS Profile', 'pos_profile'], ['Invoices', 'total_invoices'], ['Session Sales', 'session_total', 'currency']]
  };

  function ensureCustomer(d, S) {
    if (!d.customer) return;
    if (S.docs.Customer.some(function (c) { return c.name === d.customer; })) return;
    var lead = S.docs.Lead.filter(function (l) { return l.company_name === d.customer; })[0];
    S.docs.Customer.push({ name: d.customer, customer_name: d.customer, customer_group: 'Commercial', state: lead ? lead.state : S.state, city: '', gstin: '', docstatus: 0, created: S.tick++ });
  }

  /* ---------- Modules (page tabs) ---------- */
  var MODULES = [
    { key: 'accounting', tab: 'Accounting', ws: 'Accounting', icon: 'calculator', cycle: 'invoice-to-ledger',
      know: 'https://frappe.io/erpnext/open-source-accounting',
      checks: ['Multi-subsidiary, Multi-currency', 'General ledger', 'Accounts payable/receivable', 'Financial statements', 'Fixed assets', 'Global tax and compliance'],
      steps: [{ dt: 'Sales Invoice', fresh: 1 }, { dt: 'Payment Entry', src: 'Sales Invoice' }, { dt: 'Journal Entry', fresh: 1 }, { report: 'General Ledger' }],
      shortcuts: ['Sales Invoice', 'Purchase Invoice', 'Payment Entry', 'Journal Entry'],
      links: [['Accounts', ['Sales Invoice', 'Purchase Invoice', 'Payment Entry', 'Journal Entry']], ['Reports', ['report:General Ledger', 'report:Accounts Receivable']], ['Masters', ['Customer', 'Supplier']]] },
    { key: 'procurement', tab: 'Procurement', ws: 'Buying', icon: 'cart', cycle: 'procure-to-pay',
      know: 'https://frappe.io/erpnext/open-source-procurement',
      checks: ['Procure-to-Pay cycle', 'Material request', 'Purchase orders', 'Multi-level approvals', 'Supplier scorecards', 'Supplier payments'],
      steps: [{ dt: 'Material Request', fresh: 1 }, { dt: 'Purchase Order', src: 'Material Request' }, { dt: 'Purchase Receipt', src: 'Purchase Order' }, { dt: 'Purchase Invoice', src: 'Purchase Receipt' }, { dt: 'Payment Entry', src: 'Purchase Invoice', label: 'Payment' }],
      shortcuts: ['Material Request', 'Purchase Order', 'Purchase Receipt', 'Purchase Invoice'],
      links: [['Purchasing', ['Material Request', 'Purchase Order', 'Purchase Receipt', 'Purchase Invoice']], ['Payments', ['Payment Entry']], ['Masters', ['Supplier', 'Item']]] },
    { key: 'sales', tab: 'Sales', ws: 'Selling', icon: 'store', cycle: 'order-to-cash',
      know: 'https://frappe.io/erpnext/open-source-sales-invoicing',
      checks: ['Order-to-Cash', 'Sales orders', 'Sales invoice', 'Print formats', 'Pricing rules', 'Payments'],
      steps: [{ dt: 'Quotation', fresh: 1 }, { dt: 'Sales Order', src: 'Quotation' }, { dt: 'Delivery Note', src: 'Sales Order' }, { dt: 'Sales Invoice', src: 'Delivery Note' }, { dt: 'Payment Entry', src: 'Sales Invoice', label: 'Payment' }],
      shortcuts: ['Quotation', 'Sales Order', 'Delivery Note', 'Sales Invoice'],
      links: [['Selling', ['Quotation', 'Sales Order', 'Delivery Note', 'Sales Invoice', 'Payment Entry']], ['Reports', ['report:Accounts Receivable']], ['Masters', ['Customer', 'Item']]] },
    { key: 'stock', tab: 'Stock', ws: 'Stock', icon: 'warehouse', cycle: 'item-to-dispatch',
      know: 'https://frappe.io/erpnext/open-source-inventory-management-system',
      checks: ['Item master', 'Warehouses', 'Serial and batch tracking', 'Stock ledger', 'Item defaults', 'Inventory reports'],
      steps: [{ dt: 'Item', fresh: 1, label: 'New Item' }, { dt: 'Stock Entry', fresh: 1, label: 'Material Receipt', test: function (d) { return d.stock_entry_type === 'Material Receipt'; } }, { dt: 'Delivery Note', fresh: 1 }, { report: 'Stock Balance' }],
      shortcuts: ['Item', 'Stock Entry', 'Purchase Receipt', 'Delivery Note'],
      links: [['Transactions', ['Stock Entry', 'Purchase Receipt', 'Delivery Note', 'Material Request']], ['Reports', ['report:Stock Balance']], ['Masters', ['Item']]] },
    { key: 'assets', tab: 'Assets', ws: 'Assets', icon: 'handbox', cycle: 'purchase-to-depreciation',
      know: 'https://frappe.io/erpnext/open-source-asset-management-software',
      checks: ['Asset register', 'Depreciation schedules', 'Asset movement', 'Maintenance', 'Asset value adjustments', 'Disposal and scrapping'],
      steps: [{ dt: 'Asset', fresh: 1 }, { dt: 'Asset Movement', src: 'Asset' }],
      shortcuts: ['Asset', 'Asset Movement'],
      links: [['Assets', ['Asset', 'Asset Movement']]] },
    { key: 'manufacturing', tab: 'Manufacturing', ws: 'Manufacturing', icon: 'factory', cycle: 'BOM-to-finished-goods',
      know: 'https://frappe.io/erpnext/open-source-manufacturing-erp-software',
      checks: ['Multi-level BOM', 'Production planning', 'Work orders, Job cards', 'Subcontracting', 'Quality checks', 'Manufacturing reports'],
      steps: [{ dt: 'BOM', fresh: 1 }, { dt: 'Work Order', src: 'BOM' }, { dt: 'Job Card', src: 'Work Order' }, { dt: 'Stock Entry', src: 'Work Order', label: 'Manufacture Entry', test: function (d) { return d.stock_entry_type === 'Manufacture'; } }],
      shortcuts: ['BOM', 'Work Order', 'Job Card', 'Stock Entry'],
      links: [['Production', ['BOM', 'Work Order', 'Job Card', 'Stock Entry']], ['Reports', ['report:Stock Balance']], ['Masters', ['Item']]] },
    { key: 'quality', tab: 'Quality', ws: 'Quality', icon: 'badge', cycle: 'inspection-to-action',
      know: 'https://frappe.io/erpnext/open-source-quality-management-software',
      checks: ['Quality assurance plans', 'Quality inspections', 'Quality templates', 'Non-conformance reporting', 'Quality analytics & reports', 'Checks across end to end material flow'],
      steps: [{ dt: 'Purchase Receipt', fresh: 1 }, { dt: 'Quality Inspection', src: 'Purchase Receipt' }, { dt: 'Non Conformance', src: 'Quality Inspection' }, { dt: 'Quality Action', src: 'Non Conformance' }],
      shortcuts: ['Quality Inspection', 'Non Conformance', 'Quality Action', 'Purchase Receipt'],
      links: [['Quality', ['Quality Inspection', 'Non Conformance', 'Quality Action']], ['Stock', ['Purchase Receipt']]] },
    { key: 'projects', tab: 'Projects', ws: 'Projects', icon: 'listtree', cycle: 'project-to-billing',
      know: 'https://frappe.io/erpnext/open-source-project-management-software',
      checks: ['Project and task tracking', 'Revenue recognition', 'Expenses tracking', 'Timesheet tracking', 'Inventory tracking', 'Cashflow management'],
      steps: [{ dt: 'Project', fresh: 1 }, { dt: 'Task', src: 'Project' }, { dt: 'Timesheet', src: 'Task' }, { dt: 'Sales Invoice', src: 'Timesheet' }],
      shortcuts: ['Project', 'Task', 'Timesheet', 'Sales Invoice'],
      links: [['Projects', ['Project', 'Task', 'Timesheet']], ['Billing', ['Sales Invoice']], ['Reports', ['report:Project Summary']]] },
    { key: 'support', tab: 'Support', ws: 'Support', icon: 'buoy', cycle: 'ticket-to-invoice',
      know: 'https://frappe.io/erpnext/open-source-saas-help-desk-software',
      checks: ['Auto-assign tickets', 'Define and honour SLAs', 'Customer portal', 'Maintenance visits', 'Knowledge base', 'Integrated invoicing'],
      steps: [{ dt: 'Issue', fresh: 1 }, { dt: 'Maintenance Visit', src: 'Issue' }, { dt: 'Sales Invoice', src: 'Maintenance Visit', label: 'Invoice the Visit' }],
      shortcuts: ['Issue', 'Maintenance Visit', 'Sales Invoice', 'Customer'],
      links: [['Support', ['Issue', 'Maintenance Visit']], ['Billing', ['Sales Invoice']], ['Masters', ['Customer']]] },
    { key: 'crm', tab: 'CRM', ws: 'CRM', icon: 'users', cycle: 'lead-to-order',
      know: 'https://frappe.io/crm',
      checks: ['Leads', 'Opportunities', 'Quotations', 'Multi-territory sales', 'SLA management', 'Newsletters'],
      steps: [{ dt: 'Lead', fresh: 1 }, { dt: 'Opportunity', src: 'Lead' }, { dt: 'Quotation', src: 'Opportunity' }, { dt: 'Sales Order', src: 'Quotation' }],
      shortcuts: ['Lead', 'Opportunity', 'Quotation', 'Customer'],
      links: [['Pipeline', ['Lead', 'Opportunity', 'Quotation', 'Sales Order']], ['Masters', ['Customer']]] },
    { key: 'pos', tab: 'POS', ws: 'Point of Sale', icon: 'monitor', cycle: 'store shift',
      know: 'https://frappe.io/erpnext/open-source-pos-software',
      checks: ['Cloud-based', 'Multi-store', 'Collections and Invoicing', 'Shift Management', 'POS profile', 'Print formats'],
      steps: [{ dt: 'POS Opening Entry', fresh: 1, label: 'Open Shift' }, { dt: 'POS Invoice', pos: 1, label: 'Ring Up a Sale' }, { dt: 'POS Closing Entry', src: 'POS Opening Entry', label: 'Close Shift' }],
      shortcuts: ['POS Opening Entry', 'POS Invoice', 'POS Closing Entry', 'Item'],
      links: [['Point of Sale', ['pos:Point of Sale', 'POS Opening Entry', 'POS Invoice', 'POS Closing Entry']], ['Masters', ['Item', 'Customer']]] }
  ];

  /* ---------- Sector catalogs ----------
     Item rows follow fixed roles so the seed transactions keep working:
     RM1, RM2, RM3, CONS1, CONS2, FG1, FG2. Customers C1 (Maharashtra), C2 (Tamil Nadu),
     C3 (Gujarat), C4 (Telangana); suppliers S1 (Gujarat), S2 (Maharashtra), S3 (Tamil Nadu). */
  var BASE_CODES = ['COT-FAB-60', 'DNM-FAB-12', 'POLY-YRN-30', 'DYE-RED-25', 'BTN-PACK-100', 'SHIRT-CTN-M', 'KURTA-LIN-L'];
  var BASE_CUST = ['Sharma Garments', 'Kaveri Textiles', 'Patel Fashion House', 'Deccan Retail Co.'];
  var BASE_SUPP = ['Gujarat Yarn Mills', 'Shree Dyes & Chemicals', 'Coimbatore Cotton Co.'];
  var SECTORS = {
    textiles: { label: 'Textiles & Apparel', customers: BASE_CUST, suppliers: BASE_SUPP,
      items: [['COT-FAB-60', 'Cotton Fabric 60s', 'Raw Material', 'Mtr', 240, '5208', '5'], ['DNM-FAB-12', 'Denim Fabric 12 oz', 'Raw Material', 'Mtr', 320, '5209', '5'], ['POLY-YRN-30', 'Polyester Yarn 30D', 'Raw Material', 'Kg', 210, '5402', '5'], ['DYE-RED-25', 'Reactive Dye Red (25 kg)', 'Consumable', 'Kg', 760, '3204', '18'], ['BTN-PACK-100', 'Shirt Buttons (pack of 100)', 'Consumable', 'Nos', 90, '9606', '18'], ['SHIRT-CTN-M', 'Cotton Shirt, Medium', 'Products', 'Nos', 650, '6205', '5'], ['KURTA-LIN-L', 'Linen Kurta, Large', 'Products', 'Nos', 1190, '6211', '5']],
      qc: { param: 'GSM', spec: '140 ± 5', reading: 133 }, suggest: ['Cotton Shirts', 'Linen Kurtas', 'Denim Jeans', 'Bedsheets'] },
    food: { label: 'Food & Beverage', customers: ['Sharma Supermarts', 'Kaveri Fresh Stores', 'Patel Foods Distributors', 'Deccan Hypermarkets'], suppliers: ['Gujarat Agro Mills', 'Shree Packaging Industries', 'Coimbatore Oil Mills'],
      items: [['FLOUR-WHT', 'Wheat Flour (Maida)', 'Raw Material', 'Kg', 38, '1101', '5'], ['SUGAR-S30', 'Sugar S-30', 'Raw Material', 'Kg', 44, '1701', '5'], ['OIL-PALM', 'Refined Palm Oil', 'Raw Material', 'Kg', 118, '1511', '5'], ['FILM-BOPP', 'BOPP Packaging Film', 'Consumable', 'Kg', 210, '3920', '18'], ['CTN-BOX-48', 'Corrugated Carton (48 pcs)', 'Consumable', 'Nos', 24, '4819', '18'], ['COOKIE-200', 'Butter Cookies 200 g', 'Products', 'Nos', 45, '1905', '5'], ['NAMKEEN-400', 'Namkeen Mix 400 g', 'Products', 'Nos', 90, '2106', '5']],
      qc: { param: 'Moisture %', spec: '≤ 3.5', reading: 4.2 }, suggest: ['Butter Cookies', 'Namkeen Mix', 'Ready-to-eat Meals', 'Masala Blends'] },
    engineering: { label: 'Engineering & Manufacturing', customers: ['Sharma Industrial Works', 'Kaveri Engineering', 'Patel Machine Tools', 'Deccan Infra Projects'], suppliers: ['Gujarat Steel Traders', 'Shree Lubricants', 'Coimbatore Castings'],
      items: [['MS-SHEET-2', 'MS Sheet 2 mm', 'Raw Material', 'Kg', 68, '7208', '18'], ['AL-ROD-12', 'Aluminium Rod 12 mm', 'Raw Material', 'Kg', 245, '7604', '18'], ['CU-WIRE-15', 'Copper Wire 1.5 sq mm', 'Raw Material', 'Kg', 820, '7408', '18'], ['OIL-CUT', 'Cutting Oil', 'Consumable', 'Ltr', 180, '2710', '18'], ['FAST-M8', 'M8 Fastener Set (100)', 'Consumable', 'Nos', 240, '7318', '18'], ['PANEL-CTRL', 'Control Panel', 'Products', 'Nos', 18500, '8537', '18'], ['BRKT-MTR', 'Motor Mount Bracket', 'Products', 'Nos', 650, '7326', '18']],
      qc: { param: 'Thickness (mm)', spec: '2.00 ± 0.05', reading: 1.91 }, suggest: ['Control Panels', 'Motor Brackets', 'Pump Assemblies', 'Gear Boxes'] },
    distribution: { label: 'Trading & Distribution', customers: ['Sharma Kirana Stores', 'Kaveri Departmental Stores', 'Patel Wholesale Mart', 'Deccan Retail Co.'], suppliers: ['Gujarat Agro Foods', 'Shree Consumer Products', 'Coimbatore Oil Mills'],
      items: [['RICE-BAS-25', 'Basmati Rice 25 kg', 'Products', 'Nos', 2150, '1006', '5'], ['OIL-SUN-15', 'Sunflower Oil 15 L Tin', 'Products', 'Nos', 2350, '1512', '5'], ['DAL-TOOR-30', 'Toor Dal 30 kg', 'Products', 'Nos', 3900, '0713', '5'], ['DET-1KG', 'Detergent Powder 1 kg', 'Products', 'Nos', 95, '3402', '18'], ['WRAP-SHRINK', 'Shrink Wrap Roll', 'Consumable', 'Nos', 450, '3920', '18'], ['TEA-1KG', 'Assam Tea 1 kg', 'Products', 'Nos', 420, '0902', '5'], ['TPASTE-150', 'Toothpaste 150 g', 'Products', 'Nos', 88, '3306', '5']],
      qc: { param: 'Pack weight (kg)', spec: '25.00 ± 0.10', reading: 24.7 }, suggest: ['Basmati Rice', 'Packaged Tea', 'Edible Oil', 'Detergents'] },
    electronics: { label: 'Electronics', customers: ['Sharma Electronics', 'Kaveri Digital', 'Patel Appliances', 'Deccan Gadgets'], suppliers: ['Gujarat Plastics', 'Shree Components', 'Coimbatore Cells'],
      items: [['PCB-ASSY-A', 'PCB Assembly Type A', 'Raw Material', 'Nos', 340, '8534', '18'], ['HSG-ABS', 'ABS Housing', 'Raw Material', 'Nos', 85, '3926', '18'], ['CELL-18650', 'Li-ion Cell 18650', 'Raw Material', 'Nos', 160, '8507', '18'], ['SOLDER-WIRE', 'Solder Wire', 'Consumable', 'Kg', 1450, '8311', '18'], ['BOX-RETAIL', 'Retail Box', 'Consumable', 'Nos', 22, '4819', '18'], ['PBANK-10K', 'Power Bank 10000 mAh', 'Products', 'Nos', 1299, '8507', '18'], ['LED-9W', 'LED Bulb 9 W', 'Products', 'Nos', 99, '8539', '18']],
      qc: { param: 'Cell voltage (V)', spec: '3.60 ± 0.05', reading: 3.48 }, suggest: ['Power Banks', 'LED Bulbs', 'Smart Plugs', 'Chargers'] },
    pharma: { label: 'Pharma & Healthcare', customers: ['Sharma Medicals', 'Kaveri Pharma Distributors', 'Patel Chemists', 'Deccan Hospitals'], suppliers: ['Gujarat Fine Chemicals', 'Shree Pharma Packaging', 'Coimbatore Excipients'],
      items: [['API-PCM', 'Paracetamol API', 'Raw Material', 'Kg', 420, '2924', '18'], ['MCC-101', 'Microcrystalline Cellulose', 'Raw Material', 'Kg', 260, '3912', '18'], ['STARCH-MZ', 'Maize Starch', 'Raw Material', 'Kg', 58, '1108', '18'], ['FOIL-ALU', 'Blister Foil', 'Consumable', 'Kg', 690, '7607', '18'], ['CARTON-10', 'Carton (10 strips)', 'Consumable', 'Nos', 6, '4819', '18'], ['PCM-500', 'Paracetamol 500 mg (strip of 10)', 'Products', 'Nos', 22, '3004', '5'], ['VITC-500', 'Vitamin C 500 mg (strip of 15)', 'Products', 'Nos', 95, '3004', '5']],
      qc: { param: 'Assay (%)', spec: '98.0 to 102.0', reading: 96.4 }, suggest: ['Paracetamol Tablets', 'Vitamin C Tablets', 'Cough Syrup', 'Ointments'] },
    services: { label: 'IT & Services', customers: ['Sharma Hospitality', 'Kaveri Logistics', 'Patel Builders', 'Deccan Retail Co.'], suppliers: ['Gujarat IT Distributors', 'Shree Network Supplies', 'Coimbatore Systems'],
      items: [['LAPTOP-I5', 'Business Laptop i5', 'Products', 'Nos', 54000, '8471', '18'], ['SWITCH-24P', 'Network Switch 24-port', 'Products', 'Nos', 8200, '8517', '18'], ['CAT6-BOX', 'Cat6 Cable Box 305 m', 'Raw Material', 'Nos', 6500, '8544', '18'], ['PATCH-1M', 'Patch Cord 1 m', 'Consumable', 'Nos', 120, '8544', '18'], ['RACK-SCREW', 'Rack Screw Set', 'Consumable', 'Nos', 300, '7318', '18'], ['RACK-42U', '42U Server Rack Setup', 'Products', 'Nos', 95000, '8471', '18'], ['WIFI-KIT', 'Office Wi-Fi Kit', 'Products', 'Nos', 12500, '8517', '18']],
      qc: { param: 'Cable test (Mbps)', spec: '≥ 1000', reading: 870 }, suggest: ['Server Rack Setup', 'Office Wi-Fi Kits', 'CCTV Installation', 'Networking Kits'] }
  };
  SECTORS.other = { label: 'Something else', customers: SECTORS.engineering.customers, suppliers: SECTORS.engineering.suppliers, items: SECTORS.engineering.items, qc: SECTORS.engineering.qc, suggest: [] };
  var SECTOR_KEYS = ['textiles', 'food', 'engineering', 'distribution', 'electronics', 'pharma', 'services', 'other'];

  function abbrOf(name) {
    var w = String(name || '').replace(/\b(pvt|private|ltd|limited|llp|inc|co)\b\.?/gi, '').trim().split(/\s+/).filter(Boolean);
    var a = w.map(function (x) { return x[0]; }).join('').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    return a || 'CO';
  }
  function codeOf(name, taken) {
    var base = String(name).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 18) || 'ITEM';
    var c = base, n = 2;
    while (taken[c]) c = base + '-' + (n++);
    taken[c] = 1;
    return c;
  }
  var DEFAULT_PROFILE = { company: COMPANY, abbr: 'DI', state: COMPANY_STATE, sector: 'textiles', products: [] };

  /* ---------- Seed data ---------- */
  function seed(profile) {
    var P = {};
    Object.keys(DEFAULT_PROFILE).forEach(function (k) { P[k] = profile && profile[k] != null && profile[k] !== '' ? profile[k] : DEFAULT_PROFILE[k]; });
    var sec = SECTORS[P.sector] || SECTORS.textiles;
    var S = { docs: {}, counters: {}, viewed: {}, tick: 1, company: P.company, abbr: P.abbr, state: P.state, sector: P.sector, sectorLabel: sec.label, qc: sec.qc, profile: P, personal: !!(profile && profile.company) };
    Object.keys(DT).forEach(function (k) { S.docs[k] = []; S.counters[k] = 0; });

    // Map base (textile) codes and names to this company's catalog.
    var catalog = sec.items.map(function (x) { return x.slice(); });
    var taken = {}; catalog.forEach(function (x) { taken[x[0]] = 1; });
    var extras = [];
    (P.products || []).forEach(function (name, i) {
      name = String(name).trim(); if (!name) return;
      var tpl = catalog[i === 0 ? 5 : 6] || catalog[5];
      if (i < 2) { var slot = 5 + i; delete taken[catalog[slot][0]]; catalog[slot] = [codeOf(name, taken), name, 'Products', tpl[3], tpl[4], tpl[5], tpl[6]]; }
      else extras.push([codeOf(name, taken), name, 'Products', catalog[5][3], catalog[5][4], catalog[5][5], catalog[5][6]]);
    });
    var baseRates = SECTORS.textiles.items.map(function (x) { return x[4]; });
    S.codeMap = {}; S.nameMap = {};
    BASE_CODES.forEach(function (old, i) {
      var n = catalog[i];
      if (n[0] !== old || n[4] !== baseRates[i]) S.codeMap[old] = { code: n[0], ratio: n[4] / baseRates[i], uom: n[3] };
      if (n[0] !== old) S.nameMap[old] = n[0];
    });
    BASE_CUST.forEach(function (old, i) { if (sec.customers[i] !== old) S.nameMap[old] = sec.customers[i]; });
    BASE_SUPP.forEach(function (old, i) { if (sec.suppliers[i] !== old) S.nameMap[old] = sec.suppliers[i]; });
    S.R = {
      RM1: catalog[0][0], RM2: catalog[1][0], RM3: catalog[2][0], CONS1: catalog[3][0], CONS2: catalog[4][0], FG1: catalog[5][0], FG2: catalog[6][0],
      C1: sec.customers[0], C2: sec.customers[1], C3: sec.customers[2], C4: sec.customers[3],
      S1: sec.suppliers[0], S2: sec.suppliers[1], S3: sec.suppliers[2],
      extras: extras.map(function (x) { return x[0]; })
    };
    // Rewrites literal names, codes and the account/warehouse suffix in any doc.
    S.fix = function (o) {
      if (!o || typeof o !== 'object') return o;
      Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (typeof v === 'string') {
          if (S.nameMap[v]) o[k] = S.nameMap[v];
          else if (S.abbr !== 'DI' && / - DI$/.test(v)) o[k] = v.replace(/ - DI$/, ' - ' + S.abbr);
        } else if (v && typeof v === 'object') S.fix(v);
      });
      return o;
    };

    function put(dt, d) {
      d.seed = true; d.docstatus = DT[dt].submit ? 1 : 0; d.created = S.tick++;
      if (DT[dt].master) d.name = DT[dt].naming(d, S);
      S.docs[dt].push(d);
      return d;
    }
    var GST_PREFIX = { 'Maharashtra': '27', 'Tamil Nadu': '33', 'Gujarat': '24', 'Telangana': '36' };
    [[sec.customers[0], 'Commercial', 'AAKFS4521K1Z3', 'Maharashtra', 'Mumbai'],
     [sec.customers[1], 'Commercial', 'AAGCK7742L1Z8', 'Tamil Nadu', 'Chennai'],
     [sec.customers[2], 'Retail', 'ABJPP3318M1Z5', 'Gujarat', 'Surat'],
     [sec.customers[3], 'Retail', 'AADCD9120Q1Z2', 'Telangana', 'Hyderabad'],
     ['Walk In Customer', 'Individual', '', 'Maharashtra', 'Mumbai']
    ].forEach(function (c) { put('Customer', { customer_name: c[0], customer_group: c[1], gstin: c[2] ? GST_PREFIX[c[3]] + c[2] : '', state: c[3], city: c[4] }); });
    [[sec.suppliers[0], 'Raw Material', 'AAACG5561H1Z9', 'Gujarat'],
     [sec.suppliers[1], 'Raw Material', 'AAHFS2208R1Z4', 'Maharashtra'],
     [sec.suppliers[2], 'Raw Material', 'AAECC6619B1Z1', 'Tamil Nadu']
    ].forEach(function (x) { put('Supplier', { supplier_name: x[0], supplier_group: x[1], gstin: GST_PREFIX[x[3]] + x[2], state: x[3] }); });
    catalog.concat(extras).concat([
      ['SRV-CONSULT', 'Consulting Services', 'Services', 'Hour', 1500, '998311', '18'],
      ['SRV-AMC', 'Maintenance Visit', 'Services', 'Nos', 2500, '998719', '18']
    ]).forEach(function (i) { put('Item', { item_code: i[0], item_name: i[1], item_group: i[2], stock_uom: i[3], standard_rate: i[4], gst_hsn_code: i[5], gst_rate: i[6], is_stock_item: i[2] === 'Services' ? 0 : 1 }); });
    [['Application of Funds (Assets)', '', 1, 'Asset'], ['Current Assets', '', 1, 'Asset'], ['Bank Accounts', '', 1, 'Asset'], ['Direct Income', '', 1, 'Income'], ['Indirect Income', '', 1, 'Income'], ['Direct Expenses', '', 1, 'Expense'], ['Indirect Expenses', '', 1, 'Expense'], ['Duties and Taxes', '', 1, 'Liability'],
     ['Cash', 'Cash', 0, 'Asset', 'Current Assets'], ['HDFC Bank', 'Bank', 0, 'Asset', 'Bank Accounts'], ['Debtors', 'Receivable', 0, 'Asset', 'Current Assets'], ['Creditors', 'Payable', 0, 'Liability', 'Duties and Taxes'],
     ['Sales', 'Income Account', 0, 'Income', 'Direct Income'], ['Rent Expense', 'Expense Account', 0, 'Expense', 'Indirect Expenses'], ['Salary', 'Expense Account', 0, 'Expense', 'Indirect Expenses'],
     ['Office Expenses', 'Expense Account', 0, 'Expense', 'Indirect Expenses'], ['Electricity Expense', 'Expense Account', 0, 'Expense', 'Indirect Expenses']
    ].forEach(function (a) { put('Account', { account_name: a[0], account_type: a[1], is_group: a[2], root_type: a[3], parent_account: a[4] ? a[4] + ' - ' + S.abbr : '' }); });

    function tx(dt, n, d) { S.fix(d); d.name = DT[dt].prefix + String(n).padStart(DT[dt].pad || 5, '0'); S.counters[dt] = Math.max(S.counters[dt], n); return put(dt, d); }
    function r(code, q, rate) { return row(S, code, q, rate); }

    tx('Stock Entry', 1, { stock_entry_type: 'Material Receipt', posting_date: '2026-09-01', to_warehouse: 'Stores - DI', items: [r('COT-FAB-60', 3200, 205), r('DNM-FAB-12', 1800, 270), r('POLY-YRN-30', 650, 185), r('DYE-RED-25', 90, 680), r('BTN-PACK-100', 400, 70)] });
    tx('Stock Entry', 2, { stock_entry_type: 'Material Receipt', posting_date: '2026-09-02', to_warehouse: 'Finished Goods - DI', items: [r('SHIRT-CTN-M', 420, 405), r('KURTA-LIN-L', 160, 740)] });

    tx('Quotation', 1, { customer: 'Deccan Retail Co.', transaction_date: '2026-10-06', valid_till: '2026-11-05', order_type: 'Sales', items: [r('SHIRT-CTN-M', 240), r('KURTA-LIN-L', 80)] });
    tx('Quotation', 2, { customer: 'Patel Fashion House', transaction_date: '2026-09-22', valid_till: '2026-10-22', order_type: 'Sales', items: [r('DNM-FAB-12', 600)], ordered: true });
    tx('Sales Order', 1, { customer: 'Patel Fashion House', transaction_date: '2026-09-24', delivery_date: '2026-10-08', items: [r('DNM-FAB-12', 600)], delivered: true, billed: true });
    tx('Sales Order', 2, { customer: 'Sharma Garments', transaction_date: '2026-10-12', delivery_date: '2026-10-24', items: [r('COT-FAB-60', 900), r('BTN-PACK-100', 30)] });
    tx('Delivery Note', 1, { customer: 'Patel Fashion House', posting_date: '2026-10-07', set_warehouse: 'Stores - DI', items: [r('DNM-FAB-12', 600)], billed: true });
    tx('Sales Invoice', 1, { customer: 'Patel Fashion House', posting_date: '2026-10-07', due_date: '2026-11-06', items: [r('DNM-FAB-12', 600)], irn: '9c1e47b2a0f3…2d1' });
    tx('Sales Invoice', 2, { customer: 'Kaveri Textiles', posting_date: '2026-09-05', due_date: '2026-10-05', items: [r('SHIRT-CTN-M', 180)], irn: '41ad09ce7b55…1f7' });
    tx('Sales Invoice', 3, { customer: 'Deccan Retail Co.', posting_date: '2026-09-18', due_date: '2026-10-18', items: [r('KURTA-LIN-L', 60)], paid: true, irn: 'e70b3c118a92…9a0' });
    tx('Payment Entry', 1, { payment_type: 'Receive', party_type: 'Customer', party: 'Deccan Retail Co.', posting_date: '2026-10-10', mode_of_payment: 'UPI', paid_amount: 74970, reference_no: 'UTR612730094417' });

    tx('Lead', 1, { lead_name: 'Neha Kulkarni', company_name: 'Kulkarni & Sons', source: 'Trade Show', mobile_no: '+91 99870 22314', state: 'Maharashtra', status: 'Interested' });
    tx('Lead', 2, { lead_name: 'Arjun Reddy', company_name: 'Reddy Exports', source: 'Website', mobile_no: '+91 90004 81726', state: 'Telangana', status: 'Open' });
    tx('Opportunity', 1, { opportunity_from: 'Lead', party: 'Kulkarni & Sons', opportunity_type: 'Sales', sales_stage: 'Proposal/Price Quote', expected_closing: '2026-11-02', probability: 70, items: [r('SHIRT-CTN-M', 800)] });

    tx('Material Request', 1, { material_request_type: 'Purchase', transaction_date: '2026-10-09', schedule_date: '2026-10-20', set_warehouse: 'Stores - DI', items: [r('DYE-RED-25', 30, 680)], ordered: true });
    tx('Purchase Order', 1, { supplier: 'Shree Dyes & Chemicals', transaction_date: '2026-10-10', schedule_date: '2026-10-20', set_warehouse: 'Stores - DI', items: [r('DYE-RED-25', 30, 680)] });
    tx('Purchase Order', 2, { supplier: 'Coimbatore Cotton Co.', transaction_date: '2026-09-15', schedule_date: '2026-09-25', set_warehouse: 'Stores - DI', items: [r('COT-FAB-60', 1500, 205)], received: true, billed: true });
    tx('Purchase Receipt', 1, { supplier: 'Coimbatore Cotton Co.', posting_date: '2026-09-24', set_warehouse: 'Stores - DI', items: [r('COT-FAB-60', 1500, 205)], billed: true, supplier_delivery_note: 'CCC/DC/4319' });
    tx('Purchase Invoice', 1, { supplier: 'Coimbatore Cotton Co.', posting_date: '2026-09-25', bill_no: 'CCC/26-27/1182', due_date: '2026-11-09', items: [r('COT-FAB-60', 1500, 205)] });
    tx('Journal Entry', 1, { voucher_type: 'Bank Entry', posting_date: '2026-10-01', debit_account: 'Salary - DI', credit_account: 'HDFC Bank - DI', amount: 412000, user_remark: 'Salaries for September 2026' });

    tx('Project', 1, { project_name: 'Store Fit-out - Deccan Retail', customer: 'Deccan Retail Co.', expected_start_date: '2026-09-15', expected_end_date: '2026-11-15', estimated_costing: 380000, status: 'Open' });
    tx('Task', 1, { subject: 'Site measurement and survey', project: 'PROJ-0001', priority: 'Medium', expected_time: 8, exp_end_date: '2026-09-20', status: 'Completed' });
    tx('Task', 2, { subject: 'Fixture vendor shortlist', project: 'PROJ-0001', priority: 'High', expected_time: 5, exp_end_date: '2026-10-25', status: 'Working' });
    tx('Timesheet', 1, { employee: 'Vikram Mehta', project: 'PROJ-0001', task: 'TASK-2026-00001', activity_type: 'Site Visit', hours: 8, billing_rate: 1500 });

    tx('Quality Inspection', 1, { inspection_type: 'Incoming', item_code: 'COT-FAB-60', sample_size: 10, reading_gsm: 141, shade: 'Match', inspected_by: 'Priya Nair', status: 'Accepted', from: { dt: 'Purchase Receipt', name: 'MAT-PRE-2026-00001' } });
    tx('Issue', 1, { subject: 'E-invoice IRN not showing on print', customer: 'Kaveri Textiles', priority: 'Medium', issue_type: 'Billing', status: 'Replied', description: 'IRN QR code missing on reprint of last invoice.' });
    tx('Issue', 2, { subject: 'Training for new store staff', customer: 'Deccan Retail Co.', priority: 'Low', issue_type: 'Training', status: 'Open', description: 'Two new cashiers joining on Monday.' });
    tx('Asset', 1, { item_code: 'CNC Lathe Machine', asset_name: 'CNC Lathe Machine - Line 1', asset_category: 'Plant and Machinery', location: 'Factory', custodian: 'Vikram Mehta', purchase_date: '2026-04-12', available_for_use_date: '2026-04-20', gross_purchase_amount: 1450000 });

    /* ---- more sample records so every list shows 2–3 rows ---- */
    tx('Delivery Note', 2, { customer: 'Deccan Retail Co.', posting_date: '2026-10-15', set_warehouse: 'Finished Goods - DI', items: [r('KURTA-LIN-L', 40)], lr_no: '2719 4402 8831' });
    tx('Payment Entry', 2, { payment_type: 'Pay', party_type: 'Supplier', party: 'Coimbatore Cotton Co.', posting_date: '2026-10-12', mode_of_payment: 'Bank Transfer', paid_amount: 150000, reference_no: 'NEFT88214460' });
    tx('Payment Entry', 3, { payment_type: 'Receive', party_type: 'Customer', party: 'Patel Fashion House', posting_date: '2026-10-16', mode_of_payment: 'Cheque', paid_amount: 50000, reference_no: 'CHQ 004512' });
    tx('Lead', 3, { lead_name: 'Kavya Iyer', company_name: 'Iyer Home Stores', source: 'Website', mobile_no: '+91 98450 66120', state: 'Karnataka', status: 'Open' });
    tx('Opportunity', 2, { opportunity_from: 'Customer', party: 'Deccan Retail Co.', opportunity_type: 'Sales', sales_stage: 'Qualification', expected_closing: '2026-11-20', probability: 40, items: [r('SHIRT-CTN-M', 300)] });
    tx('Material Request', 2, { material_request_type: 'Purchase', transaction_date: '2026-10-14', schedule_date: '2026-10-24', set_warehouse: 'Stores - DI', items: [r('POLY-YRN-30', 300, 185), r('BTN-PACK-100', 50, 70)] });
    tx('Purchase Receipt', 2, { supplier: 'Shree Dyes & Chemicals', posting_date: '2026-10-17', set_warehouse: 'Stores - DI', items: [r('DYE-RED-25', 30, 680)], billed: true, supplier_delivery_note: 'SDC/DC/2290' });
    tx('Purchase Invoice', 2, { supplier: 'Shree Dyes & Chemicals', posting_date: '2026-10-17', bill_no: 'SDC/26-27/0951', due_date: '2026-12-01', items: [r('DYE-RED-25', 30, 680)] });
    tx('Journal Entry', 2, { voucher_type: 'Bank Entry', posting_date: '2026-10-05', debit_account: 'Electricity Expense - DI', credit_account: 'HDFC Bank - DI', amount: 38400, user_remark: 'MSEDCL bill for September 2026' });
    tx('Journal Entry', 3, { voucher_type: 'Cash Entry', posting_date: '2026-10-11', debit_account: 'Office Expenses - DI', credit_account: 'Cash - DI', amount: 6250, user_remark: 'Stationery and courier' });
    tx('Stock Entry', 3, { stock_entry_type: 'Material Transfer', posting_date: '2026-10-08', from_warehouse: 'Stores - DI', to_warehouse: 'Work In Progress - DI', items: [r('COT-FAB-60', 400, 205)] });

    var b1 = { item: 'SHIRT-CTN-M', quantity: 1, is_default: 1, items: [r('COT-FAB-60', 1.6, 205), r('BTN-PACK-100', 0.08, 70)] }; S.fix(b1); b1.name = 'BOM-' + b1.item + '-001'; put('BOM', b1);
    var b2 = { item: 'KURTA-LIN-L', quantity: 1, is_default: 1, items: [r('COT-FAB-60', 2.4, 205), r('DYE-RED-25', 0.05, 680)] }; S.fix(b2); b2.name = 'BOM-' + b2.item + '-001'; put('BOM', b2);
    function woItems(b, q) { return b.items.map(function (x) { return { item_code: x.item_code, qty: Math.round(x.qty * q * 100) / 100, rate: x.rate }; }); }
    tx('Work Order', 1, { production_item: b1.item, bom_no: b1.name, qty: 100, planned_start_date: '2026-10-03', wip_warehouse: 'Work In Progress - DI', fg_warehouse: 'Finished Goods - DI', items: woItems(b1, 100), jc: true, manufactured: true });
    tx('Work Order', 2, { production_item: b2.item, bom_no: b2.name, qty: 40, planned_start_date: '2026-10-16', wip_warehouse: 'Work In Progress - DI', fg_warehouse: 'Finished Goods - DI', items: woItems(b2, 40), jc: true });
    tx('Job Card', 1, { work_order: 'MFG-WO-2026-00001', operation: 'Cutting', workstation: 'Cutting Table 1', employee: 'Vikram Mehta', for_quantity: 100, time_in_mins: 240, total_completed_qty: 100 });
    tx('Job Card', 2, { work_order: 'MFG-WO-2026-00001', operation: 'Stitching', workstation: 'Juki Line A', employee: 'Ananya Rao', for_quantity: 100, time_in_mins: 480, total_completed_qty: 100 });
    tx('Job Card', 3, { work_order: 'MFG-WO-2026-00002', operation: 'Cutting', workstation: 'Cutting Table 1', employee: 'Vikram Mehta', for_quantity: 40, time_in_mins: 120, total_completed_qty: 40 });
    var fgRate = (itemDoc(S, b1.item) || { standard_rate: 0 }).standard_rate;
    tx('Stock Entry', 4, { stock_entry_type: 'Manufacture', posting_date: '2026-10-06', to_warehouse: 'Finished Goods - DI', work_order: 'MFG-WO-2026-00001', items: woItems(b1, 100).concat([{ item_code: b1.item, qty: 100, rate: Math.round(fgRate * 0.62), fg: 1 }]) });

    tx('Project', 2, { project_name: 'Catalogue Shoot - Kaveri Textiles', customer: 'Kaveri Textiles', expected_start_date: '2026-10-05', expected_end_date: '2026-10-30', estimated_costing: 120000, status: 'Open' });
    tx('Task', 3, { subject: 'Shortlist photographers', project: 'PROJ-0002', priority: 'Medium', expected_time: 4, exp_end_date: '2026-10-12', status: 'Completed' });
    tx('Timesheet', 2, { employee: 'Ananya Rao', project: 'PROJ-0002', task: 'TASK-2026-00003', activity_type: 'Planning', hours: 6, billing_rate: 1500 });

    tx('Quality Inspection', 2, { inspection_type: 'Incoming', item_code: 'POLY-YRN-30', sample_size: 8, reading_gsm: 128, shade: 'Minor variation', inspected_by: 'Priya Nair', status: 'Rejected', nc: true });
    tx('Non Conformance', 1, { subject: 'Yarn denier out of tolerance', procedure: 'Incoming Material Inspection', process_owner: 'Vikram Mehta', details: 'Sample of 8 cones read below spec. Batch held at gate.', status: 'Open', from: { dt: 'Quality Inspection', name: 'MAT-QA-2026-00002' } });
    tx('Non Conformance', 2, { subject: 'Loose stitching on shirt cuffs', procedure: 'In-line Stitching Check', process_owner: 'Ananya Rao', details: '12 of 200 shirts failed the pull test.', status: 'Resolved' });
    tx('Quality Action', 1, { corrective_preventive: 'Corrective', assigned_to: 'Vikram Mehta', description: 'Return the batch and raise a debit note to the supplier.', status: 'Open', from: { dt: 'Non Conformance', name: 'QA-NC-2026-00001' } });
    tx('Quality Action', 2, { corrective_preventive: 'Preventive', assigned_to: 'Ananya Rao', description: 'Add a cuff pull test to the hourly line audit.', status: 'Completed', from: { dt: 'Non Conformance', name: 'QA-NC-2026-00002' } });

    tx('Issue', 3, { subject: 'Machine stopped mid-batch', customer: 'Patel Fashion House', priority: 'High', issue_type: 'Machine Breakdown', status: 'Resolved', description: 'Blade motor tripping after 10 minutes.', resolved: true });
    tx('Maintenance Visit', 1, { customer: 'Patel Fashion House', mntc_date: '2026-10-09', maintenance_type: 'Breakdown', service_person: 'Farhan Shaikh', completion_status: 'Fully Completed', work_done: 'Replaced worn drive belt and recalibrated the blade guard.', from: { dt: 'Issue', name: 'ISS-2026-00003' } });
    tx('Maintenance Visit', 2, { customer: 'Sharma Garments', mntc_date: '2026-10-14', maintenance_type: 'Scheduled', service_person: 'Farhan Shaikh', completion_status: 'Fully Completed', work_done: 'Quarterly service of cutting machines.' });

    tx('Asset', 2, { item_code: 'Delivery Van - Tata Ace', asset_name: 'Delivery Van - MH 04 KL 2291', asset_category: 'Vehicles', location: 'Warehouse', custodian: 'Farhan Shaikh', purchase_date: '2026-05-08', available_for_use_date: '2026-05-10', gross_purchase_amount: 685000 });
    tx('Asset', 3, { item_code: 'Office Furniture Set', asset_name: 'Workstations - Accounts Bay', asset_category: 'Furniture', location: 'Head Office', custodian: '', purchase_date: '2026-06-02', available_for_use_date: '2026-06-02', gross_purchase_amount: 142000 });
    tx('Asset Movement', 1, { purpose: 'Transfer', transaction_date: '2026-06-15', asset: 'ACC-ASS-2026-00002', source_location: 'Head Office', target_location: 'Warehouse', to_employee: 'Farhan Shaikh' });
    tx('Asset Movement', 2, { purpose: 'Issue', transaction_date: '2026-07-01', asset: 'ACC-ASS-2026-00001', source_location: 'Warehouse', target_location: 'Factory', to_employee: 'Vikram Mehta' });

    tx('POS Opening Entry', 1, { pos_profile: 'Andheri Store', user: 'Priya Nair', period_start_date: '2026-10-17', opening_amount: 5000, closed: true });
    tx('POS Opening Entry', 2, { pos_profile: 'Surat Outlet', user: 'Ananya Rao', period_start_date: '2026-10-18', opening_amount: 3000, closed: true });
    tx('POS Invoice', 1, { customer: 'Walk In Customer', posting_date: '2026-10-17', pos_profile: 'Andheri Store', mode_of_payment: 'UPI', session: 'POS-OPE-2026-00001', items: [r('SHIRT-CTN-M', 2)] });
    tx('POS Invoice', 2, { customer: 'Walk In Customer', posting_date: '2026-10-17', pos_profile: 'Andheri Store', mode_of_payment: 'Cash', session: 'POS-OPE-2026-00001', items: [r('KURTA-LIN-L', 1)] });
    tx('POS Invoice', 3, { customer: 'Walk In Customer', posting_date: '2026-10-18', pos_profile: 'Surat Outlet', mode_of_payment: 'Card', session: 'POS-OPE-2026-00002', items: [r('SHIRT-CTN-M', 1), r('KURTA-LIN-L', 1)] });
    tx('POS Closing Entry', 1, { pos_profile: 'Andheri Store', total_invoices: 2, session_total: 2614, by_mode: 'UPI ₹ 1,365.00 · Cash ₹ 1,250.00', closing_amount: 6250, from: { dt: 'POS Opening Entry', name: 'POS-OPE-2026-00001' } });
    tx('POS Closing Entry', 2, { pos_profile: 'Surat Outlet', total_invoices: 1, session_total: 1932, by_mode: 'Card ₹ 1,932.00', closing_amount: 3000, from: { dt: 'POS Opening Entry', name: 'POS-OPE-2026-00002' } });

    return S;
  }

  global.ERPData = {
    TODAY: TODAY, COMPANY: COMPANY, COMPANY_STATE: COMPANY_STATE, MODES: MODES, SECTORS: SECTORS, SECTOR_KEYS: SECTOR_KEYS, STATES: STATES, abbrOf: abbrOf,
    DT: DT, MODULES: MODULES, seed: seed, row: row, bomRows: bomRows, latestUser: latestUser, itemDoc: itemDoc, addDays: addDays
  };
})(window);

/* Generated by gen_real.py from a real ERPNext v16 site: list columns, filters, sidebars, settings and report layouts. */
(function () { window.ERPReal = {"lists":{"Customer":{"c":[["customer_name","Customer Name","","Data"],["status_field","Status","",""],["customer_type","Customer Type","","Select:Company|Individual|Partnership"],["customer_group","Customer Group","","Link:Customer Group"],["territory","Territory","","Link:Territory"],["default_currency","Billing Currency","","Link:Currency"],["name","ID","","Data"]],"f":[["name","Data","ID"],["customer_name","Data","Customer Name"],["customer_group","Link","Customer Group"],["territory","Link","Territory"]],"s":"Created On"},"Supplier":{"c":[["supplier_name","Supplier Name","","Data"],["status_field","Status","",""],["supplier_type","Supplier Type","","Select:Company|Individual|Partnership"],["supplier_group","Supplier Group","","Link:Supplier Group"],["default_currency","Billing Currency","","Link:Currency"],["name","ID","","Data"]],"f":[["name","Data","ID"],["supplier_name","Data","Supplier Name"],["supplier_group","Link","Supplier Group"]],"s":"Created On"},"Item":{"c":[["item_name","Item Name","","Data"],["status_field","Status","",""],["item_group","Item Group","","Link:Item Group"],["stock_uom","UOM","","Link:UOM"],["is_fixed_asset","Item Type","","Check"],["is_sales_item","Purpose","","Check"],["name","ID","","Data"]],"f":[["name","Data","ID"],["item_name","Data","Item Name"],["item_group","Link","Item Group"],["variant_of","Link","Variant Of"],["has_variants","Check","Has Variants"]],"s":"Created On"},"Quotation":{"c":[["customer_name","Customer Name","","Data"],["status_field","Status","",""],["transaction_date","Date","","Date"],["company","Company","","Link:Company"],["grand_total","Grand Total","r","Currency"],["name","ID","","Data"]],"f":[["name","Data","ID"],["quotation_to","Link","Quotation To"],["party_name","Dynamic Link","Party"],["customer_name","Data","Customer Name"],["transaction_date","Date","Date"],["order_type","Select","Order Type"]],"s":"Created On"},"Sales Order":{"c":[["customer_name","Customer Name","","Data"],["status_field","Status","",""],["delivery_date","Delivery Date","","Date"],["grand_total","Grand Total","r","Currency"],["per_delivered","%  Delivered","r","Percent"],["per_billed","% Amount Billed","r","Percent"],["name","ID","","Data"]],"f":[["name","Data","ID"],["company","Link","Company"],["customer","Link","Customer"],["customer_name","Data","Customer Name"],["transaction_date","Date","Date"],["delivery_status","Select","Delivery Status"],["billing_status","Select","Billing Status"],["advance_payment_status","Select","Advance Payment Status"]],"s":"Created On"},"Delivery Note":{"c":[["customer_name","Customer Name","","Data"],["status_field","Status","",""],["posting_date","Date","","Date"],["grand_total","Grand Total","r","Currency"],["per_billed","% Amount Billed","r","Percent"],["per_returned","% Returned","r","Percent"],["name","ID","","Data"]],"f":[["name","Data","ID"],["customer","Link","Customer"],["customer_name","Data","Customer Name"],["company","Link","Company"],["set_target_warehouse","Link","Set Target Warehouse"],["status","Select","Status"]],"s":"Created On"},"Sales Invoice":{"c":[["customer_name","Customer Name","","Small Text"],["status_field","Status","",""],["posting_date","Posting Date","","Date"],["due_date","Payment Due Date","","Date"],["grand_total","Grand Total","r","Currency"],["name","ID","","Data"]],"f":[["name","Data","ID"],["company","Link","Company"],["customer","Link","Customer"],["customer_name","Data","Customer Name"],["posting_date","Date","Posting Date"],["status","Select","Status"]],"s":"Created On"},"Payment Entry":{"c":[["title","Title","","Data"],["status_field","Status","",""],["payment_type","Payment Type","","Select:Receive|Pay|Internal Transfer"],["posting_date","Posting Date","","Date"],["paid_from","Account Paid From","","Link:Account"],["paid_to","Account Paid To","","Link:Account"],["name","ID","","Data"]],"f":[["name","Data","ID"],["payment_type","Select","Payment Type"],["posting_date","Date","Posting Date"],["party_type","Link","Party Type"],["party","Dynamic Link","Party"],["reference_no","Data","Cheque/Reference No"],["title","Data","Title"]],"s":"Created On"},"Lead":{"c":[["title","Title","","Data"],["status_field","Status","",""],["job_title","Job Title","","Data"],["company_name","Organization Name","","Data"],["territory","Territory","","Link:Territory"],["name","ID","","Data"]],"f":[["name","Data","ID"],["job_title","Data","Job Title"],["status","Select","Status"],["company_name","Data","Organization Name"],["territory","Link","Territory"],["title","Data","Title"]],"s":"Created On"},"Opportunity":{"c":[["title","Title","","Data"],["status_field","Status","",""],["naming_series","Series","","Select:CRM-OPP-.YYYY.-"],["opportunity_from","Opportunity From","","Link:DocType"],["opportunity_type","Opportunity Type","","Link:Opportunity Type"],["name","ID","","Data"]],"f":[["name","Data","ID"],["opportunity_from","Link","Opportunity From"],["party_name","Dynamic Link","Party"],["status","Select","Status"],["title","Data","Title"]],"s":"Created On"},"Material Request":{"c":[["title","Title","","Data"],["status_field","Status","",""],["material_request_type","Purpose","","Select:Purchase|Material Transfer|Material Issue|Manufacture|Subcontracting|Customer Provided"],["transaction_date","Transaction Date","","Date"],["schedule_date","Required By","","Date"],["name","ID","","Data"]],"f":[["name","Data","ID"],["title","Data","Title"],["material_request_type","Select","Purpose"],["company","Link","Company"],["status","Select","Status"]],"s":"Created On"},"Purchase Order":{"c":[["supplier_name","Supplier Name","","Data"],["status_field","Status","",""],["transaction_date","Date","","Date"],["schedule_date","Required By","","Date"],["grand_total","Grand Total","r","Currency"],["per_billed","% Billed","r","Percent"],["per_received","% Received","r","Percent"],["name","ID","","Data"]],"f":[["name","Data","ID"],["supplier","Link","Supplier"],["supplier_name","Data","Supplier Name"],["company","Link","Company"],["status","Select","Status"],["advance_payment_status","Select","Advance Payment Status"]],"s":"Created On"},"Purchase Receipt":{"c":[["supplier_name","Supplier Name","","Data"],["status_field","Status","",""],["posting_date","Date","","Date"],["grand_total","Grand Total","r","Currency"],["per_billed","% Amount Billed","r","Percent"],["per_returned","% Returned","r","Percent"],["name","ID","","Data"]],"f":[["name","Data","ID"],["supplier_name","Data","Supplier Name"],["company","Link","Company"],["status","Select","Status"]],"s":"Created On"},"Purchase Invoice":{"c":[["supplier_name","Supplier Name","","Data"],["status_field","Status","",""],["posting_date","Posting Date","","Date"],["due_date","Due Date","","Date"],["bill_no","Supplier Invoice No","","Data"],["grand_total","Grand Total","r","Currency"],["name","ID","","Data"]],"f":[["name","Data","ID"],["supplier","Link","Supplier"],["supplier_name","Data","Supplier Name"],["company","Link","Company"],["posting_date","Date","Posting Date"],["bill_no","Data","Supplier Invoice No"],["status","Select","Status"]],"s":"Created On"},"Journal Entry":{"c":[["title","Title","","Data"],["status_field","Status","",""],["company","Company","","Link:Company"],["total_debit","Total Debit","r","Currency"],["name","ID","","Data"]],"f":[["name","Data","ID"],["company","Link","Company"],["voucher_type","Select","Entry Type"],["title","Data","Title"]],"s":"Created On"},"Stock Entry":{"c":[["stock_entry_type","Stock Entry Type","","Link:Stock Entry Type"],["status_field","Status","",""],["purpose","Purpose","","Select:Material Issue|Material Receipt|Material Transfer|Material Transfer for Manufacture|Material Consumption for Manufacture|Manufacture|Repack|Send to Subcontractor"],["from_warehouse","Default Source Warehouse","","Link:Warehouse"],["to_warehouse","Default Target Warehouse","","Link:Warehouse"],["per_transferred","Per Transferred","r","Percent"],["is_return","Is Return","","Check"],["name","ID","","Data"]],"f":[["name","Data","ID"],["stock_entry_type","Link","Stock Entry Type"],["from_warehouse","Link","Default Source Warehouse"],["to_warehouse","Link","Default Target Warehouse"]],"s":"Created On"},"BOM":{"c":[["name","ID","","Data"],["status_field","Status","",""],["item","Item to Manufacture","","Link:Item"],["is_active","Is Active","","Check"],["is_default","Is Default","","Check"],["total_cost","Total Cost","r","Currency"],["has_variants","Has Variants","","Check"]],"f":[["name","Data","ID"],["item","Link","Item to Manufacture"]],"s":"Created On"},"Work Order":{"c":[["production_item","Item To Manufacture","","Link:Item"],["status_field","Status","",""],["bom_no","BOM No","","Link:BOM"],["qty","Qty To Manufacture","r","Float"],["name","ID","","Data"]],"f":[["name","Data","ID"],["production_item","Link","Item To Manufacture"]],"s":"Created On"},"Job Card":{"c":[["operation","Operation","","Link:Operation"],["status_field","Status","",""],["work_order","Work Order","","Link:Work Order"],["for_quantity","Qty to Manufacture","r","Float"],["workstation","Workstation","","Link:Workstation"],["name","ID","","Data"]],"f":[["name","Data","ID"],["work_order","Link","Work Order"],["operation","Link","Operation"]],"s":"Created On"},"Project":{"c":[["project_name","Project Name","","Data"],["customer","Customer","","Link:Customer"],["percent_complete","% Completed","r","Percent"],["expected_end_date","Expected End Date","","Date"],["priority","Priority","","Select:Medium|Low|High"],["name","ID","","Data"]],"f":[["name","Data","ID"],["project_name","Data","Project Name"],["status","Select","Status"],["project_type","Link","Project Type"],["priority","Select","Priority"]],"s":"Expected End Date"},"Task":{"c":[["subject","Subject","","Data"],["status_field","Status","",""],["project","Project","","Link:Project"],["is_group","Is Group","","Check"],["priority","Priority","","Select:Low|Medium|High|Urgent"],["is_milestone","Is Milestone","","Check"],["name","ID","","Data"]],"f":[["name","Data","ID"],["subject","Data","Subject"],["project","Link","Project"],["status","Select","Status"],["priority","Select","Priority"]],"s":"Created On"},"Timesheet":{"c":[["employee_name","Employee Name","","Data"],["status_field","Status","",""],["start_date","Start Date","","Date"],["per_billed","% Amount Billed","r","Percent"],["name","ID","","Data"]],"f":[["name","Data","ID"],["status","Select","Status"],["employee","Link","Employee"],["employee_name","Data","Employee Name"]],"s":"Created On"},"Quality Inspection":{"c":[["name","ID","","Data"],["status_field","Status","",""],["report_date","Report Date","","Date"],["inspection_type","Inspection Type","","Select:Incoming|Outgoing|In Process"],["reference_name","Reference Name","","Dynamic Link"],["item_code","Item Code","","Link:Item"]],"f":[["name","Data","ID"],["inspection_type","Select","Inspection Type"],["reference_name","Dynamic Link","Reference Name"],["item_code","Link","Item Code"]],"s":"Created On"},"Non Conformance":{"c":[["name","ID","","Data"],["subject","Subject","","Data"],["procedure","Procedure","","Link:Quality Procedure"],["status","Status","","Select:Open|Resolved|Cancelled"]],"f":[["name","Data","ID"]],"s":"Created On"},"Quality Action":{"c":[["name","ID","","Data"],["corrective_preventive","Corrective/Preventive","","Select:Corrective|Preventive"],["review","Review","","Link:Quality Review"],["status","Status","","Select:Open|Completed"],["date","Date","","Date"],["goal","Goal","","Link:Quality Goal"]],"f":[["name","Data","ID"],["status","Select","Status"],["goal","Link","Goal"]],"s":"Created On"},"Issue":{"c":[["subject","Subject","","Data"],["customer","Customer","","Link:Customer"],["priority","Priority","","Link:Issue Priority"],["issue_type","Issue Type","","Link:Issue Type"],["opening_date","Opening Date","","Date"],["name","ID","","Data"]],"f":[["name","Data","ID"],["subject","Data","Subject"],["status","Select","Status"],["priority","Link","Priority"]],"s":"Opening Date"},"Maintenance Visit":{"c":[["customer_name","Customer Name","","Data"],["status_field","Status","",""],["completion_status","Completion Status","","Select:Partially Completed|Fully Completed"],["maintenance_type","Maintenance Type","","Select:Scheduled|Unscheduled|Breakdown"],["name","ID","","Data"]],"f":[["name","Data","ID"],["customer_name","Data","Customer Name"],["completion_status","Select","Completion Status"],["maintenance_type","Select","Maintenance Type"]],"s":"Created On"},"Asset":{"c":[["asset_name","Asset Name","","Data"],["status_field","Status","",""],["location","Location","","Link:Location"],["company","Company","","Link:Company"],["asset_category","Asset Category","","Link:Asset Category"],["name","ID","","Data"]],"f":[["name","Data","ID"],["item_code","Link","Item Code"],["asset_name","Data","Asset Name"],["company","Link","Company"],["asset_category","Link","Asset Category"],["status","Select","Status"]],"s":"Last Updated On"},"Asset Movement":{"c":[["name","ID","","Data"],["status_field","Status","",""],["company","Company","","Link:Company"],["purpose","Purpose","","Select:Issue|Receipt|Transfer|Transfer and Issue"],["transaction_date","Transaction Date","","Datetime"]],"f":[["name","Data","ID"],["company","Link","Company"]],"s":"Created On"},"POS Opening Entry":{"c":[["name","ID","","Data"],["status_field","Status","",""],["period_start_date","Period Start Date","","Datetime"],["period_end_date","Period End Date","","Date"],["posting_date","Posting Date","","Date"],["pos_profile","POS Profile","","Link:POS Profile"]],"f":[["name","Data","ID"]],"s":"Created On"},"POS Invoice":{"c":[["customer_name","Customer Name","","Data"],["status_field","Status","",""],["grand_total","Grand Total","r","Currency"],["name","ID","","Data"]],"f":[["name","Data","ID"],["customer","Link","Customer"],["customer_name","Data","Customer Name"],["company","Link","Company"],["status","Select","Status"]],"s":"Created On"},"POS Closing Entry":{"c":[["name","ID","","Data"],["status_field","Status","",""],["period_start_date","Period Start Date","","Datetime"],["period_end_date","Period End Date","","Datetime"],["posting_date","Posting Date","","Date"],["pos_profile","POS Profile","","Link:POS Profile"]],"f":[["name","Data","ID"]],"s":"Created On"},"Company":{"c":[["name","ID","","Data"],["default_currency","Default Currency","","Link:Currency"],["country","Country","","Link:Country"],["is_group","Is Group","","Check"],["enable_perpetual_inventory","Enable Perpetual Inventory","","Check"]],"f":[["name","Data","ID"]],"s":"Created On"},"User":{"c":[["full_name","Full Name","","Data"],["status_field","Status","",""],["user_type","User Type","","Link:User Type"],["name","ID","","Data"]],"f":[["name","Data","ID"],["full_name","Data","Full Name"],["username","Data","Username"],["user_type","Link","User Type"]],"s":"Created On"},"Branch":{"c":[["name","ID","","Data"],["branch","Branch","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"Designation":{"c":[["name","ID","","Data"],["designation_name","Designation","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"Role":{"c":[["name","ID","","Data"],["status_field","Status","",""],["is_custom","Is Custom","","Check"],["desk_access","Desk Access","","Check"]],"f":[["name","Data","ID"]],"s":"Created On"},"Role Profile":{"c":[["role_profile","Role Name","","Data"],["name","ID","","Data"]],"f":[["name","Data","ID"],["role_profile","Data","Role Name"]],"s":"Created On"},"User Permission":{"c":[["user","User","","Link:User"],["allow","Allow","","Link:DocType"],["for_value","For Value","","Dynamic Link"],["applicable_for","Applicable For","","Link:DocType"],["name","ID","","Data"]],"f":[["name","Data","ID"],["user","Link","User"],["allow","Link","Allow"],["for_value","Dynamic Link","For Value"]],"s":"Created On"},"Print Format":{"c":[["name","ID","","Data"],["status_field","Status","",""],["doc_type","DocType","","Link:DocType"],["report","Report","","Link:Report"]],"f":[["name","Data","ID"],["doc_type","Link","DocType"],["report","Link","Report"]],"s":"Created On"},"Letter Head":{"c":[["name","ID","","Data"],["status_field","Status","",""],["letter_head_name","Letter Head Name","","Data"],["disabled","Disabled","","Check"],["is_default","Default Letter Head","","Check"]],"f":[["name","Data","ID"]],"s":"Created On"},"Email Account":{"c":[["name","ID","","Data"],["status_field","Status","",""],["email_id","Email Address","","Data"],["domain","Domain","","Link:Email Domain"]],"f":[["name","Data","ID"],["domain","Link","Domain"],["append_to","Link","Append To"]],"s":"Created On"},"Email Template":{"c":[["name","ID","","Data"],["subject","Subject","","Data"],["response","Response","","Text Editor"]],"f":[["name","Data","ID"]],"s":"Created On"},"Notification":{"c":[["subject","Subject","","Data"],["status_field","Status","",""],["event","Send Alert On","","Select:New|Save|Submit|Cancel|Days After|Days Before|Minutes After|Minutes Before"],["document_type","Document Type","","Link:DocType"],["condition","Condition","","Code"],["name","ID","","Data"]],"f":[["name","Data","ID"],["module","Link","Module"],["subject","Data","Subject"],["document_type","Link","Document Type"]],"s":"Created On"},"Data Import":{"c":[["name","ID","","Data"],["status_field","Status","",""],["reference_doctype","Document Type","","Link:DocType"],["import_type","Import Type","","Select:Insert New Records|Update Existing Records|Insert or Update Records"],["import_file","Import File","","Attach"]],"f":[["name","Data","ID"]],"s":"Created On"},"Webhook":{"c":[["name","ID","","Data"],["status_field","Status","",""],["webhook_doctype","DocType","","Link:DocType"],["webhook_docevent","Doc Event","","Select:after_insert|on_update|on_submit|on_cancel|on_trash|on_update_after_submit|on_change|workflow_transition"],["request_url","Request URL","","Small Text"]],"f":[["name","Data","ID"]],"s":"Created On"},"Social Login Key":{"c":[["provider_name","Provider Name","","Data"],["name","ID","","Data"]],"f":[["name","Data","ID"],["provider_name","Data","Provider Name"]],"s":"Created On"},"Bank Account":{"c":[["name","ID","","Data"],["status_field","Status","",""],["account_name","Account Name","","Data"],["account","Company Account","","Link:Account"],["company","Company","","Link:Company"],["iban","IBAN","","Data"],["bank_account_no","Bank Account No","","Data"]],"f":[["name","Data","ID"],["account_name","Data","Account Name"],["company","Link","Company"]],"s":"Created On"},"Bank":{"c":[["name","ID","","Data"],["swift_number","SWIFT number","","Data"]],"f":[["name","Data","ID"],["swift_number","Data","SWIFT number"]],"s":"Created On"},"Sales Taxes and Charges Template":{"c":[["title","Title","","Data"],["status_field","Status","",""],["is_default","Default","","Check"],["company","Company","","Link:Company"],["name","ID","","Data"]],"f":[["name","Data","ID"],["title","Data","Title"],["company","Link","Company"]],"s":"Created On"},"Purchase Taxes and Charges Template":{"c":[["title","Title","","Data"],["status_field","Status","",""],["is_default","Default","","Check"],["disabled","Disabled","","Check"],["company","Company","","Link:Company"],["name","ID","","Data"]],"f":[["name","Data","ID"],["title","Data","Title"],["company","Link","Company"]],"s":"Created On"},"Item Tax Template":{"c":[["title","Title","","Data"],["status_field","Status","",""],["company","Company","","Link:Company"],["name","ID","","Data"]],"f":[["name","Data","ID"],["title","Data","Title"]],"s":"Created On"},"Tax Category":{"c":[["name","ID","","Data"],["status_field","Status","",""],["title","Title","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"Budget":{"c":[["name","ID","","Data"],["status_field","Status","",""],["budget_against","Budget Against","","Select:Cost Center|Project"],["company","Company","","Link:Company"],["account","Account","","Link:Account"]],"f":[["name","Data","ID"],["budget_against","Select","Budget Against"],["company","Link","Company"],["cost_center","Link","Cost Center"],["project","Link","Project"]],"s":"Created On"},"Accounting Dimension":{"c":[["name","ID","","Data"],["status_field","Status","",""],["label","Dimension Name","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"Fiscal Year":{"c":[["name","ID","","Data"],["status_field","Status","",""],["year","Year Name","","Data"],["year_start_date","Year Start Date","","Date"],["year_end_date","Year End Date","","Date"]],"f":[["name","Data","ID"]],"s":"ID"},"Mode of Payment":{"c":[["name","ID","","Data"],["status_field","Status","",""],["mode_of_payment","Mode of Payment","","Data"]],"f":[["name","Data","ID"],["type","Select","Type"]],"s":"Created On"},"Payment Terms Template":{"c":[["name","ID","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"Item Price":{"c":[["item_name","Item Name","","Data"],["item_code","Item Code","","Link:Item"],["brand","Brand","","Link:Brand"],["price_list","Price List","","Link:Price List"],["price_list_rate","Rate","r","Currency"],["reference","Reference","","Data"]],"f":[["name","Data","ID"],["item_code","Link","Item Code"],["item_name","Data","Item Name"],["price_list","Link","Price List"],["reference","Data","Reference"]],"s":"Created On"},"Price List":{"c":[["name","ID","","Data"],["status_field","Status","",""],["currency","Currency","","Link:Currency"],["buying","Buying","","Check"],["selling","Selling","","Check"]],"f":[["name","Data","ID"],["currency","Link","Currency"]],"s":"Created On"},"Pricing Rule":{"c":[["title","Title","","Data"],["apply_on","Apply On","","Select:Item Code|Item Group|Brand|Transaction"],["name","ID","","Data"]],"f":[["name","Data","ID"],["title","Data","Title"],["apply_on","Select","Apply On"]],"s":"Created On"},"POS Profile":{"c":[["name","ID","","Data"],["status_field","Status","",""],["company","Company","","Link:Company"]],"f":[["name","Data","ID"]],"s":"Created On"},"Sales Person":{"c":[["name","ID","","Data"],["status_field","Status","",""],["sales_person_name","Sales Person Name","","Data"],["parent_sales_person","Parent Sales Person","","Link:Sales Person"],["is_group","Is Group","","Check"]],"f":[["name","Data","ID"]],"s":"Created On"},"Terms and Conditions":{"c":[["name","ID","","Data"],["status_field","Status","",""],["selling","Selling","","Check"],["buying","Buying","","Check"]],"f":[["name","Data","ID"]],"s":"Created On"},"Request for Quotation":{"c":[["company","Company","","Link:Company"],["status_field","Status","",""],["vendor","Supplier","","Link:Supplier"],["transaction_date","Date","","Date"],["schedule_date","Required Date","","Date"],["name","ID","","Data"]],"f":[["name","Data","ID"],["company","Link","Company"],["vendor","Link","Supplier"],["transaction_date","Date","Date"],["status","Select","Status"]],"s":"Created On"},"Supplier Quotation":{"c":[["supplier_name","Supplier Name","","Data"],["status_field","Status","",""],["transaction_date","Date","","Date"],["valid_till","Valid Till","","Date"],["grand_total","Grand Total","r","Currency"],["name","ID","","Data"]],"f":[["name","Data","ID"],["supplier","Link","Supplier"],["supplier_name","Data","Supplier Name"],["company","Link","Company"]],"s":"Created On"},"Supplier Scorecard":{"c":[["name","ID","","Data"],["status_field","Status","",""],["period","Evaluation Period","","Select:Per Week|Per Month|Per Year"]],"f":[["name","Data","ID"]],"s":"Created On"},"Stock Reconciliation":{"c":[["name","ID","","Data"],["status_field","Status","",""],["posting_date","Posting Date","","Date"],["posting_time","Posting Time","","Time"]],"f":[["name","Data","ID"],["expense_account","Link","Difference Account"],["cost_center","Link","Cost Center"]],"s":"Created On"},"Pick List":{"c":[["name","ID","","Data"],["status_field","Status","",""],["company","Company","","Link:Company"],["customer","Customer","","Link:Customer"]],"f":[["name","Data","ID"],["delivery_status","Select","Delivery Status"],["status","Select","Status"]],"s":"Last Updated On"},"UOM":{"c":[["name","ID","","Data"],["status_field","Status","",""],["uom_name","UOM Name","","Data"],["category","Category","","Link:UOM Category"]],"f":[["name","Data","ID"],["category","Link","Category"]],"s":"Created On"},"Batch":{"c":[["batch_id","Batch ID","","Data"],["status_field","Status","",""],["item_name","Item Name","","Data"],["batch_qty","Batch Quantity","r","Float"],["name","ID","","Data"]],"f":[["name","Data","ID"],["batch_id","Data","Batch ID"],["item","Link","Item"]],"s":"Created On"},"Serial No":{"c":[["name","ID","","Data"],["item_code","Item Code","","Link:Item"],["warehouse","Warehouse","","Link:Warehouse"],["status","Status","","Select:Active|Inactive|Consumed|Delivered|Expired"],["company","Company","","Link:Company"]],"f":[["name","Data","ID"],["item_code","Link","Item Code"],["status","Select","Status"],["company","Link","Company"]],"s":"Created On"},"Production Plan":{"c":[["name","ID","","Data"],["status_field","Status","",""],["company","Company","","Link:Company"],["get_items_from","Get Items From","","Select:Sales Order|Material Request"],["posting_date","Posting Date","","Date"],["item_code","Item Code","","Link:Item"],["customer","Customer","","Link:Customer"]],"f":[["name","Data","ID"]],"s":"Created On"},"Subcontracting Order":{"c":[["supplier_name","Job Worker Name","","Data"],["status_field","Status","",""],["transaction_date","Date","","Date"],["per_received","% Received","r","Percent"],["name","ID","","Data"]],"f":[["name","Data","ID"],["supplier","Link","Job Worker"],["supplier_name","Data","Job Worker Name"],["company","Link","Company"],["status","Select","Status"]],"s":"Created On"},"Subcontracting Receipt":{"c":[["supplier_name","Job Worker Name","","Data"],["status_field","Status","",""],["posting_date","Date","","Date"],["per_returned","% Returned","r","Percent"],["name","ID","","Data"]],"f":[["name","Data","ID"],["supplier_name","Data","Job Worker Name"],["company","Link","Company"],["status","Select","Status"]],"s":"Created On"},"Subcontracting BOM":{"c":[["name","ID","","Data"],["is_active","Is Active","","Check"],["finished_good","Finished Good","","Link:Item"],["finished_good_bom","Finished Good BOM","","Link:BOM"],["service_item","Service Item","","Link:Item"]],"f":[["name","Data","ID"],["finished_good","Link","Finished Good"],["finished_good_bom","Link","Finished Good BOM"],["service_item","Link","Service Item"],["is_active","Check","Is Active"]],"s":"Created On"},"Workstation":{"c":[["name","ID","","Data"],["status_field","Status","",""],["workstation_name","Workstation Name","","Data"],["description","Description","","Text"]],"f":[["name","Data","ID"]],"s":"Created On"},"Operation":{"c":[["name","ID","","Data"],["workstation","Default Workstation","","Link:Workstation"]],"f":[["name","Data","ID"],["workstation","Link","Default Workstation"]],"s":"Created On"},"Routing":{"c":[["name","ID","","Data"],["status_field","Status","",""]],"f":[["name","Data","ID"]],"s":"Created On"},"Plant Floor":{"c":[["name","ID","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"Project Template":{"c":[["name","ID","","Data"],["status_field","Status","",""],["project_type","Project Type","","Link:Project Type"]],"f":[["name","Data","ID"]],"s":"Created On"},"Activity Type":{"c":[["name","ID","","Data"],["status_field","Status","",""],["activity_type","Activity Type","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"Activity Cost":{"c":[["title","title","","Data"],["activity_type","Activity Type","","Link:Activity Type"],["name","ID","","Data"]],"f":[["name","Data","ID"],["activity_type","Link","Activity Type"],["employee","Link","Employee"],["title","Data","title"]],"s":"Created On"},"Project Type":{"c":[["name","ID","","Data"],["project_type","Project Type","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"Asset Maintenance":{"c":[["name","ID","","Data"],["asset_name","Asset Name","","Link:Asset"],["maintenance_team","Maintenance Team","","Link:Asset Maintenance Team"]],"f":[["name","Data","ID"]],"s":"Created On"},"Asset Repair":{"c":[["asset_name","Asset Name","","Read Only"],["status_field","Status","",""],["asset","Asset","","Link:Asset"],["downtime","Downtime","","Data"],["name","ID","","Data"]],"f":[["name","Data","ID"],["asset_name","Data","Asset Name"]],"s":"Created On"},"Asset Value Adjustment":{"c":[["asset","Asset","","Link:Asset"],["status_field","Status","",""],["finance_book","Finance Book","","Link:Finance Book"],["current_asset_value","Current Asset Value","r","Currency"],["new_asset_value","New Asset Value","r","Currency"],["name","ID","","Data"]],"f":[["name","Data","ID"],["asset","Link","Asset"]],"s":"Created On"},"Asset Category":{"c":[["name","ID","","Data"],["asset_category_name","Asset Category Name","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"Quality Inspection Template":{"c":[["name","ID","","Data"],["quality_inspection_template_name","Quality Inspection Template Name","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"Quality Procedure":{"c":[["name","ID","","Data"],["quality_procedure_name","Quality Procedure","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"Quality Goal":{"c":[["name","ID","","Data"],["frequency","Monitoring Frequency","","Select:None|Daily|Weekly|Monthly|Quarterly"],["procedure","Procedure","","Link:Quality Procedure"]],"f":[["name","Data","ID"]],"s":"Created On"},"Quality Review":{"c":[["goal","Goal","","Link:Quality Goal"],["status_field","Status","",""],["date","Date","","Date"],["name","ID","","Data"]],"f":[["name","Data","ID"],["goal","Link","Goal"]],"s":"Created On"},"Quality Meeting":{"c":[["name","ID","","Data"],["status_field","Status","",""]],"f":[["name","Data","ID"]],"s":"Created On"},"Warranty Claim":{"c":[["customer_name","Customer Name","","Data"],["status","Status","","Select:Open|Closed|Work In Progress|Cancelled"],["item_code","Item Code","","Link:Item"],["name","ID","","Data"]],"f":[["name","Data","ID"],["status","Select","Status"],["customer","Link","Customer"],["item_code","Link","Item Code"],["customer_name","Data","Customer Name"]],"s":"Created On"},"Maintenance Schedule":{"c":[["name","ID","","Data"],["status_field","Status","",""],["customer_name","Customer Name","","Data"]],"f":[["name","Data","ID"],["customer","Link","Customer"],["status","Select","Status"]],"s":"Created On"},"Service Level Agreement":{"c":[["name","ID","","Data"],["status_field","Status","",""],["service_level","Service Level Name","","Data"],["entity","Entity","","Dynamic Link"]],"f":[["name","Data","ID"],["service_level","Data","Service Level Name"],["entity_type","Select","Entity Type"],["entity","Dynamic Link","Entity"]],"s":"Created On"},"Issue Type":{"c":[["name","ID","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"Issue Priority":{"c":[["name","ID","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"Prospect":{"c":[["company_name","Company Name","","Data"],["annual_revenue","Annual Revenue","r","Currency"],["industry","Industry","","Link:Industry Type"],["territory","Territory","","Link:Territory"],["name","ID","","Data"]],"f":[["name","Data","ID"],["company_name","Data","Company Name"],["industry","Link","Industry"],["territory","Link","Territory"]],"s":"Created On"},"Contact":{"c":[["full_name","Full Name","","Data"],["email_id","Email Address","","Data"],["status","Status","","Select:Passive|Open|Replied"],["phone","Phone","","Data"],["name","ID","","Data"]],"f":[["name","Data","ID"],["full_name","Data","Full Name"],["status","Select","Status"]],"s":"Created On"},"Campaign":{"c":[["name","ID","","Data"],["description","Description","","Text"]],"f":[["name","Data","ID"]],"s":"Created On"},"UTM Source":{"c":[["name","ID","","Data"]],"f":[["name","Data","ID"]],"s":"Last Updated On"},"Sales Stage":{"c":[["name","ID","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"Account Category":{"c":[["name","ID","","Data"],["account_category_name","Account Category Name","","Data"],["root_type","Root Type","","Select:\nAsset\nLiability\nIncome\nExpense\nEquity"]],"f":[["name","Data","ID"],["account_category_name","Data","Account Category Name"],["root_type","Select","Root Type"]],"s":"Created On"},"Asset Capitalization":{"c":[["title","Title","","Data"],["status_field","Status","",""],["posting_date","Posting Date","","Date"],["name","ID","","Data"]],"f":[["name","Data","ID"],["title","Data","Title"],["target_asset","Link","Target Asset"],["posting_date","Date","Posting Date"],["target_item_code","Link","Target Item Code"]],"s":"Created On"},"Asset Depreciation Schedule":{"c":[["name","ID","","Data"],["status_field","Status","",""],["asset","Asset","","Link:Asset"]],"f":[["name","Data","ID"]],"s":"Created On"},"Asset Maintenance Log":{"c":[["name","ID","","Data"],["status_field","Status","",""],["due_date","Due Date","","Date"],["completion_date","Completion Date","","Date"]],"f":[["name","Data","ID"],["maintenance_status","Select","Maintenance Status"]],"s":"Created On"},"Asset Maintenance Team":{"c":[["name","ID","","Data"],["maintenance_team_name","Maintenance Team Name","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"BOM Creator":{"c":[["design_name","Design Name","","Data"],["status_field","Status","",""],["item_code","Finished Good","","Link:Item"],["raw_material_cost","Total Cost","r","Currency"],["revision","Revision","r","Int"],["name","ID","","Data"]],"f":[["name","Data","ID"],["design_name","Data","Design Name"],["item_code","Link","Finished Good"],["status","Select","Status"]],"s":"Created On"},"Brand":{"c":[["name","ID","","Data"],["description","Description","","Text"]],"f":[["name","Data","ID"]],"s":"Created On"},"Cost Center Allocation":{"c":[["name","ID","","Data"],["status_field","Status","",""],["main_cost_center","Main Cost Center","","Link:Cost Center"],["valid_from","Valid From","","Date"]],"f":[["name","Data","ID"]],"s":"Created On"},"Currency Exchange":{"c":[["name","ID","","Data"],["date","Date","","Date"],["from_currency","From Currency","","Link:Currency"],["to_currency","To Currency","","Link:Currency"],["exchange_rate","Exchange Rate","r","Float"]],"f":[["name","Data","ID"],["from_currency","Link","From Currency"],["to_currency","Link","To Currency"]],"s":"ID"},"Downtime Entry":{"c":[["workstation","Workstation / Machine","","Link:Workstation"],["operator","Operator","","Link:Employee"],["from_time","From Time","","Datetime"],["to_time","To Time","","Datetime"],["name","ID","","Data"]],"f":[["name","Data","ID"],["workstation","Link","Workstation / Machine"]],"s":"Created On"},"Financial Report Template":{"c":[["template_name","Template Name","","Data"],["status_field","Status","",""],["report_type","Report Type","","Select:\nProfit and Loss Statement\nBalance Sheet\nCash Flow\nCustom Financial Statement"],["name","ID","","Data"]],"f":[["name","Data","ID"],["template_name","Data","Template Name"],["report_type","Select","Report Type"]],"s":"Created On"},"Inventory Dimension":{"c":[["name","ID","","Data"],["dimension_name","Dimension Name","","Data"],["reference_document","Reference Document","","Link:DocType"]],"f":[["name","Data","ID"]],"s":"Created On"},"Item Attribute":{"c":[["name","ID","","Data"],["status_field","Status","",""],["attribute_name","Attribute Name","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"},"Landed Cost Voucher":{"c":[["name","ID","","Data"],["status_field","Status","",""],["company","Company","","Link:Company"]],"f":[["name","Data","ID"],["company","Link","Company"]],"s":"Created On"},"Monthly Distribution":{"c":[["name","ID","","Data"],["distribution_id","Distribution Name","","Data"],["fiscal_year","Fiscal Year","","Link:Fiscal Year"]],"f":[["name","Data","ID"],["fiscal_year","Link","Fiscal Year"]],"s":"Created On"},"Packing Slip":{"c":[["name","ID","","Data"],["status_field","Status","",""],["delivery_note","Delivery Note","","Link:Delivery Note"],["from_case_no","From Package No.","r","Int"],["to_case_no","To Package No.","r","Int"]],"f":[["name","Data","ID"]],"s":"Created On"},"Serial and Batch Bundle":{"c":[["item_code","Item Code","","Link:Item"],["status_field","Status","",""],["company","Company","","Link:Company"],["warehouse","Warehouse","","Link:Warehouse"],["voucher_type","Voucher Type","","Link:DocType"],["name","ID","","Data"]],"f":[["name","Data","ID"],["item_code","Link","Item Code"],["warehouse","Link","Warehouse"],["voucher_no","Dynamic Link","Voucher No"]],"s":"Created On"},"Subcontracting Inward Order":{"c":[["customer_name","Customer Name","","Data"],["status_field","Status","",""],["transaction_date","Date","","Date"],["per_raw_material_received","% Raw Material Received","r","Percent"],["per_produced","% Produced","r","Percent"],["per_delivered","% Delivered","r","Percent"],["per_raw_material_returned","% Raw Material Returned","r","Percent"],["per_process_loss","% Process Loss","r","Percent"],["per_returned","% Returned","r","Percent"],["name","ID","","Data"]],"f":[["name","Data","ID"],["customer","Link","Customer"],["customer_name","Data","Customer Name"],["company","Link","Company"],["status","Select","Status"]],"s":"Created On"},"Tax Rule":{"c":[["name","ID","","Data"],["tax_type","Tax Type","","Select:Sales\nPurchase"]],"f":[["name","Data","ID"],["tax_type","Select","Tax Type"]],"s":"Created On"},"Tax Withholding Category":{"c":[["name","ID","","Data"],["category_name","Category Name","","Data"]],"f":[["name","Data","ID"]],"s":"Created On"}},"side":{"accounting":[{"t":"ws","ic":"home","label":"Home"},{"t":"dash","ic":"dash","label":"Dashboard"},{"t":"dt","ic":"squarex","label":"Chart of Accounts","dt":"Account"},{"t":"dt","ic":"file","label":"Sales Invoice","dt":"Sales Invoice"},{"t":"dt","ic":"file","label":"Purchase Invoice","dt":"Purchase Invoice"},{"t":"dt","ic":"cash","label":"Payment Entry","dt":"Payment Entry"},{"t":"dt","ic":"pencil","label":"Journal Entry","dt":"Journal Entry"},{"t":"g","ic":"table","label":"Reports","kids":["v:General Ledger","v:Trial Balance","v:Trial Balance for Party","v:Profit and Loss Statement|Profit and Loss","v:Balance Sheet","v:Cash Flow","v:Consolidated Financial Statement|Consolidated Report","v:Profitability Analysis","v:Accounts Receivable","v:Accounts Payable"]},{"t":"g","ic":"bank","label":"Banking","kids":["v:Bank Reconciliation Tool|Banking","v:Bank Account","v:Bank Clearance"]},{"t":"g","ic":"percent","label":"Taxes","kids":["v:Sales Taxes and Charges Template|Sales Tax Template","v:Purchase Taxes and Charges Template|Purchase Tax Template","v:Item Tax Template","v:Tax Rule","v:Tax Withholding Category"]},{"t":"g","ic":"piggy","label":"Budgeting","kids":["v:Budget","v:Cost Center Allocation","v:Monthly Distribution","v:Budget Variance Report|Budget Variance"]},{"t":"g","ic":"database","label":"Setup","kids":["v:Company","v:Fiscal Year","v:Cost Center|Chart of Cost Centers","v:Accounting Dimension","v:Account Category","v:Financial Report Template","v:Mode of Payment","v:Payment Terms Template","v:Currency Exchange","v:Accounts Settings|Settings"]}],"procurement":[{"t":"ws","ic":"home","label":"Home"},{"t":"dash","ic":"dash","label":"Dashboard"},{"t":"dt","ic":"truck","label":"Supplier","dt":"Supplier"},{"t":"dt","ic":"clip","label":"Material Request","dt":"Material Request"},{"t":"v","ic":"file","label":"Request for Quotation","view":"Request for Quotation"},{"t":"v","ic":"file","label":"Supplier Quotation","view":"Supplier Quotation"},{"t":"dt","ic":"cart","label":"Purchase Order","dt":"Purchase Order"},{"t":"dt","ic":"box","label":"Purchase Receipt","dt":"Purchase Receipt"},{"t":"dt","ic":"file","label":"Purchase Invoice","dt":"Purchase Invoice"},{"t":"g","ic":"table","label":"Reports","kids":["v:Purchase Analytics","v:Purchase Order Analysis","v:Purchase Register","v:Supplier Quotation Comparison","v:Accounts Payable","v:Accounts Payable Summary"]},{"t":"g","ic":"box","label":"Items","kids":["dt:Item","v:Item Group","v:Price List"]},{"t":"g","ic":"database","label":"Setup","kids":["v:Supplier Group","v:Supplier Scorecard","v:Buying Settings|Settings"]}],"sales":[{"t":"ws","ic":"home","label":"Home"},{"t":"dash","ic":"dash","label":"Dashboard"},{"t":"dt","ic":"user","label":"Customer","dt":"Customer"},{"t":"dt","ic":"file","label":"Quotation","dt":"Quotation"},{"t":"dt","ic":"cart","label":"Sales Order","dt":"Sales Order"},{"t":"dt","ic":"truck","label":"Delivery Note","dt":"Delivery Note"},{"t":"dt","ic":"file","label":"Sales Invoice","dt":"Sales Invoice"},{"t":"g","ic":"table","label":"Reports","kids":["v:Sales Analytics","v:Sales Register","v:Accounts Receivable","v:Accounts Receivable Summary","v:Gross Profit"]},{"t":"g","ic":"box","label":"Items","kids":["dt:Item","v:Price List","v:Pricing Rule"]},{"t":"g","ic":"monitor","label":"POS","kids":["v:POS Profile","dt:POS Invoice"]},{"t":"g","ic":"database","label":"Setup","kids":["v:Customer Group","v:Territory","v:Sales Person","v:Selling Settings|Settings"]}],"stock":[{"t":"ws","ic":"home","label":"Home"},{"t":"dash","ic":"dash","label":"Dashboard"},{"t":"dt","ic":"box","label":"Item","dt":"Item"},{"t":"v","ic":"warehouse","label":"Warehouse","view":"Warehouse"},{"t":"dt","ic":"clip","label":"Material Request","dt":"Material Request"},{"t":"dt","ic":"swap","label":"Stock Entry","dt":"Stock Entry"},{"t":"v","ic":"calcheck","label":"Stock Reconciliation","view":"Stock Reconciliation"},{"t":"dt","ic":"box","label":"Purchase Receipt","dt":"Purchase Receipt"},{"t":"dt","ic":"truck","label":"Delivery Note","dt":"Delivery Note"},{"t":"g","ic":"table","label":"Reports","kids":["v:Stock Ledger","v:Stock Balance","v:Stock Projected Qty","v:Stock Ageing","v:Stock Analytics"]},{"t":"g","ic":"wrench","label":"Tools","kids":["v:Pick List","v:Landed Cost Voucher","dt:Quality Inspection","v:Packing Slip"]},{"t":"g","ic":"listtree","label":"Serial & Batch","kids":["v:Serial No","v:Batch|Batch No","v:Serial and Batch Bundle"]},{"t":"g","ic":"database","label":"Setup","kids":["v:Item Group","v:Item Attribute","v:Brand","v:UOM|Unit of Measure (UOM)","v:Inventory Dimension","v:Stock Settings|Settings"]}],"assets":[{"t":"ws","ic":"home","label":"Home"},{"t":"dash","ic":"dash","label":"Dashboard"},{"t":"dt","ic":"building","label":"Asset","dt":"Asset"},{"t":"v","ic":"chart","label":"Depreciation Schedule","view":"Asset Depreciation Schedule"},{"t":"dt","ic":"swap","label":"Asset Movement","dt":"Asset Movement"},{"t":"v","ic":"table","label":"Fixed Asset Register","view":"Fixed Asset Register"},{"t":"g","ic":"table","label":"Reports","kids":["v:Asset Depreciation Ledger","v:Asset Depreciations and Balances","v:Asset Activity"]},{"t":"g","ic":"sliders","label":"Value Changes","kids":["v:Asset Capitalization","v:Asset Value Adjustment"]},{"t":"g","ic":"wrench","label":"Maintenance","kids":["v:Asset Maintenance","v:Asset Maintenance Log","v:Asset Repair","v:Asset Maintenance Team"]},{"t":"g","ic":"database","label":"Setup","kids":["v:Asset Category","v:Location","v:Accounts Settings|Settings"]}],"manufacturing":[{"t":"ws","ic":"home","label":"Home"},{"t":"dash","ic":"dash","label":"Dashboard"},{"t":"dt","ic":"listtree","label":"BOM","dt":"BOM"},{"t":"v","ic":"calcheck","label":"Production Plan","view":"Production Plan"},{"t":"dt","ic":"factory","label":"Work Order","dt":"Work Order"},{"t":"dt","ic":"clip","label":"Job Card","dt":"Job Card"},{"t":"dt","ic":"swap","label":"Stock Entry","dt":"Stock Entry"},{"t":"g","ic":"table","label":"Reports","kids":["v:Production Analytics","v:Work Order Summary","v:Job Card Summary","v:Production Planning Report","v:Material Requirements Planning Report"]},{"t":"g","ic":"bag","label":"Subcontracting","kids":["v:Subcontracting Order","v:Subcontracting Receipt","v:Subcontracting BOM","v:Subcontracting Inward Order","v:Subcontracting Inward Order Summary|Inward Order Summary","v:Subcontracted Raw Materials To Be Received|Raw Materials To Be Received","v:Subcontracted Items To Be Delivered|Items To Be Delivered"]},{"t":"g","ic":"wrench","label":"Tools","kids":["v:BOM Creator","v:BOM Update Tool","v:Downtime Entry"]},{"t":"g","ic":"database","label":"Setup","kids":["v:Workstation","v:Operation","v:Routing","v:Plant Floor","v:Manufacturing Settings|Settings"]}],"quality":[{"t":"ws","ic":"home","label":"Home"},{"t":"dt","ic":"clip","label":"Quality Inspection","dt":"Quality Inspection"},{"t":"v","ic":"badge","label":"Quality Goal","view":"Quality Goal"},{"t":"v","ic":"clip","label":"Quality Procedure","view":"Quality Procedure"},{"t":"v","ic":"clip","label":"Quality Review","view":"Quality Review"},{"t":"dt","ic":"badge","label":"Non Conformance","dt":"Non Conformance"},{"t":"dt","ic":"check","label":"Quality Action","dt":"Quality Action"},{"t":"g","ic":"table","label":"Reports","kids":["v:Quality Inspection Summary","v:Review","v:Maintenance Schedules"]},{"t":"g","ic":"users","label":"Meetings & Feedback","kids":["v:Quality Meeting","v:Quality Feedback"]},{"t":"g","ic":"wrench","label":"Maintenance","kids":["v:Maintenance Schedule","dt:Maintenance Visit"]},{"t":"g","ic":"database","label":"Setup","kids":["v:Quality Inspection Template","v:Quality Feedback Template|Feedback Template"]}],"projects":[{"t":"ws","ic":"home","label":"Home"},{"t":"dash","ic":"dash","label":"Dashboard"},{"t":"dt","ic":"kanban","label":"Project","dt":"Project"},{"t":"dt","ic":"clip","label":"Task","dt":"Task"},{"t":"dt","ic":"calcheck","label":"Timesheet","dt":"Timesheet"},{"t":"g","ic":"table","label":"Reports","kids":["v:Project Summary","v:Timesheet Billing Summary","v:Daily Timesheet Summary","v:Delayed Tasks Summary","v:Project wise Stock Tracking"]},{"t":"g","ic":"database","label":"Setup","kids":["v:Activity Type","v:Activity Cost","v:Project Type","v:Task Type","v:Project Template","v:Project Update","v:Projects Settings|Settings"]}],"support":[{"t":"ws","ic":"home","label":"Home"},{"t":"dt","ic":"file","label":"Issue","dt":"Issue"},{"t":"v","ic":"calcheck","label":"Maintenance Schedule","view":"Maintenance Schedule"},{"t":"dt","ic":"calcheck","label":"Maintenance Visit","dt":"Maintenance Visit"},{"t":"v","ic":"shield","label":"Warranty Claim","view":"Warranty Claim"},{"t":"g","ic":"database","label":"Setup","kids":["v:Issue Type","v:Issue Priority","v:Service Level Agreement"]},{"t":"g","ic":"table","label":"Reports","kids":["v:First Response Time for Issues"]},{"t":"v","ic":"gear","label":"Settings","view":"Support Settings"}],"crm":[{"t":"dash","ic":"dash","label":"Home"},{"t":"dt","ic":"users","label":"Lead","dt":"Lead"},{"t":"dt","ic":"file","label":"Opportunity","dt":"Opportunity"},{"t":"dt","ic":"user","label":"Customer","dt":"Customer"},{"t":"g","ic":"table","label":"Reports","kids":["v:Sales Analytics","v:Lead Details","v:Sales Pipeline Analytics","v:Opportunity Summary by Sales Stage","x:Sales Funnel","v:Prospects Engaged But Not Converted","v:First Response Time for Opportunity","v:Campaign Efficiency","v:Lead Owner Efficiency"]},{"t":"g","ic":"wrench","label":"Maintenance","kids":["v:Maintenance Schedule","dt:Maintenance Visit","v:Warranty Claim"]},{"t":"g","ic":"filter","label":"Sales Pipeline","kids":["v:Contract","v:Appointment","v:Communication"]},{"t":"g","ic":"store","label":"Campaign","kids":["v:Campaign","v:Email Campaign","v:SMS Center","v:SMS Log","v:Email Group"]},{"t":"g","ic":"database","label":"Setup","kids":["v:Territory","v:Customer Group","v:Contact","v:Prospect","v:Sales Person","v:Sales Stage","v:UTM Source|Lead Source"]},{"t":"g","ic":"gear","label":"Settings","kids":["v:CRM Settings","v:SMS Settings"]}],"home":[{"t":"home","ic":"home","label":"Home"},{"t":"v","ic":"building","label":"Company","view":"Company"},{"t":"v","ic":"users","label":"Users","view":"User"},{"t":"g","ic":"building","label":"Organization","kids":["v:Branch","v:Department","v:Designation","v:Holiday List"]},{"t":"g","ic":"shield","label":"Access","kids":["v:Role","x:Role Permissions","v:User Permission|User Permissions","v:Authorization Rule"]},{"t":"g","ic":"print","label":"Printing","kids":["v:Letter Head","v:Print Format","v:Print Settings"]},{"t":"g","ic":"mail","label":"Email","kids":["v:Email Account","v:Email Template","v:Email Digest"]},{"t":"g","ic":"database","label":"Data","kids":["v:Data Import","v:Rename Tool","v:Bulk Transaction Log","v:Transaction Deletion Record"]},{"t":"g","ic":"plug","label":"Integrations","kids":["v:Incoming Call Settings","v:Voice Call Settings","v:Call Log","v:Telephony Call Type","v:Communication Medium","v:Code List","v:Common Code"]},{"t":"g","ic":"gear","label":"Settings","kids":["v:System Settings|System","v:Global Defaults","v:Accounts Settings|Accounts","v:Selling Settings|Selling","v:Buying Settings|Buying","v:Stock Settings|Stock","v:Manufacturing Settings|Manufacturing","v:Projects Settings|Projects","v:CRM Settings|CRM","v:Support Settings|Support","v:POS Settings|POS","v:Subscription Settings|Subscription","v:Item Variant Settings|Item Variant","v:Delivery Settings|Delivery","v:Currency Exchange Settings|Currency Exchange","v:Appointment Booking Settings|Appointment Booking","v:Stock Reposting Settings|Stock Reposting"]}]},"singles":{"Accounts Settings":[["Audit Trail","Invoice and Billing",[["Enable Audit Trail","Check","0",0]]],["Invoice Cancellation","Invoice and Billing",[["Unlink Payment on cancellation of invoice","Check","1",0],["Unlink Advance Payment on cancellation of order","Check","1",0],["|"],["Delete Accounting and Stock Ledger entries on deletion of transaction","Check","0",0],["Enable Immutable Ledger","Check","0",0]]],["Invoicing Features","Invoice and Billing",[["Check Supplier invoice number uniqueness","Check","0",0],["Automatically fetch Payment Terms from Order/Quotation","Check","0",0],["Enable Subscription","Check","1",0],["|"],["Enable Common Party Accounting","Check","0",0],["Allow multi-currency invoices against single party account ","Check","0",0],["Confirm before resetting posting date","Check","1",0]]],["Stock Expense Accounting","Invoice and Billing",[["Book Stock Expense GL Entries","Check","0",0]]],["Analytical Accounting","Invoice and Billing",[["Enable Discounts and Margin","Check","0",0],["Enable Accounting Dimensions","Check","0",0],["|"]]],["Journals","Invoice and Billing",[["Merge similar Account Heads","Check","0",0]]],["Deferred Accounting Settings","Invoice and Billing",[["Book Deferred entries based on","Select","Days",0],["|"],["Automatically process deferred Accounting entry","Check","1",0],["Book deferred entries via Journal Entry","Check","0",0],["Submit Journal entries","Check","0",1]]],["Tax Settings","Invoice and Billing",[["Determine Address Tax Category from","Select","Billing Address",0],["|"],["Automatically add Taxes and Charges from Item Tax Template","Check","0",0],["Automatically add taxes from Taxes and Charges Template","Check","0",0],["Book tax loss on early payment discount","Check","0",0],["Round tax amount row-wise","Check","0",0]]],["Print Settings","Invoice and Billing",[["Show inclusive tax in print","Check","0",0],["Show taxes as table in print","Check","0",0],["Show Payment Schedule in print","Check","0",0]]],["Item Price Settings","Invoice and Billing",[["Maintain same rate throughout internal Transaction","Check","0",0],["Fetch valuation rate for internal Transaction","Check","0",0],["|"],["Action if same rate is not maintained throughout internal transaction","Select","Stop",1],["Role allowed to override stop action","Link","",1]]],["Currency Exchange Settings","Invoice and Billing",[["Allow Stale Exchange Rates","Check","1",0],["Allow Implicit Pegged Currency Conversion","Check","0",0],["|"],["Stale Days","Int","1",1]]],["Payment Reconciliation Settings","Payments",[["Auto reconcile Payments","Check","0",0],["Posting Date inheritance for exchange gain / loss","Select","Payment",0],["Auto Reconciliation job trigger","Int","15",0],["Reconciliation queue size","Int","5",0],["|"]]],["Repost","Payments",[["|"]]],["Payment Options","Payments",[["Fetch Payment Schedule in Payment Request","Check","1",0],["Enable Loyalty Point Program","Check","0",0],["|"]]],["","Credit Limits",[["Over Billing Allowance (%)","Currency","0",0],["Role allowed to bypass credit limit","Link","",0],["Role Allowed to over bill ","Link","",1],["Prevent Sales Invoice when Customer is Overdue","Check","0",0],["Role Allowed to Bypass Over Billing Restriction","Link","",1],["|"]]],["Asset Settings","Assets",[["Book Asset Depreciation entry automatically","Check","1",0],["Calculate daily depreciation using total days in depreciation period","Check","0",0],["Role to Notify on Depreciation Failure","Link","",0],["|"]]],["","Accounts Closing",[["Ignore Account closing balance","Check","0",0],["Use legacy controller for Period Closing Voucher","Check","1",0],["PCV Job Timeout (seconds)","Int","3600",1],["|"]]],["General Ledger Report","Reports",[["Disable \"Consider Accounting Dimension\" Filter","Check","0",0],["|"],["General Ledger remarks length","Int","0",0]]],["Accounts Receivable / Payable Report","Reports",[["Data fetch method","Select","Buffered Cursor",0],["Default Ageing Range","Data","30, 60, 90, 120",0],["|"],["Accounts Receivable / Payable remarks length","Int","0",0]]],["Legacy Fields","Reports",[["Ignore Is Opening check for reporting","Check","0",0]]],["Chart of Accounts","Others",[["Show balances in Chart of Accounts","Check","1",0]]],["Banking","Others",[["Enable Automatic Party Matching","Check","0",0],["Automatically run rules on unreconciled transactions","Check","1",0],["Enable Fuzzy Matching","Check","0",1],["Match transfers within 'N' days","Int","3",0]]],["Payment Request","Others",[["Create payment requests in Draft status","Check","1",0]]],["Budget","Others",[["Use legacy Budget Controller","Check","0",0]]]],"Buying Settings":[["Supplier Defaults","Defaults",[["Supplier Naming By","Select","Supplier Name",0],["|"],["Default Supplier Group","Link","",0]]],["","Pricing",[["Default Buying Price List","Link","Standard Buying",0]]],["","Pricing",[["Maintain same rate throughout the purchase  cycle","Check","1",0],["|"],["Set Landed Cost Based on Purchase Invoice Rate","Check","0",1],["Action if same rate is not maintained","Select","Stop",1],["Role allowed to override stop action","Link","",1]]],["","Transaction Settings",[["|"],["Is Purchase Order required for Purchase Invoice & Receipt creation?","Select","No",0],["Is Purchase Receipt required for Purchase Invoice creation?","Select","No",0],["How often should project be updated of Total Purchase Cost ?","Select","Each Transaction",0],["Over Order Allowance (%)","Float","0",0],["|"],["Allow Item to be added multiple times in a transaction","Check","1",0],["Allow negative rates for Items","Check","0",0],["Set valuation rate for rejected Materials","Check","0",1],["Disable last purchase rate","Check","0",0],["Show pay button in Purchase Order portal","Check","1",1]]],["Purchase Invoice Settings","Transaction Settings",[["Bill for rejected quantity in Purchase Invoice","Check","1",0],["Use Transaction Date Exchange Rate","Check","0",0]]],["Zero-Quantity Line Items","Transaction Settings",[["Allow Supplier Quotation with Zero Quantity","Check","0",0],["Allow Request for Quotation with Zero Quantity","Check","0",0],["Allow Purchase Order with Zero Quantity","Check","0",0]]],["Blanket Orders","Transaction Settings",[["Blanket Order Allowance (%)","Float","0",0]]],["","Subcontracting Settings",[["Backflush raw materials of subcontract based on","Select","BOM",0],["Over Transfer Allowance (%)","Float","0",1],["Validate consumed quantity (as per BOM)","Check","0",1]]],["","Subcontracting Settings",[["Auto create Subcontracting Order","Check","0",0],["Auto create Purchase Receipt","Check","0",0]]],["","Request for Quotation",[["Fixed Outgoing Email Account","Link","",0]]]],"Selling Settings":[["","Customer Defaults",[["Customer Naming By","Select","Customer Name",0],["|"],["Default Customer Group","Link","",0],["Default Territory","Link","",0]]],["","Pricing",[["Default Price List","Link","Standard Selling",0],["Use prices from Default Price List as fallback","Check","0",0],["Allow editing Price List rate in transactions","Check","0",0]]],["","Pricing",[["Maintain same rate throughout sales cycle","Check","0",0],["|"],["Action if same rate is not maintained throughout sales cycle","Select","Stop",1],["Role allowed to override stop action","Link","",1]]],["","Pricing",[["Validate selling price for Item against purchase or valuation rate","Check","0",0],["Calculate Product Bundle price based on child Item's rates","Check","0",0],["Allow negative rates for Items","Check","0",0]]],["Transaction Settings","Transaction",[["Is Sales Order required to create Sales Invoice/Delivery Note?","Select","No",0],["Is Delivery Note required to create Sales Invoice?","Select","No",0],["How often should sales data be updated in Company/Project?","Select","Each Transaction",0],["|"],["Allow same Item to be added multiple times in a transaction","Check","1",0],["Allow multiple Sales Orders against a customer's Purchase Order","Check","0",0],["Hide Customer's Tax ID from sales transactions","Check","0",0]]],["","Transaction",[["Allow Sales Order creation for expired Quotation","Check","0",0],["Don't reserve Sales Order qty on sales return","Check","0",0],["Enable cut-off date on creating bulk Delivery Notes","Check","0",0],["Set incoming rate as zero for expired Batch","Check","0",0]]],["Zero-Quantity Line Items","Transaction",[["Allow Quotation with zero quantity","Check","0",0],["|"],["Allow Sales Order with zero quantity","Check","0",0]]],["Blanket Orders","Transaction",[["Blanket Order Allowance (%)","Float","0",0]]],["Proforma Invoice","Transaction",[["Enable Proforma Invoice","Check","0",0],["Default Proforma Print Format","Link","",1],["Proforma Email Template","Link","",1]]],["","Advanced Features",[["Enable tracking sales commissions","Check","0",0],["Enable discount accounting for selling","Check","0",0],["Enable UTM","Check","0",0]]],["Experimental","Advanced Features",[["Use Legacy (Client side) Reactivity","Check","0",0]]],["","Subcontracting Inward",[["Allow delivery of overproduced quantity","Check","0",0],["|"],["Deliver secondary Items","Check","0",0]]]],"Stock Settings":[["Item Defaults","Defaults",[["Item Naming By","Select","Item Code",0],["|"],["Default Item Group","Link","",0],["Default Valuation Method","Select","FIFO",0]]],["Price List Defaults","Defaults",[["Auto insert Item Price if missing","Check","1",0],["Update existing Price List Rate","Check","0",1],["Update Price List based on","Select","Rate",1]]],["UOM Defaults","Defaults",[["Default Stock UOM","Link","Nos",0],["Allow to edit stock UOM qty for Sales documents","Check","0",0],["Allow to edit stock UOM qty for Purchase documents","Check","0",0],["Allow to edit stock UOM qty for Stock Entry","Check","0",0],["Allow UOM with conversion rate defined in Item","Check","0",0]]],["Negative Stock","Stock Validations",[["Allow negative stock","Check","0",0]]],["Quantity Tolerance","Stock Validations",[["Over Delivery/Receipt Allowance (%)","Float","0",0],["Over Transfer Allowance (%)","Float","0",0],["Over Picking Allowance (%)","Percent","0",0],["|"],["Role Allowed to Over Deliver/Receive","Link","",0]]],["Display & Data Formatting","Stock Validations",[["Show barcode field in stock transactions","Check","1",0],["Convert Item description to clean HTML in transactions","Check","1",0]]],["Internal Transfer Rules","Stock Validations",[["Allow internal transfers at user-defined rate","Check","0",0],["Validate Material Transfer warehouses","Check","0",0]]],["","Serial & Batch Item",[["Activate Serial / Batch No for Item","Check","0",0]]],["Serial Item settings","Serial & Batch Item",[["Pick Serial / Batch Based On","Select","FIFO",1],["Allow existing Serial No to be Manufactured/Received again","Check","1",0],["Use Serial / Batch fields","Check","1",0],["Disable Serial No and Batch selector","Check","0",0]]],["Batch Item settings","Serial & Batch Item",[["Allow negative stock for Batch","Check","0",0],["Do not use Batch-wise Valuation","Check","0",0],["Have default Naming Series for Batch ID?","Check","0",0],["Naming Series Prefix","Data","BATCH-",1]]],["Serial and Batch Bundle","Serial & Batch Item",[["Auto create Serial and Batch Bundle for outward","Check","1",1],["Do not update Serial / Batch on creation of auto bundle","Check","1",1],["Auto Map Raw Materials to Finished Goods","Check","0",1],["Set Serial and Batch Bundle Naming Based on Naming Series","Check","0",1],["|"]]],["","Stock Reservation",[["Enable stock reservation","Check","0",0],["Auto reserve stock","Check","0",0],["|"],["Allow partial reservation","Check","1",1],["Auto reserve Stock for Sales Order on Purchase","Check","0",1]]],["Serial and Batch Reservation","Stock Reservation",[["Auto reserve Serial and Batch Nos","Check","1",1]]],["","Quality",[["Allow to make Quality Inspection after Purchase / Delivery","Check","0",0],["Action if Quality Inspection is rejected","Select","Stop",0],["Action if Quality Inspection is not submitted","Select","Stop",0]]],["Auto Material Request","Stock Planning",[["Raise Material Request when stock reaches re-order level","Check","1",0],["Notify by email on creation of automatic Material Request","Check","0",0]]],["Control Historical Stock Transactions","Stock Closing",[["Freeze stocks older than (days)","Int","0",0],["Stock frozen up to","Date","",0],["|"],["Role allowed to edit frozen stock","Link","",1]]],["","Stock Closing",[["Role allowed to create/edit back-dated transactions","Link","",0]]]],"Manufacturing Settings":[["Raw Materials Consumption","BOM and Production",[["Allow Continuous Material Consumption","Check","0",0],["Get Raw Materials Cost from Consumption Entry","Check","0",1],["|"],["Backflush Raw Materials Based On","Select","BOM",0],["Validate Components and Quantities Per BOM","Check","0",1]]],["BOM","BOM and Production",[["Update BOM Cost Automatically","Check","1",0],["|"],["Allow Editing of Items and Quantities in Work Order","Check","0",0]]],["Overproduction for Sales and Work Order","BOM and Production",[["Overproduction Percentage For Sales Order","Percent","0",0],["|"],["Overproduction Percentage For Work Order","Percent","0",0]]],["Extra Material Transfer","BOM and Production",[["Transfer Extra Raw Materials to WIP (%)","Percent","0",0],["|"]]],["","Job Card and Capacity Planning",[["Add Corrective Operation Cost in Finished Good Valuation","Check","0",0],["Enforce Time Logs","Check","0",0],["|"],["Allow Excess Material Transfer","Check","0",0]]],["Capacity Planning","Job Card and Capacity Planning",[["Disable Capacity Planning","Check","0",0],["Allow Overtime","Check","0",1],["Allow Production on Holidays","Check","0",1],["|"],["Capacity Planning For (Days)","Int","30",1],["Time Between Operations (Mins)","Int","10",1]]],["Other Settings","Job Card and Capacity Planning",[["Set Operating Cost / Secondary Items From Sub-assemblies","Check","0",0],["|"],["Make Serial No / Batch from Work Order","Check","0",0]]]],"BOM Update Tool":[["Replace BOM","Details",[["Current BOM","Link","",0],["New BOM","Link","",0]]]],"Bank Clearance":[["","Details",[["Account","Link","",0],["From Date","Date","",0],["To Date","Date","",0],["|"],["Bank Account","Link","",0],["Include Reconciled Entries","Check","0",0],["Include POS Transactions","Check","0",0]]]]},"reports":{"General Ledger":{"c":[["GL Entry","Link"],["Posting Date","Date"],["Account","Link"],["Debit (INR)","Currency"],["Credit (INR)","Currency"],["Balance (INR)","Currency"],["Voucher Type","Link"],["Voucher Subtype","Data"],["Voucher No","Dynamic Link"],["Against Account",""],["Party Type",""],["Party",""],["Project",""],["Cost Center",""],["Against Voucher Type","Link"],["Against Voucher","Dynamic Link"],["Supplier Invoice No","Data"]],"f":[["Company","Link","ARAIS"],["Finance Book","Link",""],["From Date","Date","2026-10-03"],["To Date","Date","2026-11-03"],["Account","MultiSelectList",""],["Voucher No","Data",""]],"chart":true},"Trial Balance":{"c":[["Account","Link"],["Account Name","Data"],["Account Number","Data"],["Currency","Link"],["Opening (Dr)","Currency"],["Opening (Cr)","Currency"],["Debit","Currency"],["Credit","Currency"],["Closing (Dr)","Currency"],["Closing (Cr)","Currency"]],"f":[["Company","Link","ARAIS"],["Fiscal Year","Link","2026-2027"],["From Date","Date","2026-04-01"],["To Date","Date","2027-03-31"],["Cost Center","MultiSelectList",""],["Project","MultiSelectList",""],["Finance Book","Link",""],["Currency","Select",""],["With Period Closing Entry For Opening Balances","Check","1"],["Period Closing Entry For Current Period","Check","1"],["Show zero values","Check","0"],["Show unclosed fiscal year's P&L balances","Check","0"],["Include Default FB Entries","Check","1"],["Show net values in opening and closing columns","Check","1"],["Show Group Accounts","Check","1"]],"chart":true},"Trial Balance for Party":{"c":[["Customer","Link"],["Opening (Dr)","Currency"],["Opening (Cr)","Currency"],["Debit","Currency"],["Credit","Currency"],["Closing (Dr)","Currency"],["Closing (Cr)","Currency"],["Currency","Link"]],"f":[["Company","Link","ARAIS"],["Fiscal Year","Link","2026-2027"],["From Date","Date","2026-04-01"],["To Date","Date","2027-03-31"],["Party Type","Link","Customer"],["Party","Dynamic Link",""],["Account","MultiSelectList",""],["Finance Book","Link",""],["Include Default FB Entries","Check","1"],["Show zero values","Check","0"],["Exclude Zero Balance Parties","Check","1"]],"chart":true},"Profit and Loss Statement":{"c":[["Account","Link"],["Account Name","Data"],["Account Number","Data"],["Currency","Link"],["2026-2027","Currency"]],"f":[["Company","Link","ARAIS"],["Finance Book","Link",""],["Filter Based On","Select","Fiscal Year"],["Start Year","Link","2026-2027"],["End Year","Link","2026-2027"],["Periodicity","Select","Yearly"],["Currency","Select",""],["Cost Center","MultiSelectList",""],["Project","MultiSelectList",""],["Group by Dimension","Select",""],["Report Template","Link",""],["Select View","Select","Report"],["Accumulated Values","Check","0"],["Include Default FB Entries","Check","1"],["Show zero values","Check","0"]],"chart":true},"Balance Sheet":{"c":[["Account","Link"],["Account Name","Data"],["Account Number","Data"],["Currency","Link"],["2026-2027","Currency"]],"f":[["Company","Link","ARAIS"],["Finance Book","Link",""],["Filter Based On","Select","Fiscal Year"],["Start Year","Link","2026-2027"],["End Year","Link","2026-2027"],["Periodicity","Select","Yearly"],["Currency","Select",""],["Cost Center","MultiSelectList",""],["Project","MultiSelectList",""],["Group by Dimension","Select",""],["Report Template","Link",""],["Select View","Select","Report"],["Accumulated Values","Check","1"],["Include Default FB Entries","Check","1"],["Show zero values","Check","0"]],"chart":true},"Cash Flow":{"c":[["Section","Link"],["Currency","Link"],["2026-2027","Currency"]],"f":[["Company","Link","ARAIS"],["Finance Book","Link",""],["Filter Based On","Select","Fiscal Year"],["Start Year","Link","2026-2027"],["End Year","Link","2026-2027"],["Periodicity","Select","Yearly"],["Currency","Select",""],["Cost Center","MultiSelectList",""],["Project","MultiSelectList",""]],"chart":true},"Consolidated Financial Statement":{"c":[["Account","Link"],["Currency","Link"],["ARAIS (INR)","Currency"]],"f":[["Company","Link","ARAIS"],["Filter Based On","Select","Fiscal Year"],["Start Year","Link","2026-2027"],["End Year","Link","2026-2027"],["Finance Book","Link",""],["Report","Select","Balance Sheet"],["Currency","Select","INR"],["Accumulated Values in Group Company","Check","0"],["Include Default FB Entries","Check","1"],["Show zero values","Check","0"]],"chart":true},"Profitability Analysis":{"c":[["Cost Center","Link"],["Currency","Link"],["Income","Currency"],["Expense","Currency"],["Gross Profit / Loss","Currency"]],"f":[["Company","Link","ARAIS"],["Based On","Select","Cost Center"],["Accounting Dimension","Link",""],["Fiscal Year","Link","2026-2027"],["From Date","Date","2026-04-01"],["To Date","Date","2027-03-31"],["Finance Book","Link",""],["Include Default FB Entries","Check","1"],["Show zero values","Check","0"]],"chart":true},"Accounts Receivable":{"c":[["Posting Date","Date"],["Party Type","Link"],["Party","Dynamic Link"],["Receivable Account","Link"],["Customer Contact","Link"],["Cost Center","Data"],["Project","Link"],["Voucher Type","Link"],["Voucher No","Dynamic Link"],["Due Date","Date"],["Invoiced Amount","Currency"],["Paid Amount","Currency"],["Credit Note","Currency"],["Outstanding Amount","Currency"],["Age (Days)","Int"],["<0","Currency"],["0-30","Currency"],["31-60","Currency"],["61-90","Currency"],["91-120","Currency"],["121-Above","Currency"],["Currency","Link"],["Customer LPO","Data"],["Territory","Link"],["Customer Group","Link"]],"f":[["Company","Link","ARAIS"],["Report Date","Date","2026-11-03"],["Finance Book","Link",""],["Cost Center","MultiSelectList",""],["Project","MultiSelectList",""],["Party Type","Autocomplete",""],["Party","MultiSelectList",""],["Receivable Account","Link",""],["Ageing Based On","Select","Due Date"],["Age as on","Select","Report Date"],["Ageing Range","Data","30, 60, 90, 120"],["Customer Group","MultiSelectList",""],["Payment Terms Template","Link",""],["Sales Partner","Link",""],["Sales Person","Link",""],["Territory","MultiSelectList",""],["Group By Customer","Check","0"],["Based On Payment Terms","Check","0"],["Show Future Payments","Check","0"],["Show Linked Delivery Notes","Check","0"],["Show Sales Person","Check","0"],["Show Remarks","Check","0"],["In Party Currency","Check","0"],["Include Revaluation Journals","Check","0"],["Group by Voucher","Check","0"]],"chart":true},"Accounts Payable":{"c":[],"f":[["Company","Link","ARAIS"],["Report Date","Date","03-11-2026"],["Finance Book","Link",""],["Cost Center","MultiSelectList",""],["Project","MultiSelectList",""],["Payable Account","Link",""],["Ageing Based On","Select","Due Date"],["Age As On","Select","Report Date"],["Ageing Range","Data","30, 60, 90, 120"],["Payment Terms Template","Link",""],["Party Type","Autocomplete",""],["Party","MultiSelectList",""],["Group By Supplier","Check","0"],["Based On Payment Terms","Check","0"],["Show Remarks","Check","0"],["Show Future Payments","Check","0"],["In Party Currency","Check","0"],["Include Revaluation Journals","Check","0"],["Group by Voucher","Check","0"],["Handle Employee Advances","Check","0"]],"chart":false},"Budget Variance Report":{"c":[["Cost Center",""],["Budget 2026-2027","Currency"],["Actual 2026-2027","Currency"],["Variance 2026-2027","Currency"]],"f":[["Company","Link","ARAIS"],["From Fiscal Year","Link","2026-2027"],["To Fiscal Year","Link","2026-2027"],["Period","Select","Yearly"],["Budget Against","Select","Cost Center"],["Budget Against Filter","MultiSelectList",""],["Show Cumulative Amount","Check","0"]],"chart":false},"Purchase Analytics":{"c":[],"f":[["Company","Link","ARAIS"],["From Date","Date","03-10-2026"],["To Date","Date","03-11-2026"],["Item","Link",""],["Supplier","MultiSelectList",""],["Supplier Quotation","MultiSelectList",""],["Request for Quotation","Link",""],["Categorize By","Select","Categorize by Supplier"],["Status","Select","Submitted"],["Order Status","Select",""],["Include Expired","Check","0"]],"chart":false},"Supplier Quotation Comparison":{"c":[["Supplier","Link"],["Item","Link"],["UOM","Link"],["Quantity","Float"],["Stock UOM","Link"],["Currency","Link"],["Price","Currency"],["Price per Unit (Stock UOM)","Currency"],["Price (INR)","Currency"],["Price Per Unit (INR)","Currency"],["Supplier Quotation","Link"],["Order Status","Data"],["Valid Till","Date"],["Lead Time (Days)","Int"],["Request for Quotation","Link"]],"f":[["Company","Link","ARAIS"],["From Date","Date","2026-10-03"],["To Date","Date","2026-11-03"],["Item","Link",""],["Supplier","MultiSelectList",""],["Supplier Quotation","MultiSelectList",""],["Request for Quotation","Link",""],["Categorize by","Select","Categorize by Supplier"],["Status","Select","Submitted"],["Order Status","Select",""],["Include Expired","Check","0"]],"chart":true},"Purchase Order Analysis":{"c":[],"f":[["Company","Link","ARAIS"],["From Date","Date","2026-10-03"],["To Date","Date","2026-11-03"],["Project","Link",""],["Purchase Order","MultiSelectList",""],["Status","MultiSelectList",""],["Group by Purchase Order","Check","0"],["Group by Item","Check","0"]],"chart":true},"Purchase Register":{"c":[["Voucher Type","Link"],["Voucher","Dynamic Link"],["Posting Date","Date"],["Supplier","Link"],["Supplier Name","Data"],["Supplier Group","Link"],["Tax Id","Data"],["Payable Account","Link"],["Mode Of Payment","Data"],["Project","Link"],["Bill No","Data"],["Bill Date","Date"],["Purchase Order","Link"],["Purchase Receipt","Link"],["Currency","Data"],["Net Total","Currency"],["Total Tax","Currency"],["Grand Total","Currency"],["Rounded Total","Currency"],["Outstanding Amount","Currency"],["Remarks","Data"]],"f":[],"chart":true},"Accounts Payable Summary":{"c":[["Party Type","Link"],["Party","Dynamic Link"],["Advance Amount","Currency"],["Invoiced Amount","Currency"],["Paid Amount","Currency"],["Debit Note","Currency"],["Outstanding Amount","Currency"],["<0","Currency"],["0-30","Currency"],["31-60","Currency"],["61-90","Currency"],["91-120","Currency"],["121-Above","Currency"],["Total Amount Due","Currency"],["Supplier Group","Link"],["Currency","Link"]],"f":[["Company","Link","ARAIS"],["Report Date","Date","2026-11-03"],["Ageing Based On","Select","Due Date"],["Age as on","Select","Report Date"],["Ageing Range","Data","30, 60, 90, 120"],["Finance Book","Link",""],["Cost Center","MultiSelectList",""],["Project","MultiSelectList",""],["Party Type","Autocomplete",""],["Party","MultiSelectList",""],["Payment Terms Template","Link",""],["Supplier Group","MultiSelectList",""],["Based On Payment Terms","Check","0"],["Include Revaluation Journals","Check","0"],["Show GL Balance","Check","0"]],"chart":true},"Sales Analytics":{"c":[["Customer","Link"],["Customer Name","Data"],["Apr 2026","Float"],["May 2026","Float"],["Jun 2026","Float"],["Jul 2026","Float"],["Aug 2026","Float"],["Sep 2026","Float"],["Oct 2026","Float"],["Nov 2026","Float"],["Dec 2026","Float"],["Jan 2027","Float"],["Feb 2027","Float"],["Mar 2027","Float"],["Total","Float"]],"f":[["Tree Type","Select","Customer"],["Entity","MultiSelectList",""],["Based On","Select","Sales Invoice"],["Value Or Qty","Select","Value"],["From Date","Date","2026-04-01"],["To Date","Date","2027-03-31"],["Company","Link","ARAIS"],["Range","Select","Monthly"],["Curves","Select","select"],["Show Aggregate Value from Subsidiary Companies","Check","0"]],"chart":true},"Sales Register":{"c":[["Voucher Type","Link"],["Voucher","Dynamic Link"],["Posting Date","Date"],["Customer","Link"],["Customer Name","Data"],["Customer Group","Link"],["Territory","Link"],["Tax Id","Data"],["Receivable Account","Link"],["Mode Of Payment","Data"],["Project","Link"],["Owner","Data"],["Sales Order","Link"],["Delivery Note","Link"],["Cost Center","Link"],["Warehouse","Link"],["Currency","Data"],["Net Total","Currency"],["Tax Total","Currency"],["Grand Total","Currency"],["Rounded Total","Currency"],["Outstanding Amount","Currency"],["Remarks","Data"]],"f":[["From Date","Date","2026-10-03"],["To Date","Date","2026-11-03"],["Customer","Link",""],["Customer Group","Link",""],["Company","Link","ARAIS"],["Mode of Payment","Link",""],["Owner","Link",""],["Cost Center","Link",""],["Warehouse","Link",""],["Brand","Link",""],["Item Group","Link",""],["Show Ledger View","Check","0"]],"chart":true},"Accounts Receivable Summary":{"c":[["Party Type","Link"],["Party","Dynamic Link"],["Advance Amount","Currency"],["Invoiced Amount","Currency"],["Paid Amount","Currency"],["Credit Note","Currency"],["Outstanding Amount","Currency"],["<0","Currency"],["0-30","Currency"],["31-60","Currency"],["61-90","Currency"],["91-120","Currency"],["121-Above","Currency"],["Total Amount Due","Currency"],["Territory","Link"],["Customer Group","Link"],["Currency","Link"]],"f":[["Company","Link","ARAIS"],["Report Date","Date","2026-11-03"],["Ageing Based On","Select","Due Date"],["Age as on","Select","Report Date"],["Ageing Range","Data","30, 60, 90, 120"],["Finance Book","Link",""],["Cost Center","MultiSelectList",""],["Project","MultiSelectList",""],["Party Type","Autocomplete",""],["Party","MultiSelectList",""],["Customer Group","Link",""],["Payment Terms Template","Link",""],["Territory","MultiSelectList",""],["Sales Partner","Link",""],["Sales Person","Link",""],["Based On Payment Terms","Check","0"],["Show Future Payments","Check","0"],["Show GL Balance","Check","0"],["Include Revaluation Journals","Check","0"]],"chart":true},"Gross Profit":{"c":[["Sales Invoice","Link"],["Item Name","Data"],["Customer","Link"],["Customer Group","Link"],["Posting Date","Date"],["Item Group","Link"],["Brand","Link"],["Description","Data"],["Warehouse","Link"],["Qty","Float"],["Avg. Selling Rate","Currency"],["Valuation Rate","Currency"],["Selling Amount","Currency"],["Buying Amount","Currency"],["Gross Profit","Currency"],["Gross Profit Percent","Percent"],["Project","Link"],["Currency","Link"]],"f":[["Company","Link","ARAIS"],["From Date","Date","2026-04-01"],["To Date","Date","2027-03-31"],["Sales Invoice","Link",""],["Group By","Select","Invoice"],["Item Group","Link",""],["Sales Person","Link",""],["Warehouse","Link",""],["Cost Center","MultiSelectList",""],["Project","MultiSelectList",""],["Include Returned Invoices (Stand-alone)","Check","1"]],"chart":true},"Stock Ledger":{"c":[["Date","Datetime"],["Item","Link"],["Item Name",""],["Stock UOM","Link"],["In Qty","Float"],["Out Qty","Float"],["Balance Qty","Float"],["Warehouse","Link"],["Item Group","Link"],["Brand","Link"],["Description",""],["Incoming Rate","Currency"],["Avg Rate (Balance Stock)","Currency"],["Outgoing Rate","Currency"],["Balance Value","Currency"],["Value Change","Currency"],["Voucher Type","Link"],["Voucher #","Dynamic Link"],["Serial and Batch Bundle","Link"],["Batch","Link"],["Serial No","Link"],["Project","Link"],["Company","Link"]],"f":[["Company","Link","ARAIS"],["From Date","Date","2026-10-03"],["To Date","Date","2026-11-03"],["Warehouses","MultiSelectList",""],["Items","MultiSelectList",""],["Item Group","Link",""],["Batch No","Link",""],["Brands","MultiSelectList",""],["Voucher #","Data",""],["Project","Link",""],["Include UOM","Link",""],["Valuation Field Type","Select","Currency"],["Enable Serial / Batch Bundle","Check","0"]],"chart":true},"Stock Balance":{"c":[["Item","Link"],["Item Name",""],["Item Group","Link"],["Warehouse","Link"],["Stock UOM","Link"],["Balance Qty","Float"],["Balance Value","Currency"],["Opening Qty","Float"],["Opening Value","Currency"],["In Qty","Float"],["In Value","Float"],["Out Qty","Float"],["Out Value","Float"],["Valuation Rate","Currency"],["Reserved Stock","Float"],["Company","Link"]],"f":[["Company","Link","ARAIS"],["From Date","Date","2026-10-03"],["To Date","Date","2026-11-03"],["Item Group","Link",""],["Items","MultiSelectList",""],["Warehouses","MultiSelectList",""],["Warehouse Type","Link",""],["Valuation Field Type","Select","Currency"],["Include UOM","Link",""],["Show Alternate UOM Balance","Check","0"],["Show Variant Attributes","Check","0"],["Show Stock Ageing Data","Check","0"],["Ignore Closing Balance","Check","0"],["Include Zero Stock Items","Check","1"],["Show Dimension Wise Stock","Check","0"]],"chart":true},"Stock Projected Qty":{"c":[["Item Code","Link"],["Item Name",""],["Description",""],["Item Group","Link"],["Brand","Link"],["Warehouse","Link"],["UOM","Link"],["Actual Qty","Float"],["Planned Qty","Float"],["Requested Qty","Float"],["Ordered Qty","Float"],["Reserved Qty","Float"],["Reserved for Production","Float"],["Reserved for Production Plan","Float"],["Reserved for Sub Contracting","Float"],["Reserved for POS Transactions","Float"],["Reserved Stock","Float"],["Projected Qty","Float"],["Reorder Level","Float"],["Reorder Qty","Float"],["Shortage Qty","Float"]],"f":[["Company","Link","ARAIS"],["Warehouse","Link",""],["Item","Link",""],["Item Group","Link",""],["Brand","Link",""],["Include UOM","Link",""]],"chart":true},"Stock Ageing":{"c":[["Item Code","Link"],["Item Name","Data"],["Description","Data"],["Item Group","Link"],["Brand","Link"],["Available Qty","Float"],["Average Age","Float"],["Age (0 - 30)","Float"],["Value (0 - 30)","Float"],["Age (31 - 60)","Float"],["Value (31 - 60)","Float"],["Age (61 - 90)","Float"],["Value (61 - 90)","Float"],["Age (91 - Above)","Float"],["Value (91 - Above)","Float"],["Earliest","Int"],["Latest","Int"],["UOM","Link"]],"f":[["Company","Link","ARAIS"],["As On Date","Date","2026-11-03"],["Warehouse Type","Link",""],["Warehouse","Link",""],["Item","Link",""],["Brand","Link",""],["Ageing Range","Data","30, 60, 90"],["Show Warehouse-wise Stock","Check","0"]],"chart":true},"Stock Analytics":{"c":[["Item",""],["Item Name",""],["Item Group",""],["UOM",""],["Apr 2026","Float"],["May 2026","Float"],["Jun 2026","Float"],["Jul 2026","Float"],["Aug 2026","Float"],["Sep 2026","Float"],["Oct 2026","Float"],["Nov 2026","Float"],["Dec 2026","Float"],["Jan 2027","Float"],["Feb 2027","Float"],["Mar 2027","Float"],["Total","Float"]],"f":[["Item Group","Link",""],["Item","Link",""],["Value Or Qty","Select","Value"],["Brand","Link",""],["Company","Link","ARAIS"],["Warehouse","Link",""],["From Date","Date",""],["To Date","Date",""],["Range","Select","Monthly"]],"chart":true},"Asset Depreciation Ledger":{"c":[["Asset","Link"],["Asset Name","Data"],["Depreciation Date","Date"],["Purchase Amount","Currency"],["Opening Accumulated Depreciation","Currency"],["Depreciation Amount","Currency"],["Accumulated Depreciation Amount","Currency"],["Value After Depreciation","Currency"],["Depreciation Entry","Link"],["Asset Category","Link"],["Cost Center","Link"],["Current Status","Data"],["Purchase Date","Date"]],"f":[["Company","Link","ARAIS"],["From Date","Date","2026-10-03"],["To Date","Date","2026-11-03"],["Asset","Link",""],["Asset Category","Link",""],["Cost Center","Link",""],["Finance Book","Link",""],["Include Default FB Assets","Check","1"]],"chart":true},"Asset Depreciations and Balances":{"c":[["Asset Category","Link"],["Value as on 31-03-2026","Currency"],["Value of New Purchase","Currency"],["Value of Sold Asset","Currency"],["Value of Scrapped Asset","Currency"],["Value of Assets Consumed in Capitalization","Currency"],["Adjustment during the period","Currency"],["Value as on 31-03-2027","Currency"],["Accumulated Depreciation as on 31-03-2026","Currency"],["Depreciation Amount during the period","Currency"],["Depreciation Eliminated due to disposal of assets","Currency"],["Accumulated Depreciation as on 31-03-2027","Currency"],["Depreciation eliminated via reversal","Currency"],["Net Asset value as on 31-03-2026","Currency"],["Net Asset value as on 31-03-2027","Currency"]],"f":[["Company","Link","ARAIS"],["From Date","Date","2026-04-01"],["To Date","Date","2027-03-31"],["Group By","Select","Asset Category"],["Asset Category","Link",""],["Finance Book","Link",""]],"chart":true},"Asset Activity":{"c":[["Asset",""],["Asset Name",""],["Date",""],["Activity Type",""],["User",""]],"f":[["Company","Link","ARAIS"],["From Date","Date","2026-10-03"],["To Date","Date","2026-11-03"],["Asset","Link",""],["Asset Category","Link",""]],"chart":true},"Fixed Asset Register":{"c":[["Asset ID","Link"],["Asset Name","Data"],["Asset Category","Link"],["Status","Data"],["Purchase Date","Date"],["Available For Use Date","Date"],["Net Purchase Amount","Currency"],["Asset Value","Currency"],["Opening Accumulated Depreciation","Currency"],["Depreciated Amount","Currency"],["Cost Center","Link"],["Department","Link"],["Vendor Name","Data"],["Location","Link"],["Company","Link"]],"f":[["Company","Link","ARAIS"],["Status","Select","In Location"],["Asset Category","Link",""],["Cost Center","Link",""],["Group By","Select","--Select a group--"],["Only existing assets","Check","0"],["Finance Book","Link",""],["Include Default FB Assets","Check","1"],["Period Based On","Select","--Select a period--"]],"chart":true},"Production Analytics":{"c":[["Status","Data"],["Apr 2026","Float"],["May 2026","Float"],["Jun 2026","Float"],["Jul 2026","Float"],["Aug 2026","Float"],["Sep 2026","Float"],["Oct 2026","Float"],["Nov 2026","Float"],["Dec 2026","Float"],["Jan 2027","Float"],["Feb 2027","Float"],["Mar 2027","Float"]],"f":[["Company","Link","ARAIS"],["From Date","Date","2026-04-01"],["To Date","Date","2027-03-31"],["Range","Select","Monthly"]],"chart":true},"Work Order Summary":{"c":[],"f":[["Company","Link","ARAIS"],["Based On","Select","Creation Date"],["From Posting Date","Date","03-08-2026"],["To Posting Date","Date","03-11-2026"],["Status","Select",""],["Sales Order","MultiSelectList",""],["Production Item","MultiSelectList",""],["Age","Int","0"],["Charts Based On","Select","Status"]],"chart":false},"Job Card Summary":{"c":[["Job Card",""],["Posting Date",""],["Status",""],["Work Order",""],["Production Item",""],["Qty To Manufacture","Float"],["Completed Qty","Float"],["Total Time in Mins","Float"],["Workstation",""],["Operation",""]],"f":[["Company","Link","ARAIS"],["Fiscal Year","Link","2026-2027"],["From Posting Date","Date","01-04-2026"],["To Posting Date","Date","31-03-2027"],["Status","Select",""],["Work Order","MultiSelectList",""],["Production Item","MultiSelectList",""],["Workstation","Link",""],["Operation","Link",""]],"chart":false},"Production Planning Report":{"c":[],"f":[["Company","Link","ARAIS"],["Based On","Select","Sales Order"],["Docnames","MultiSelectList",""],["Raw Material Warehouse","Link",""],["Order By","Select","Delivery Date"],["Include Sub-assembly Raw Materials","Check","0"]],"chart":false},"Material Requirements Planning Report":{"c":[["Item Code",""],["Item Name",""],["Warehouse",""],["Required Qty","Float"],["Available Qty","Float"],["Safety Stock Qty","Float"],["Ordered Qty","Float"],["Shortage Qty","Float"]],"f":[["Company","Link","ARAIS"],["From Date","Date","10-11-2026"],["To Date","Date","03-02-2027"],["Item Code","Link",""],["Warehouse","Link",""],["MPS","Link",""],["Type Of Material","Select","All"],["Add Safety Stock","Check","1"],["Show in Bucket View","Check","0"]],"chart":false},"Subcontracting Inward Order Summary":{"c":[["Subcontracting Inward Order","Link"],["Date","Date"],["Customer","Link"],["Status","Data"],["Finished Good","Link"],["UOM","Link"],["Order Qty","Float"],["Produced Qty","Float"],["Delivered Qty","Float"],["Returned by Customer","Float"],["Raw Material","Link"],["UOM","Link"],["Required Qty","Float"],["Received Qty","Float"],["Consumed Qty","Float"],["Returned to Customer","Float"]],"f":[["Company","Link","ARAIS"],["From Date","Date","2026-10-03"],["To Date","Date","2026-11-03"],["Customer","Link",""],["Subcontracting Inward Order","Link",""]],"chart":true},"Subcontracted Raw Materials To Be Received":{"c":[["Subcontracting Inward Order","Link"],["Date","Date"],["Customer","Link"],["Finished Good","Link"],["Raw Material","Link"],["UOM","Link"],["Required Qty","Float"],["Received Qty","Float"],["Returned Qty","Float"],["Process Loss Qty","Float"],["Pending Qty","Float"]],"f":[["Company","Link","ARAIS"],["From Date","Date","2026-10-03"],["To Date","Date","2026-11-03"],["Customer","Link",""]],"chart":true},"Subcontracted Items To Be Delivered":{"c":[["Subcontracting Inward Order","Link"],["Date","Date"],["Customer","Link"],["Finished Good","Link"],["Item Name","Data"],["UOM","Link"],["Order Qty","Float"],["Produced Qty","Float"],["Delivered Qty","Float"],["Pending Qty","Float"]],"f":[["Company","Link","ARAIS"],["From Date","Date","2026-10-03"],["To Date","Date","2026-11-03"],["Customer","Link",""]],"chart":true}},"ws":{"Accounting":{"cards":[["Financial Statements",[["Profit and Loss","Report","Profit and Loss Statement"],["Balance Sheet","Report","Balance Sheet"],["Cash Flow","Report","Cash Flow"],["Trial Balance","Report","Trial Balance"],["General Ledger","Report","General Ledger"],["Consolidated Report","Report","Consolidated Financial Statement"],["Custom Financial Statement","Report","Custom Financial Statement"],["Consolidated Trial Balance","Report","Consolidated Trial Balance"],["Financial Ratios","Report","Financial Ratios"]]],["Receivables & Payables",[["Accounts Receivable","Report","Accounts Receivable"],["Accounts Receivable Summary","Report","Accounts Receivable Summary"],["Accounts Payable","Report","Accounts Payable"],["Accounts Payable Summary","Report","Accounts Payable Summary"],["Customer Ledger Summary","Report","Customer Ledger Summary"],["Supplier Ledger Summary","Report","Supplier Ledger Summary"],["Trial Balance for Party","Report","Trial Balance for Party"],["Customer Credit Balance","Report","Customer Credit Balance"],["Payment Period Based On Invoice Date","Report","Payment Period Based On Invoice Date"]]],["Registers & Profitability",[["Sales Register","Report","Sales Register"],["Purchase Register","Report","Purchase Register"],["Item-wise Sales Register","Report","Item-wise Sales Register"],["Item-wise Purchase Register","Report","Item-wise Purchase Register"],["Gross Profit","Report","Gross Profit"],["Profitability Analysis","Report","Profitability Analysis"],["Gross and Net Profit Report","Report","Gross and Net Profit Report"],["Deferred Revenue and Expense","Report","Deferred Revenue and Expense"],["Sales Invoice Trends","Report","Sales Invoice Trends"],["Purchase Invoice Trends","Report","Purchase Invoice Trends"],["Sales Payment Summary","Report","Sales Payment Summary"]]],["Tax & Compliance",[["TDS Computation Summary","Report","TDS Computation Summary"],["Tax Withholding Details","Report","Tax Withholding Details"],["Electronic Invoice Register","Report","Electronic Invoice Register"]]],["Invoicing & Payments",[["Payment Request","DocType","Payment Request"],["Payment Order","DocType","Payment Order"],["Dunning","DocType","Dunning"],["Invoice Discounting","DocType","Invoice Discounting"],["Subscription","DocType","Subscription"],["Subscription Plan","DocType","Subscription Plan"]]],["Banking",[["Bank Reconciliation (old)","DocType","Bank Reconciliation Tool"],["Bank Transaction","DocType","Bank Transaction"],["Bank Statement Import","DocType","Bank Statement Import"],["Bank","DocType","Bank"],["Bank Account Type","DocType","Bank Account Type"],["Bank Account Subtype","DocType","Bank Account Subtype"],["Bank Guarantee","DocType","Bank Guarantee"],["Plaid Settings","DocType","Plaid Settings"],["Bank Reconciliation Statement","Report","Bank Reconciliation Statement"],["Bank Clearance Summary","Report","Bank Clearance Summary"]]],["Reconciliation",[["Payment Reconciliation","DocType","Payment Reconciliation"],["Process Payment Reconciliation","DocType","Process Payment Reconciliation"],["Unreconcile Payment","DocType","Unreconcile Payment"]]],["Opening & Closing",[["COA Importer","DocType","Chart of Accounts Importer"],["Opening Invoice Tool","DocType","Opening Invoice Creation Tool"],["Accounting Period","DocType","Accounting Period"],["FX Revaluation","DocType","Exchange Rate Revaluation"],["Period Closing Voucher","DocType","Period Closing Voucher"],["Process Deferred Accounting","DocType","Process Deferred Accounting"]]],["Ledger Tools",[["Repost Accounting Ledger","DocType","Repost Accounting Ledger"],["Repost Payment Ledger","DocType","Repost Payment Ledger"],["Ledger Merge","DocType","Ledger Merge"],["Ledger Health Monitor","DocType","Ledger Health Monitor"],["Process Statement Of Accounts","DocType","Process Statement Of Accounts"]]],["Share Management",[["Shareholder","DocType","Shareholder"],["Share Transfer","DocType","Share Transfer"],["Share Type","DocType","Share Type"],["Share Ledger","Report","Share Ledger"],["Share Balance","Report","Share Balance"]]],["Setup",[["Currency","DocType","Currency"],["Finance Book","DocType","Finance Book"],["Journal Entry Template","DocType","Journal Entry Template"],["Tax Category","DocType","Tax Category"],["Tax Withholding Group","DocType","Tax Withholding Group"],["Deduction Certificate","DocType","Lower Deduction Certificate"],["Dunning Type","DocType","Dunning Type"],["Cheque Print Template","DocType","Cheque Print Template"],["Currency Exchange Settings","DocType","Currency Exchange Settings"],["Subscription Settings","DocType","Subscription Settings"]]]]},"Buying":{"cards":[["Purchase Reports",[["Purchase Analytics","Report","Purchase Analytics"],["Purchase Order Analysis","Report","Purchase Order Analysis"],["Purchase Register","Report","Purchase Register"],["Item-wise Purchase Register","Report","Item-wise Purchase Register"],["Item-wise Purchase History","Report","Item-wise Purchase History"],["Purchase Order Trends","Report","Purchase Order Trends"],["Purchase Receipt Trends","Report","Purchase Receipt Trends"],["Purchase Invoice Trends","Report","Purchase Invoice Trends"],["Supplier Quotation Comparison","Report","Supplier Quotation Comparison"],["Procurement Tracker","Report","Procurement Tracker"],["Item Wise Consumption","Report","Item Wise Consumption"]]],["Order Status Reports",[["Requested Items to Order and Receive","Report","Requested Items to Order and Receive"],["Items To Be Requested","Report","Items To Be Requested"],["Received Items To Be Billed","Report","Received Items To Be Billed"],["Billed Items To Be Received","Report","Billed Items To Be Received"]]],["Supplier Reports",[["Accounts Payable","Report","Accounts Payable"],["Accounts Payable Summary","Report","Accounts Payable Summary"],["Supplier Ledger Summary","Report","Supplier Ledger Summary"],["Supplier Addresses And Contacts","Report","Address And Contacts"]]],["Subcontracting Reports",[["Subcontract Order Summary","Report","Subcontract Order Summary"],["Materials To Be Transferred","Report","Subcontracted Raw Materials To Be Transferred"],["Items To Be Received","Report","Subcontracted Item To Be Received"]]],["Setup",[["Tax Template","DocType","Purchase Taxes and Charges Template"],["Terms Template","DocType","Terms and Conditions"],["Pricing Rule","DocType","Pricing Rule"],["Blanket Order","DocType","Blanket Order"],["Supplier Scorecard Criteria","DocType","Supplier Scorecard Criteria"],["Supplier Scorecard Variable","DocType","Supplier Scorecard Variable"],["Supplier Scorecard Standing","DocType","Supplier Scorecard Standing"]]]]},"Selling":{"cards":[["Sales Reports",[["Sales Analytics","Report","Sales Analytics"],["Sales Register","Report","Sales Register"],["Gross Profit","Report","Gross Profit"],["Item-wise Sales Register","Report","Item-wise Sales Register"],["Item-wise Sales History","Report","Item-wise Sales History"],["Sales Order Analysis","Report","Sales Order Analysis"],["Sales Order Trends","Report","Sales Order Trends"],["Quotation Trends","Report","Quotation Trends"],["Sales Invoice Trends","Report","Sales Invoice Trends"],["Territory-wise Sales","Report","Territory-wise Sales"],["Lost Quotations","Report","Lost Quotations"]]],["Customer Reports",[["Accounts Receivable","Report","Accounts Receivable"],["Accounts Receivable Summary","Report","Accounts Receivable Summary"],["Customer Credit Balance","Report","Customer Credit Balance"],["Inactive Customers","Report","Inactive Customers"],["Customers Without Any Sales Transactions","Report","Customers Without Any Sales Transactions"],["Customer Acquisition and Loyalty","Report","Customer Acquisition and Loyalty"],["Payment Terms Status for Sales Order","Report","Payment Terms Status for Sales Order"],["Customer-wise Item Price","Report","Customer-wise Item Price"]]],["Sales Team Reports",[["Sales Person-wise Transaction Summary","Report","Sales Person-wise Transaction Summary"],["Sales Person Commission Summary","Report","Sales Person Commission Summary"],["Sales Partners Commission","Report","Sales Partners Commission"],["Sales Partner Commission Summary","Report","Sales Partner Commission Summary"],["Sales Partner Transaction Summary","Report","Sales Partner Transaction Summary"],["Sales Person Target Variance Based On Item Group","Report","Sales Person Target Variance Based On Item Group"],["Territory Target Variance Based On Item Group","Report","Territory Target Variance Based On Item Group"],["Sales Partner Target Variance based on Item Group","Report","Sales Partner Target Variance based on Item Group"]]],["Pricing",[["Promotional Scheme","DocType","Promotional Scheme"],["Coupon Code","DocType","Coupon Code"],["Product Bundle","DocType","Product Bundle"],["Blanket Order","DocType","Blanket Order"]]],["Point of Sale",[["POS Opening Entry","DocType","POS Opening Entry"],["POS Closing Entry","DocType","POS Closing Entry"],["Loyalty Program","DocType","Loyalty Program"],["POS Settings","DocType","POS Settings"]]],["Setup",[["Tax Template","DocType","Sales Taxes and Charges Template"],["Terms Template","DocType","Terms and Conditions"],["Shipping Rule","DocType","Shipping Rule"],["Sales Partner","DocType","Sales Partner"]]]]},"Stock":{"cards":[["Stock Reports",[["Stock Ledger","Report","Stock Ledger"],["Stock Balance","Report","Stock Balance"],["Stock Projected Qty","Report","Stock Projected Qty"],["Stock Analytics","Report","Stock Analytics"],["Stock Ageing","Report","Stock Ageing"],["Warehouse Wise Stock Balance","Report","Warehouse Wise Stock Balance"],["Warehouse wise Item Balance Age and Value","Report","Warehouse wise Item Balance Age and Value"],["Total Stock Summary","Report","Total Stock Summary"],["Item Shortage Report","Report","Item Shortage Report"],["Itemwise Recommended Reorder Level","Report","Itemwise Recommended Reorder Level"],["Reserved Stock","Report","Reserved Stock"],["Product Bundle Balance","Report","Product Bundle Balance"],["Stock Summary","Page","stock-balance"],["Warehouse Capacity Summary","Page","warehouse-capacity-summary"]]],["Serial & Batch Reports",[["Serial No and Batch Traceability","Report","Serial No and Batch Traceability"],["Serial and Batch Summary","Report","Serial and Batch Summary"],["Serial No Status","Report","Serial No Status"],["Serial No Ledger","Report","Serial No Ledger"],["Serial No Warranty Expiry","Report","Serial No Warranty Expiry"],["Serial No Service Contract Expiry","Report","Serial No Service Contract Expiry"],["Batch-Wise Balance History","Report","Batch-Wise Balance History"],["Batch Item Expiry Status","Report","Batch Item Expiry Status"],["Available Batch Report","Report","Available Batch Report"],["Available Serial No","Report","Available Serial No"]]],["Movement Reports",[["Purchase Receipt Trends","Report","Purchase Receipt Trends"],["Delivery Note Trends","Report","Delivery Note Trends"],["Requested Items To Be Transferred","Report","Requested Items To Be Transferred"],["Items To Be Requested","Report","Items To Be Requested"],["Delayed Item Report","Report","Delayed Item Report"],["Delayed Order Report","Report","Delayed Order Report"],["Landed Cost Report","Report","Landed Cost Report"],["Item Wise Consumption","Report","Item Wise Consumption"],["COGS By Item Group","Report","COGS By Item Group"]]],["Item Reports",[["Item Prices","Report","Item Prices"],["Item Price Stock","Report","Item Price Stock"],["Item-wise Price List Rate","Report","Item-wise Price List Rate"],["Item Variant Details","Report","Item Variant Details"],["Item Where Used","Report","Item Where Used"]]],["Audit Reports",[["Stock and Account Value Comparison","Report","Stock and Account Value Comparison"],["Stock Ledger Variance","Report","Stock Ledger Variance"],["Stock Ledger Invariant Check","Report","Stock Ledger Invariant Check"],["Incorrect Balance Qty After Transaction","Report","Incorrect Balance Qty After Transaction"],["Incorrect Stock Value Report","Report","Incorrect Stock Value Report"],["Incorrect Serial No Valuation","Report","Incorrect Serial No Valuation"],["Incorrect Serial and Batch Bundle","Report","Incorrect Serial and Batch Bundle"],["FIFO Queue vs Qty After Transaction Comparison","Report","FIFO Queue vs Qty After Transaction Comparison"],["Stock Qty vs Batch Qty","Report","Stock Qty vs Batch Qty"],["Stock Qty vs Serial No Count","Report","Stock Qty vs Serial No Count"],["Negative Batch Report","Report","Negative Batch Report"]]],["Tools",[["Repost Item Valuation","DocType","Repost Item Valuation"],["Stock Closing Entry","DocType","Stock Closing Entry"],["Stock Reservation Entry","DocType","Stock Reservation Entry"],["Putaway Rule","DocType","Putaway Rule"],["Delivery Trip","DocType","Delivery Trip"],["Shipment","DocType","Shipment"],["Quick Stock Balance","DocType","Quick Stock Balance"]]],["Setup",[["Item Alternative","DocType","Item Alternative"],["UOM Conversion Factor","DocType","UOM Conversion Factor"],["UOM Category","DocType","UOM Category"],["Warehouse Type","DocType","Warehouse Type"],["Stock Entry Type","DocType","Stock Entry Type"],["Manufacturer","DocType","Manufacturer"],["Customs Tariff Number","DocType","Customs Tariff Number"],["Quality Inspection Template","DocType","Quality Inspection Template"],["Quality Inspection Parameter","DocType","Quality Inspection Parameter"],["Shipping Rule","DocType","Shipping Rule"],["Shipment Parcel Template","DocType","Shipment Parcel Template"],["Item Variant Settings","DocType","Item Variant Settings"],["Stock Reposting Settings","DocType","Stock Reposting Settings"],["Delivery Settings","DocType","Delivery Settings"]]]]},"Assets":{"cards":[["Asset Reports",[["Fixed Asset Register","Report","Fixed Asset Register"],["Asset Depreciation Ledger","Report","Asset Depreciation Ledger"],["Asset Depreciations and Balances","Report","Asset Depreciations and Balances"],["Asset Activity","Report","Asset Activity"],["Asset Maintenance Report","Report","Asset Maintenance"]]],["Setup",[["Item","DocType","Item"],["Asset Shift Factor","DocType","Asset Shift Factor"],["Asset Shift Allocation","DocType","Asset Shift Allocation"]]]]},"Manufacturing":{"cards":[["Production Reports",[["Production Analytics","Report","Production Analytics"],["Work Order Summary","Report","Work Order Summary"],["Open Work Orders","Report","Open Work Orders"],["Work Orders in Progress","Report","Work Orders in Progress"],["Completed Work Orders","Report","Completed Work Orders"],["Work Order Consumed Materials","Report","Work Order Consumed Materials"],["Work Order Stock Report","Report","Work Order Stock Report"],["Issued Items Against Work Order","Report","Issued Items Against Work Order"],["Job Card Summary","Report","Job Card Summary"],["Downtime Analysis","Report","Downtime Analysis"],["Process Loss Report","Report","Process Loss Report"],["Cost of Poor Quality Report","Report","Cost of Poor Quality Report"],["Quality Inspection Summary","Report","Quality Inspection Summary"]]],["Planning Reports",[["Production Planning Report","Report","Production Planning Report"],["Production Plan Summary","Report","Production Plan Summary"],["Material Requirements Planning Report","Report","Material Requirements Planning Report"],["Forecasting","Report","Exponential Smoothing Forecasting"]]],["BOM Reports",[["BOM Search","Report","BOM Search"],["BOM Explorer","Report","BOM Explorer"],["BOM Stock Analysis","Report","BOM Stock Analysis"],["BOM Variance Report","Report","BOM Variance Report"],["BOM Operations Time","Report","BOM Operations Time"]]],["Planning",[["Master Production Schedule","DocType","Master Production Schedule"],["Sales Forecast","DocType","Sales Forecast"]]],["Tools",[["Visual Plant Floor","Page","visual-plant-floor"]]],["Setup",[["Workstation Type","DocType","Workstation Type"],["Item","DocType","Item"],["Warehouse","DocType","Warehouse"]]]]}}}; })();

/* ERPNext interactive demo — read-only pages for every sidebar sub-section that has no
   working form in the sandbox. Each is a list (2–3 sample rows), a report, or a settings page.
   Placeholders: {C} company, {A} abbr, {S} state, {C1}-{C4} customers, {S1}-{S3} suppliers,
   {FG1} {FG2} {RM1} {RM2} {RM3} item names. */
(function (global) {
  'use strict';
  var V = {};
  function L(name, cols, rows, o) { V[name] = { kind: 'list', cols: cols, rows: rows, o: o || {} }; }
  function R(name, cols, rows, o) { V[name] = { kind: 'report', cols: cols, rows: rows, o: o || {} }; }
  function ST(name, secs) { V[name] = { kind: 'single', secs: secs }; }
  function TR(name, nodes, company) { V[name] = { kind: 'tree', nodes: nodes, company: !!company }; }
  /* column: 'Label' | 'Label:r' (right-aligned number) | 'Label:pill' | 'Label:check' */

  /* ---------- Setup ---------- */
  L('Company', ['Company Name', 'Abbr', 'Country', 'Default Currency', 'Is Group:check'], [['{C}', '{A}', 'India', 'INR', '0']]);
  V.Company.rows.push(['{C} - Export Unit', '{A}E', 'India', 'INR', '0']);
  L('User', ['Full Name', 'Status:pill', 'User Type', 'Role Profile', 'ID'], [
    ['Priya Nair', 'Active', 'System User', 'Accounts Manager', 'priya@company.in'],
    ['Vikram Mehta', 'Active', 'System User', 'Manufacturing Manager', 'vikram@company.in'],
    ['Ananya Rao', 'Active', 'System User', 'Sales User', 'ananya@company.in']]);
  L('Branch', ['Branch'], [['Mumbai Head Office'], ['Surat Factory'], ['Bengaluru Sales Office']]);
  L('Department', ['Department', 'Company', 'Is Group:check'], [['Accounts - {A}', '{C}', '0'], ['Production - {A}', '{C}', '0'], ['Sales - {A}', '{C}', '0']]);
  L('Designation', ['Designation'], [['Accounts Manager'], ['Production Supervisor'], ['Sales Executive']]);
  L('Role', ['Role Name', 'Desk Access:check', 'Two Factor Auth:check'], [['Accounts Manager', '1', '0'], ['Stock User', '1', '0'], ['Sales User', '1', '0']]);
  L('Role Profile', ['Role Profile', 'Roles'], [['Accounts Manager', 'Accounts User, Accounts Manager, Auditor'], ['Manufacturing Manager', 'Manufacturing User, Stock User'], ['Sales User', 'Sales User, Stock User']]);
  L('User Permission', ['User', 'Allow', 'For Value', 'Apply To All Documents:check'], [['ananya@company.in', 'Territory', 'South India', '1'], ['vikram@company.in', 'Warehouse', 'Stores - {A}', '1']]);
  L('Print Format', ['Name', 'DocType', 'Standard:check', 'Disabled:check'], [['GST Tax Invoice', 'Sales Invoice', '1', '0'], ['Quotation with Images', 'Quotation', '0', '0'], ['Delivery Challan', 'Delivery Note', '1', '0']]);
  L('Letter Head', ['Letter Head Name', 'Is Default:check', 'Source'], [['{C}', '1', 'Image'], ['{C} - Export Unit', '0', 'HTML']]);
  ST('Print Settings', [['PDF Settings', [['PDF Page Size', 'A4'], ['Send Print as PDF', 'Yes'], ['Repeat Header and Footer', 'Yes']]], ['Print Style', [['Print Style', 'Redesign'], ['Font Size', '0']]]]);
  L('Email Account', ['Email Account Name', 'Email ID', 'Enable Incoming:check', 'Enable Outgoing:check'], [['Sales', 'sales@company.in', '1', '1'], ['Support', 'support@company.in', '1', '1'], ['Notifications', 'noreply@company.in', '0', '1']]);
  L('Email Template', ['Name', 'Subject'], [['Quotation Follow Up', 'Following up on our quotation'], ['Payment Reminder', 'Your invoice is due'], ['Order Confirmation', 'Your order is confirmed']]);
  L('Notification', ['Subject', 'Document Type', 'Send Alert On', 'Enabled:check'], [['Payment overdue', 'Sales Invoice', 'Days After', '1'], ['New lead assigned', 'Lead', 'New', '1'], ['Material request approved', 'Material Request', 'Submit', '1']]);
  L('Data Import', ['Title', 'Reference DocType', 'Import Type', 'Status:pill'], [['Opening customers', 'Customer', 'Insert New Records', 'Success'], ['Item master', 'Item', 'Insert New Records', 'Success'], ['Price update Oct', 'Item Price', 'Update Existing Records', 'Partial Success']]);
  ST('Data Export', [['Select Document Type', [['Select DocType', 'Customer'], ['File Type', 'Excel'], ['Export Type', 'All Records']]]]);
  L('Webhook', ['Name', 'DocType', 'Doc Event', 'Enabled:check'], [['Order to WhatsApp', 'Sales Order', 'on_submit', '1'], ['Invoice to Tally', 'Sales Invoice', 'on_submit', '0']]);
  L('Social Login Key', ['Social Login Provider', 'Enable Social Login:check'], [['Google', '1'], ['Microsoft', '0']]);
  ST('Google Settings', [['Google Integration', [['Enable', 'No'], ['Client ID', ''], ['API Key', '']]]]);
  ST('System Settings', [['Localization', [['Country', 'India'], ['Language', 'English'], ['Time Zone', 'Asia/Kolkata'], ['Date Format', 'dd-mm-yyyy'], ['Number Format', '#,##,###.##'], ['Currency Precision', '2']]], ['Security', [['Session Expiry', '170:00'], ['Allow Login using Mobile Number', 'Yes']]]]);
  ST('Website Settings', [['Landing Page', [['Home Page', 'home'], ['Title Prefix', '{C}'], ['Disable Signup', 'Yes']]]]);
  ST('Global Defaults', [['Defaults', [['Default Company', '{C}'], ['Current Fiscal Year', '2026-2027'], ['Default Currency', 'INR'], ['Hide Currency Symbol', 'No']]]]);

  /* ---------- Accounting ---------- */
  ST('Bank Reconciliation Tool', [['Bank Account', [['Company', '{C}'], ['Bank Account', 'HDFC Bank - Current'], ['From Date', '01-10-2026'], ['To Date', '19-10-2026'], ['Opening Balance', '₹ 18,42,300.00'], ['Closing Balance as per statement', '₹ 21,06,145.00']]]]);
  L('Bank Account', ['Account Name', 'Bank', 'Account No', 'Is Company Account:check'], [['HDFC Bank - Current', 'HDFC Bank', 'XXXXXX2290', '1'], ['ICICI Bank - OD', 'ICICI Bank', 'XXXXXX7814', '1'], ['{C1} - SBI', 'State Bank of India', 'XXXXXX0457', '0']]);
  L('Bank', ['Bank Name', 'SWIFT Number'], [['HDFC Bank', 'HDFCINBB'], ['ICICI Bank', 'ICICINBB'], ['State Bank of India', 'SBININBB']]);
  L('Sales Taxes and Charges Template', ['Title', 'Company', 'Tax Category', 'Is Default:check'], [['Output GST In-state', '{C}', 'In-State', '1'], ['Output GST Out-state', '{C}', 'Out-State', '0'], ['Export with IGST', '{C}', 'Overseas', '0']]);
  L('Purchase Taxes and Charges Template', ['Title', 'Company', 'Tax Category', 'Is Default:check'], [['Input GST In-state', '{C}', 'In-State', '1'], ['Input GST Out-state', '{C}', 'Out-State', '0'], ['Reverse Charge In-state', '{C}', 'Reverse Charge In-State', '0']]);
  L('Item Tax Template', ['Title', 'Company', 'GST Rate:r'], [['GST 5% - {A}', '{C}', '5'], ['GST 12% - {A}', '{C}', '12'], ['GST 18% - {A}', '{C}', '18']]);
  L('Tax Category', ['Title', 'Is Inter State:check'], [['In-State', '0'], ['Out-State', '1'], ['Reverse Charge In-State', '0']]);
  L('Budget', ['Budget Against', 'Cost Center', 'Fiscal Year', 'Action if Annual Budget Exceeded'], [['Cost Center', 'Marketing - {A}', '2026-2027', 'Warn'], ['Cost Center', 'Production - {A}', '2026-2027', 'Stop'], ['Project', 'PROJ-0001', '2026-2027', 'Warn']]);
  L('Cost Center', ['Cost Center Name', 'Parent Cost Center', 'Is Group:check'], [['Main - {A}', '{C}', '1'], ['Production - {A}', 'Main - {A}', '0'], ['Marketing - {A}', 'Main - {A}', '0']]);
  L('Accounting Dimension', ['Document Type', 'Label', 'Disabled:check'], [['Branch', 'Branch', '0'], ['Project', 'Project', '0']]);
  ST('Accounts Settings', [['Invoicing Features', [['Check Supplier Invoice Number Uniqueness', 'Yes'], ['Make Payment via Journal Entry', 'No'], ['Unlink Payment on Cancellation of Invoice', 'Yes']]], ['Accounts Closing', [['Accounts Frozen Till Date', '31-03-2026'], ['Role Allowed to Set Frozen Accounts', 'Accounts Manager']]]]);
  L('Fiscal Year', ['Year Name', 'Year Start Date', 'Year End Date', 'Disabled:check'], [['2026-2027', '01-04-2026', '31-03-2027', '0'], ['2025-2026', '01-04-2025', '31-03-2026', '0']]);
  L('Mode of Payment', ['Mode of Payment', 'Type', 'Enabled:check'], [['UPI', 'Bank', '1'], ['Bank Transfer', 'Bank', '1'], ['Cash', 'Cash', '1']]);
  L('Payment Terms Template', ['Template Name', 'Allocate Payment Based On Payment Terms:check'], [['Net 30', '0'], ['50% Advance, 50% on Delivery', '1'], ['Net 45', '0']]);
  R('Accounts Payable', ['Posting Date', 'Supplier', 'Voucher No', 'Due Date', 'Invoiced (INR):r', 'Outstanding (INR):r', 'Age (Days):r'], [['25-09-2026', '{S3}', 'ACC-PINV-2026-00001', '09-11-2026', '3,22,875.00', '1,72,875.00', '24'], ['17-10-2026', '{S2}', 'ACC-PINV-2026-00002', '01-12-2026', '21,420.00', '21,420.00', '2']]);
  R('Trial Balance', ['Account', 'Opening (Dr):r', 'Debit:r', 'Credit:r', 'Closing (Dr):r', 'Closing (Cr):r'], [['Debtors - {A}', '2,10,000.00', '4,42,294.00', '1,24,970.00', '5,27,324.00', ''], ['Sales - {A}', '', '', '3,92,430.00', '', '3,92,430.00'], ['HDFC Bank - {A}', '18,42,300.00', '1,24,970.00', '6,00,400.00', '13,66,870.00', '']]);
  R('Balance Sheet', ['Account', 'FY 2026-27 (INR):r'], [['Application of Funds (Assets)', '41,86,540.00'], ['Source of Funds (Liabilities)', '12,44,730.00'], ['Equity', '29,41,810.00']]);
  R('Profit and Loss Statement', ['Account', 'Apr–Sep 2026 (INR):r', 'Oct 2026 (INR):r'], [['Income', '1,15,30,000.00', '15,20,000.00'], ['Expenses', '96,40,000.00', '12,95,000.00'], ['Net Profit', '18,90,000.00', '2,25,000.00']]);

  /* ---------- Selling ---------- */
  R('Sales Analytics', ['Customer', 'Apr:r', 'May:r', 'Jun:r', 'Jul:r', 'Aug:r', 'Sep:r', 'Total:r'], [['{C1}', '2.1 L', '2.4 L', '1.9 L', '2.8 L', '2.6 L', '3.1 L', '14.9 L'], ['{C2}', '1.6 L', '1.8 L', '2.2 L', '2.0 L', '1.7 L', '2.4 L', '11.7 L'], ['{C4}', '0.9 L', '1.1 L', '1.0 L', '1.4 L', '1.2 L', '1.5 L', '7.1 L']], { filters: [['Tree Type', 'Customer', 'select'], ['Based On', 'Value', 'select'], ['Value or Qty', 'Value', 'select'], ['Company', '{C}', 'select'], ['From Date', '01-04-2026'], ['To Date', '31-03-2027'], ['Range', 'Monthly', 'select']] });
  R('Sales Order Analysis', ['Date', 'Sales Order', 'Customer', 'Qty:r', 'Delivered Qty:r', 'Pending Amount (INR):r', 'Status:pill'], [['24-09-2026', 'SAL-ORD-2026-00001', '{C3}', '600', '600', '0.00', 'Completed'], ['12-10-2026', 'SAL-ORD-2026-00002', '{C1}', '930', '0', '2,17,080.00', 'To Deliver and Bill']], { filters: [['Company', '{C}', 'select'], ['From Date', '01-04-2026'], ['To Date', '19-10-2026'], ['Sales Order', ''], ['Status', '', 'select'], ['Warehouse', ''], ['Group by Sales Order', 1, 'check']] });
  L('Item Group', ['Item Group Name', 'Parent Item Group', 'Is Group:check'], [['All Item Groups', '', '1'], ['Raw Material', 'All Item Groups', '0'], ['Products', 'All Item Groups', '0']]);
  L('Item Price', ['Item Code', 'Price List', 'Rate (INR):r', 'Valid From'], [['{FG1}', 'Standard Selling', '{FG1R}', '01-04-2026'], ['{FG2}', 'Standard Selling', '{FG2R}', '01-04-2026'], ['{RM1}', 'Standard Buying', '{RM1R}', '01-04-2026']]);
  L('Price List', ['Price List Name', 'Currency', 'Buying:check', 'Selling:check', 'Enabled:check'], [['Standard Selling', 'INR', '0', '1', '1'], ['Standard Buying', 'INR', '1', '0', '1'], ['Dealer Price', 'INR', '0', '1', '1']]);
  L('Pricing Rule', ['Title', 'Apply On', 'Discount (%):r', 'Valid Upto'], [['Diwali 10% off', 'Item Group', '10', '05-11-2026'], ['Dealer volume discount', 'Transaction', '5', '31-03-2027']]);
  L('POS Profile', ['Name', 'Company', 'Warehouse', 'Disabled:check'], [['Andheri Store', '{C}', 'Finished Goods - {A}', '0'], ['Surat Outlet', '{C}', 'Finished Goods - {A}', '0']]);
  ST('Selling Settings', [['Defaults', [['Customer Naming By', 'Customer Name'], ['Default Customer Group', 'Commercial'], ['Default Territory', 'India'], ['Default Price List', 'Standard Selling']]], ['Transaction Settings', [['Sales Order Required for Sales Invoice', 'No'], ['Delivery Note Required for Sales Invoice', 'No'], ['Maintain Same Rate Throughout Sales Cycle', 'Yes']]]]);
  L('Customer Group', ['Customer Group Name', 'Parent Customer Group', 'Is Group:check'], [['All Customer Groups', '', '1'], ['Commercial', 'All Customer Groups', '0'], ['Retail', 'All Customer Groups', '0']]);
  L('Territory', ['Territory Name', 'Parent Territory', 'Is Group:check'], [['India', 'All Territories', '1'], ['West India', 'India', '0'], ['South India', 'India', '0']]);
  L('Sales Person', ['Sales Person Name', 'Parent Sales Person', 'Enabled:check'], [['Ananya Rao', 'Sales Team', '1'], ['Rahul Kapoor', 'Sales Team', '1'], ['Meera Joshi', 'Sales Team', '1']]);
  L('Terms and Conditions', ['Title', 'Selling:check', 'Buying:check'], [['Standard Sales Terms', '1', '0'], ['Purchase Terms', '0', '1'], ['Export Terms', '1', '0']]);

  /* ---------- Buying ---------- */
  L('Request for Quotation', ['Title', 'Status:pill', 'Transaction Date', 'ID'], [['{RM1} for Q3', 'Submitted', '05-10-2026', 'PUR-RFQ-2026-00001'], ['Packaging material', 'Draft', '16-10-2026', 'PUR-RFQ-2026-00002']]);
  L('Supplier Quotation', ['Supplier', 'Status:pill', 'Date', 'Grand Total (INR):r', 'ID'], [['{S1}', 'Submitted', '08-10-2026', '1,42,800.00', 'PUR-SQTN-2026-00001'], ['{S3}', 'Submitted', '09-10-2026', '1,38,250.00', 'PUR-SQTN-2026-00002'], ['{S2}', 'Draft', '17-10-2026', '24,960.00', 'PUR-SQTN-2026-00003']]);
  R('Purchase Analytics', ['Supplier', 'Jul:r', 'Aug:r', 'Sep:r', 'Oct:r', 'Total:r'], [['{S3}', '1.8 L', '2.1 L', '3.2 L', '0.0 L', '7.1 L'], ['{S2}', '0.4 L', '0.3 L', '0.5 L', '0.4 L', '1.6 L'], ['{S1}', '0.9 L', '1.2 L', '0.8 L', '0.0 L', '2.9 L']], { filters: [['Tree Type', 'Supplier', 'select'], ['Based On', 'Value', 'select'], ['Company', '{C}', 'select'], ['From Date', '01-04-2026'], ['To Date', '31-03-2027'], ['Range', 'Monthly', 'select']] });
  R('Purchase Order Analysis', ['Date', 'Purchase Order', 'Supplier', 'Qty:r', 'Received Qty:r', 'Pending Amount (INR):r', 'Status:pill'], [['15-09-2026', 'PUR-ORD-2026-00002', '{S3}', '1,500', '1,500', '0.00', 'Completed'], ['10-10-2026', 'PUR-ORD-2026-00001', '{S2}', '30', '0', '21,420.00', 'To Receive and Bill']], { filters: [['Company', '{C}', 'select'], ['From Date', '01-04-2026'], ['To Date', '19-10-2026'], ['Purchase Order', ''], ['Status', '', 'select'], ['Group by Purchase Order', 1, 'check']] });
  R('Procurement Tracker', ['Material Request', 'Item', 'Purchase Order', 'Supplier', 'Ordered Qty:r', 'Received Qty:r'], [['MAT-MR-2026-00001', '{RM2}', 'PUR-ORD-2026-00001', '{S2}', '30', '0'], ['MAT-MR-2026-00002', '{RM3}', '', '', '0', '0']], { filters: [['Company', '{C}', 'select'], ['Cost Center', ''], ['Project', ''], ['From Date', '01-04-2026'], ['To Date', '19-10-2026']] });
  ST('Buying Settings', [['Defaults', [['Supplier Naming By', 'Supplier Name'], ['Default Supplier Group', 'Raw Material'], ['Default Buying Price List', 'Standard Buying']]], ['Transaction Settings', [['Purchase Order Required for Purchase Invoice', 'No'], ['Purchase Receipt Required for Purchase Invoice', 'No'], ['Maintain Same Rate Throughout Purchase Cycle', 'Yes']]]]);
  L('Supplier Group', ['Supplier Group Name', 'Parent Supplier Group', 'Is Group:check'], [['All Supplier Groups', '', '1'], ['Raw Material', 'All Supplier Groups', '0'], ['Services', 'All Supplier Groups', '0']]);
  L('Supplier Scorecard', ['Supplier', 'Current Score:r', 'Status:pill', 'Period'], [['{S3}', '86', 'Excellent', 'Per Month'], ['{S1}', '72', 'Good', 'Per Month'], ['{S2}', '58', 'Average', 'Per Month']]);

  /* ---------- Stock ---------- */
  L('Stock Reconciliation', ['Purpose', 'Status:pill', 'Posting Date', 'ID'], [['Opening Stock', 'Submitted', '01-04-2026', 'MAT-RECO-2026-00001'], ['Stock Reconciliation', 'Submitted', '30-09-2026', 'MAT-RECO-2026-00002']]);
  L('Pick List', ['Purpose', 'Status:pill', 'Customer', 'ID'], [['Delivery', 'Completed', '{C3}', 'STO-PICK-2026-00001'], ['Delivery', 'Open', '{C1}', 'STO-PICK-2026-00002']]);
  R('Stock Ledger', ['Date', 'Item', 'Warehouse', 'In Qty:r', 'Out Qty:r', 'Balance Qty:r', 'Voucher Type', 'Voucher #'], [['01-09-2026', '{RM1}', 'Stores - {A}', '3,200', '', '3,200', 'Stock Entry', 'MAT-STE-2026-00001'], ['24-09-2026', '{RM1}', 'Stores - {A}', '1,500', '', '4,700', 'Purchase Receipt', 'MAT-PRE-2026-00001'], ['08-10-2026', '{RM1}', 'Stores - {A}', '', '400', '4,300', 'Stock Entry', 'MAT-STE-2026-00003']], { filters: [['Company', '{C}', 'select'], ['From Date', '01-09-2026'], ['To Date', '19-10-2026'], ['Warehouse', ''], ['Item', ''], ['Item Group', ''], ['Batch No', ''], ['Voucher #', '']] });
  R('Stock Projected Qty', ['Item', 'Warehouse', 'Actual Qty:r', 'Ordered Qty:r', 'Reserved Qty:r', 'Projected Qty:r'], [['{RM1}', 'Stores - {A}', '4,300', '0', '0', '4,300'], ['{FG1}', 'Finished Goods - {A}', '515', '0', '0', '515'], ['{RM2}', 'Stores - {A}', '120', '30', '0', '150']], { filters: [['Company', '{C}', 'select'], ['Warehouse', ''], ['Item', ''], ['Item Group', ''], ['Brand', ''], ['Include UOM', '']] });
  R('Stock Ageing', ['Item', 'Warehouse', 'Available Qty:r', '0-30:r', '30-60:r', '60-90:r', '90-120:r'], [['{RM1}', 'Stores - {A}', '4,300', '1,900', '2,400', '0', '0'], ['{FG2}', 'Finished Goods - {A}', '120', '40', '80', '0', '0']], { filters: [['Company', '{C}', 'select'], ['As On Date', '19-10-2026'], ['Warehouse', ''], ['Item', ''], ['Ageing Range', '30, 60, 90, 120'], ['Show Warehouse-wise Stock', 0, 'check']] });
  L('Warehouse', ['Warehouse Name', 'Parent Warehouse', 'Is Group:check'], [['Stores - {A}', 'All Warehouses - {A}', '0'], ['Finished Goods - {A}', 'All Warehouses - {A}', '0'], ['Work In Progress - {A}', 'All Warehouses - {A}', '0']]);
  L('UOM', ['UOM Name', 'Must be Whole Number:check'], [['Nos', '1'], ['Kg', '0'], ['Mtr', '0']]);
  L('Batch', ['Batch ID', 'Item', 'Manufacturing Date', 'Expiry Date'], [['B-2610-001', '{FG1}', '06-10-2026', ''], ['B-2610-002', '{FG2}', '16-10-2026', '']]);
  L('Serial No', ['Serial No', 'Item Code', 'Warehouse', 'Status:pill'], [['SN-000124', '{FG1}', 'Finished Goods - {A}', 'Active'], ['SN-000125', '{FG1}', 'Finished Goods - {A}', 'Active'], ['SN-000098', '{FG1}', '', 'Delivered']]);
  ST('Stock Settings', [['Defaults', [['Item Naming By', 'Item Code'], ['Default Warehouse', 'Stores - {A}'], ['Default Valuation Method', 'Moving Average']]], ['Stock Validations', [['Allow Negative Stock', 'No'], ['Auto Insert Item Price If Missing', 'Yes']]]]);

  /* ---------- Manufacturing ---------- */
  L('Production Plan', ['Status:pill', 'Posting Date', 'Total Planned Qty:r', 'ID'], [['Completed', '01-10-2026', '100', 'MFG-PP-2026-00001'], ['In Process', '15-10-2026', '40', 'MFG-PP-2026-00002'], ['Draft', '19-10-2026', '250', 'MFG-PP-2026-00003']]);
  R('Work Order Summary', ['Work Order', 'Item', 'Status:pill', 'Qty to Manufacture:r', 'Produced Qty:r'], [['MFG-WO-2026-00001', '{FG1}', 'Completed', '100', '100'], ['MFG-WO-2026-00002', '{FG2}', 'In Process', '40', '0']], { filters: [['Company', '{C}', 'select'], ['Based On', 'Creation Date', 'select'], ['From Date', '01-04-2026'], ['To Date', '19-10-2026'], ['Status', '', 'select'], ['Charts Based On', 'Status', 'select']] });
  R('Production Planning Report', ['Item', 'Warehouse', 'Required Qty:r', 'Available Qty:r', 'Shortage:r'], [['{RM1}', 'Stores - {A}', '96', '4,300', '0'], ['{RM2}', 'Stores - {A}', '2', '120', '0']], { filters: [['Company', '{C}', 'select'], ['Based On', 'Sales Order', 'select'], ['Document Name', ''], ['Raw Material Based On', 'Work Order', 'select']] });
  R('BOM Search', ['BOM', 'Item', 'Is Active:check', 'Is Default:check'], [['BOM-{FG1C}-001', '{FG1}', '1', '1'], ['BOM-{FG2C}-001', '{FG2}', '1', '1']], { filters: [['Item 1', ''], ['Item 2', ''], ['Item 3', ''], ['Item 4', ''], ['Item 5', ''], ['Search Sub Assemblies', 0, 'check']] });
  L('Subcontracting Order', ['Supplier', 'Status:pill', 'Date', 'ID'], [['{S1}', 'Completed', '02-10-2026', 'SC-ORD-2026-00001'], ['{S2}', 'Open', '14-10-2026', 'SC-ORD-2026-00002']]);
  L('Subcontracting Receipt', ['Supplier', 'Status:pill', 'Date', 'ID'], [['{S1}', 'Completed', '09-10-2026', 'MAT-SCR-2026-00001'], ['{S2}', 'Draft', '18-10-2026', 'MAT-SCR-2026-00002']]);
  L('Subcontracting BOM', ['Finished Good', 'Service Item', 'Is Active:check'], [['{FG1}', 'Dyeing Service', '1'], ['{FG2}', 'Embroidery Service', '1']]);
  ST('BOM Update Tool', [['Replace BOM', [['Current BOM', 'BOM-{FG1C}-001'], ['New BOM', '']]], ['Update Cost', [['Update latest price in all BOMs', 'Click to update']]]]);
  ST('BOM Comparison Tool', [['Compare', [['BOM 1', 'BOM-{FG1C}-001'], ['BOM 2', 'BOM-{FG2C}-001']]]]);
  L('Workstation', ['Workstation Name', 'Workstation Type', 'Hour Rate (INR):r', 'Status:pill'], [['Cutting Table 1', 'Cutting', '450.00', 'Production'], ['Juki Line A', 'Stitching', '620.00', 'Production'], ['Finishing Bay', 'Finishing', '380.00', 'Idle']]);
  L('Operation', ['Operation', 'Default Workstation'], [['Cutting', 'Cutting Table 1'], ['Stitching', 'Juki Line A'], ['Finishing', 'Finishing Bay']]);
  L('Routing', ['Routing Name', 'Operations'], [['Standard Garment Routing', 'Cutting → Stitching → Finishing'], ['Quick Finish', 'Stitching → Finishing']]);
  L('Plant Floor', ['Floor Name', 'Company', 'Warehouse'], [['Ground Floor - Cutting', '{C}', 'Work In Progress - {A}'], ['First Floor - Stitching', '{C}', 'Work In Progress - {A}']]);
  ST('Manufacturing Settings', [['BOM and Production', [['Update BOM Cost Automatically', 'Yes'], ['Backflush Raw Materials Based On', 'BOM'], ['Allow Overtime', 'No']]], ['Default Warehouses', [['Default Work In Progress Warehouse', 'Work In Progress - {A}'], ['Default Finished Goods Warehouse', 'Finished Goods - {A}']]]]);

  /* ---------- Projects ---------- */
  L('Project Template', ['Name', 'Project Type'], [['Store Fit-out', 'External'], ['Catalogue Shoot', 'External'], ['Annual Audit', 'Internal']]);
  R('Timesheet Billing Summary', ['Employee', 'Timesheet', 'Billable Hours:r', 'Billing Amount (INR):r'], [['Vikram Mehta', 'TS-2026-00001', '8', '12,000.00'], ['Ananya Rao', 'TS-2026-00002', '6', '9,000.00']], { filters: [['Employee', ''], ['From Date', '01-10-2026'], ['To Date', '19-10-2026'], ['Group By', 'Employee', 'select'], ['Include Draft Timesheets', 0, 'check']] });
  R('Delayed Tasks Summary', ['Task', 'Subject', 'Expected End', 'Status:pill', 'Delay (Days):r'], [['TASK-2026-00002', 'Fixture vendor shortlist', '25-10-2026', 'Working', '0'], ['TASK-2026-00004', 'Final lighting plan sign-off', '12-10-2026', 'Overdue', '7'], ['TASK-2026-00005', 'Order display fixtures', '15-10-2026', 'Overdue', '4']], { filters: [['From Date', '01-10-2026'], ['To Date', '19-10-2026'], ['Priority', '', 'select'], ['Status', '', 'select']] });
  L('Activity Type', ['Activity Type', 'Default Costing Rate:r', 'Default Billing Rate:r'], [['Consulting', '900.00', '1,500.00'], ['Site Visit', '700.00', '1,500.00'], ['Planning', '800.00', '1,200.00']]);
  L('Activity Cost', ['Employee', 'Activity Type', 'Costing Rate:r', 'Billing Rate:r'], [['Vikram Mehta', 'Site Visit', '700.00', '1,500.00'], ['Ananya Rao', 'Consulting', '900.00', '1,500.00']]);
  L('Project Type', ['Project Type'], [['External'], ['Internal'], ['Other']]);
  ST('Projects Settings', [['Timesheets', [['Ignore User Time Overlap', 'No'], ['Ignore Workstation Time Overlap', 'No']]]]);

  /* ---------- Assets ---------- */
  L('Asset Maintenance', ['Asset Name', 'Maintenance Team', 'Item Code'], [['CNC Lathe Machine - Line 1', 'Plant Maintenance', 'CNC Lathe Machine'], ['Delivery Van - MH 04 KL 2291', 'Fleet', 'Delivery Van - Tata Ace']]);
  L('Asset Repair', ['Asset', 'Repair Status:pill', 'Failure Date', 'Repair Cost (INR):r'], [['CNC Lathe Machine - Line 1', 'Completed', '12-08-2026', '18,500.00'], ['Delivery Van - MH 04 KL 2291', 'Pending', '15-10-2026', '6,200.00']]);
  L('Asset Value Adjustment', ['Asset', 'Date', 'Current Value:r', 'New Value:r'], [['CNC Lathe Machine - Line 1', '30-09-2026', '13,45,000.00', '13,00,000.00'], ['Workstations - Accounts Bay', '30-09-2026', '1,37,000.00', '1,30,000.00']]);
  R('Fixed Asset Register', ['Asset', 'Asset Category', 'Location', 'Purchase Amount:r', 'Accumulated Depreciation:r', 'Net Value:r'], [['CNC Lathe Machine - Line 1', 'Plant and Machinery', 'Factory', '14,50,000.00', '72,500.00', '13,77,500.00'], ['Delivery Van - MH 04 KL 2291', 'Vehicles', 'Warehouse', '6,85,000.00', '35,700.00', '6,49,300.00'], ['Workstations - Accounts Bay', 'Furniture', 'Head Office', '1,42,000.00', '4,700.00', '1,37,300.00']], { filters: [['Company', '{C}', 'select'], ['Status', 'In Location', 'select'], ['Filter Based On', 'Fiscal Year', 'select'], ['From Fiscal Year', '2026-2027', 'select'], ['Asset Category', ''], ['Group By', '', 'select']] });
  R('Asset Depreciation Ledger', ['Asset', 'Depreciation Date', 'Depreciation Amount:r', 'Accumulated:r'], [['CNC Lathe Machine - Line 1', '30-09-2026', '12,083.00', '72,500.00'], ['Delivery Van - MH 04 KL 2291', '30-09-2026', '7,135.00', '35,700.00']], { filters: [['Company', '{C}', 'select'], ['From Date', '01-04-2026'], ['To Date', '31-03-2027'], ['Asset', ''], ['Asset Category', '']] });
  L('Asset Category', ['Asset Category Name', 'Depreciation Method', 'Useful Life (Years):r'], [['Computers', 'Straight Line', '3'], ['Vehicles', 'Straight Line', '8'], ['Plant and Machinery', 'Straight Line', '10']]);
  L('Location', ['Location Name', 'Parent Location', 'Is Group:check'], [['Head Office', 'India', '0'], ['Factory', 'India', '0'], ['Warehouse', 'India', '0']]);

  /* ---------- Quality ---------- */
  L('Quality Inspection Template', ['Template Name', 'Parameters'], [['Fabric Incoming', 'GSM, Shade, Width'], ['Finished Shirt', 'Stitching, Measurements, Packing']]);
  L('Quality Procedure', ['Procedure', 'Process Owner', 'Is Group:check'], [['Incoming Material Inspection', 'Priya Nair', '0'], ['In-line Stitching Check', 'Ananya Rao', '0'], ['Final Audit', 'Vikram Mehta', '0']]);
  L('Quality Goal', ['Goal', 'Frequency', 'Procedure'], [['Incoming rejection below 2%', 'Monthly', 'Incoming Material Inspection'], ['Zero customer returns', 'Quarterly', 'Final Audit']]);
  L('Quality Review', ['Goal', 'Date', 'Status:pill'], [['Incoming rejection below 2%', '30-09-2026', 'Passed'], ['Zero customer returns', '30-09-2026', 'Failed']]);
  L('Quality Meeting', ['Date', 'Status:pill', 'Agenda'], [['05-10-2026', 'Closed', 'September rejections review'], ['02-11-2026', 'Open', 'Supplier scorecard follow-up']]);

  /* ---------- Support ---------- */
  L('Warranty Claim', ['Customer', 'Status:pill', 'Item', 'Complaint Date', 'ID'], [['{C1}', 'Open', '{FG1}', '14-10-2026', 'SER-WRN-2026-00001'], ['{C2}', 'Closed', '{FG2}', '02-10-2026', 'SER-WRN-2026-00002']]);
  L('Maintenance Schedule', ['Customer', 'Status:pill', 'Transaction Date', 'ID'], [['{C1}', 'Submitted', '01-10-2026', 'MAT-MSH-2026-00001'], ['{C3}', 'Draft', '18-10-2026', 'MAT-MSH-2026-00002']]);
  L('Service Level Agreement', ['Service Level', 'Document Type', 'Default:check', 'Enabled:check'], [['Default SLA', 'Issue', '1', '1'], ['Premium Customers', 'Issue', '0', '1']]);
  L('Issue Type', ['Issue Type'], [['Machine Breakdown'], ['Billing'], ['Training']]);
  L('Issue Priority', ['Priority'], [['Low'], ['Medium'], ['High']]);
  ST('Support Settings', [['Issues', [['Close Issue After Days', '7'], ['Allow Resetting Service Level Agreement', 'Yes']]]]);

  /* ---------- CRM ---------- */
  L('Prospect', ['Company Name', 'Industry', 'No. of Employees', 'Territory'], [['Kulkarni & Sons', 'Retail', '51-200', 'West India'], ['Reddy Exports', 'Textile', '201-500', 'South India']]);
  L('Contact', ['Full Name', 'Email', 'Mobile', 'Linked To'], [['Neha Kulkarni', 'neha@kulkarnisons.in', '+91 99870 22314', 'Kulkarni & Sons'], ['Arjun Reddy', 'arjun@reddyexports.in', '+91 90004 81726', 'Reddy Exports'], ['Kavya Iyer', 'kavya@iyerhome.in', '+91 98450 66120', 'Iyer Home Stores']]);
  L('Campaign', ['Campaign Name', 'Description'], [['Diwali 2026', 'Festive offers to retail customers'], ['Trade Fair Surat', 'Leads from Surat textile fair']]);
  R('Lead Details', ['Lead', 'Organization', 'Source', 'Status:pill', 'Owner'], [['CRM-LEAD-2026-00001', 'Kulkarni & Sons', 'Trade Show', 'Opportunity', 'Ananya Rao'], ['CRM-LEAD-2026-00002', 'Reddy Exports', 'Website', 'Open', 'Ananya Rao'], ['CRM-LEAD-2026-00003', 'Iyer Home Stores', 'Website', 'Open', 'Rahul Kapoor']], { filters: [['Company', '{C}', 'select'], ['From Date', '01-04-2026'], ['To Date', '19-10-2026'], ['Status', '', 'select'], ['Territory', '']] });
  R('Opportunity Summary by Sales Stage', ['Sales Stage', 'Count:r', 'Amount (INR):r'], [['Qualification', '1', '1,95,000.00'], ['Proposal/Price Quote', '1', '4,16,000.00']], { filters: [['Based On', 'Opportunity Owner', 'select'], ['Data Based On', 'Number', 'select'], ['Opportunity Source', ''], ['Opportunity Type', '']] });
  ST('CRM Settings', [['Settings', [['Campaign Naming By', 'Campaign Name'], ['Allow Lead Duplication based on Emails', 'No'], ['Auto Creation of Contact', 'Yes'], ['Close Replied Opportunity After Days', '15']]]]);
  L('Lead Source', ['Source Name'], [['Website'], ['IndiaMART'], ['Trade Show']]);
  L('Sales Stage', ['Stage Name'], [['Prospecting'], ['Qualification'], ['Proposal/Price Quote']]);

  /* ---------- tree views (these open as trees in ERPNext) ---------- */
  TR('Cost Center', [['{C}', [['Main - {A}', [['Production - {A}'], ['Marketing - {A}'], ['Administration - {A}']]]]]], true);
  TR('Item Group', [['All Item Groups', [['Products'], ['Raw Material'], ['Consumable'], ['Services'], ['Sub Assemblies']]]]);
  TR('Customer Group', [['All Customer Groups', [['Commercial'], ['Retail'], ['Dealer'], ['Individual'], ['Government']]]]);
  TR('Supplier Group', [['All Supplier Groups', [['Raw Material'], ['Services'], ['Hardware'], ['Local'], ['Distributor']]]]);
  TR('Territory', [['All Territories', [['India', [['West India', [['Maharashtra'], ['Gujarat']]], ['South India', [['Tamil Nadu'], ['Karnataka'], ['Telangana']]], ['North India', [['Delhi'], ['Rajasthan']]]]], ['Rest Of The World']]]]);
  TR('Warehouse', [['All Warehouses - {A}', [['Stores - {A}'], ['Work In Progress - {A}'], ['Finished Goods - {A}'], ['Goods In Transit - {A}'], ['Rejected Warehouse - {A}']]]], true);
  TR('Location', [['India', [['Head Office'], ['Factory'], ['Warehouse'], ['Branch Office']]]]);
  TR('Department', [['All Departments', [['Accounts - {A}'], ['Production - {A}'], ['Sales - {A}'], ['Purchase - {A}'], ['Quality - {A}']]]], true);

  global.ERPViews = V;
})(window);
