import { requireAuth, PROFILES, fmt, saveUser } from './app.js';

const user = requireAuth("inicio");
if (!user) throw new Error("auth");

// ===== 1) Cargar monto =====
const rawAmount = localStorage.getItem("remi_amount");
const amount = Number(rawAmount ?? user.amount ?? 0) || 0;
user.amount = amount;

// ===== 2) Perfil desde elige-perfil o default =====
const storedProfile = localStorage.getItem("remi_profile");
user.profile = (storedProfile && PROFILES[storedProfile])
  ? storedProfile
  : (user.profile && PROFILES[user.profile] ? user.profile : "equilibrado");
saveUser(user);

// ===== 3) Refs =====
const donut   = document.getElementById('donut');
const dAmount = document.getElementById('dAmount');

const cPct = document.getElementById('cPct');
const aPct = document.getElementById('aPct');
const sPct = document.getElementById('sPct');

const cVal = document.getElementById('cVal');
const aVal = document.getElementById('aVal');
const sVal = document.getElementById('sVal');

const wCons = document.getElementById('wCons');
const wAho  = document.getElementById('wAho');

const goMetas = document.getElementById('goMetas');
const goEdu   = document.getElementById('goEdu');

const kpiAhorroDisp = document.getElementById('kpiAhorroDisp');
const kpiAhorroMes  = document.getElementById('kpiAhorroMes');
const kpiPctAhorro  = document.getElementById('kpiPctAhorro');

const bars        = document.getElementById('bars');
const stack       = document.getElementById('stack');
const stackLegend = document.getElementById('stackLegend');

const recoCard     = document.getElementById('recoCard');
const acceptRecBtn = document.getElementById('acceptRec');
const ignoreRecBtn = document.getElementById('ignoreRec');

// ===== 4) Recomendación ocultable =====
const RECO_KEY = "remi_reco_dismissed";
function hideReco(){ if (recoCard) recoCard.style.display = "none"; localStorage.setItem(RECO_KEY,"1"); }
if (localStorage.getItem(RECO_KEY) === "1") hideReco();
acceptRecBtn?.addEventListener('click', hideReco);
ignoreRecBtn?.addEventListener('click', hideReco);

// ===== Helpers =====
const fmtK = n => n >= 1000 ? "$" + Math.round(n / 1000) + "K" : fmt(n);

// ===== 5) Render principal =====
function render() {
  const pKey = user.profile || 'equilibrado';
  const d = PROFILES[pKey].dist;

  // Ahorro disponible real (impactado por movimientos en Metas)
  const storedAhorro = Number(localStorage.getItem("remi_savings_available"));
  const ahorroDisponible = (!isNaN(storedAhorro) && storedAhorro >= 0)
    ? storedAhorro
    : Math.round(amount * d.a / 100);

  // Otros montos
  const vC = Math.round(amount * d.c / 100);
  const vA = ahorroDisponible;
  const vS = Math.round(amount * d.s / 100);

  // Dona
  const c1 = d.c, c2 = d.c + d.a;
  donut.style.background = `conic-gradient(
    var(--consumo) 0 ${c1}%,
    var(--ahorro)  ${c1}% ${c2}%,
    var(--serv)    ${c2}% 100%)`;

  // Texto
  dAmount.textContent = fmtK(amount);
  cPct.textContent = d.c + "%";
  aPct.textContent = d.a + "%";
  sPct.textContent = d.s + "%";

  cVal.textContent = fmt(vC);
  aVal.textContent = fmt(vA);
  sVal.textContent = fmt(vS);

  wCons.textContent = fmt(vC);
  wAho.textContent  = fmt(vA);

  // KPIs
  kpiAhorroDisp.textContent = fmt(vA);
  kpiAhorroMes.textContent  = fmt(Math.round(amount * d.a / 100));
  kpiPctAhorro.textContent  = d.a + "%";

  // Evolución (historial simple en localStorage)
  renderEvolucion(d.a);

  // Stack hacia metas
  renderStackMetas();
}

function renderEvolucion(pctAhorro){
  const KEY = "remi_savings_history";
  // Historial de 6-8 puntos; si no existe, creamos a partir del % de ahorro
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch {}
  if (!Array.isArray(arr) || arr.length === 0){
    // crea 6 puntos simulados alrededor del ahorro actual (±20%)
    const base = Math.round((user.amount||0) * pctAhorro/100);
    arr = Array.from({length:6}, (_,i)=> Math.max(0, Math.round(base * (0.8 + 0.08*i))));
    localStorage.setItem(KEY, JSON.stringify(arr));
  }

  bars.innerHTML = "";
  const max = Math.max(...arr, 1);
  const labels = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const today = new Date();
  for (let i=0;i<arr.length;i++){
    const h = Math.round((arr[i]/max) * 100);
    const lab = labels[(today.getMonth()- (arr.length-1-i) + 12) % 12];
    const d = document.createElement("div");
    d.className = "bar";
    d.style.height = h + "%";
    d.setAttribute("data-label", lab);
    bars.appendChild(d);
  }
}

function renderStackMetas(){
  // Lee metas
  const raw = localStorage.getItem("remi_goals");
  let goals = [];
  try { goals = JSON.parse(raw || "[]"); } catch {}
  // Si no hay, muestra vacío y sale
  stack.innerHTML = "";
  stackLegend.innerHTML = "";
  if (!Array.isArray(goals) || goals.length === 0){
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Aún no has creado metas.";
    stackLegend.appendChild(empty);
    return;
  }

  // Ordena por saved desc, toma hasta 5 colores
  goals.sort((a,b)=> (b.saved||0)-(a.saved||0));
  const total = goals.reduce((acc,g)=> acc + (Number(g.saved)||0), 0);

  if (total <= 0){
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Todavía no has aportado a ninguna meta.";
    stackLegend.appendChild(empty);
    return;
  }

  goals.slice(0,5).forEach((g,idx)=>{
    const pct = Math.max(2, Math.round((g.saved||0) * 100 / total)); // ancho mínimo visible
    const chunk = document.createElement("div");
    chunk.className = `chunk chunk-${idx}`;
    chunk.style.width = pct + "%";
    chunk.title = `${g.name}: ${fmt(g.saved)} (${pct}%)`;
    stack.appendChild(chunk);

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.innerHTML = `<span class="dot-sm" style="background: var(--ring); box-shadow: inset 0 0 0 1000px currentColor"></span> ${g.name} — <b style="margin-left:6px">${pct}%</b>`;
    // Color del punto = mismo que el chunk
    const colors = ["#19b169","#f4bf28","#156646","#2c8d6e","#88d1b3"];
    tag.querySelector(".dot-sm").style.color = colors[idx % colors.length];
    stackLegend.appendChild(tag);
  });
}

// ===== 6) Reaccionar a cambios desde Metas =====
window.addEventListener("storage", (e) => {
  if (e.key === "remi_savings_available" || e.key === "remi_goals") render();
});

// ===== 7) Acciones rápidas =====
goMetas && (goMetas.onclick = () => location.href = "metas.html");
goEdu   && (goEdu.onclick   = () => location.href = "educacion.html");
document.getElementById('btnConsumo')?.addEventListener('click', () => alert('Ver movimientos (demo)'));
document.getElementById('btnAhorro') ?.addEventListener('click', () => location.href='metas.html');

// ===== 8) Pintar todo =====
render();
