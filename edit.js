/* Edit mode. Open the page with ?edit to type on it; nothing is saved to the live site.
   Changes are kept in this browser and exported as text with "Copy my edits". */
(function () {
  if (!/[?&]edit\b/.test(location.search)) return;
  var PAGE = location.pathname.replace(/\/$/, '/index.html'), KEY = 'g2g-edits-v1:' + PAGE, store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  function clean(el) {                                   // text, with <b> kept as **bold**
    var c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('b,strong'), function (b) { b.replaceWith('**' + b.textContent + '**'); });
    Array.prototype.forEach.call(c.querySelectorAll('br'), function (b) { b.replaceWith('\n'); });
    return c.textContent.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim();
  }
  var els = document.querySelectorAll('main h1, main h2, main h3, main p:not(.wordmark), main li, .nav a.link, a.btn');
  var originals = {}, n = 0;
  document.documentElement.classList.add('editing');
  Array.prototype.forEach.call(els, function (el) {
    if (el.closest('footer')) return;
    var id = 't' + ('0' + (++n)).slice(-2);
    el.setAttribute('data-edit', id); el.setAttribute('contenteditable', 'true'); el.setAttribute('spellcheck', 'true');
    originals[id] = { html: el.innerHTML, text: clean(el) };
    if (store[id] != null) el.innerHTML = store[id];
    function mark() { el.classList.toggle('changed', clean(el) !== originals[id].text); }
    mark();
    el.addEventListener('input', function () {
      if (clean(el) === originals[id].text) delete store[id]; else store[id] = el.innerHTML;
      save(); mark(); count();
    });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
    el.addEventListener('paste', function (e) {
      e.preventDefault();
      var t = (e.clipboardData || window.clipboardData).getData('text').replace(/\s+/g, ' ');
      document.execCommand('insertText', false, t);
    });
  });
  document.addEventListener('click', function (e) { var a = e.target.closest('a'); if (a && !a.closest('.editbar')) e.preventDefault(); }, true);

  var bar = document.createElement('div'); bar.className = 'editbar';
  bar.innerHTML = '<span><b>Edit mode.</b> Click any text and type. <span id="ecount"></span></span>' +
    '<button type="button" id="ecopy">Copy my edits</button><button type="button" class="quiet" id="ereset">Reset</button>';
  document.body.appendChild(bar);
  function changed() { return Object.keys(originals).filter(function (id) { var el = document.querySelector('[data-edit="' + id + '"]'); return clean(el) !== originals[id].text; }); }
  function count() { var c = changed().length; document.getElementById('ecount').textContent = c ? c + (c === 1 ? ' change' : ' changes') + ' so far.' : 'No changes yet.'; }
  count();
  function report() {
    var ids = changed(); if (!ids.length) return '';
    return 'GateToGate site edits, page ' + PAGE + '\n\n' + ids.map(function (id) {
      var el = document.querySelector('[data-edit="' + id + '"]');
      return '[' + id + '] was: ' + originals[id].text + '\n      now: ' + clean(el);
    }).join('\n\n') + '\n';
  }
  document.getElementById('ecopy').addEventListener('click', function () {
    var old = document.querySelector('.editout'); if (old) old.remove();
    var txt = report();
    var box = document.createElement('div'); box.className = 'editout';
    if (!txt) { box.innerHTML = '<p>No changes yet. Click any text on the page and type.</p>'; document.body.appendChild(box); setTimeout(function () { box.remove(); }, 2500); return; }
    box.innerHTML = '<p id="emsg">Select all of this, copy it, and paste it to Claude.</p><textarea readonly></textarea>';
    document.body.appendChild(box);
    var ta = box.querySelector('textarea'); ta.value = txt; ta.focus(); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(function () { done(); }, function () {});
    function done() { document.getElementById('emsg').textContent = 'Copied. Paste it to Claude. (The text is also below.)'; }
    if (ok) done();
  });
  document.getElementById('ereset').addEventListener('click', function () {
    if (!changed().length) return;
    store = {}; save();
    Object.keys(originals).forEach(function (id) { var el = document.querySelector('[data-edit="' + id + '"]'); el.innerHTML = originals[id].html; el.classList.remove('changed'); });
    var old = document.querySelector('.editout'); if (old) old.remove();
    count();
  });
})();
