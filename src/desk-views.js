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
