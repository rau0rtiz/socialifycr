/**
 * Runtime para documentos tipo "formulario".
 *
 * Toma un HTML pensado para imprimir (cajas vacías, listas de opciones,
 * checkboxes decorativos, escalas 1-5) y lo convierte en un formulario
 * interactivo: campos editables, opciones clickeables, autosave en el
 * navegador y botón de enviar.
 *
 * La comunicación con la app pasa por postMessage:
 *  - iframe → parent: { type: 'sform:ready' | 'sform:change' | 'sform:submit' }
 *  - parent → iframe: { type: 'sform:restore', values } | { type: 'sform:submitted' }
 */

export interface FormAnswer {
  id: string;
  label: string;
  type: string;
  value: string;
}

const RUNTIME_CSS = `
<style id="sform-style">
  .sform-input {
    outline: none;
    background: rgba(233,119,44,.05);
    border-bottom: 1.5px solid rgba(233,119,44,.35);
    border-radius: 6px;
    padding: 3px 6px;
    min-height: 1.2em;
    transition: background .15s, border-color .15s;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
    white-space: pre-wrap;
    word-break: break-word;
    display: block;
  }
  .sform-input:focus { background: rgba(233,119,44,.11); border-color: #E9772C; }
  .sform-input:empty::before { content: attr(data-ph); color: #B4AEA4; }
  .sform-input.sform-fill { display: inline-block; min-width: 120px; vertical-align: baseline; }
  .sform-opt {
    cursor: pointer; border-radius: 999px; padding: 3px 10px; list-style: none;
    border: 1.2px solid rgba(26,25,22,.16); display: inline-block; margin: 0 4px 5px 0;
    transition: all .12s; user-select: none;
  }
  .sform-opt:hover { border-color: rgba(233,119,44,.6); }
  .sform-opt[data-on="1"] { background: #E9772C; border-color: #E9772C; color: #fff; font-weight: 600; }
  ul.sform-opts { list-style: none !important; padding-left: 0 !important; margin: 4px 0 0 0 !important; }
  ul.sform-opts li::before { content: none !important; }
  .sform-cb {
    cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    width: 18px; height: 18px; border-radius: 6px;
    border: 1.5px solid rgba(26,25,22,.3); background: transparent; vertical-align: middle;
    position: relative; transition: all .12s; box-sizing: border-box; flex: none;
    color: #E9772C; font-size: 15px; font-weight: 700; line-height: 1;
  }
  .sform-cb:hover { border-color: rgba(233,119,44,.7); }
  .sform-cb[data-on="1"] { background: transparent; border-color: transparent; }
  .sform-cb[data-on="1"]::after {
    content: "✓"; position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    color: #E9772C;
  }


  .sform-dot { cursor: pointer; transition: all .12s; }
  .sform-dot[data-on="1"] { background: #E9772C !important; border-color: #E9772C !important; color: #fff !important; font-weight: 700; }
  .sform-bar {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 99999;
    background: #121110; color: #F6F1E8; padding: 10px 16px;
    display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
    box-shadow: 0 -8px 24px rgba(0,0,0,.18);
    font-family: 'Inter', system-ui, sans-serif;
  }
  .sform-bar input {
    background: rgba(246,241,232,.08); border: 1px solid rgba(246,241,232,.18); color: #F6F1E8;
    border-radius: 8px; padding: 8px 11px; font-size: 13px; font-family: inherit; min-width: 150px; flex: 1 1 150px;
  }
  .sform-bar input::placeholder { color: rgba(246,241,232,.45); }
  .sform-bar button {
    background: #E9772C; color: #fff; border: 0; border-radius: 8px; padding: 9px 20px;
    font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
  }
  .sform-bar button:disabled { opacity: .6; cursor: default; }
  .sform-status { font-size: 11.5px; color: rgba(246,241,232,.6); flex: 1 1 100%; }
  .sform-done {
    position: fixed; inset: 0; z-index: 100000; background: rgba(18,17,16,.96); color: #F6F1E8;
    display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 10px;
    text-align: center; padding: 32px; font-family: 'Inter', system-ui, sans-serif;
  }
  .sform-done h2 { font-size: 24px; font-weight: 800; font-family: 'Sora', system-ui, sans-serif; }
  .sform-done p { font-size: 14px; color: rgba(246,241,232,.7); max-width: 420px; }
  body { padding-bottom: 120px !important; }
  @media print { .sform-bar { display: none !important; } body { padding-bottom: 0 !important; } }
</style>
`;

const RUNTIME_JS = String.raw`
<script id="sform-runtime">
(function () {
  var post = function (msg) { try { parent.postMessage(msg, '*'); } catch (e) {} };
  var seq = 0;
  var nextId = function (p) { seq++; return p + seq; };
  var txt = function (el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; };

  var labelFor = function (el) {
    var scope = el.closest('.f, td, li, div');
    var hops = 0;
    while (scope && hops < 5) {
      var q = scope.querySelector(':scope > .q, :scope > .qs, :scope > h3, :scope > h2');
      if (q && txt(q)) return txt(q).slice(0, 220);
      scope = scope.parentElement; hops++;
    }
    var prev = el.previousElementSibling;
    while (prev) {
      if (txt(prev)) return txt(prev).slice(0, 220);
      prev = prev.previousElementSibling;
    }
    return 'Campo';
  };

  var fields = [];

  var addText = function (el, kind, cls, ph) {
    var box = document.createElement(kind === 'fill' ? 'span' : 'div');
    box.className = 'sform-input ' + cls;
    box.setAttribute('contenteditable', 'true');
    box.setAttribute('data-ph', ph || '');
    box.id = nextId('f');
    if (kind === 'area') box.style.minHeight = (el.offsetHeight || 46) + 'px';
    el.parentNode.replaceChild(box, el);
    fields.push({ id: box.id, type: 'text', label: labelFor(box), get: function () { return txt(box); }, set: function (v) { box.textContent = v || ''; }, el: box });
  };

  // 1. Cajas de escritura, renglones y líneas cortas
  Array.prototype.forEach.call(document.querySelectorAll('.box-write'), function (el) { addText(el, 'area', 'sform-area', 'Escribí acá…'); });
  Array.prototype.forEach.call(document.querySelectorAll('.lines'), function (el) { addText(el, 'line', 'sform-line', 'Escribí acá…'); });
  Array.prototype.forEach.call(document.querySelectorAll('.fill'), function (el) { addText(el, 'fill', 'sform-fill', '—'); });

  // 2. Listas de opciones (selección única)
  Array.prototype.forEach.call(document.querySelectorAll('ul.opts'), function (ul) {
    ul.classList.add('sform-opts');
    var gid = nextId('g');
    ul.setAttribute('data-gid', gid);
    var items = Array.prototype.slice.call(ul.querySelectorAll(':scope > li'));
    items.forEach(function (li) {
      li.className = 'sform-opt';
      li.setAttribute('data-on', '0');
      li.addEventListener('click', function () {
        var on = li.getAttribute('data-on') === '1';
        items.forEach(function (x) { x.setAttribute('data-on', '0'); });
        li.setAttribute('data-on', on ? '0' : '1');
        changed();
      });
    });
    fields.push({
      id: gid, type: 'choice', label: labelFor(ul), el: ul,
      get: function () { var s = items.filter(function (x) { return x.getAttribute('data-on') === '1'; }); return s.map(function (x) { return txt(x); }).join(', '); },
      set: function (v) { items.forEach(function (x) { x.setAttribute('data-on', txt(x) === v ? '1' : '0'); }); }
    });
  });

  // 3. Escalas 1-5
  Array.prototype.forEach.call(document.querySelectorAll('.scale'), function (sc) {
    var gid = nextId('s');
    var dots = Array.prototype.slice.call(sc.querySelectorAll('.dot'));
    dots.forEach(function (d) {
      d.classList.add('sform-dot');
      d.setAttribute('data-on', '0');
      d.addEventListener('click', function () {
        var on = d.getAttribute('data-on') === '1';
        dots.forEach(function (x) { x.setAttribute('data-on', '0'); });
        d.setAttribute('data-on', on ? '0' : '1');
        changed();
      });
    });
    if (!dots.length) return;
    fields.push({
      id: gid, type: 'scale', label: labelFor(sc), el: sc,
      get: function () { var s = dots.filter(function (x) { return x.getAttribute('data-on') === '1'; }); return s.length ? txt(s[0]) : ''; },
      set: function (v) { dots.forEach(function (x) { x.setAttribute('data-on', txt(x) === v ? '1' : '0'); }); }
    });
  });

  // 4. Checkboxes: dentro de una fila de tabla = selección única por fila
  var rows = [];
  Array.prototype.forEach.call(document.querySelectorAll('.cb'), function (cb) {
    cb.classList.add('sform-cb');
    cb.setAttribute('data-on', '0');
    var tr = cb.closest('tr');
    if (tr && rows.indexOf(tr) === -1) rows.push(tr);
  });

  rows.forEach(function (tr) {
    var cbs = Array.prototype.slice.call(tr.querySelectorAll('.cb'));
    var table = tr.closest('table');
    var heads = table ? Array.prototype.slice.call(table.querySelectorAll('thead th')) : [];
    var rowLabel = txt(tr.querySelector('td')) || 'Ítem';
    var colLabel = function (cb) {
      var td = cb.closest('td');
      if (!td) return '';
      var idx = Array.prototype.indexOf.call(tr.children, td);
      return heads[idx] ? txt(heads[idx]) : String(idx);
    };
    cbs.forEach(function (cb) {
      cb.addEventListener('click', function () {
        var on = cb.getAttribute('data-on') === '1';
        cbs.forEach(function (x) { x.setAttribute('data-on', '0'); });
        cb.setAttribute('data-on', on ? '0' : '1');
        changed();
      });
    });
    fields.push({
      id: nextId('r'), type: 'row', label: rowLabel, el: tr,
      get: function () { var s = cbs.filter(function (x) { return x.getAttribute('data-on') === '1'; }); return s.length ? colLabel(s[0]) : ''; },
      set: function (v) { cbs.forEach(function (x) { x.setAttribute('data-on', colLabel(x) === v ? '1' : '0'); }); }
    });
  });

  // Checkboxes sueltos (fuera de tablas)
  Array.prototype.forEach.call(document.querySelectorAll('.cb'), function (cb) {
    if (cb.closest('tr')) return;
    cb.addEventListener('click', function () {
      cb.setAttribute('data-on', cb.getAttribute('data-on') === '1' ? '0' : '1');
      changed();
    });
    fields.push({
      id: nextId('c'), type: 'check', label: labelFor(cb), el: cb,
      get: function () { return cb.getAttribute('data-on') === '1' ? 'Sí' : ''; },
      set: function (v) { cb.setAttribute('data-on', v ? '1' : '0'); }
    });
  });

  var byId = {};
  fields.forEach(function (f) { byId[f.id] = f; });

  var collect = function () {
    return fields.map(function (f) { return { id: f.id, label: f.label, type: f.type, value: f.get() }; });
  };

  var timer = null;
  var status = null;
  function changed() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      post({ type: 'sform:change', answers: collect() });
      if (status) status.textContent = 'Guardado automáticamente en este dispositivo · ' + new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
    }, 500);
  }
  document.addEventListener('input', changed, true);

  // ---------- Snapshot estático con respuestas ----------
  var snapshot = function () {
    var clone = document.documentElement.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll('#sform-runtime, .sform-bar, .sform-done'), function (n) { n.remove(); });
    Array.prototype.forEach.call(clone.querySelectorAll('.sform-input'), function (n) {
      n.removeAttribute('contenteditable');
      n.style.background = 'rgba(233,119,44,.06)';
      if (!(n.textContent || '').trim()) n.removeAttribute('data-ph');
    });
    Array.prototype.forEach.call(clone.querySelectorAll('.sform-opt'), function (n) {
      if (n.getAttribute('data-on') !== '1') { n.style.opacity = '.35'; }
    });
    Array.prototype.forEach.call(clone.querySelectorAll('.sform-dot'), function (n) {
      if (n.getAttribute('data-on') !== '1') { n.style.opacity = '.35'; }
    });
    return '<!DOCTYPE html>' + clone.outerHTML;
  };

  // ---------- Barra de envío ----------
  var bar = document.createElement('div');
  bar.className = 'sform-bar';
  bar.innerHTML =
    '<input id="sform-name" placeholder="Tu nombre" autocomplete="name" />' +
    '<input id="sform-email" type="email" placeholder="Tu correo" autocomplete="email" />' +
    '<button id="sform-send" type="button">Enviar respuestas</button>' +
    '<div class="sform-status" id="sform-status">Tus respuestas se guardan solas en este dispositivo.</div>';
  document.body.appendChild(bar);
  status = bar.querySelector('#sform-status');
  var nameEl = bar.querySelector('#sform-name');
  var mailEl = bar.querySelector('#sform-email');
  var btn = bar.querySelector('#sform-send');

  nameEl.addEventListener('input', changed);
  mailEl.addEventListener('input', changed);

  btn.addEventListener('click', function () {
    if (!nameEl.value.trim()) { nameEl.focus(); status.textContent = 'Poné tu nombre antes de enviar.'; return; }
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    post({
      type: 'sform:submit',
      name: nameEl.value.trim(),
      email: mailEl.value.trim(),
      answers: collect(),
      html: snapshot()
    });
  });

  window.addEventListener('message', function (ev) {
    var d = ev.data || {};
    if (d.type === 'sform:restore') {
      (d.answers || []).forEach(function (a) { if (byId[a.id]) byId[a.id].set(a.value); });
      if (d.name) nameEl.value = d.name;
      if (d.email) mailEl.value = d.email;
      if ((d.answers || []).length) status.textContent = 'Recuperamos lo que habías llenado antes en este dispositivo.';
    }
    if (d.type === 'sform:error') {
      btn.disabled = false;
      btn.textContent = 'Enviar respuestas';
      status.textContent = d.message || 'No se pudo enviar. Intentá de nuevo.';
    }
    if (d.type === 'sform:submitted') {
      var done = document.createElement('div');
      done.className = 'sform-done';
      done.innerHTML = '<h2>¡Listo, gracias!</h2><p>Recibimos tus respuestas. Te vamos a escribir con los siguientes pasos.</p>';
      document.body.appendChild(done);
    }
  });

  post({ type: 'sform:ready', count: fields.length });
})();
</script>
`;

/**
 * Puente para documentos "wizard" (formularios paginados que traen su propio
 * motor y exponen `window.__sformWizard`). No transformamos nada del DOM:
 * solo conectamos autosave y envío por postMessage.
 */
const WIZARD_BRIDGE = String.raw`
<style id="sform-wizard-style">
  .sform-done {
    position: fixed; inset: 0; z-index: 100000; background: rgba(18,17,16,.96); color: #F6F1E8;
    display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 10px;
    text-align: center; padding: 32px; font-family: 'Inter', system-ui, sans-serif;
  }
  .sform-done h2 { font-size: 24px; font-weight: 800; font-family: 'Sora', system-ui, sans-serif; }
  .sform-done p { font-size: 14px; color: rgba(246,241,232,.72); max-width: 420px; }
</style>
<script id="sform-wizard-bridge">
(function () {
  var post = function (msg) { try { parent.postMessage(msg, '*'); } catch (e) {} };
  var start = function () {
    var api = window.__sformWizard;
    if (!api) return setTimeout(start, 60);
    api.onChange = function (answers, name, email) {
      post({ type: 'sform:change', answers: answers, name: name, email: email });
    };
    api.onSubmit = function (answers, name, email, html) {
      post({ type: 'sform:submit', answers: answers, name: name, email: email, html: html });
    };
    window.addEventListener('message', function (ev) {
      var d = ev.data || {};
      if (d.type === 'sform:restore') { try { api.setAnswers(d.answers || []); } catch (e) {} }
      if (d.type === 'sform:error') {
        if (api.fail) api.fail();
        try { alert(d.message || 'No se pudo enviar. Intentá de nuevo.'); } catch (e) {}
      }
      if (d.type === 'sform:submitted') {
        var done = document.createElement('div');
        done.className = 'sform-done';
        done.innerHTML = '<h2>¡Listo, gracias!</h2><p>Recibimos tus respuestas. Te vamos a escribir con los siguientes pasos.</p>';
        document.body.appendChild(done);
      }
    });
    post({ type: 'sform:ready', wizard: true });
  };
  start();
})();
</script>
`;

/** Detecta formularios que traen su propio motor paginado. */
export const isWizardForm = (source: string): boolean => /__sformWizard/.test(source || '');

/** Inyecta el runtime interactivo dentro del HTML del formulario. */
export const buildFormDocument = (source: string, title = 'Formulario'): string => {
  const base = source && source.trim()
    ? source
    : `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${title}</title></head><body><div class="f"><div class="q">Formulario vacío</div></div></body></html>`;
  const injection = isWizardForm(base) ? WIZARD_BRIDGE : RUNTIME_CSS + RUNTIME_JS;
  // Se inyecta en el ÚLTIMO </body> para no romper scripts que lo mencionen como texto.
  const at = base.toLowerCase().lastIndexOf('</body>');
  if (at >= 0) return `${base.slice(0, at)}${injection}${base.slice(at)}`;
  return base + injection;
};

