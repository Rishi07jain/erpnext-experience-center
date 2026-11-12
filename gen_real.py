#!/usr/bin/env python3
"""Turn the metadata scraped from a real ERPNext v16 site into src/desk-real.js.

Inputs (JSON, written while auditing the trial site):
  real/lists.json     list view columns + standard filters per DocType
  real/ftypes.json    field types for those columns
  real/sidebars.json  module sidebars (boot.module_sidebars)
  real/extra.json     {lists: new doctypes, singles: settings pages, reports: query reports}
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).parent
R = ROOT / 'real'

ICON = {
    'house': 'home', 'chart-column': 'dash', 'vault': 'squarex', 'receipt-text': 'file', 'banknote': 'cash',
    'notebook-pen': 'pencil', 'sheet': 'table', 'landmark': 'bank', 'badge-percent': 'percent', 'piggy-bank': 'piggy',
    'database': 'database', 'truck': 'truck', 'clipboard-list': 'clip', 'file-question-mark': 'file', 'file-text': 'file',
    'shopping-cart': 'cart', 'package-check': 'box', 'package': 'box', 'user-round': 'user', 'monitor': 'monitor',
    'warehouse': 'warehouse', 'arrow-left-right': 'swap', 'scale': 'calcheck', 'wrench': 'wrench', 'layers': 'listtree',
    'building': 'building', 'trending-down': 'chart', 'move': 'swap', 'table': 'table', 'sliders-horizontal': 'sliders',
    'list-tree': 'listtree', 'calendar-check': 'calcheck', 'factory': 'factory', 'shopping-bag': 'bag', 'users': 'users',
    'shield-check': 'shield', 'printer': 'print', 'mail': 'mail', 'plug': 'plug', 'settings': 'gear', 'building-2': 'building',
    'building-complex': 'building', 'clipboard-check': 'clip', 'target': 'badge', 'triangle-alert': 'badge', 'check-check': 'check',
    'folder-kanban': 'kanban', 'list-checks': 'clip', 'clock': 'calcheck', 'calendar-days': 'calcheck', 'calendar-check-2': 'calcheck',
    'grid-2x2-check': 'shield', 'notepad-text': 'table', 'users-round': 'users', 'lightbulb': 'file', 'user': 'user',
    'rocket': 'wrench', 'funnel': 'filter', 'store': 'store',
}
MODKEY = {'Accounts': 'accounting', 'Buying': 'procurement', 'Selling': 'sales', 'Stock': 'stock', 'Assets': 'assets',
          'Manufacturing': 'manufacturing', 'Quality': 'quality', 'Projects': 'projects', 'Support': 'support', 'CRM': 'crm',
          'Setup': 'home'}
# DocTypes the sandbox models as real documents (forms, tours); everything else is a read-only view
SIM = {'Customer', 'Supplier', 'Item', 'Account', 'Quotation', 'Sales Order', 'Delivery Note', 'Sales Invoice', 'Payment Entry',
       'Lead', 'Opportunity', 'Material Request', 'Purchase Order', 'Purchase Receipt', 'Purchase Invoice', 'Journal Entry',
       'Stock Entry', 'BOM', 'Work Order', 'Job Card', 'Project', 'Task', 'Timesheet', 'Quality Inspection', 'Non Conformance',
       'Quality Action', 'Issue', 'Maintenance Visit', 'Asset', 'Asset Movement', 'POS Opening Entry', 'POS Invoice', 'POS Closing Entry'}


MONTHS = ['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026', 'Jan 2027', 'Feb 2027', 'Mar 2027']
# column layouts for reports whose columns could not be read from the trial site (they need data to run)
FALLBACK_COLS = {
    'Budget Variance Report': ['Cost Center', 'Budget 2026-2027', 'Actual 2026-2027', 'Variance 2026-2027'],
    'Job Card Summary': ['Job Card', 'Posting Date', 'Status', 'Work Order', 'Production Item', 'Qty To Manufacture', 'Completed Qty', 'Total Time in Mins', 'Workstation', 'Operation'],
    'Material Requirements Planning Report': ['Item Code', 'Item Name', 'Warehouse', 'Required Qty', 'Available Qty', 'Safety Stock Qty', 'Ordered Qty', 'Shortage Qty'],
    'Asset Activity': ['Asset', 'Asset Name', 'Date', 'Activity Type', 'User'],
    'Stock Analytics': ['Item', 'Item Name', 'Item Group', 'UOM'] + MONTHS + ['Total'],
}


def load(name, default=None):
    p = R / name
    return json.loads(p.read_text()) if p.exists() else default


def leaf(it):
    kind, label, ltype, target = it[0], it[1], it[2], it[3]
    if ltype == 'DocType':
        if target in SIM:
            return 'dt:' + target + ('|' + label if label != target else '')
        return 'v:' + target + ('|' + label if label != target else '')
    if ltype == 'Report':
        return 'v:' + target + ('|' + label if label != target else '')
    if ltype == 'Page' and target == 'point-of-sale':
        return 'pos:Point of Sale'
    if label == 'Banking':
        return 'v:Bank Reconciliation Tool|Banking'
    return 'x:' + label


def sidebar(mod):
    out, group = [], None
    for it in mod['items']:
        kind, label, ltype, target, icon = it[:5]
        if kind == 'S':
            group = {'t': 'g', 'ic': ICON.get(icon, 'table'), 'label': label, 'kids': [leaf(k) for k in (it[5] if len(it) > 5 else [])]}
            out.append(group)
            continue
        if ltype == 'Workspace' and label == 'Home':
            out.append({'t': 'home' if target == 'Home' else 'ws', 'ic': 'home', 'label': 'Home'}); group = None; continue
        if ltype == 'Dashboard':
            out.append({'t': 'dash', 'ic': 'dash', 'label': label}); group = None; continue
        if group is not None and not icon:
            spec = leaf(it)
            if spec not in group['kids']:
                group['kids'].append(spec)
            continue
        group = None
        spec = leaf(it)
        t, rest = spec.split(':', 1)
        name, _, lab = rest.partition('|')
        if t == 'dt':
            out.append({'t': 'dt', 'ic': ICON.get(icon, 'file'), 'label': lab or name, 'dt': name})
        elif t == 'v':
            out.append({'t': 'v', 'ic': ICON.get(icon, 'file'), 'label': lab or name, 'view': name})
        else:
            out.append({'t': 'x', 'ic': ICON.get(icon, 'file'), 'label': label})
    return out


def main():
    lists = load('lists.json', {})
    ftypes = load('ftypes.json', {})
    extra = load('extra.json', {})
    for dt, v in (extra.get('lists') or {}).items():
        if v.get('err'):
            continue
        lists[dt] = {'c': [c[:3] for c in v['cols']], 'f': v['filters'], 's': v.get('sort', 'Created On'), 'a': v.get('add', '')}
        ftypes.setdefault(dt, {})
        for c in v['cols']:
            if len(c) > 3 and c[3]:
                ftypes[dt][c[0]] = c[3] + (':' + c[4] if c[3] in ('Link', 'Select') and len(c) > 4 and c[4] else '')
    out_lists = {}
    for dt, v in lists.items():
        ft = ftypes.get(dt, {})
        cols = [[c[0], c[1], c[2], ft.get(c[0], 'Data' if c[0] == 'name' else '')] for c in v['c']]
        out_lists[dt] = {'c': cols, 'f': v['f'], 's': v.get('s') or 'Created On'}
    side = {MODKEY[k]: sidebar(m) for k, m in (load('sidebars.json', {}) or {}).items() if k in MODKEY}
    singles = {}
    for dt, v in (extra.get('singles') or {}).items():
        if v.get('kind') == 'single':
            singles[dt] = [[s['label'], s['tab'], s['fields']] for s in v['secs']]
    reports = {}
    for name, v in (load('reports.json', {}) or {}).items():
        if v.get('err'):
            continue
        cols = [c if isinstance(c, list) else [c, ''] for c in v['cols'] if not (isinstance(c, str) and c.startswith('ERR'))]
        if not cols and name in FALLBACK_COLS:
            cols = [[c, 'Currency' if any(w in c for w in ('Budget', 'Actual', 'Variance')) else ('Float' if 'Qty' in c or c[:3] in ('Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Tot') else '')] for c in FALLBACK_COLS[name]]
        reports[name] = {'c': cols, 'f': v['vis'], 'chart': v.get('chart', False)}
    ws = {k: {'cards': [[c[0], [l for l in c[1] if not any(x in l[0] for x in ('UAE', 'South Africa', 'IRS', 'VAT'))]] for c in v['cards']]} for k, v in (load('workspaces.json', {}) or {}).items() if not v.get('err')}
    data = {'lists': out_lists, 'side': side, 'singles': singles, 'reports': reports, 'ws': ws}
    js = '/* Generated by gen_real.py from a real ERPNext v16 site: list columns, filters, sidebars, settings and report layouts. */\n'
    js += '(function () { window.ERPReal = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '; })();\n'
    (ROOT / 'src' / 'desk-real.js').write_text(js)
    print('lists', len(out_lists), 'side', len(side), 'singles', len(singles), 'reports', len(reports))


if __name__ == '__main__':
    main()
