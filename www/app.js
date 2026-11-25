/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
const STORAGE_KEY = 'visiones_cashflow_v2';
const THEME_KEY = 'visiones_theme';
const APP_VERSION = '2.0.1';
const RELEASES_API = 'https://api.github.com/repos/kakycu/APKCashierYudira/releases/latest';
const RELEASES_PAGE = 'https://github.com/kakycu/APKCashierYudira/releases';

/* ============================================================
   PUENTE NATIVO (Capacitor) / FALLBACK WEB
   En el navegador no hay window.Capacitor: todo sigue funcionando
   con localStorage, navigator.clipboard y el modal web.
   ============================================================ */
const Cap = window.Capacitor || null;
const isNative = !!(Cap && typeof Cap.getPlatform === 'function' && Cap.getPlatform() !== 'web');
const NativePlugins = (Cap && Cap.Plugins) || {};

async function nativeCall(plugin, method, args = {}){
  const p = NativePlugins[plugin];
  if(!p || typeof p[method] !== 'function') return { ok:false, result:null };
  try{ return { ok:true, result: await p[method](args) }; }
  catch(e){ console.warn(`[nativo] ${plugin}.${method}:`, e); return { ok:false, result:null }; }
}

/* localStorage es la fuente de verdad dentro del WebView; Preferences
   se usa como copia persistente que se restaura al arrancar. */
async function hydrateStorage(){
  if(!isNative) return;
  for(const key of [STORAGE_KEY, THEME_KEY]){
    try{
      if(localStorage.getItem(key)) continue;
      const r = await nativeCall('Preferences','get',{ key });
      if(r.ok && r.result && typeof r.result.value === 'string') localStorage.setItem(key, r.result.value);
    }catch(e){}
  }
}

function mirrorToNative(key, value){
  if(!isNative) return;
  nativeCall('Preferences','set',{ key, value: String(value) });
}

const DEFAULT_DENOMS = [3,5,10,20,50,100,200,500,1000,2000,5000,10000,20000];

const COLORS = [
  '#5b8cff','#8b5cf6','#ec4899','#f59e0b','#22c55e','#06b6d4',
  '#ef4444','#a78bfa','#14b8a6','#f97316','#84cc16','#e879f9'
];

let state = {
  denoms: [...DEFAULT_DENOMS],
  allDenoms: [...DEFAULT_DENOMS],
  quantities: {},
  history: [],
  prefs: { confetti: true, autoSave: false, sound: true },
  currency: { code:'CUP', symbol:'$', locale:'es-CU' }
};

/* ============================================================
   TEMA
   ============================================================ */
function getPreferredTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  if(saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function updateThumbIcon(theme){
  const thumbIcon = document.getElementById('thumbIcon');
  if(!thumbIcon) return;
  thumbIcon.className = 'fas ' + (theme === 'dark' ? 'fa-moon' : 'fa-sun');
}

function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', theme === 'light' ? '#e8eef7' : '#0a0c10');
  localStorage.setItem(THEME_KEY, theme);
  mirrorToNative(THEME_KEY, theme);
  syncStatusBar(theme);
  updateThumbIcon(theme);
  const toggle = document.getElementById('themeToggle');
  if(toggle) toggle.setAttribute('aria-checked', theme === 'light' ? 'true' : 'false');
}

async function syncStatusBar(theme){
  if(!isNative) return;
  await nativeCall('StatusBar','setStyle',{ style: theme === 'light' ? 'DARK' : 'LIGHT' });
  await nativeCall('StatusBar','setBackgroundColor',{ color: theme === 'light' ? '#e8eef7' : '#0a0c10' });
}

function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  toast(next === 'light' ? 'Tema claro activado ☀️' : 'Tema oscuro activado 🌙', 'info');
  beep(next === 'light' ? 900 : 500, 50);
}

/* ============================================================
   PERSISTENCIA
   ============================================================ */
function saveState(){
  const toSave = {
    denoms: state.denoms,
    allDenoms: state.allDenoms,
    quantities: state.quantities,
    history: state.history,
    prefs: state.prefs,
    currency: state.currency
  };
  try{
    const raw = JSON.stringify(toSave);
    localStorage.setItem(STORAGE_KEY, raw);
    mirrorToNative(STORAGE_KEY, raw);
  }catch(e){}
  updateDrawerState();
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const data = JSON.parse(raw);
    if(Array.isArray(data.denoms) && data.denoms.length) state.denoms = data.denoms.map(Number).filter(n=>n>0);
    if(Array.isArray(data.allDenoms) && data.allDenoms.length) state.allDenoms = data.allDenoms.map(Number).filter(n=>n>0);
    if(data.quantities && typeof data.quantities === 'object') state.quantities = data.quantities;
    if(Array.isArray(data.history)) state.history = data.history;
    if(data.prefs && typeof data.prefs === 'object') state.prefs = { ...state.prefs, ...data.prefs };
    if(data.currency && data.currency.code) state.currency = data.currency;
  }catch(e){ console.warn('Load error', e); }
}

/* ============================================================
   HELPERS
   ============================================================ */
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function fmtMoney(n){
  try{
    return Number(n).toLocaleString(state.currency.locale || 'es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }catch(e){
    return Number(n).toFixed(2);
  }
}

function colorForDenom(denom){
  const idx = state.allDenoms.indexOf(denom);
  return COLORS[(idx < 0 ? denom : idx) % COLORS.length];
}

function iconForDenom(denom){
  if(denom >= 20000) return 'fa-money-bill-transfer';
  if(denom >= 5000) return 'fa-money-bill-wave';
  if(denom >= 1000) return 'fa-money-bill-1-wave';
  if(denom >= 200) return 'fa-money-bill-1';
  if(denom >= 50) return 'fa-money-bill';
  return 'fa-money-check';
}

function calcTotals(){
  let total = 0, bills = 0;
  for(const d of state.denoms){
    const q = state.quantities[d] || 0;
    total += d * q;
    bills += q;
  }
  return { total, bills };
}

let audioCtx = null;
function getAudioCtx(){
  if(!audioCtx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    try{ audioCtx = new AC(); }catch(e){ return null; }
  }
  if(audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  return audioCtx;
}

function beep(freq = 600, dur = 60){
  if(!state.prefs.sound) return;
  try{
    const ctx = getAudioCtx();
    if(!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur/1000);
    osc.start(); osc.stop(ctx.currentTime + dur/1000);
  }catch(e){}
}

function toast(msg, type = 'info'){
  const container = $('#toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info' };
  el.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

function confettiBurst(){
  if(!state.prefs.confetti) return;
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const colors = isLight
    ? ['#1d4ed8','#6d28d9','#15803d','#b45309','#be185d','#0e7490']
    : ['#5b8cff','#8b5cf6','#22c55e','#f59e0b','#ec4899','#06b6d4'];
  const n = 32;
  for(let i = 0; i < n; i++){
    const p = document.createElement('div');
    p.style.cssText = `
      position:fixed;left:50%;top:50%;width:8px;height:8px;
      background:${colors[i%colors.length]};border-radius:${Math.random()>.5?'50%':'2px'};
      pointer-events:none;z-index:99999;
      transform:translate(-50%,-50%);
    `;
    document.body.appendChild(p);
    const angle = (Math.PI*2*i)/n + Math.random()*0.4;
    const dist = 100 + Math.random()*140;
    const x = Math.cos(angle)*dist;
    const y = Math.sin(angle)*dist - 40;
    p.animate([
      { transform:'translate(-50%,-50%) scale(1)', opacity:1 },
      { transform:`translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0.3) rotate(${Math.random()*720}deg)`, opacity:0 }
    ], { duration: 700 + Math.random()*400, easing:'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => p.remove();
  }
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ============================================================
   RENDER: GRID DE BILLETES
   ============================================================ */
function renderBills(filter = ''){
  const grid = $('#billsGrid');
  const f = filter.trim().toLowerCase();
  const activeDenoms = [...state.denoms].sort((a,b)=>b-a);

  const visible = activeDenoms.filter(d => {
    if(!f) return true;
    return String(d).includes(f) || `$${d}`.includes(f);
  });

  if(visible.length === 0){
    grid.innerHTML = `<div class="empty-grid">
      <i class="fas fa-money-bill-slash"></i>
      <p>${f ? 'Sin coincidencias para "'+escapeHtml(filter)+'"' : 'No hay denominaciones activas. Agrega una en la pestaña "Denominaciones".'}</p>
    </div>`;
    return;
  }

  grid.innerHTML = visible.map(d => {
    const qty = state.quantities[d] || 0;
    const subtotal = qty * d;
    const color = colorForDenom(d);
    const icon = iconForDenom(d);
    const code = state.currency.code;
    return `
      <div class="bill-card" data-denom="${d}">
        <div class="bill-top">
          <div class="bill-icon" style="background:linear-gradient(135deg,${color},${color}aa)">
            <i class="fas ${icon}"></i>
          </div>
          <button class="bill-remove" data-remove="${d}" title="Quitar denominación" aria-label="Quitar denominación ${d}">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div class="bill-denom">${state.currency.symbol}${d.toLocaleString('es-MX')} <small>${code}</small></div>
        <div class="qty-control">
          <button class="qty-btn" data-dec="${d}" aria-label="Restar ${d}"><i class="fas fa-minus"></i></button>
          <input class="qty-input" type="number" min="0" step="1" value="${qty}" data-qty="${d}" aria-label="Cantidad de billetes de ${d}">
          <button class="qty-btn" data-inc="${d}" aria-label="Sumar ${d}"><i class="fas fa-plus"></i></button>
        </div>
        <div class="bill-subtotal">
          <span>${qty} × ${state.currency.symbol}${d.toLocaleString('es-MX')}</span>
          <strong>${state.currency.symbol}${fmtMoney(subtotal)}</strong>
        </div>
      </div>
    `;
  }).join('');

  bindBillEvents();
}

function bindBillEvents(){
  $$('.qty-input').forEach(inp => {
    const d = Number(inp.dataset.qty);
    inp.addEventListener('input', () => {
      let v = inp.value.replace(/[^0-9]/g,'');
      if(v === '') v = '0';
      v = Math.max(0, parseInt(v,10) || 0);
      state.quantities[d] = v;
      inp.value = v;
      updateSubtotalFor(d);
      refreshTotals();
    });
    inp.addEventListener('blur', () => {
      const d2 = Number(inp.dataset.qty);
      if(!state.quantities[d2]) state.quantities[d2] = 0;
      inp.value = state.quantities[d2];
    });
    inp.addEventListener('wheel', e => e.preventDefault(), { passive:false });
    inp.addEventListener('keydown', e => {
      if(['-','e','E','.','+',','].includes(e.key)) e.preventDefault();
    });
  });

  $$('[data-inc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = Number(btn.dataset.inc);
      state.quantities[d] = (state.quantities[d] || 0) + 1;
      updateCardQty(d);
      refreshTotals();
      beep(750, 40);
    });
  });
  $$('[data-dec]').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = Number(btn.dataset.dec);
      state.quantities[d] = Math.max(0, (state.quantities[d] || 0) - 1);
      updateCardQty(d);
      refreshTotals();
      beep(450, 40);
    });
  });

  $$('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = Number(btn.dataset.remove);
      const card = btn.closest('.bill-card');
      card.classList.add('removing');
      setTimeout(() => {
        state.denoms = state.denoms.filter(x => x !== d);
        if(state.quantities[d]) delete state.quantities[d];
        saveState();
        renderBills($('#searchDenom').value);
        renderDenomList();
        refreshTotals();
        renderStats();
        toast(`Denominación ${state.currency.symbol}${d.toLocaleString('es-MX')} removida`, 'info');
      }, 200);
    });
  });
}

function updateCardQty(d){
  const card = document.querySelector(`.bill-card[data-denom="${d}"]`);
  if(!card) return;
  const q = state.quantities[d] || 0;
  const inp = card.querySelector('.qty-input');
  if(inp) inp.value = q;
  updateSubtotalFor(d);
}

function updateSubtotalFor(d){
  const card = document.querySelector(`.bill-card[data-denom="${d}"]`);
  if(!card) return;
  const q = state.quantities[d] || 0;
  const sub = q * d;
  const subEl = card.querySelector('.bill-subtotal strong');
  const leftEl = card.querySelector('.bill-subtotal span');
  if(subEl) subEl.textContent = state.currency.symbol + fmtMoney(sub);
  if(leftEl) leftEl.textContent = `${q} × ${state.currency.symbol}${d.toLocaleString('es-MX')}`;
}

/* ============================================================
   TOTAL Y REFRESH
   ============================================================ */
function refreshTotals(){
  const { total, bills } = calcTotals();
  const totalEl = $('#totalValue');
  const amountEl = $('#totalAmount');
  totalEl.textContent = fmtMoney(total);
  $('#billCountLabel').textContent = `${bills} billete${bills === 1 ? '' : 's'} contado${bills === 1 ? '' : 's'}`;
  amountEl.classList.remove('bump');
  void amountEl.offsetWidth;
  amountEl.classList.add('bump');

  $('#statCurrent').textContent = state.currency.symbol + fmtMoney(total);
  $('#statBills').textContent = bills;
}

/* ============================================================
   RENDER: HISTORIAL
   ============================================================ */
function renderHistory(filter = ''){
  const list = $('#historyList');
  const f = filter.trim().toLowerCase();

  const items = state.history
    .map((h, idx) => ({ ...h, _idx: idx }))
    .filter(h => !f || String(h.total).includes(f) || (h.note || '').toLowerCase().includes(f) || String(h.bills).includes(f));

  $('#histBadge').textContent = state.history.length;

  if(items.length === 0){
    list.innerHTML = `<div class="history-empty">
      <i class="fas fa-clock-rotate-left"></i>
      <p>${f ? 'Sin resultados para "'+escapeHtml(filter)+'"' : 'Aún no hay registros. Guarda tu primer cálculo con el botón <strong>Guardar</strong>.'}</p>
    </div>`;
    return;
  }

  list.innerHTML = items.reverse().map(h => {
    const date = new Date(h.date);
    const ds = date.toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
    const ts = date.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });
    const curCode = h.currencyCode || 'CUP';
    const sym = h.currencySymbol || '$';
    const breakdown = Object.entries(h.snapshot || {})
      .map(([denom, qty]) => ({ denom: Number(denom), qty: Number(qty) }))
      .filter(x => x.denom > 0 && x.qty > 0)
      .sort((a, b) => b.denom - a.denom)
      .map(x => `<span>${x.qty}×${x.denom.toLocaleString('es-MX')}</span>`)
      .join('') || '<span class="bd-none">Sin desglose</span>';
    return `
      <div class="history-item">
        <div class="history-idx">#${h._idx + 1}</div>
        <div class="history-body">
          <div class="history-total">${sym}${fmtMoney(h.total)} <span class="hcur">${curCode}</span></div>
          <div class="history-meta">
            <span><i class="fas fa-layer-group"></i> ${h.bills} billetes</span>
            <span><i class="fas fa-calendar"></i> ${ds} · ${ts}</span>
            ${h.note ? `<span><i class="fas fa-tag"></i> ${escapeHtml(h.note)}</span>` : ''}
          </div>
          <div class="history-breakdown" aria-label="Desglose de billetes">${breakdown}</div>
        </div>
        <div class="history-actions">
          <button class="btn btn-sm btn-ghost" data-restore="${h._idx}" title="Restaurar cantidades" aria-label="Restaurar"><i class="fas fa-rotate-left"></i></button>
          <button class="btn btn-sm btn-ghost" data-copyhist="${h._idx}" title="Copiar" aria-label="Copiar"><i class="fas fa-copy"></i></button>
          <button class="btn btn-sm btn-ghost" data-delhist="${h._idx}" title="Eliminar" aria-label="Eliminar"><i class="fas fa-trash-can"></i></button>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('[data-restore]').forEach(b => b.addEventListener('click', () => restoreHistory(+b.dataset.restore)));
  list.querySelectorAll('[data-copyhist]').forEach(b => b.addEventListener('click', () => copyHistory(+b.dataset.copyhist)));
  list.querySelectorAll('[data-delhist]').forEach(b => b.addEventListener('click', () => deleteHistory(+b.dataset.delhist)));
}

/* ============================================================
   RENDER: DENOMINACIONES
   ============================================================ */
function renderDenomList(){
  const list = $('#denomList');
  const all = [...new Set([...state.allDenoms, ...state.denoms])].sort((a,b)=>b-a);

  list.innerHTML = all.map(d => {
    const active = state.denoms.includes(d);
    const color = colorForDenom(d);
    return `
      <div class="denom-row" data-denom-row="${d}">
        <div class="denom-swatch" style="background:${color}"></div>
        <div class="denom-info">
          <strong>${state.currency.symbol}${d.toLocaleString('es-MX')} ${state.currency.code}</strong>
          <small>${active ? 'Activa en calculadora' : 'Desactivada'}</small>
        </div>
        <label class="switch">
          <input type="checkbox" ${active ? 'checked' : ''} data-toggle="${d}" aria-label="Activar denominación ${d}">
          <span class="slider"></span>
        </label>
      </div>
    `;
  }).join('');

  list.querySelectorAll('[data-toggle]').forEach(inp => {
    inp.addEventListener('change', () => {
      const d = Number(inp.dataset.toggle);
      if(inp.checked){
        if(!state.denoms.includes(d)){
          state.denoms.push(d);
          state.denoms.sort((a,b)=>b-a);
        }
      }else{
        state.denoms = state.denoms.filter(x => x !== d);
        delete state.quantities[d];
      }
      saveState();
      renderBills($('#searchDenom').value);
      renderDenomList();
      refreshTotals();
      renderStats();
      beep(inp.checked ? 800 : 500, 50);
    });
  });
}

/* ============================================================
   STATS
   ============================================================ */
function renderStats(){
  const { total, bills } = calcTotals();
  $('#statCurrent').textContent = state.currency.symbol + fmtMoney(total);
  $('#statBills').textContent = bills;
  $('#statHistory').textContent = state.history.length;

  const avg = state.history.length
    ? state.history.reduce((s,h)=>s+h.total,0) / state.history.length
    : 0;
  $('#statAvg').textContent = state.currency.symbol + fmtMoney(avg);

  const breakdown = $('#statsBreakdown');
  const active = [...state.denoms].sort((a,b)=>b-a);
  const rows = active.map(d => {
    const q = state.quantities[d] || 0;
    const sub = q*d;
    const pct = total > 0 ? (sub/total*100) : 0;
    const color = colorForDenom(d);
    return `
      <div class="denom-row">
        <div class="denom-swatch" style="background:${color}"></div>
        <div class="denom-info">
          <strong>${state.currency.symbol}${d.toLocaleString('es-MX')} × ${q}</strong>
          <small>${state.currency.symbol}${fmtMoney(sub)} · ${pct.toFixed(1)}%</small>
        </div>
        <div style="width:100px;height:6px;background:var(--bg-4);border-radius:3px;overflow:hidden;flex-shrink:0;border:1px solid var(--stroke)">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width .3s"></div>
        </div>
      </div>
    `;
  }).join('') || '<div class="empty-grid" style="padding:20px"><p>Sin datos</p></div>';
  breakdown.innerHTML = rows;
}

/* ============================================================
   ACCIONES
   ============================================================ */
async function saveToHistory(){
  const { total, bills } = calcTotals();
  if(total === 0){
    toast('No hay nada que guardar (total 0.00)', 'error');
    return;
  }
  const note = await askNote();
  if(note === null) return;

  const snapshot = {};
  for(const d of state.denoms){
    if(state.quantities[d]) snapshot[d] = state.quantities[d];
  }

  state.history.push({
    total,
    bills,
    date: new Date().toISOString(),
    note: (note || '').slice(0, 60),
    snapshot,
    currencyCode: state.currency.code,
    currencySymbol: state.currency.symbol
  });
  saveState();
  renderHistory($('#searchHistory').value);
  renderStats();
  confettiBurst();
  beep(900, 120);
  toast('Registro guardado en historial ✓', 'success');
}

function restoreHistory(idx){
  const h = state.history[idx];
  if(!h) return;
  Object.keys(h.snapshot || {}).forEach(d => {
    const n = Number(d);
    if(!state.denoms.includes(n)) state.denoms.push(n);
    state.quantities[n] = h.snapshot[d];
  });
  state.denoms.sort((a,b)=>b-a);
  saveState();
  renderBills($('#searchDenom').value);
  renderDenomList();
  refreshTotals();
  renderStats();
  activateTab('calc');
  toast('Cantidades restauradas desde historial', 'info');
}

async function copyText(text){
  if(isNative){
    const r = await nativeCall('Clipboard','write',{ string: text });
    if(r.ok) return true;
  }
  try{ await navigator.clipboard.writeText(text); return true; }
  catch(e){
    try{
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }catch(_){ return false; }
  }
}

async function copyHistory(idx){
  const h = state.history[idx];
  if(!h) return;
  const sym = h.currencySymbol || '$';
  const code = h.currencyCode || 'CUP';
  const text = `${sym}${fmtMoney(h.total)} ${code} · ${h.bills} billetes · ${new Date(h.date).toLocaleString('es-MX')}${h.note?' · '+h.note:''}`;
  const ok = await copyText(text);
  toast(ok ? 'Copiado al portapapeles' : 'No se pudo copiar', ok ? 'success' : 'error');
}

function deleteHistory(idx){
  state.history.splice(idx, 1);
  saveState();
  renderHistory($('#searchHistory').value);
  renderStats();
  toast('Registro eliminado', 'info');
}

function clearAllQuantities(){
  const hasAny = Object.values(state.quantities).some(v => v > 0);
  if(!hasAny){ toast('Ya está todo en cero', 'info'); return; }
  if(state.prefs.autoSave) saveToHistoryQuiet();
  for(const k of Object.keys(state.quantities)) state.quantities[k] = 0;
  saveState();
  renderBills($('#searchDenom').value);
  refreshTotals();
  renderStats();
  toast('Cantidades vaciadas', 'info');
}

function saveToHistoryQuiet(){
  const { total, bills } = calcTotals();
  if(total === 0) return;
  const snapshot = {};
  for(const d of state.denoms) if(state.quantities[d]) snapshot[d] = state.quantities[d];
  state.history.push({
    total, bills, date: new Date().toISOString(), note:'(auto)', snapshot,
    currencyCode: state.currency.code, currencySymbol: state.currency.symbol
  });
  saveState();
  renderHistory($('#searchHistory').value);
}

/* ============================================================
   MONEDA
   ============================================================ */
function setCurrency(code, symbol, locale){
  state.currency = { code, symbol, locale };
  $('#currencySymbol').textContent = symbol;
  $('#currencyCodeLabel').textContent = code;
  saveState();
  renderBills($('#searchDenom').value);
  renderDenomList();
  refreshTotals();
  renderStats();
  renderHistory($('#searchHistory').value);
}

function applyCurrencyChip(chip){
  const code = chip.dataset.currency;
  const sym = chip.dataset.symbol;
  const loc = chip.dataset.locale;
  $$('#currencyChips .chip').forEach(c => c.classList.toggle('active', c === chip));
  setCurrency(code, sym, loc);
  toast(`Moneda cambiada a ${code}`, 'info');
  beep(700, 50);
}

/* ============================================================
   TABS
   ============================================================ */
function activateTab(name){
  $$('.tab').forEach(t => {
    const active = t.dataset.tab === name;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  $$('.content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + name));
  $$('.side-link[data-gototab]').forEach(b => b.classList.toggle('active', b.dataset.gototab === name));
  if(name === 'stats') renderStats();
  if(name === 'history') renderHistory($('#searchHistory').value);
  if(name === 'denoms') renderDenomList();
}

/* ============================================================
   MODAL
   ============================================================ */
let modalResolve = null;
function confirmModal(title, msg){
  return new Promise(resolve => {
    $('#modalTitle').textContent = title;
    $('#modalMsg').textContent = msg;
    $('#modalOverlay').classList.add('show');
    modalResolve = resolve;
  });
}
$('#modalCancel').addEventListener('click', () => { $('#modalOverlay').classList.remove('show'); modalResolve && modalResolve(false); });
$('#modalConfirm').addEventListener('click', () => { $('#modalOverlay').classList.remove('show'); modalResolve && modalResolve(true); });
$('#modalOverlay').addEventListener('click', (e) => { if(e.target.id === 'modalOverlay'){ $('#modalOverlay').classList.remove('show'); modalResolve && modalResolve(false); } });

/* Modal de nota: reemplaza prompt(), que se ve mal dentro del WebView. */
function askNote(){
  return new Promise(resolve => {
    const overlay = $('#noteOverlay');
    const input = $('#noteInput');
    const okBtn = $('#noteOk');
    const cancelBtn = $('#noteCancel');
    input.value = '';
    overlay.classList.add('show');
    let done = false;

    const finish = value => {
      if(done) return;
      done = true;
      overlay.classList.remove('show');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey, true);
      resolve(value);
    };
    const onOk = () => finish(input.value.trim());
    const onCancel = () => finish(null);
    const onBackdrop = e => { if(e.target === overlay) finish(null); };
    const onKey = e => {
      if(e.key === 'Escape'){ e.preventDefault(); finish(null); }
      else if(e.key === 'Enter'){ e.preventDefault(); finish(input.value.trim()); }
    };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey, true);
    setTimeout(() => input.focus(), 40);
  });
}

/* ============================================================
   BARRA LATERAL Y CIERRE DE LA APP
   ============================================================ */
function isDrawerOpen(){
  const s = $('#sidebar');
  return !!(s && s.classList.contains('open'));
}
function openDrawer(){
  if(isDrawerOpen()) return;
  $('#sidebar').classList.add('open');
  $('#sidebar').setAttribute('aria-hidden','false');
  $('#drawerOverlay').classList.add('show');
  document.body.classList.add('drawer-open');
  $('#menuToggle').setAttribute('aria-expanded','true');
  setTimeout(() => $('#drawerClose').focus(), 120);
}
function closeDrawer(){
  if(!isDrawerOpen()) return;
  $('#sidebar').classList.remove('open');
  $('#sidebar').setAttribute('aria-hidden','true');
  $('#drawerOverlay').classList.remove('show');
  document.body.classList.remove('drawer-open');
  $('#menuToggle').setAttribute('aria-expanded','false');
}
function toggleDrawer(){ isDrawerOpen() ? closeDrawer() : openDrawer(); }

function updateDrawerState(){
  const badge = $('#sideHistBadge');
  if(badge) badge.textContent = state.history.length;
  const sound = $('#sideSoundState');
  if(sound) sound.textContent = state.prefs.sound ? 'Sí' : 'No';
  const version = $('#sideVersion');
  if(version && version.textContent === '…') return;
  if(version) version.textContent = 'v' + APP_VERSION;
}
function exitApp(){
  confirmModal(
    'Cerrar aplicación',
    isNative ? '¿Cerrar ChashierYudira?' : 'Una pestaña web no puede cerrarse sola. ¿Recargar la aplicación?'
  ).then(ok => {
    if(!ok) return;
    if(isNative) nativeCall('App','exitApp');
    else location.reload();
  });
}

/* ============================================================
   ACTUALIZACIONES (GitHub Releases)
   En la APK se comprueba al abrir; en la web solo al pulsar.
   ============================================================ */
function compareVersions(a, b){
  const parse = v => String(v || '').replace(/^v/i,'').split(/[.\-]/).map(x => parseInt(x,10) || 0);
  const pa = parse(a), pb = parse(b);
  for(let i=0;i<Math.max(pa.length,pb.length);i++){
    const d = (pa[i] || 0) - (pb[i] || 0);
    if(d) return d > 0 ? 1 : -1;
  }
  return 0;
}
const UPDATE_TIMEOUT_MS = 7000;
let updateAssetUrl = RELEASES_PAGE;
let lastAutoCheck = 0;
async function checkForUpdates(opts){
  const auto = !!(opts && opts.auto);
  const btn = $('#sideUpdate');
  const label = $('#sideVersion');
  if(!auto && btn && btn.disabled) return;
  if(auto){
    if(Date.now() - lastAutoCheck < 60000) return;
    lastAutoCheck = Date.now();
  }else{
    if(btn) btn.disabled = true;
    if(label) label.textContent = '…';
  }

  const controller = (typeof AbortController === 'function') ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), UPDATE_TIMEOUT_MS) : null;
  try{
    const res = await fetch(RELEASES_API, {
      cache:'no-store',
      headers:{ Accept:'application/vnd.github+json' },
      signal: controller ? controller.signal : undefined
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const rel = await res.json();
    const latest = String(rel.tag_name || APP_VERSION);
    const apk = (rel.assets || []).find(a => /\.apk$/i.test(a.name || ''));
    updateAssetUrl = (apk && apk.browser_download_url) || rel.html_url || RELEASES_PAGE;
    if(label) label.textContent = latest;

    if(compareVersions(latest, APP_VERSION) > 0){
      $('#updateTitle').textContent = `Versión ${latest} disponible`;
      $('#updateMsg').textContent = `Tienes la versión ${APP_VERSION}. Se abrirá GitHub para descargar el APK actualizado.`;
      $('#updateOverlay').classList.add('show');
    }else if(!auto){
      toast(`Ya tienes la versión más reciente (${APP_VERSION})`, 'success');
    }
  }catch(e){
    if(!auto){
      if(label) label.textContent = 'v' + APP_VERSION;
      toast('Sin conexión: no se pudo buscar actualizaciones', 'error');
    }
  }finally{
    if(timer) clearTimeout(timer);
    if(!auto && btn) btn.disabled = false;
  }
}

/* Botón Atrás de Android y estilos nativos. */
function initNativeUI(){
  if(!isNative) return;
  document.body.classList.add('native');
  const App = NativePlugins.App;
  if(App && typeof App.addListener === 'function'){
    App.addListener('backButton', ({ canGoBack } = {}) => {
      if(isDrawerOpen()){ closeDrawer(); return; }
      const active = document.querySelector('.tab.active');
      if(active && active.dataset.tab !== 'calc'){ activateTab('calc'); return; }
      if(canGoBack && window.history.length > 1){ window.history.back(); return; }
      exitApp();
    });
  }
}

/* ============================================================
   INICIALIZACIÓN
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  await hydrateStorage();
  initNativeUI();
  applyTheme(getPreferredTheme());
  $('#themeToggle').addEventListener('click', toggleTheme);

  /* Barra lateral */
  updateDrawerState();
  $('#menuToggle').addEventListener('click', toggleDrawer);
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#drawerOverlay').addEventListener('click', closeDrawer);
  $$('.side-link[data-gototab]').forEach(b => b.addEventListener('click', () => {
    activateTab(b.dataset.gototab);
    closeDrawer();
    beep(650, 30);
  }));
  $('#sideSave').addEventListener('click', () => { closeDrawer(); $('#btnSaveHistory').click(); });
  $('#sideClear').addEventListener('click', () => { closeDrawer(); $('#btnClearAll').click(); });
  $('#sideTheme').addEventListener('click', toggleTheme);
  $('#sideSound').addEventListener('click', () => {
    const cb = $('#prefSound');
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change'));
    updateDrawerState();
  });
  $('#sidePrefs').addEventListener('click', () => { activateTab('denoms'); closeDrawer(); });
  $('#sideExit').addEventListener('click', () => { closeDrawer(); exitApp(); });
  $('#sideUpdate').addEventListener('click', checkForUpdates);
  $('#updateClose').addEventListener('click', () => $('#updateOverlay').classList.remove('show'));
  $('#updateOverlay').addEventListener('click', e => {
    if(e.target.id === 'updateOverlay') $('#updateOverlay').classList.remove('show');
  });
  $('#updateDownload').addEventListener('click', () => {
    if(isNative) window.open(updateAssetUrl, '_system');
    else window.open(updateAssetUrl, '_blank', 'noopener');
  });

  /* Android solo desbloquea el audio tras una interacción real. */
  document.addEventListener('pointerdown', () => {
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  }, { passive:true });

  loadState();

  const savedCur = state.currency;
  $('#currencySymbol').textContent = savedCur.symbol;
  $('#currencyCodeLabel').textContent = savedCur.code;
  const matchingChip = Array.from($$('#currencyChips .chip')).find(c => c.dataset.currency === savedCur.code);
  if(matchingChip){
    $$('#currencyChips .chip').forEach(c => c.classList.toggle('active', c === matchingChip));
  }else{
    $$('#currencyChips .chip').forEach(c => c.classList.remove('active'));
    $('#customCurrencyCode').value = savedCur.code;
  }

  renderBills();
  renderHistory();
  renderDenomList();
  refreshTotals();
  renderStats();

  $$('.tab').forEach(t => t.addEventListener('click', () => { activateTab(t.dataset.tab); beep(650, 30); }));

  $$('#currencyChips .chip').forEach(chip => {
    chip.addEventListener('click', () => applyCurrencyChip(chip));
  });

  $('#applyCustomCurrency').addEventListener('click', () => {
    const code = ($('#customCurrencyCode').value || '').trim().toUpperCase().slice(0,4);
    if(!code || code.length < 2){ toast('Ingresa un código de moneda válido (mín. 2 letras)','error'); return; }
    $$('#currencyChips .chip').forEach(c => c.classList.remove('active'));
    setCurrency(code, '$', 'es-MX');
    toast(`Moneda personalizada: ${code}`, 'success');
    beep(800, 60);
  });
  $('#customCurrencyCode').addEventListener('keydown', e => {
    if(e.key === 'Enter'){ e.preventDefault(); $('#applyCustomCurrency').click(); }
  });

  $('#searchDenom').addEventListener('input', e => renderBills(e.target.value));
  $('#searchHistory').addEventListener('input', e => renderHistory(e.target.value));

  $('#btnClearAll').addEventListener('click', async () => {
    const has = Object.values(state.quantities).some(v=>v>0);
    if(!has){ toast('Ya está todo en cero','info'); return; }
    const ok = await confirmModal('Vaciar cantidades', '¿Poner todos los billetes en cero? Esta acción no borra el historial.');
    if(ok) clearAllQuantities();
  });

  $('#btnSaveHistory').addEventListener('click', saveToHistory);

  $('#btnClearHistory').addEventListener('click', async () => {
    if(state.history.length === 0){ toast('El historial ya está vacío','info'); return; }
    const ok = await confirmModal('Borrar historial', '¿Eliminar permanentemente TODOS los registros del historial?');
    if(ok){
      state.history = [];
      saveState();
      renderHistory();
      renderStats();
      toast('Historial borrado', 'info');
    }
  });

  $('#addDenomForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#newDenomInput');
    const val = parseInt(input.value, 10);
    if(!val || val <= 0){ toast('Ingresa un valor válido mayor a 0','error'); return; }
    if(state.allDenoms.includes(val) && state.denoms.includes(val)){
      toast('Esa denominación ya está activa','error'); return;
    }
    if(!state.allDenoms.includes(val)) state.allDenoms.push(val);
    if(!state.denoms.includes(val)) state.denoms.push(val);
    state.denoms.sort((a,b)=>b-a);
    state.allDenoms.sort((a,b)=>b-a);
    state.quantities[val] = state.quantities[val] || 0;
    input.value = '';
    saveState();
    renderDenomList();
    renderBills($('#searchDenom').value);
    refreshTotals();
    renderStats();
    toast(`Denominación ${state.currency.symbol}${val.toLocaleString('es-MX')} agregada`, 'success');
    beep(900, 80);
  });

  $('#prefConfetti').checked = state.prefs.confetti;
  $('#prefAutoSave').checked = state.prefs.autoSave;
  $('#prefSound').checked = state.prefs.sound;
  $('#prefConfetti').addEventListener('change', e => { state.prefs.confetti = e.target.checked; saveState(); });
  $('#prefAutoSave').addEventListener('change', e => { state.prefs.autoSave = e.target.checked; saveState(); });
  $('#prefSound').addEventListener('change', e => { state.prefs.sound = e.target.checked; saveState(); if(e.target.checked) beep(800, 60); });

  $('#winMin').addEventListener('click', () => toast('Minimizar (demo)','info'));
  $('#winMax').addEventListener('click', () => {
    const app = document.querySelector('.app');
    app.style.maxWidth = app.style.maxWidth === '100%' ? '1180px' : '100%';
  });
  $('#winClose').addEventListener('click', exitApp);

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && isDrawerOpen()){ e.preventDefault(); closeDrawer(); return; }
    if(e.ctrlKey && e.key === 's'){ e.preventDefault(); saveToHistory(); }
    if(e.ctrlKey && e.key === 'k'){ e.preventDefault(); $('#searchDenom').focus(); }
    if(e.ctrlKey && e.shiftKey && e.key === 'L'){ e.preventDefault(); toggleTheme(); }
  });

  const schemeQuery = window.matchMedia('(prefers-color-scheme: light)');
  const onSchemeChange = e => {
    if(!localStorage.getItem(THEME_KEY)) applyTheme(e.matches ? 'light' : 'dark');
  };
  if(schemeQuery.addEventListener) schemeQuery.addEventListener('change', onSchemeChange);
  else if(schemeQuery.addListener) schemeQuery.addListener(onSchemeChange);

  /* Al abrir la APK (tras pasar la intro) se busca versión nueva en silencio;
     si no hay conexión no se muestra ningún aviso y la app sigue local. */
  if(isNative && sessionStorage.getItem('cashier_entered') === '1'){
    setTimeout(() => checkForUpdates({ auto:true }), 1200);
  }

  window.addEventListener('orientationchange', () => setTimeout(() => refreshTotals(), 200));
});
