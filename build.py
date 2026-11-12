import pathlib, re
src = pathlib.Path('src')
page = (src/'page.html').read_text()
css = (src/'desk.css').read_text()
js = (src/'desk-data.js').read_text() + '\n' + (src/'desk-real.js').read_text() + '\n' + (src/'desk-views.js').read_text() + '\n' + (src/'desk-engine.js').read_text() + '\n' + (src/'desk-tour.js').read_text() + '\n' + (src/'desk-reports.js').read_text() + '\n' + (src/'desk-lists.js').read_text()

def standalone(out, name):
    cut = out.index('</style>') + len('</style>')
    head, body = out[:cut], out[cut:]
    std = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' + head + '\n</head>\n<body>\n' + body + '\n</body>\n</html>\n'
    pathlib.Path(name).write_text(std)
    print(name, len(std)//1024, 'KB')

# landing page
assert '/*DESK_CSS*/' in page and '/*DESK_JS*/' in page
out = page.replace('/*DESK_CSS*/', css).replace('/*DESK_JS*/', js)
pathlib.Path('erpnext-india.html').write_text(out)
print('built erpnext-india.html', len(out)//1024, 'KB')
standalone(out, 'erpnext-india-standalone.html')

# experience center: shared tokens, base, buttons and footer come from the landing page
style = page[page.index('<style>') + 7: page.index('/* top bar */')]
btns = page[page.index('/* buttons */'): page.index('/* type */')]
foot_css = page[page.index('footer { border-top'): page.index('/* scroll reveal')]
foot_resp = '@media (max-width: 900px) {\n  .foot { grid-template-columns: repeat(3, minmax(0, 1fr)); }\n  .foot > div:first-child { grid-column: 1 / -1; }\n}\n@media (max-width: 640px) {\n  .foot { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n}\n'
footer = page[page.index('<footer'): page.index('</footer>') + 9]
exp = (src/'experience.html').read_text()
exp = exp.replace('/*SHARED_CSS*/', style + btns + foot_css + foot_resp).replace('/*DESK_CSS*/', css).replace('<!--FOOTER-->', footer).replace('/*DESK_JS*/', js)
pathlib.Path('experience-center.html').write_text(exp)
print('built experience-center.html', len(exp)//1024, 'KB')
standalone(exp, 'experience-center-standalone.html')

# Frappe Builder: three Page Client Scripts (style, data, app) + one HTML block for the page
b = pathlib.Path('builder'); b.mkdir(exist_ok=True)
ex_style = exp[exp.index('<style>') + 7: exp.index('</style>')]
fonts = '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:opsz,wght@6..72,500&display=swap");\n\n'
(b/'erpnext-demo-style.css').write_text(fonts + ex_style.strip() + '\n')
data_js = '\n'.join((src/n).read_text() for n in ('desk-data.js', 'desk-real.js', 'desk-views.js'))
(b/'erpnext-demo-data.js').write_text(data_js)
app_js = '\n'.join((src/n).read_text() for n in ('desk-engine.js', 'desk-tour.js', 'desk-reports.js', 'desk-lists.js'))
page_js = exp[exp.index('<script>\n(function () {') + len('<script>\n'): exp.rindex('</script>')]
mount = """/* Builder mount: works with the page's HTML block, or builds the stage itself if the block is missing */
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
"""
page_js = page_js.strip()
assert page_js.startswith('(function () {') and page_js.endswith('})();')
body = page_js[len('(function () {'):-len('})();')]
app = app_js + '\n' + mount + body + '}\nif (document.readyState === \'loading\') document.addEventListener(\'DOMContentLoaded\', erpnextDemoMount); else erpnextDemoMount();\n'
(b/'erpnext-demo-app.js').write_text(app)
(b/'page-html-block.html').write_text('<main class="xstage">\n  <h1 class="sr">ERPNext Experience Center</h1>\n  <div class="xsandbox"><div id="erp-sandbox" role="region" aria-label="ERPNext sandbox"></div></div>\n</main>\n')
for f in sorted(b.iterdir()): print('builder/' + f.name, f.stat().st_size // 1024, 'KB')
