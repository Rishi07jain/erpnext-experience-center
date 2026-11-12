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
