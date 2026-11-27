/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
const STORAGE_KEY = 'visiones_cashflow_v2';
const THEME_KEY = 'visiones_theme';
const APP_VERSION = '2.0.5';
const APP_NAME = 'ChashierYudira';
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

const DEFAULT_DENOMS = [1,3,5,10,20,50,100,200,500,1000,2000,5000,10000,20000];

const COLORS = [
  '#5b8cff','#8b5cf6','#ec4899','#f59e0b','#22c55e','#06b6d4',
  '#ef4444','#a78bfa','#14b8a6','#f97316','#84cc16','#e879f9'
];

let state = {
  denoms: [...DEFAULT_DENOMS],
  allDenoms: [...DEFAULT_DENOMS],
  quantities: {},
  history: [],
  prefs: { confetti: true, autoSave: false, sound: true, denomOrderAsc: false },
  currency: { code:'CUP', symbol:'$', locale:'es-CU' }
};

/* ============================================================
   TEMA: oscuro por defecto, con opción para cambiar a claro.
   ============================================================ */
function getPreferredTheme(){
  let saved = null;
  try{ saved = localStorage.getItem(THEME_KEY); }catch(e){}
  return saved === 'light' || saved === 'dark' ? saved : 'dark';
}

function updateThumbIcon(theme){
  const thumbIcon = document.getElementById('thumbIcon');
  if(!thumbIcon) return;
  thumbIcon.className = 'fas ' + (theme === 'dark' ? 'fa-moon' : 'fa-sun');
}

/* Icono único de la titlebar: muestra el tema al que se cambiará al pulsar. */
function updateWinThemeIcon(theme){
  const btn = document.getElementById('winTheme');
  if(!btn) return;
  const icon = document.getElementById('winThemeIcon');
  if(icon) icon.className = 'fas ' + (theme === 'dark' ? 'fa-sun' : 'fa-moon');
  const label = theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  btn.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
}

function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', theme === 'light' ? '#e8eef7' : '#0a0c10');
  try{ localStorage.setItem(THEME_KEY, theme); }catch(e){}
  mirrorToNative(THEME_KEY, theme);
  syncStatusBar(theme);
  updateThumbIcon(theme);
  updateWinThemeIcon(theme);
  const toggle = document.getElementById('themeToggle');
  if(toggle) toggle.setAttribute('aria-checked', theme === 'light' ? 'true' : 'false');
  const prefThemeIcon = document.getElementById('prefThemeIcon');
  if(prefThemeIcon) prefThemeIcon.className = 'fas ' + (theme === 'dark' ? 'fa-moon' : 'fa-sun');
  const prefThemeLabel = document.getElementById('prefThemeLabel');
  if(prefThemeLabel) prefThemeLabel.textContent = theme === 'dark' ? 'Tema oscuro' : 'Tema claro';
  const prefThemeHint = document.getElementById('prefThemeHint');
  if(prefThemeHint) prefThemeHint.textContent = theme === 'dark' ? 'Pulsa para cambiar al tema claro' : 'Pulsa para cambiar al tema oscuro';
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
    /* Migración: el billete de $1.00 pasa a ser una denominación fija del programa. */
    if(!state.allDenoms.includes(1)) state.allDenoms.push(1);
    if(!state.denoms.includes(1)) state.denoms.push(1);
    state.denoms = sortDenoms(state.denoms);
    state.allDenoms = sortDenoms(state.allDenoms);
  }catch(e){ console.warn('Load error', e); }
}

/* ============================================================
   HELPERS
   ============================================================ */
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

/* Tooltips propios: reemplazan al title nativo (que no se puede estilizar)
   y funcionan con ratón, teclado y toque en la APK. */
function initTooltips(){
  const tip = document.createElement('div');
  tip.id = 'appTooltip';
  tip.className = 'app-tooltip';
  tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);

  let showTimer = null;
  let hideTimer = null;
  let current = null;
  let lastPointerAt = 0;
  const selector = '[title],[data-tooltip]';

  function preparar(el){
    if(!el || !el.closest) return null;
    el = el.closest(selector);
    if(!el) return null;
    if(!el.dataset.tooltip){
      const title = (el.getAttribute('title') || '').trim();
      if(!title) return null;
      el.dataset.tooltip = title;
      if(!el.hasAttribute('aria-label')) el.setAttribute('aria-label', title);
      el.removeAttribute('title');
    }
    return el.dataset.tooltip ? el : null;
  }

  function ocultar(){
    clearTimeout(showTimer);
    delete tip.dataset.visible;
    current = null;
  }

  function position(el){
    const r = el.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const gap = 10;
    let left = r.left + r.width / 2 - t.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - t.width - 8));
    let top = r.top - t.height - gap;
    tip.dataset.side = top < 8 ? 'bottom' : 'top';
    if(top < 8) top = r.bottom + gap;
    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
  }

  function mostrar(el, tactil){
    el = preparar(el);
    if(!el) return;
    clearTimeout(hideTimer);
    clearTimeout(showTimer);
    current = el;
    tip.textContent = el.dataset.tooltip;
    tip.dataset.visible = '1';
    requestAnimationFrame(() => position(el));
    if(tactil) hideTimer = setTimeout(ocultar, 1100);
  }

  document.addEventListener('pointerover', e => {
    if(e.pointerType === 'touch' || e.pointerType === 'pen') return;
    const el = preparar(e.target);
    if(!el || (current === el && tip.dataset.visible === '1')) return;
    clearTimeout(hideTimer);
    showTimer = setTimeout(() => mostrar(el, false), 80);
  });

  document.addEventListener('pointerout', e => {
    if(e.pointerType === 'touch' || e.pointerType === 'pen') return;
    const el = preparar(e.target);
    if(el && e.relatedTarget && el.contains(e.relatedTarget)) return;
    ocultar();
  });

  document.addEventListener('focusin', e => {
    if(Date.now() - lastPointerAt < 300) return;
    const el = preparar(e.target);
    if(el) mostrar(el, false);
    else ocultar();
  });

  document.addEventListener('focusout', e => {
    const el = preparar(e.target);
    if(el && e.relatedTarget && el.contains(e.relatedTarget)) return;
    ocultar();
  });

  document.addEventListener('pointerdown', e => {
    lastPointerAt = Date.now();
    if(e.pointerType === 'mouse') return;
    const el = preparar(e.target);
    if(el) mostrar(el, true);
    else ocultar();
  }, { passive:true });

  window.addEventListener('scroll', ocultar, { passive:true, capture:true });
  window.addEventListener('resize', ocultar);

  /* Convierte los títulos iniciales y los que añade el render dinámico. */
  const observar = new MutationObserver(registros => {
    registros.forEach(reg => reg.addedNodes.forEach(n => {
      if(n.nodeType !== 1) return;
      if(n.matches && n.matches(selector)) preparar(n);
      if(n.querySelectorAll) n.querySelectorAll(selector).forEach(preparar);
    }));
  });
  $$('[title]').forEach(preparar);
  observar.observe(document.body, { childList:true, subtree:true });
}

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

/* ============================================================
   IMPORTE EN LETRAS — para comprobantes, exportaciones y copia.
   ============================================================ */
const LETRAS_UNIDADES = ['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve'];
const LETRAS_DECENAS = ['','','','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
const LETRAS_CENTENAS = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
const NOMBRES_MONEDA = {
  CUP: { singular:'peso cubano', plural:'pesos cubanos', centSingular:'centavo', centPlural:'centavos' },
  USD: { singular:'dólar', plural:'dólares', centSingular:'centavo', centPlural:'centavos' },
  EUR: { singular:'euro', plural:'euros', centSingular:'céntimo', centPlural:'céntimos' },
  MXN: { singular:'peso mexicano', plural:'pesos mexicanos', centSingular:'centavo', centPlural:'centavos' }
};

function centenasEnLetras(n){
  if(n <= 0) return '';
  if(n === 100) return 'cien';
  let out = '';
  const c = Math.floor(n / 100);
  const r = n % 100;
  if(c) out += LETRAS_CENTENAS[c];
  if(r){
    if(out) out += ' ';
    if(r <= 29){
      out += LETRAS_UNIDADES[r];
    }else{
      const d = Math.floor(r / 10);
      const u = r % 10;
      out += LETRAS_DECENAS[d];
      if(u) out += ' y ' + LETRAS_UNIDADES[u];
    }
  }
  return out;
}

function apocopeUno(texto){
  return texto.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');
}

function enteroEnLetras(n){
  if(n === 0) return 'cero';
  const partes = [];
  const billones = Math.floor(n / 1000000000000);
  const millones = Math.floor((n % 1000000000000) / 1000000);
  const miles = Math.floor((n % 1000000) / 1000);
  const resto = n % 1000;
  if(billones) partes.push(billones === 1 ? 'un billón' : apocopeUno(enteroEnLetras(billones)) + ' billones');
  if(millones) partes.push(millones === 1 ? 'un millón' : apocopeUno(enteroEnLetras(millones)) + ' millones');
  if(miles) partes.push(miles === 1 ? 'mil' : apocopeUno(centenasEnLetras(miles)) + ' mil');
  if(resto) partes.push(centenasEnLetras(resto));
  return partes.join(' ');
}

function importeEnLetras(amount, code = state.currency.code){
  const num = Math.abs(Number(amount) || 0);
  const totalCent = Math.round(num * 100);
  const entero = Math.floor(totalCent / 100);
  const centavos = totalCent % 100;
  const cur = NOMBRES_MONEDA[code] || { singular:'peso', plural:'pesos', centSingular:'centavo', centPlural:'centavos' };
  const letras = apocopeUno(enteroEnLetras(entero)).toUpperCase();
  const nombre = (entero === 1 ? cur.singular : cur.plural).toUpperCase();
  const centNombre = (centavos === 1 ? cur.centSingular : cur.centPlural).toUpperCase();
  return `${letras} ${nombre} CON ${String(centavos).padStart(2, '0')}/100 ${centNombre}`;
}

function pad2(n){ return String(n).padStart(2, '0'); }
function dateObj(value){
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
function formatDate12(value){
  const d = dateObj(value);
  return d ? `${pad2(d.getDate())}-${pad2(d.getMonth()+1)}-${d.getFullYear()}` : '—';
}
function formatTime12(value){
  const d = dateObj(value);
  if(!d) return '—';
  let h = d.getHours();
  const suffix = h < 12 ? 'a.m.' : 'p.m.';
  h = h % 12 || 12;
  return `${pad2(h)}:${pad2(d.getMinutes())} ${suffix}`;
}
function formatDateTime12(value){
  const d = dateObj(value);
  return d ? `${formatDate12(d)} ${formatTime12(d)}` : '—';
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

/* Orden configurable de las denominaciones (ascendente o descendente). */
function sortDenoms(list){
  return [...list].sort((a,b)=> state.prefs.denomOrderAsc ? a-b : b-a);
}

/* Imágenes locales de billetes cubanos para la marca de agua de cada tarjeta. */
const BILL_IMAGES = {
  1: 'billetes/_alt-1.jpg',
  3: 'billetes/_alt-3.jpg',
  5: 'billetes/_alt-5.jpg',
  10: 'billetes/_alt-10.jpg',
  20: 'billetes/_alt-20.jpg',
  50: 'billetes/_alt-50.jpg',
  100: 'billetes/_alt-100.jpg',
  200: 'billetes/_alt-200.jpg',
  500: 'billetes/_alt-500.jpg',
  1000: 'billetes/_alt-1000.jpg',
  2000: 'billetes/_alt-2000.jpg',
  5000: 'billetes/_alt-5000.jpg',
  10000: 'billetes/_alt-10000.jpg',
  20000: 'billetes/_alt-20000.jpg'
};

/* Devuelve el atributo style con la imagen de fondo, solo para pesos cubanos. */
function billWatermarkAttr(denom){
  if(state.currency.code !== 'CUP') return '';
  const src = BILL_IMAGES[denom];
  return src ? ` style="--bill-wm:url('${src}')"` : '';
}

/* Imagen del billete para el visor ampliado (solo pesos cubanos). */
function billImageFor(denom){
  return state.currency.code === 'CUP' ? (BILL_IMAGES[denom] || '') : '';
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

/* ============================================================
   REPARTO AUTOMÁTICO EN BILLETES
   ============================================================ */
const SPLIT_DP_LIMIT = 1000000;

/* Menor número de billetes con programación dinámica. Para importes
   muy grandes se usa el reparto rápido, que coincide con el óptimo
   en el sistema canónico de denominaciones (1/3/5/10/20/...). */
function minimalBillSplit(amount, denoms){
  const list = [...new Set(denoms)]
    .filter(d => Number.isInteger(d) && d > 0 && d <= amount)
    .sort((a,b) => b-a);
  if(!list.length) return null;

  if(amount <= SPLIT_DP_LIMIT){
    const INF = 1000000000;
    const dp = new Int32Array(amount + 1).fill(INF);
    const prev = new Int32Array(amount + 1).fill(-1);
    dp[0] = 0;
    for(let s = 1; s <= amount; s++){
      for(const d of list){
        if(d > s) continue;
        const cand = dp[s - d] + 1;
        if(cand < dp[s]){ dp[s] = cand; prev[s] = d; }
      }
    }
    if(dp[amount] >= INF) return null;
    const out = {};
    let s = amount;
    while(s > 0){
      const d = prev[s];
      if(d < 0) return null;
      out[d] = (out[d] || 0) + 1;
      s -= d;
    }
    return out;
  }

  const out = {};
  let rest = amount;
  for(const d of list){
    const q = Math.floor(rest / d);
    if(q > 0){ out[d] = q; rest -= q * d; }
    if(rest === 0) break;
  }
  return rest === 0 ? out : null;
}

let splitModeResolve = null;
function askSplitMode(amount, hasCents){
  return new Promise(resolve => {
    const aviso = hasCents
      ? ` Los centavos se ignoran: solo se reparten billetes por ${state.currency.symbol}${amount.toLocaleString('es-MX')} ${state.currency.code}.`
      : ` Importe: ${state.currency.symbol}${amount.toLocaleString('es-MX')} ${state.currency.code}.`;
    $('#splitModalMsg').textContent = `Ya hay billetes contados.${aviso} ¿Los reemplazo o agrego el reparto a las cantidades actuales?`;
    $('#splitOverlay').classList.add('show');
    splitModeResolve = resolve;
  });
}
function closeSplitMode(answer){
  const overlay = $('#splitOverlay');
  if(!overlay || !overlay.classList.contains('show')) return;
  overlay.classList.remove('show');
  if(splitModeResolve){ const resolve = splitModeResolve; splitModeResolve = null; resolve(answer); }
}

/* Aviso específico cuando el importe a repartir está vacío o no es válido. */
let amountAlertInput = null;
function showAmountAlert(msg){
  const overlay = $('#amountAlertOverlay');
  if(!overlay) return;
  $('#amountAlertMsg').textContent = msg || 'Introduce un monto mayor que cero para distribuir.';
  amountAlertInput = $('#splitAmount');
  overlay.classList.add('show');
}
function closeAmountAlert(){
  const overlay = $('#amountAlertOverlay');
  if(!overlay || !overlay.classList.contains('show')) return false;
  overlay.classList.remove('show');
  if(amountAlertInput){ amountAlertInput.focus(); amountAlertInput = null; }
  return true;
}

async function splitAmountIntoBills(){
  const input = $('#splitAmount');
  const text = (input.value || '').trim().replace(/\s/g, '').replace(',', '.');
  const raw = Number(text);
  if(!text || !Number.isFinite(raw) || raw <= 0){
    showAmountAlert('Debes introducir un monto mayor que cero para distribuir.');
    return;
  }
  const amount = Math.trunc(raw);
  const hasCents = Math.abs(raw - amount) > 1e-9;
  if(amount < 1){
    showAmountAlert('El monto debe ser al menos 1 para repartir en billetes.');
    return;
  }

  const activas = state.denoms.filter(d => Number.isFinite(d) && d > 0);
  if(!activas.length){ toast('No hay denominaciones activas', 'error'); return; }
  const reparto = minimalBillSplit(amount, activas);
  if(!reparto){
    toast('No se puede repartir exactamente con las denominaciones activas', 'error');
    return;
  }

  const hasQuantities = Object.values(state.quantities).some(v => Number(v) > 0);
  const modo = hasQuantities ? await askSplitMode(amount, hasCents) : 'replace';
  if(!modo) return;

  if(modo === 'replace'){
    for(const k of Object.keys(state.quantities)) state.quantities[k] = 0;
  }
  for(const [d, q] of Object.entries(reparto)){
    const denom = Number(d);
    state.quantities[denom] = (Number(state.quantities[denom]) || 0) + q;
  }
  saveState();
  renderBills($('#searchDenom').value);
  refreshTotals();
  renderStats();

  const n = Object.values(reparto).reduce((a,b) => a+b, 0);
  toast(
    `${modo === 'add' ? 'Agregados' : 'Repartidos'} ${state.currency.symbol}${amount.toLocaleString('es-MX')} en ${n} billete${n === 1 ? '' : 's'}${hasCents ? ' · centavos ignorados' : ''}`,
    'success'
  );
  beep(880, 70);
  input.value = '';
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
  const colors = ['#5b8cff','#8b5cf6','#22c55e','#f59e0b','#ec4899','#06b6d4','#ffffff'];
  /* El estallido nace del centro del ÁREA VISIBLE de la app, no del contenedor
     completo: si la calculadora es más alta que la pantalla, su centro cae
     fuera del viewport y el confeti no se vería (web y APK por igual). */
  const app = $('.app');
  const rect = app && app.getBoundingClientRect ? app.getBoundingClientRect() : null;
  const left = rect ? Math.max(rect.left, 0) : 0;
  const right = rect ? Math.min(rect.right, window.innerWidth) : window.innerWidth;
  const top = rect ? Math.max(rect.top, 0) : 0;
  const bottom = rect ? Math.min(rect.bottom, window.innerHeight) : window.innerHeight;
  const originX = (left + right) / 2;
  const originY = (top + bottom) / 2;
  const n = 58;
  for(let i = 0; i < n; i++){
    const p = document.createElement('div');
    const size = 9 + Math.random() * 8;
    const glow = colors[i % colors.length];
    p.style.cssText = `
      position:fixed;left:${originX}px;top:${originY}px;width:${size}px;height:${size}px;
      background:${glow};border-radius:${Math.random()>.5?'50%':'3px'};
      box-shadow:0 0 14px ${glow};pointer-events:none;z-index:100003;
      transform:translate(-50%,-50%);
    `;
    document.body.appendChild(p);
    const angle = (Math.PI*2*i)/n + (Math.random()-.5)*0.5;
    const dist = 180 + Math.random()*190;
    const x = Math.cos(angle)*dist;
    const y = Math.sin(angle)*dist - 60;
    p.animate([
      { transform:'translate(-50%,-50%) scale(.4)', opacity:0 },
      { transform:`translate(calc(-50% + ${x*.35}px), calc(-50% + ${y*.35 - 40}px)) scale(1.25)`, opacity:1, offset:.18 },
      { transform:`translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(.2) rotate(${Math.random()*900}deg)`, opacity:0 }
    ], { duration: 2200 + Math.random()*1000, easing:'cubic-bezier(.22,.61,.36,1)' }).onfinish = () => p.remove();
  }
}

/* Modal grande de guardado: permanece hasta pulsar CERRAR (sin cierre por fuera). */
function isSaveFlashOpen(){
  const overlay = $('#saveFlashOverlay');
  return !!(overlay && overlay.classList.contains('show'));
}
function closeSaveFlash(){
  const overlay = $('#saveFlashOverlay');
  if(overlay) overlay.classList.remove('show');
}
function saveFlash(amountText, words = ''){
  const amount = $('#saveFlashAmount');
  if(!amount) return;
  amount.textContent = `${amountText} · en el historial`;
  const wordsEl = $('#saveFlashWords');
  if(wordsEl) wordsEl.textContent = words;
  const overlay = $('#saveFlashOverlay');
  overlay.classList.add('show');
  const closeBtn = $('#saveFlashClose');
  if(closeBtn && closeBtn.focus) closeBtn.focus();
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* Muestra u oculta la X que quita el filtro del buscador de denominaciones. */
function syncDenomFilterClear(){
  const input = $('#searchDenom');
  const btn = $('#clearDenomFilter');
  if(input && btn) btn.hidden = input.value.length === 0;
}

/* ============================================================
   RENDER: GRID DE BILLETES
   ============================================================ */
function renderBills(filter = ''){
  const grid = $('#billsGrid');
  const f = filter.trim().toLowerCase();
  const activeDenoms = sortDenoms(state.denoms);

  const visible = activeDenoms.filter(d => {
    if(!f) return true;
    return String(d).includes(f) || `$${d}`.includes(f);
  });

  if(visible.length === 0){
    grid.innerHTML = `<div class="empty-grid">
      <i class="fas fa-money-bill-slash"></i>
      <p>${f ? 'Sin coincidencias para "'+escapeHtml(filter)+'"' : 'No hay denominaciones activas. Agrega una en la pestaña "Denomin.".'}</p>
    </div>`;
    return;
  }

  grid.innerHTML = visible.map(d => {
    const qty = state.quantities[d] || 0;
    const subtotal = qty * d;
    const color = colorForDenom(d);
    const icon = iconForDenom(d);
    const code = state.currency.code;
    const billImg = billImageFor(d);
    return `
      <div class="bill-card" data-denom="${d}"${billWatermarkAttr(d)}>
        <div class="bill-top">
          <div class="bill-icon" style="background:linear-gradient(135deg,${color},${color}aa)">
            <i class="fas ${icon}"></i>
          </div>
          <div class="bill-actions">
            ${billImg ? `<button class="bill-zoom" data-billview="${d}" title="Ver billete completo" aria-label="Ver imagen del billete de ${d} ${code}"><i class="fas fa-magnifying-glass-plus"></i></button>` : ''}
            <button class="bill-remove" data-remove="${d}" title="Quitar denominación" aria-label="Quitar denominación ${d}">
              <i class="fas fa-xmark"></i>
            </button>
          </div>
        </div>
        <div class="bill-denom${billImg ? ' bill-denom-view' : ''}"${billImg ? ` data-billview="${d}" role="button" tabindex="0" aria-label="Ver imagen del billete de ${d} ${code}"` : ''}>${state.currency.symbol}${d.toLocaleString('es-MX')} <small>${code}</small></div>
        <div class="qty-control">
          <button class="qty-btn" data-dec="${d}" aria-label="Restar ${d}"><i class="fas fa-minus"></i></button>
          <input class="qty-input" type="number" min="0" step="1" value="${qty}" data-qty="${d}" aria-label="Cantidad de billetes de ${d}">
          <button class="qty-btn" data-inc="${d}" aria-label="Sumar ${d}"><i class="fas fa-plus"></i></button>
        </div>
        <div class="bill-subtotal">
          <span class="sub-pill">${qty} × ${state.currency.symbol}${d.toLocaleString('es-MX')}</span>
          <strong class="sub-pill">${state.currency.symbol}${fmtMoney(subtotal)}</strong>
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
  const formatted = fmtMoney(total);
  const countText = `${bills} billete${bills === 1 ? '' : 's'} contado${bills === 1 ? '' : 's'}`;

  /* El total aparece dos veces: arriba de la calculadora y en el panel final. */
  ['#totalValue', '#totalValueTop'].forEach(id => { const el = $(id); if(el) el.textContent = formatted; });
  ['#totalWords', '#totalWordsTop'].forEach(id => {
    const el = $(id);
    if(el) el.textContent = importeEnLetras(total);
  });
  ['#billCountLabel', '#billCountLabelTop'].forEach(id => { const el = $(id); if(el) el.textContent = countText; });
  ['#totalAmount', '#totalAmountTop'].forEach(id => {
    const el = $(id);
    if(!el) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  });

  $('#statCurrent').textContent = state.currency.symbol + fmtMoney(total);
  $('#statCurrentWords').textContent = importeEnLetras(total);
  $('#statBills').textContent = bills;
}

/* ============================================================
   RENDER: HISTORIAL
   ============================================================ */
function breakdownEntries(h){
  return Object.entries(h.snapshot || {})
    .map(([denom, qty]) => ({ denom:Number(denom), qty:Number(qty) }))
    .filter(x => x.denom > 0 && x.qty > 0)
    .sort((a, b) => b.denom - a.denom);
}
function breakdownLine(x){
  return `${x.qty}×${x.denom.toLocaleString('es-MX')} = ${fmtMoney(x.denom * x.qty)}`;
}
function historyClipboardText(h){
  const sym = h.currencySymbol || '$';
  const code = h.currencyCode || 'CUP';
  const entries = breakdownEntries(h);
  const bills = entries.reduce((sum, x) => sum + x.qty, 0);
  const lines = entries.length
    ? entries.map(breakdownLine)
    : ['Sin desglose'];
  const note = String(h.note || '').trim() || 'Sin nota';
  return [
    'Copiado de:',
    APP_NAME,
    `Versión: v${APP_VERSION}`,
    '--------------------------',
    'Desglose:',
    '--------------------------',
    'Fecha:',
    formatDateTime12(h.date),
    'Nota:',
    note,
    '--------------------------',
    'Total:',
    `${sym}${fmtMoney(h.total)} ${code}`,
    'Importe en letras:',
    importeEnLetras(h.total, code),
    'Repartidos en:',
    `${bills} billetes`,
    'Desglose:',
    '---------------',
    ...lines
  ].join('\n');
}

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
    const ds = formatDate12(h.date);
    const ts = formatTime12(h.date);
    const curCode = h.currencyCode || 'CUP';
    const sym = h.currencySymbol || '$';
    const breakdown = breakdownEntries(h)
      .map(x => `<span>${breakdownLine(x)}</span>`)
      .join('') || '<span class="bd-none">Sin desglose</span>';
    return `
      <div class="history-item history-card-open" data-openhist="${h._idx}" role="button" tabindex="0" aria-label="Ver detalle del registro ${h._idx + 1}">
        <div class="history-idx">#${h._idx + 1}</div>
        <div class="history-body">
          <div class="history-total">${sym}${fmtMoney(h.total)} <span class="hcur">${curCode}</span></div>
          <div class="history-words">${importeEnLetras(h.total, curCode)}</div>
          <div class="history-meta">
            <span><i class="fas fa-layer-group"></i> ${h.bills} billetes</span>
            <span><i class="fas fa-calendar"></i> ${ds} ${ts}</span>
            ${h.note ? `<span><i class="fas fa-tag"></i> ${escapeHtml(h.note)}</span>` : ''}
          </div>
          <div class="history-breakdown" aria-label="Desglose de billetes">${breakdown}</div>
        </div>
        <div class="history-actions">
          <button class="btn btn-sm btn-ghost" data-exporthist="${h._idx}" title="Exportar este registro" aria-label="Exportar registro ${h._idx + 1}"><i class="fas fa-file-export"></i></button>
          <button class="btn btn-sm btn-ghost" data-restore="${h._idx}" title="Restaurar cantidades" aria-label="Restaurar"><i class="fas fa-rotate-left"></i></button>
          <button class="btn btn-sm btn-ghost" data-copyhist="${h._idx}" title="Copiar" aria-label="Copiar"><i class="fas fa-copy"></i></button>
          <button class="btn btn-sm btn-ghost" data-delhist="${h._idx}" title="Eliminar" aria-label="Eliminar"><i class="fas fa-trash-can"></i></button>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('[data-openhist]').forEach(card => {
    card.addEventListener('click', e => {
      if(e.target.closest('button')) return;
      openHistoryDetail(+card.dataset.openhist);
    });
    card.addEventListener('keydown', e => {
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openHistoryDetail(+card.dataset.openhist); }
    });
  });
  list.querySelectorAll('[data-exporthist]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    openExportMenu(b, +b.dataset.exporthist);
  }));
  list.querySelectorAll('[data-restore]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); restoreHistory(+b.dataset.restore);
  }));
  list.querySelectorAll('[data-copyhist]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); copyHistory(+b.dataset.copyhist);
  }));
  list.querySelectorAll('[data-delhist]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); deleteHistory(+b.dataset.delhist);
  }));
}

/* ---------- Detalle del registro guardado ---------- */
let historyDetailIndex = null;
function isHistoryDetailOpen(){
  const overlay = $('#historyDetailOverlay');
  return !!(overlay && overlay.classList.contains('show'));
}
function closeHistoryDetail(){
  const overlay = $('#historyDetailOverlay');
  if(overlay) overlay.classList.remove('show');
  historyDetailIndex = null;
}
function openHistoryDetail(idx){
  const h = state.history[idx];
  if(!h) return;
  historyDetailIndex = idx;
  const ds = formatDate12(h.date);
  const ts = formatTime12(h.date);
  const sym = h.currencySymbol || '$';
  const code = h.currencyCode || 'CUP';
  const note = String(h.note || '').trim() || 'Sin nota';
  const entries = breakdownEntries(h);
  const breakdown = entries.length
    ? entries.map(x => `<span>${breakdownLine(x)}</span>`).join('')
    : '<span>Sin desglose</span>';
  $('#historyDetailTitle').textContent = `Registro #${idx + 1}`;
  $('#historyDetailDate').textContent = `${ds} ${ts}`;
  $('#historyDetailBody').innerHTML = `
    <div class="detail-total"><strong>${sym}${fmtMoney(h.total)}</strong><span>${code}</span></div>
    <div class="detail-words"><small>Importe en letras</small><strong>${importeEnLetras(h.total, code)}</strong></div>
    <div class="detail-grid">
      <div class="detail-cell"><small>Billetes</small><strong>${h.bills}</strong></div>
      <div class="detail-cell"><small>Fecha</small><strong>${ds} ${ts}</strong></div>
      <div class="detail-cell wide"><small>Nota</small><strong>${escapeHtml(note)}</strong></div>
      <div class="detail-cell wide"><small>Desglose</small><div class="detail-breakdown">${breakdown}</div></div>
    </div>
  `;
  $('#historyDetailOverlay').classList.add('show');
  beep(700, 30);
}

/* ============================================================
   RENDER: DENOMINACIONES
   ============================================================ */
function renderDenomList(){
  const list = $('#denomList');
  const all = sortDenoms([...new Set([...state.allDenoms, ...state.denoms])]);

  list.innerHTML = all.map(d => {
    const active = state.denoms.includes(d);
    const color = colorForDenom(d);
    const personalizada = !DEFAULT_DENOMS.includes(d);
    return `
      <div class="denom-row" data-denom-row="${d}">
        <div class="denom-swatch" style="background:${color}"></div>
        <div class="denom-info">
          <strong>${state.currency.symbol}${d.toLocaleString('es-MX')} ${state.currency.code}</strong>
          <small>${active ? 'Activa en calculadora' : 'Desactivada'}${personalizada ? ' · Personalizada' : ''}</small>
        </div>
        <label class="switch">
          <input type="checkbox" ${active ? 'checked' : ''} data-toggle="${d}" aria-label="Activar denominación ${d}">
          <span class="slider"></span>
        </label>
        ${personalizada ? `<button type="button" class="btn btn-danger btn-sm btn-icon" data-deldenom="${d}" title="Borrar denominación ${d}" aria-label="Borrar denominación ${d}"><i class="fas fa-trash-can"></i></button>` : ''}
      </div>
    `;
  }).join('');

  list.querySelectorAll('[data-toggle]').forEach(inp => {
    inp.addEventListener('change', () => {
      const d = Number(inp.dataset.toggle);
      if(inp.checked){
        if(!state.denoms.includes(d)){
          state.denoms.push(d);
          state.denoms = sortDenoms(state.denoms);
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

  /* Solo se pueden borrar las denominaciones agregadas por el usuario. */
  list.querySelectorAll('[data-deldenom]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const d = Number(btn.dataset.deldenom);
      if(DEFAULT_DENOMS.includes(d)){
        toast('Las denominaciones originales no se pueden borrar', 'error');
        return;
      }
      const ok = await confirmModal(
        'Borrar denominación',
        `¿Borrar ${state.currency.symbol}${d.toLocaleString('es-MX')} ${state.currency.code} de la configuración?`
      );
      if(!ok) return;
      state.allDenoms = state.allDenoms.filter(x => x !== d);
      state.denoms = state.denoms.filter(x => x !== d);
      delete state.quantities[d];
      saveState();
      renderBills($('#searchDenom').value);
      renderDenomList();
      refreshTotals();
      renderStats();
      toast(`Denominación ${state.currency.symbol}${d.toLocaleString('es-MX')} borrada`, 'success');
      beep(500, 60);
    });
  });

  updateToggleAllDenoms();
}

/* ---------- Acciones rápidas de denominaciones activas ---------- */
function afterDenomsChanged(msg){
  saveState();
  renderBills($('#searchDenom').value);
  renderDenomList();
  refreshTotals();
  renderStats();
  if(msg) toast(msg, 'info');
}

function resetDenoms(){
  confirmModal(
    'Restablecer denominaciones',
    '¿Volver a las originales? Se borrarán las personalizadas y sus cantidades; el historial no se toca.'
  ).then(ok => {
    if(!ok) return;
    const originales = new Set(DEFAULT_DENOMS);
    state.allDenoms = sortDenoms([...DEFAULT_DENOMS]);
    state.denoms = sortDenoms([...DEFAULT_DENOMS]);
    for(const k of Object.keys(state.quantities)) if(!originales.has(Number(k))) delete state.quantities[k];
    afterDenomsChanged('Denominaciones restablecidas');
    beep(880, 70);
  });
}

function activateAllDenoms(){
  const todas = [...new Set([...state.allDenoms, ...state.denoms, ...DEFAULT_DENOMS])];
  if(state.denoms.length === todas.length){ toast('Todas las denominaciones ya están activas', 'info'); return; }
  state.denoms = sortDenoms(todas);
  afterDenomsChanged('Todas las denominaciones activadas');
  beep(800, 60);
}

function deactivateAllDenoms(){
  if(state.denoms.length === 0){ toast('Ya no hay denominaciones activas', 'info'); return; }
  confirmModal(
    'Desactivar todas',
    '¿Desactivar todas las denominaciones? Las cantidades se pondrán en cero; el historial no se toca.'
  ).then(ok => {
    if(!ok) return;
    state.denoms = [];
    state.quantities = {};
    afterDenomsChanged('Todas las denominaciones desactivadas');
    beep(480, 60);
  });
}

function allAvailableDenoms(){
  return sortDenoms([...new Set([...state.allDenoms, ...state.denoms, ...DEFAULT_DENOMS])]);
}

function allDenomsActive(){
  const todas = allAvailableDenoms();
  return todas.length > 0 && todas.every(d => state.denoms.includes(d));
}

/* Un solo botón: activa lo que falta o desactiva todo según el estado actual. */
function updateToggleAllDenoms(){
  const btn = $('#btnToggleAllDenoms');
  if(!btn) return;
  const activas = allDenomsActive();
  const label = activas ? 'Desactivar todas' : 'Activar todas';
  const labelEl = $('#toggleAllLabel');
  const iconEl = $('#toggleAllIcon');
  if(labelEl) labelEl.textContent = label;
  if(iconEl) iconEl.className = 'fas ' + (activas ? 'fa-circle-xmark' : 'fa-circle-check');
  btn.title = activas
    ? 'Desactivar todas las denominaciones y poner cantidades en cero'
    : 'Activar todas las denominaciones disponibles';
  btn.setAttribute('aria-label', label);
  btn.setAttribute('aria-checked', activas ? 'true' : 'false');
}

function toggleAllDenoms(){
  if(allDenomsActive()) deactivateAllDenoms();
  else activateAllDenoms();
}

/* ============================================================
   STATS
   ============================================================ */
function renderStats(){
  const { total, bills } = calcTotals();
  $('#statCurrent').textContent = state.currency.symbol + fmtMoney(total);
  $('#statCurrentWords').textContent = importeEnLetras(total);
  $('#statBills').textContent = bills;
  $('#statHistory').textContent = state.history.length;

  const avg = state.history.length
    ? state.history.reduce((s,h)=>s+h.total,0) / state.history.length
    : 0;
  $('#statAvg').textContent = state.currency.symbol + fmtMoney(avg);

  const breakdown = $('#statsBreakdown');
  const active = sortDenoms(state.denoms);
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
async function copyCurrentCalc(){
  const { total, bills } = calcTotals();
  if(total === 0){
    toast('No hay nada que copiar (total 0.00)', 'error');
    return;
  }
  const note = await askNote();
  if(note === null) return;
  const snapshot = {};
  for(const d of state.denoms){
    if(state.quantities[d]) snapshot[d] = state.quantities[d];
  }
  const record = {
    total,
    bills,
    date: new Date().toISOString(),
    note,
    snapshot,
    currencyCode: state.currency.code,
    currencySymbol: state.currency.symbol
  };
  const ok = await copyText(historyClipboardText(record));
  toast(ok ? 'Copiado al portapapeles' : 'No se pudo copiar', ok ? 'success' : 'error');
  if(ok) beep(760, 50);
}

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
  saveFlash(`${state.currency.symbol}${fmtMoney(total)} ${state.currency.code}`, importeEnLetras(total));
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
  state.denoms = sortDenoms(state.denoms);
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
  const ok = await copyText(historyClipboardText(h));
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
function syncCurrencyLabels(symbol, code){
  ['#currencySymbol', '#currencySymbolTop', '#splitSymbol'].forEach(id => { const el = $(id); if(el) el.textContent = symbol; });
  ['#currencyCodeLabel', '#currencyCodeLabelTop', '#splitCode'].forEach(id => { const el = $(id); if(el) el.textContent = code; });
}

function syncCurrencySelect(){
  const select = $('#currencySelect');
  if(!select) return;
  const option = Array.from(select.options).find(o => o.dataset.currency === state.currency.code);
  select.value = option ? option.value : 'CUSTOM';
  if(!option){
    const input = $('#customCurrencyCode');
    if(input) input.value = state.currency.code;
  }
}

function setCurrency(code, symbol, locale){
  state.currency = { code, symbol, locale };
  syncCurrencyLabels(symbol, code);
  syncCurrencySelect();
  saveState();
  renderBills($('#searchDenom').value);
  renderDenomList();
  refreshTotals();
  renderStats();
  renderHistory($('#searchHistory').value);
}

function applyCurrencyOption(option){
  if(!option || option.value === 'CUSTOM'){
    $('#customCurrencyCode').focus();
    return;
  }
  setCurrency(option.dataset.currency, option.dataset.symbol, option.dataset.locale);
  toast(`Moneda cambiada a ${option.dataset.currency}`, 'info');
  beep(700, 50);
}

/* ============================================================
   TABS
   ============================================================ */
function activateTab(name, reveal = false){
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
  if(reveal){
    const tab = document.querySelector('.tab[data-tab="' + name + '"]');
    if(tab) requestAnimationFrame(() => tab.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'start' }));
  }
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
  const version = $('#sideVersion');
  if(version && version.textContent === '…') return;
  if(version) version.textContent = 'V' + APP_VERSION;
}
function openAuthor(){
  closeDrawer();
  $('#authorOverlay').classList.add('show');
  beep(700, 35);
}
function closeAuthor(){
  $('#authorOverlay').classList.remove('show');
}
function openPhoto(){
  $('#photoOverlay').classList.add('show');
  beep(850, 40);
}
function closePhoto(){
  $('#photoOverlay').classList.remove('show');
}

/* Visor del billete completo: se abre al tocar el título de una tarjeta. */
function openBillView(denom){
  const src = billImageFor(denom);
  if(!src) return;
  const img = $('#billImage');
  const overlay = $('#billOverlay');
  if(!img || !overlay) return;
  img.src = src;
  img.alt = `Billete de ${denom.toLocaleString('es-MX')} ${state.currency.code}`;
  const cap = $('#billCaption');
  if(cap) cap.textContent = `${state.currency.symbol} ${denom.toFixed(2)} ${state.currency.code}`;
  overlay.classList.add('show');
  beep(820, 40);
}
function closeBillView(){
  const overlay = $('#billOverlay');
  if(overlay) overlay.classList.remove('show');
}

/* Los botones flotantes buscan el contenedor que realmente hace scroll:
   el documento en web/APK y el propio .app en pantallas apaisadas. */
function scrollTarget(){
  const app = document.querySelector('.app');
  if(app && /auto|scroll/.test(getComputedStyle(app).overflowY) && app.scrollHeight > app.clientHeight + 1) return app;
  return document.scrollingElement || document.documentElement || document.body;
}
function scrollPage(toTop){
  const el = scrollTarget();
  const top = toTop ? 0 : el.scrollHeight;
  if(el.scrollTo) el.scrollTo({ top, behavior: 'auto' });
  else el.scrollTop = top;
  if(state.prefs.sound) beep(toTop ? 900 : 650, 35);
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
    if(label) label.textContent = (latest === 'v' + APP_VERSION || latest === 'V' + APP_VERSION) ? 'V' + APP_VERSION : latest;

    if(compareVersions(latest, APP_VERSION) > 0){
      $('#updateTitle').textContent = `Versión ${latest.replace(/^v/i,'V')} disponible`;
      $('#updateMsg').textContent = `Tienes la versión V${APP_VERSION}. Se abrirá GitHub para descargar el APK actualizado.`;
      $('#updateOverlay').classList.add('show');
    }else if(!auto){
      toast(`Ya tienes la versión más reciente (V${APP_VERSION})`, 'success');
    }
  }catch(e){
    if(!auto){
      if(label) label.textContent = 'V' + APP_VERSION;
      toast('Sin conexión: no se pudo buscar actualizaciones', 'error');
    }
  }finally{
    if(timer) clearTimeout(timer);
    if(!auto && btn) btn.disabled = false;
  }
}

/* ============================================================
   EXPORTACIONES LOCALES (EXCEL / WORD / PDF)
   Un único menú; librerías en www/vendor, sin CDN ni red.
   ============================================================ */
const EXPORT_META = {
  xlsx:{ label:'Excel', ext:'xlsx', mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  docx:{ label:'Word', ext:'docx', mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  pdf:{ label:'PDF', ext:'pdf', mime:'application/pdf' }
};

function exportTimestamp(){
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function exportDateLabel(value){
  return formatDateTime12(value);
}

function exportRows(source = state.history, startIndex = 0){
  return source.map((h, idx) => {
    const entries = breakdownEntries(h);
    const bills = entries.reduce((sum, x) => sum + x.qty, 0);
    const total = Number(h.total) || 0;
    return {
      index: startIndex + idx + 1,
      date: exportDateLabel(h.date),
      note: String(h.note || '').trim() || '—',
      currency: h.currencyCode || state.currency.code,
      symbol: h.currencySymbol || state.currency.symbol,
      total,
      bills,
      breakdown: entries.map(breakdownLine).join(' | ') || '—'
    };
  });
}

function historyTotals(rows){
  return rows.reduce((acc, r) => {
    acc.total += r.total;
    acc.bills += r.bills;
    return acc;
  }, { total:0, bills:0 });
}

/* ---------- Aviso cuando no hay nada que exportar ---------- */
function closeEmptyExport(){
  const overlay = $('#emptyExportOverlay');
  if(overlay) overlay.classList.remove('show');
}
function showEmptyExport(message){
  const overlay = $('#emptyExportOverlay');
  if(!overlay) return;
  const text = $('#emptyExportMsg');
  if(text) text.textContent = message || 'No hay registros guardados en el historial.';
  overlay.classList.add('show');
  const btn = $('#emptyExportClose');
  if(btn && typeof btn.focus === 'function') btn.focus();
  beep(360, 90);
}

/* ---------- Modal único de exportación ---------- */
let exportMenuTrigger = null;
let exportMenuRecord = null;
function isExportMenuOpen(){
  const menu = $('#exportMenu');
  return !!(menu && !menu.hidden);
}
function closeExportMenu(){
  const menu = $('#exportMenu');
  const overlay = $('#exportOverlay');
  if(menu) menu.hidden = true;
  if(overlay) overlay.classList.remove('show');
  $$('[aria-controls="exportMenu"]').forEach(b => b.setAttribute('aria-expanded','false'));
  exportMenuTrigger = null;
  exportMenuRecord = null;
  const title = $('#exportMenuTitle');
  const subtitle = $('#exportMenuSubtitle');
  if(title) title.textContent = 'Exportar historial';
  if(subtitle) subtitle.textContent = 'Elige el formato de salida';
}
function openExportMenu(trigger, recordIdx = null){
  const menu = $('#exportMenu');
  const overlay = $('#exportOverlay');
  if(!menu || !overlay) return;
  if(recordIdx == null && state.history.length === 0){
    showEmptyExport('No hay registros guardados en el historial. Guarda un cálculo desde la calculadora y vuelve a intentarlo.');
    return;
  }
  if(recordIdx != null && !state.history[recordIdx]){
    showEmptyExport('El registro seleccionado ya no existe en el historial.');
    return;
  }
  closeDrawer();
  if(isExportMenuOpen() && exportMenuTrigger === trigger){ closeExportMenu(); return; }
  exportMenuTrigger = trigger || null;
  exportMenuRecord = recordIdx == null ? null : recordIdx;
  const record = exportMenuRecord == null ? null : state.history[exportMenuRecord];
  const title = $('#exportMenuTitle');
  const subtitle = $('#exportMenuSubtitle');
  if(title) title.textContent = record ? `Exportar registro #${exportMenuRecord + 1}` : 'Exportar historial';
  if(subtitle) subtitle.textContent = record ? 'Solo el registro seleccionado' : 'Elige el formato de salida';
  menu.hidden = false;
  overlay.classList.add('show');
  $$('[aria-controls="exportMenu"]').forEach(b => b.setAttribute('aria-expanded', b === trigger ? 'true' : 'false'));
  const first = menu.querySelector('.export-option');
  if(first && typeof first.focus === 'function') setTimeout(() => first.focus(), 40);
  beep(700, 30);
}

/* ---------- utilidades de archivo ---------- */
function bytesToBase64(input){
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  const chunk = 0x8000;
  for(let i=0;i<bytes.length;i+=chunk){
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i+chunk));
  }
  return btoa(binary);
}
function base64ToBytes(base64){
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function blobToBase64(blob){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
function downloadBase64(base64, filename, mime){
  const blob = new Blob([base64ToBytes(base64)], { type:mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function shareOrDownload(base64, filename, mime, label){
  if(isNative && NativePlugins.Filesystem && NativePlugins.Share){
    try{
      await NativePlugins.Filesystem.writeFile({
        path:filename, data:base64, directory:'CACHE', recursive:true
      });
      const uriResult = await NativePlugins.Filesystem.getUri({ path:filename, directory:'CACHE' });
      await NativePlugins.Share.share({
        title:label,
        text:`${label} · ${filename}`,
        url:uriResult.uri,
        dialogTitle:`Compartir ${label}`
      });
      toast(`${label} listo para compartir`, 'success');
      return;
    }catch(e){ console.warn('[exportación nativa]', e); }
  }
  downloadBase64(base64, filename, mime);
  toast(`${label} descargado`, 'success');
}

/* ---------- Excel profesional ---------- */
async function buildWorkbookBase64(dataRows){
  const XL = window.ExcelJS;
  if(!XL || !XL.Workbook) throw new Error('ExcelJS no disponible');
  const rows = dataRows || exportRows();
  const summary = historyTotals(rows);
  const generated = exportDateLabel(new Date());
  const wb = new XL.Workbook();
  wb.creator = 'Unicornio Software®';
  wb.lastModifiedBy = 'Unicornio Software®';
  wb.title = 'Informe de historial - Cashier de Yudira';
  wb.subject = 'Exportación local del historial de billetes';
  wb.description = `Generado ${generated} · Versión ${APP_VERSION}`;
  wb.company = 'Unicornio Software®';
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet('Historial', {
    properties:{ defaultRowHeight:18 },
    views:[{ state:'frozen', ySplit:9 }],
    pageSetup:{
      orientation:'landscape',
      horizontalCentered:true,
      fitToPage:true,
      fitToWidth:1,
      fitToHeight:0,
      printTitleRows:'1:9',
      margins:{ left:0.3, right:0.3, top:0.55, bottom:0.55, header:0.2, footer:0.25 }
    },
    headerFooter:{
      oddHeader:'&C&"Inter,Bold"&12 CASHIER DE YUDIRA',
      oddFooter:`&L© Unicornio Software® - 2026&C Página &P de &N&RGenerado ${generated}`
    }
  });
  ws.columns = [
    { key:'index', width:8 }, { key:'date', width:20 }, { key:'note', width:30 },
    { key:'currency', width:12 }, { key:'total', width:17 }, { key:'bills', width:12 },
    { key:'breakdown', width:50 }
  ];

  const thin = { style:'thin', color:{ argb:'FFCBD5E1' } };
  const border = { top:thin, left:thin, bottom:thin, right:thin };
  const fillDark = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF0F2540' } };
  const fillLight = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFE8EEF9' } };
  const fillSoft = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF8FAFC' } };
  const font = (size, bold, argb) => ({ name:'Inter', size, bold, color:{ argb } });

  function styleCell(cell, s){
    if(s.font) cell.font = s.font;
    if(s.fill) cell.fill = s.fill;
    if(s.alignment) cell.alignment = s.alignment;
    if(s.border) cell.border = s.border;
    if(s.numFmt) cell.numFmt = s.numFmt;
  }
  function paint(range, s){
    const a = ws.getCell(range.split(':')[0]);
    const b = ws.getCell(range.split(':')[1]);
    for(let r=a.row;r<=b.row;r++){
      for(let c=a.col;c<=b.col;c++) styleCell(ws.getCell(r,c), s);
    }
  }

  /* Cabecera corporativa */
  paint('A1:G2', { fill:fillDark, alignment:{ vertical:'middle', horizontal:'center' } });
  ws.mergeCells('A1:G2');
  ws.getCell('A1').value = 'CASHIER DE YUDIRA';
  ws.getCell('A1').font = font(20, true, 'FFFFFFFF');
  ws.getRow(1).height = 28;
  ws.getRow(2).height = 16;

  paint('A3:G3', { fill:fillLight, alignment:{ vertical:'middle', horizontal:'center' } });
  ws.mergeCells('A3:G3');
  ws.getCell('A3').value = `INFORME PROFESIONAL DE HISTORIAL · v${APP_VERSION}`;
  ws.getCell('A3').font = font(11, true, 'FF0F2540');
  ws.getRow(3).height = 22;

  paint('A4:B4', { fill:fillSoft, border, alignment:{ vertical:'middle', horizontal:'left' } });
  paint('C4:D4', { fill:fillSoft, border, alignment:{ vertical:'middle', horizontal:'left' } });
  paint('E4:G4', { fill:fillSoft, border, alignment:{ vertical:'middle', horizontal:'left' } });
  ws.mergeCells('A4:B4'); ws.mergeCells('C4:D4'); ws.mergeCells('E4:G4');
  ws.getCell('A4').value = `Generado: ${generated}`;
  ws.getCell('C4').value = `Moneda: ${state.currency.code} (${state.currency.symbol})`;
  ws.getCell('E4').value = `Registros: ${rows.length}`;
  ['A4','C4','E4'].forEach(ref => { ws.getCell(ref).font = font(10, true, 'FF475569'); });
  ws.getRow(4).height = 20;
  ws.getRow(5).height = 8;

  /* Tarjetas de resumen */
  const cards = [
    ['A','B','REGISTROS', rows.length, null],
    ['C','D','TOTAL HISTORIAL', summary.total, '#,##0.00'],
    ['E','F','BILLETES', summary.bills, '0'],
    ['G','G','MONEDA', state.currency.code, null]
  ];
  cards.forEach(([a,b,label,value,numFmt]) => {
    paint(`${a}6:${b}6`, { fill:fillLight, border, alignment:{ vertical:'middle', horizontal:'center' } });
    paint(`${a}7:${b}7`, { fill:fillSoft, border, alignment:{ vertical:'middle', horizontal:'center' } });
    if(a !== b){ ws.mergeCells(`${a}6:${b}6`); ws.mergeCells(`${a}7:${b}7`); }
    ws.getCell(`${a}6`).value = label;
    ws.getCell(`${a}6`).font = font(9, true, 'FF64748B');
    ws.getCell(`${a}7`).value = value;
    ws.getCell(`${a}7`).font = font(14, true, 'FF0F2540');
    if(numFmt) ws.getCell(`${a}7`).numFmt = numFmt;
  });
  ws.getRow(6).height = 18;
  ws.getRow(7).height = 26;
  ws.getRow(8).height = 8;

  /* Tabla */
  const headers = ['N.º','Fecha','Nota','Moneda','Total','Billetes','Desglose'];
  paint('A9:G9', { fill:fillDark, border, alignment:{ vertical:'middle', horizontal:'center', wrapText:true } });
  headers.forEach((h,i) => {
    const cell = ws.getCell(9, i+1);
    cell.value = h;
    cell.font = font(10, true, 'FFFFFFFF');
  });
  ws.getRow(9).height = 24;

  rows.forEach((r,i) => {
    const rowNumber = 10 + i;
    const row = ws.getRow(rowNumber);
    row.values = [r.index, r.date, r.note, r.currency, r.total, r.bills, r.breakdown];
    row.height = 22;
    row.eachCell((cell, col) => {
      cell.border = border;
      cell.font = font(10, col === 5, 'FF172233');
      cell.alignment = {
        vertical:'middle',
        horizontal:(col === 1 || col === 4 || col === 6) ? 'center' : (col === 5 ? 'right' : 'left'),
        wrapText:(col === 3 || col === 7)
      };
      if(i % 2 === 0) cell.fill = fillSoft;
    });
    row.getCell(5).numFmt = '#,##0.00';
    row.getCell(6).numFmt = '0';
  });
  const lastDataRow = 9 + rows.length;
  if(rows.length) ws.autoFilter = { from:'A9', to:`G${lastDataRow}` };

  const totalRow = 10 + rows.length;
  paint(`A${totalRow}:G${totalRow}`, { fill:fillLight, border, alignment:{ vertical:'middle' } });
  ws.mergeCells(`A${totalRow}:D${totalRow}`);
  const tr = ws.getRow(totalRow);

  tr.getCell(1).value = 'TOTAL DE REGISTROS';
  tr.getCell(1).font = font(10, true, 'FF0F2540');
  tr.getCell(5).value = rows.length
    ? { formula:`SUM(E10:E${lastDataRow})`, result:summary.total }
    : 0;
  tr.getCell(6).value = rows.length
    ? { formula:`SUM(F10:F${lastDataRow})`, result:summary.bills }
    : 0;
  tr.getCell(5).font = font(11, true, 'FF0F2540');
  tr.getCell(6).font = font(11, true, 'FF0F2540');
  tr.getCell(5).numFmt = '#,##0.00';
  tr.getCell(6).numFmt = '0';
  tr.getCell(5).alignment = { vertical:'middle', horizontal:'right' };
  tr.getCell(6).alignment = { vertical:'middle', horizontal:'center' };
  tr.height = 26;

  const wordsRow = totalRow + 1;
  paint(`A${wordsRow}:G${wordsRow}`, { fill:fillSoft, border, alignment:{ vertical:'middle', horizontal:'left', wrapText:true } });
  ws.mergeCells(`A${wordsRow}:G${wordsRow}`);
  ws.getCell(`A${wordsRow}`).value = `IMPORTE EN LETRAS: ${importeEnLetras(summary.total, state.currency.code)}`;
  ws.getCell(`A${wordsRow}`).font = font(10, true, 'FF0F2540');
  ws.getRow(wordsRow).height = 30;

  const noteRow = totalRow + 3;
  paint(`A${noteRow}:G${noteRow}`, { alignment:{ vertical:'middle', horizontal:'center' } });
  ws.mergeCells(`A${noteRow}:G${noteRow}`);
  ws.getCell(`A${noteRow}`).value = '© Unicornio Software® - 2026 · 100 % local · En colaboración con MiPyMe "Visiones"';
  ws.getCell(`A${noteRow}`).font = font(9, false, 'FF64748B');
  ws.getRow(noteRow).height = 20;
  ws.pageSetup.printArea = `A1:G${noteRow}`;

  /* Segunda hoja: resumen ejecutativo con la misma identidad visual. */
  const rs = wb.addWorksheet('Resumen', {
    properties:{ defaultRowHeight:18 },
    views:[{ state:'frozen', ySplit:3 }],
    pageSetup:{
      orientation:'portrait',
      horizontalCentered:true,
      fitToPage:true,
      fitToWidth:1,
      fitToHeight:0,
      margins:{ left:0.4, right:0.4, top:0.55, bottom:0.55, header:0.2, footer:0.25 }
    },
    headerFooter:{
      oddHeader:'&C&"Inter,Bold"&12 CASHIER DE YUDIRA',
      oddFooter:`&L© Unicornio Software® - 2026&C Página &P de &N&RGenerado ${generated}`
    }
  });
  rs.columns = [{ key:'label', width:28 }, { key:'value', width:68 }];
  rs.mergeCells('A1:B2');
  rs.getCell('A1').value = 'RESUMEN EJECUTIVO';
  rs.getCell('A1').font = font(18, true, 'FFFFFFFF');
  rs.getCell('A1').alignment = { vertical:'middle', horizontal:'center' };
  for(let r=1;r<=2;r++) for(let c=1;c<=2;c++) rs.getCell(r,c).fill = fillDark;
  rs.getRow(1).height = 28;
  rs.getRow(2).height = 14;
  rs.mergeCells('A3:B3');
  rs.getCell('A3').value = `Cashier de Yudira · v${APP_VERSION}`;
  rs.getCell('A3').font = font(11, true, 'FF0F2540');
  rs.getCell('A3').alignment = { vertical:'middle', horizontal:'center' };
  rs.getCell('A3').fill = fillLight;
  rs.getRow(3).height = 22;

  const metrics = [
    ['Generado', generated, null],
    ['Registros guardados', rows.length, '0'],
    ['Total del historial', summary.total, '#,##0.00'],
    ['Total del historial en letras', importeEnLetras(summary.total, state.currency.code), null],
    ['Billetes del historial', summary.bills, '0'],
    ['Moneda actual', `${state.currency.code} (${state.currency.symbol})`, null],
    ['Total actual', calcTotals().total, '#,##0.00'],
    ['Billetes actuales', calcTotals().bills, '0'],
    ['Denominaciones activas', sortDenoms(state.denoms).join(', '), null]
  ];
  metrics.forEach(([label, value, numFmt], i) => {
    const rowNumber = 5 + i;
    const labelCell = rs.getCell(rowNumber, 1);
    const valueCell = rs.getCell(rowNumber, 2);
    labelCell.value = label;
    valueCell.value = value;
    labelCell.font = font(10, true, 'FF475569');
    valueCell.font = font(11, i === 2, 'FF0F2540');
    labelCell.fill = fillSoft;
    valueCell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFFFFF' } };
    labelCell.border = border;
    valueCell.border = border;
    labelCell.alignment = { vertical:'middle' };
    valueCell.alignment = { vertical:'middle', wrapText:true };
    if(numFmt) valueCell.numFmt = numFmt;
    rs.getRow(rowNumber).height = 22;
  });
  const creditRow = 5 + metrics.length + 1;
  rs.mergeCells(`A${creditRow}:B${creditRow}`);
  rs.getCell(`A${creditRow}`).value = '© Unicornio Software® - 2026 · 100 % local · En colaboración con MiPyMe "Visiones"';
  rs.getCell(`A${creditRow}`).font = font(9, false, 'FF64748B');
  rs.getCell(`A${creditRow}`).alignment = { vertical:'middle', horizontal:'center' };
  rs.getRow(creditRow).height = 20;
  rs.pageSetup.printArea = `A1:B${creditRow}`;

  const buffer = await wb.xlsx.writeBuffer();
  return bytesToBase64(buffer);
}

/* ---------- Word profesional: OOXML local con JSZip (sin CDN) ---------- */
async function buildDocumentBase64(dataRows){
  const ZipLib = window.JSZip;
  if(!ZipLib || typeof ZipLib !== 'function') throw new Error('JSZip no disponible');
  const rows = dataRows || exportRows();
  const summary = historyTotals(rows);
  const generated = exportDateLabel(new Date());
  const esc = value => escapeHtml(String(value));
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  const para = (text, opts = {}) => {
    const align = opts.align || 'left';
    const bold = opts.bold ? '<w:b/>' : '';
    const color = opts.color || '172233';
    const size = opts.size || 20;
    return `<w:p><w:pPr><w:spacing w:before="${opts.before || 0}" w:after="${opts.after || 80}"/><w:jc w:val="${align}"/></w:pPr>` +
      `<w:r><w:rPr>${bold}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>` +
      `<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
  };
  const cell = (text, opts = {}) => {
    const fill = opts.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${opts.fill}"/>` : '';
    const bold = opts.bold ? '<w:b/>' : '';
    const color = opts.color || '172233';
    const size = opts.size || 16;
    return `<w:tc><w:tcPr><w:tcW w:w="${opts.w || 1200}" w:type="dxa"/>${fill}<w:vAlign w:val="center"/></w:tcPr>` +
      `<w:p><w:pPr><w:spacing w:before="20" w:after="20"/><w:jc w:val="${opts.align || 'left'}"/></w:pPr>` +
      `<w:r><w:rPr>${bold}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>` +
      `<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p></w:tc>`;
  };
  const side = name => `<w:${name} w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>`;
  const table = (headers, data, widths, aligns) => {
    const grid = widths.map(w => `<w:gridCol w:w="${w}"/>`).join('');
    const head = `<w:tr><w:trPr><w:tblHeader/></w:trPr>` +
      headers.map((h, i) => cell(h, { w:widths[i], fill:'0F2540', color:'FFFFFF', bold:true, align:aligns[i], size:15 })).join('') +
      '</w:tr>';
    const body = data.map((row, i) => '<w:tr>' +
      row.map((v, j) => cell(v, {
        w:widths[j],
        fill:i % 2 === 0 ? 'F8FAFC' : undefined,
        align:aligns[j],
        bold:j === 4,
        size:14
      })).join('') + '</w:tr>').join('');
    return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>` +
      `<w:tblBorders>${side('top')}${side('left')}${side('bottom')}${side('right')}${side('insideH')}${side('insideV')}</w:tblBorders>` +
      `<w:tblLayout w:type="fixed"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>` +
      `</w:tblPr><w:tblGrid>${grid}</w:tblGrid>${head}${body}</w:tbl>`;
  };

  const cardTable = table(
    ['REGISTROS', 'TOTAL HISTORIAL', 'BILLETES', 'MONEDA'],
    [[String(rows.length), summary.total.toFixed(2), String(summary.bills), state.currency.code]],
    [2200, 2200, 2200, 2200],
    ['center', 'center', 'center', 'center']
  );
  const detailHeaders = ['N.º', 'Fecha', 'Nota', 'Moneda', 'Total', 'Bil.', 'Desglose'];
  const detailData = rows.map(r => [
    r.index, r.date, r.note, r.currency, r.total.toFixed(2), r.bills, r.breakdown
  ]);
  const detailTable = rows.length
    ? table(detailHeaders, detailData, [500, 1250, 1850, 750, 1150, 600, 3100],
      ['center', 'left', 'left', 'center', 'right', 'center', 'left'])
    : para('El historial está vacío.', { align:'center', color:'64748B' });

  const children = [
    para('CASHIER DE YUDIRA', { size:36, bold:true, color:'0F2540', align:'center', after:60 }),
    para(`INFORME DE HISTORIAL · v${APP_VERSION}`, { size:22, bold:true, color:'5B8CFF', align:'center', after:60 }),
    para(`Generado: ${generated} · Moneda: ${state.currency.code} (${state.currency.symbol})`, { size:16, color:'64748B', align:'center', after:200 }),
    cardTable,
    para(`IMPORTE EN LETRAS: ${importeEnLetras(summary.total, state.currency.code)}`, {
      size:16, bold:true, color:'0F2540', before:120, after:60
    }),
    para('DETALLE DE REGISTROS', { size:22, bold:true, color:'0F2540', before:260, after:120 }),
    detailTable,
    para('© Unicornio Software® - 2026 · 100 % local · En colaboración con MiPyMe "Visiones"', {
      size:14, color:'64748B', align:'center', before:240
    })
  ];

  const iso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="${W}" xmlns:r="${R}"><w:body>${children.join('')}` +
    `<w:sectPr><w:footerReference w:type="default" r:id="rId1"/>` +
    `<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="600" w:bottom="720" w:left="600" w:header="360" w:footer="360" w:gutter="0"/>` +
    `</w:sectPr></w:body></w:document>`;
  const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:ftr xmlns:w="${W}" xmlns:r="${R}"><w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>` +
    `<w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="14"/></w:rPr>` +
    `<w:t xml:space="preserve">© Unicornio Software® - 2026 · Página </w:t></w:r>` +
    `<w:fldSimple w:instr="PAGE"><w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="14"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple>` +
    `</w:p></w:ftr>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr>` +
    `<w:rFonts w:ascii="Inter" w:hAnsi="Inter"/><w:sz w:val="20"/><w:szCs w:val="20"/>` +
    `</w:rPr></w:rPrDefault></w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
    `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
    `</Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>` +
    `</Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ` +
    `xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ` +
    `xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>Informe de historial - Cashier de Yudira</dc:title>` +
    `<dc:subject>Exportación local del historial de billetes</dc:subject>` +
    `<dc:creator>Unicornio Software®</dc:creator><cp:lastModifiedBy>Unicornio Software®</cp:lastModifiedBy>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified>` +
    `<cp:revision>1</cp:revision></cp:coreProperties>`;
  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ` +
    `xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">` +
    `<Application>Cashier de Yudira</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop>` +
    `<Company>Unicornio Software®</Company><LinksUpToDate>false</LinksUpToDate>` +
    `<SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>2.0.5</AppVersion>` +
    `</Properties>`;

  const zip = new ZipLib();
  zip.file('[Content_Types].xml', contentTypes);
  zip.file('_rels/.rels', rootRels);
  zip.file('word/document.xml', documentXml);
  zip.file('word/_rels/document.xml.rels', docRels);
  zip.file('word/styles.xml', stylesXml);
  zip.file('word/footer1.xml', footerXml);
  zip.file('docProps/core.xml', coreXml);
  zip.file('docProps/app.xml', appXml);
  const bytes = await zip.generateAsync({ type:'uint8array', compression:'DEFLATE', compressionOptions:{ level:6 } });
  return bytesToBase64(bytes);
}

/* ---------- PDF profesional ---------- */
function buildPdfBase64(dataRows){
  const jspdfLib = window.jspdf || window.jsPDF;
  const JsPDF = jspdfLib && (jspdfLib.jsPDF || jspdfLib);
  if(typeof JsPDF !== 'function') throw new Error('PDF no disponible');

  const doc = new JsPDF({ unit:'mm', format:'a4', orientation:'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const width = pageW - margin * 2;
  const generated = exportDateLabel(new Date());
  const rows = dataRows || exportRows();
  const ink = [23,34,51];
  const muted = [100,116,139];
  let y = margin;

  function pageHeader(first){
    doc.setFillColor(15,37,64);
    doc.roundedRect(margin, y, width, first ? 26 : 12, 2, 2, 'F');
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold');
    doc.setFontSize(first ? 17 : 11);
    doc.text(first ? 'Cashier de Yudira' : 'Cashier de Yudira · Historial', margin + 5, y + (first ? 10 : 8));
    if(first){
      doc.setFont('helvetica','normal');
      doc.setFontSize(9);
      doc.setTextColor(191,219,254);
      doc.text(`Informe de historial · v${APP_VERSION} · ${generated}`, margin + 5, y + 18);
    }
    y += (first ? 26 : 12) + 6;
  }

  pageHeader(true);

  const totals = calcTotals();
  const wordsLines = doc.splitTextToSize(
    `Total en letras: ${importeEnLetras(totals.total, state.currency.code)}`, width - 10
  );
  const summaryH = 24 + Math.max(0, wordsLines.length - 1) * 3.5;
  doc.setFillColor(239,246,255);
  doc.roundedRect(margin, y, width, summaryH, 2, 2, 'F');
  doc.setFont('helvetica','bold');
  doc.setFontSize(9);
  doc.setTextColor(...ink);
  doc.text('RESUMEN', margin + 5, y + 7);
  doc.setFont('helvetica','normal');
  doc.setFontSize(8.5);
  doc.text(
    `Registros: ${rows.length}    Moneda: ${state.currency.code}    Total actual: ${state.currency.symbol}${totals.total.toFixed(2)}    Billetes: ${totals.bills}`,
    margin + 5, y + 15
  );
  doc.setFont('helvetica','bold');
  doc.setFontSize(8);
  doc.text(wordsLines, margin + 5, y + 21);
  doc.setFont('helvetica','normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...muted);
  doc.text(`Denominaciones activas: ${sortDenoms(state.denoms).join(', ')}`, margin + 5, y + 21 + wordsLines.length * 3.5);
  y += summaryH + 6;

  const columns = [
    { title:'N.º', w:10, align:'center' },
    { title:'Fecha', w:32 },
    { title:'Nota', w:42 },
    { title:'Mon.', w:14, align:'center' },
    { title:'Total', w:28, align:'right' },
    { title:'Bil.', w:14, align:'right' },
    { title:'Desglose', w:42 }
  ];
  let cursor = margin;
  columns.forEach(c => { c.x = cursor; cursor += c.w; });

  function tableHeader(){
    doc.setFillColor(30,41,59);
    doc.rect(margin, y, width, 8, 'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(7.6);
    doc.setTextColor(255,255,255);
    columns.forEach(c => {
      if(c.align === 'right') doc.text(c.title, c.x + c.w - 2, y + 5.2, { align:'right' });
      else if(c.align === 'center') doc.text(c.title, c.x + c.w / 2, y + 5.2, { align:'center' });
      else doc.text(c.title, c.x + 1.5, y + 5.2);
    });
    y += 8;
  }

  function newPage(){
    doc.addPage();
    y = margin;
    pageHeader(false);
    tableHeader();
  }

  tableHeader();

  if(rows.length === 0){
    doc.setFont('helvetica','normal');
    doc.setFontSize(10);
    doc.setTextColor(...muted);
    doc.text('El historial está vacío.', pageW / 2, y + 12, { align:'center' });
  }else{
    rows.forEach((r, i) => {
      const noteLines = doc.splitTextToSize(r.note, columns[2].w - 3);
      const detailLines = doc.splitTextToSize(r.breakdown, columns[6].w - 3);
      const lineCount = Math.max(noteLines.length, detailLines.length, 1);
      const rowH = Math.max(7, lineCount * 3.7 + 2.5);
      if(y + rowH > pageH - margin - 10) newPage();

      if(i % 2 === 0){
        doc.setFillColor(248,250,252);
        doc.rect(margin, y, width, rowH, 'F');
      }

      const textY = y + 4.2;
      doc.setFont('helvetica','normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...ink);
      doc.text(String(r.index), columns[0].x + columns[0].w / 2, textY, { align:'center' });
      doc.text(r.date, columns[1].x + 1.5, textY);
      doc.text(noteLines, columns[2].x + 1.5, textY);
      doc.text(r.currency, columns[3].x + columns[3].w / 2, textY, { align:'center' });
      doc.setFont('helvetica','bold');
      doc.text(r.total.toFixed(2), columns[4].x + columns[4].w - 2, textY, { align:'right' });
      doc.setFont('helvetica','normal');
      doc.text(String(r.bills), columns[5].x + columns[5].w - 2, textY, { align:'right' });
      doc.text(detailLines, columns[6].x + 1.5, textY);
      y += rowH;
    });
  }

  const pages = doc.getNumberOfPages();
  for(let p=1;p<=pages;p++){
    doc.setPage(p);
    doc.setDrawColor(226,232,240);
    doc.line(margin, pageH - 9, pageW - margin, pageH - 9);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(`© Unicornio Software® · ${generated}`, margin, pageH - 5);
    doc.text(`Página ${p} de ${pages}`, pageW - margin, pageH - 5, { align:'right' });
  }

  return bytesToBase64(doc.output('arraybuffer'));
}

async function exportData(type, recordRows = null, recordIndex = null){
  const meta = EXPORT_META[type];
  if(!meta) return;
  if(recordRows && recordRows.length === 0){
    showEmptyExport('El registro seleccionado ya no existe en el historial.');
    return;
  }
  if(!recordRows && state.history.length === 0){
    showEmptyExport('No hay registros guardados en el historial. Guarda un cálculo desde la calculadora y vuelve a intentarlo.');
    return;
  }
  const options = $$('.export-option, [data-export-record]');
  options.forEach(b => { b.disabled = true; });
  const rows = recordRows ? exportRows(recordRows, recordIndex == null ? 0 : recordIndex) : null;
  try{
    let base64;
    if(type === 'xlsx'){
      base64 = await buildWorkbookBase64(rows);
    }else if(type === 'docx'){
      base64 = await buildDocumentBase64(rows);
    }else{
      base64 = buildPdfBase64(rows);
    }
    const prefix = recordIndex == null
      ? 'CashierYudira_historial'
      : `CashierYudira_registro_${recordIndex + 1}`;
    const filename = `${prefix}_${exportTimestamp()}.${meta.ext}`;
    await shareOrDownload(base64, filename, meta.mime, meta.label);
    beep(type === 'xlsx' ? 840 : (type === 'docx' ? 780 : 760), 70);
  }catch(e){
    console.error('Error al exportar', e);
    toast('No se pudo generar el archivo de exportación', 'error');
  }finally{
    options.forEach(b => { b.disabled = false; });
  }
}

/* Botón Atrás de Android y estilos nativos. */
function initNativeUI(){
  if(!isNative) return;
  document.body.classList.add('native');
  const App = NativePlugins.App;
  if(App && typeof App.addListener === 'function'){
    App.addListener('backButton', ({ canGoBack } = {}) => {
      if($('#emptyExportOverlay').classList.contains('show')){ closeEmptyExport(); return; }
      if($('#splitOverlay').classList.contains('show')){ closeSplitMode(null); return; }
      if($('#amountAlertOverlay').classList.contains('show')){ closeAmountAlert(); return; }
      if(isSaveFlashOpen()){ return; }
      if(isHistoryDetailOpen()){ closeHistoryDetail(); return; }
      if(isExportMenuOpen()){ closeExportMenu(); return; }
      if($('#billOverlay').classList.contains('show')){ closeBillView(); return; }
      if($('#photoOverlay').classList.contains('show')){ closePhoto(); return; }
      if($('#authorOverlay').classList.contains('show')){ closeAuthor(); return; }
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
  initTooltips();
  applyTheme(getPreferredTheme());
  const themeToggle = $('#themeToggle');
  if(themeToggle) themeToggle.addEventListener('click', toggleTheme);
  const winTheme = $('#winTheme');
  if(winTheme) winTheme.addEventListener('click', toggleTheme);

  /* Barra lateral */
  updateDrawerState();
  $('#menuToggle').addEventListener('click', toggleDrawer);
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#drawerOverlay').addEventListener('click', closeDrawer);
  $$('.side-link[data-gototab]').forEach(b => b.addEventListener('click', () => {
    activateTab(b.dataset.gototab, true);
    closeDrawer();
    beep(650, 30);
  }));
  $('#sideSave').addEventListener('click', () => { closeDrawer(); $('#btnSaveHistory').click(); });
  $('#sideClear').addEventListener('click', () => { closeDrawer(); $('#btnClearAll').click(); });
  $('#sideReplayIntro').addEventListener('click', () => {
    closeDrawer();
    saveState();
    try { sessionStorage.removeItem('cashier_entered'); } catch(e){}
    if(state.prefs.sound) beep(750, 50);
    window.location.href = 'intro.html';
  });
  const authorMail = $('#authorMail');
  if(authorMail){
    const asunto = `Sobre el APK Cashier de Yudira V${APP_VERSION}`;
    authorMail.href = `mailto:kakycu@gmail.com?subject=${encodeURIComponent(asunto)}`;
    authorMail.title = asunto;
  }
  $('#sideAuthor').addEventListener('click', openAuthor);
  $('#authorClose').addEventListener('click', closeAuthor);
  $('#authorOk').addEventListener('click', closeAuthor);
  $('#authorOverlay').addEventListener('click', e => { if(e.target.id === 'authorOverlay') closeAuthor(); });
  $('#authorPhotoBtn').addEventListener('click', openPhoto);
  $('#photoClose').addEventListener('click', closePhoto);
  $('#photoOk').addEventListener('click', closePhoto);
  $('#photoOverlay').addEventListener('click', e => { if(e.target.id === 'photoOverlay') closePhoto(); });
  $('#billClose').addEventListener('click', closeBillView);
  $('#billOk').addEventListener('click', closeBillView);
  $('#billOverlay').addEventListener('click', e => { if(e.target.id === 'billOverlay') closeBillView(); });
  /* Tocar el título de una tarjeta abre la imagen completa del billete. */
  $('#billsGrid').addEventListener('click', e => {
    const target = e.target.closest('[data-billview]');
    if(target) openBillView(Number(target.dataset.billview));
  });
  $('#billsGrid').addEventListener('keydown', e => {
    if(e.key !== 'Enter' && e.key !== ' ') return;
    const target = e.target.closest('[data-billview]');
    if(!target) return;
    e.preventDefault();
    openBillView(Number(target.dataset.billview));
  });
  $$('[data-author-link]').forEach(b => b.addEventListener('click', () => {
    const url = b.dataset.authorLink;
    if(isNative) window.open(url, '_system');
    else window.open(url, '_blank', 'noopener');
  }));
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

  /* En Android :hover no existe: .activo reproduce el realce visual al tocar. */
  let tapTimer = null;
  const tapSelector = 'button, .tab, .side-link, .switch, .bill-card, .history-item, .denom-row, .export-option, .scroll-fab, .currency-picker';
  document.addEventListener('pointerdown', e => {
    const el = e.target && e.target.closest ? e.target.closest(tapSelector) : null;
    if(!el) return;
    $$('.activo').forEach(n => { if(n !== el) n.classList.remove('activo'); });
    el.classList.add('activo');
    if(tapTimer) clearTimeout(tapTimer);
    tapTimer = setTimeout(() => el.classList.remove('activo'), 420);
  }, { passive:true });

  loadState();

  const savedCur = state.currency;
  syncCurrencyLabels(savedCur.symbol, savedCur.code);
  syncCurrencySelect();

  renderBills();
  syncDenomFilterClear();
  renderHistory();
  renderDenomList();
  refreshTotals();
  renderStats();

  $$('.tab').forEach(t => t.addEventListener('click', () => { activateTab(t.dataset.tab); beep(650, 30); }));

  $('#currencySelect').addEventListener('change', e => {
    applyCurrencyOption(e.target.selectedOptions[0]);
  });

  $('#applyCustomCurrency').addEventListener('click', () => {
    const code = ($('#customCurrencyCode').value || '').trim().toUpperCase().slice(0,4);
    if(!code || code.length < 2){ toast('Ingresa un código de moneda válido (mín. 2 letras)','error'); return; }
    const preset = Array.from($('#currencySelect').options).find(o => o.dataset.currency === code);
    if(preset){ applyCurrencyOption(preset); return; }
    setCurrency(code, '$', 'es-MX');
    toast(`Moneda personalizada: ${code}`, 'success');
    beep(800, 60);
  });
  $('#customCurrencyCode').addEventListener('keydown', e => {
    if(e.key === 'Enter'){ e.preventDefault(); $('#applyCustomCurrency').click(); }
  });

  $('#searchDenom').addEventListener('input', e => { renderBills(e.target.value); syncDenomFilterClear(); });
  $('#clearDenomFilter').addEventListener('click', () => {
    const input = $('#searchDenom');
    input.value = '';
    syncDenomFilterClear();
    renderBills('');
    input.focus();
    beep(650, 30);
  });
  $('#searchHistory').addEventListener('input', e => renderHistory(e.target.value));

  $('#btnClearAll').addEventListener('click', async () => {
    const has = Object.values(state.quantities).some(v=>v>0);
    if(!has){ toast('Ya está todo en cero','info'); return; }
    const ok = await confirmModal('Vaciar cantidades', '¿Poner todos los billetes en cero? Esta acción no borra el historial.');
    if(ok) clearAllQuantities();
  });

  $('#btnCopyCalc').addEventListener('click', copyCurrentCalc);
  $('#btnSaveHistory').addEventListener('click', saveToHistory);

  $('#btnSplitAmount').addEventListener('click', splitAmountIntoBills);
  $('#splitAmount').addEventListener('keydown', e => {
    if(e.key === 'Enter'){ e.preventDefault(); splitAmountIntoBills(); }
  });
  $('#splitCancel').addEventListener('click', () => closeSplitMode(null));
  $('#splitAdd').addEventListener('click', () => closeSplitMode('add'));
  $('#splitReplace').addEventListener('click', () => closeSplitMode('replace'));
  $('#splitOverlay').addEventListener('click', e => { if(e.target.id === 'splitOverlay') closeSplitMode(null); });
  $('#amountAlertOk').addEventListener('click', closeAmountAlert);
  $('#amountAlertOverlay').addEventListener('click', e => { if(e.target.id === 'amountAlertOverlay') closeAmountAlert(); });

  /* Un único menú de exportación, compartido por historial y barra lateral. */
  ['#btnExport', '#sideExport'].forEach(sel => {
    const trigger = $(sel);
    if(trigger) trigger.addEventListener('click', e => {
      e.stopPropagation();
      openExportMenu(trigger);
    });
  });
  $$('.export-option').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const recordIdx = exportMenuRecord;
    const record = recordIdx == null ? null : state.history[recordIdx];
    closeExportMenu();
    exportData(b.dataset.export, record ? [record] : null, record == null ? null : recordIdx);
  }));
  $('#emptyExportClose').addEventListener('click', closeEmptyExport);
  $('#emptyExportOverlay').addEventListener('click', e => {
    if(e.target.id === 'emptyExportOverlay') closeEmptyExport();
  });
  $('#saveFlashClose').addEventListener('click', closeSaveFlash);
  $('#exportClose').addEventListener('click', closeExportMenu);
  $('#exportOverlay').addEventListener('click', e => {
    if(e.target.id === 'exportOverlay') closeExportMenu();
  });

  /* Detalle del historial: exportar/copiar/restaurar el registro abierto. */
  $('#historyDetailClose').addEventListener('click', closeHistoryDetail);
  $('#historyDetailOverlay').addEventListener('click', e => {
    if(e.target.id === 'historyDetailOverlay') closeHistoryDetail();
  });
  $('#histDetailCopy').addEventListener('click', () => {
    if(historyDetailIndex != null) copyHistory(historyDetailIndex);
  });
  $('#histDetailRestore').addEventListener('click', () => {
    const idx = historyDetailIndex;
    closeHistoryDetail();
    restoreHistory(idx);
  });
  const exportThisRecord = type => {
    const idx = historyDetailIndex;
    if(idx == null) return;
    const record = state.history[idx];
    closeHistoryDetail();
    exportData(type, [record], idx);
  };
  $('#histDetailXlsx').addEventListener('click', () => exportThisRecord('xlsx'));
  $('#histDetailDocx').addEventListener('click', () => exportThisRecord('docx'));
  $('#histDetailPdf').addEventListener('click', () => exportThisRecord('pdf'));

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

  $('#btnResetDenoms').addEventListener('click', resetDenoms);
  $('#btnToggleAllDenoms').addEventListener('click', toggleAllDenoms);

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
    state.denoms = sortDenoms(state.denoms);
    state.allDenoms = sortDenoms(state.allDenoms);
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
  const prefDenomOrder = $('#prefDenomOrder');
  if(prefDenomOrder){
    prefDenomOrder.checked = !!state.prefs.denomOrderAsc;
    prefDenomOrder.addEventListener('change', e => {
      state.prefs.denomOrderAsc = e.target.checked;
      saveState();
      renderBills($('#searchDenom').value);
      renderDenomList();
      renderStats();
      toast(state.prefs.denomOrderAsc ? 'Denominaciones de menor a mayor' : 'Denominaciones de mayor a menor', 'info');
      beep(720, 45);
    });
  }
  $('#prefConfetti').addEventListener('change', e => { state.prefs.confetti = e.target.checked; saveState(); });
  $('#prefAutoSave').addEventListener('change', e => { state.prefs.autoSave = e.target.checked; saveState(); });
  $('#prefSound').addEventListener('change', e => { state.prefs.sound = e.target.checked; saveState(); if(e.target.checked) beep(800, 60); });

  $('#winClose').addEventListener('click', exitApp);

  $('#btnScrollTop').addEventListener('click', () => scrollPage(true));
  $('#btnScrollBottom').addEventListener('click', () => scrollPage(false));

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && $('#emptyExportOverlay').classList.contains('show')){ e.preventDefault(); closeEmptyExport(); return; }
    if(e.key === 'Escape' && $('#splitOverlay').classList.contains('show')){ e.preventDefault(); closeSplitMode(null); return; }
    if(e.key === 'Escape' && $('#amountAlertOverlay').classList.contains('show')){ e.preventDefault(); closeAmountAlert(); return; }
    if(e.key === 'Escape' && isSaveFlashOpen()){ e.preventDefault(); return; }
    if(e.key === 'Escape' && $('#billOverlay').classList.contains('show')){ e.preventDefault(); closeBillView(); return; }
    if(e.key === 'Escape' && $('#photoOverlay').classList.contains('show')){ e.preventDefault(); closePhoto(); return; }
    if(e.key === 'Escape' && $('#authorOverlay').classList.contains('show')){ e.preventDefault(); closeAuthor(); return; }
    if(e.key === 'Escape' && isHistoryDetailOpen()){ e.preventDefault(); closeHistoryDetail(); return; }
    if(e.key === 'Escape' && isExportMenuOpen()){ e.preventDefault(); closeExportMenu(); return; }
    if(e.key === 'Escape' && isDrawerOpen()){ e.preventDefault(); closeDrawer(); return; }
    if(e.ctrlKey && e.key === 's'){ e.preventDefault(); saveToHistory(); }
    if(e.ctrlKey && e.key === 'k'){ e.preventDefault(); $('#searchDenom').focus(); }
    if(e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l'){ e.preventDefault(); toggleTheme(); }
  });

  /* Al abrir la APK (tras pasar la intro) se busca versión nueva en silencio;
     si no hay conexión no se muestra ningún aviso y la app sigue local. */
  if(isNative && sessionStorage.getItem('cashier_entered') === '1'){
    setTimeout(() => checkForUpdates({ auto:true }), 1200);
  }

  window.addEventListener('orientationchange', () => setTimeout(() => refreshTotals(), 200));
});
