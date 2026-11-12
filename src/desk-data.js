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
