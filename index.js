// index.js — versión corregida, completa y con evolución premium

import { requireAuth, PROFILES, fmt, saveUser, ensureSavingsSynced } from './app.js';

// ===== 0) Autenticación =====
const user = requireAuth("inicio");
if (!user) throw new Error("auth");

// ===== 1) Monto =====
const rawAmount = localStorage.getItem("remi_amount");
const amount = Number(rawAmount ?? user.amount ?? 0) || 0;
user.amount = amount;

// ===== 2) Perfil =====
const storedProfile = localStorage.getItem("remi_profile");
user.profile = (storedProfile && PROFILES[storedProfile])
  ? storedProfile
  : (user.profile && PROFILES[user.profile] ? user.profile : "equilibrado");

saveUser(user);

// ===== 3) Referencias =====
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

// ===== Helpers =====
const fmtFull = n => fmt(Number(n || 0));

// ======================================================
//                   RENDER PRINCIPAL
// ======================================================
function render() {
  const pKey = user.profile || 'equilibrado';
  const d = PROFILES[pKey].dist;

  // Sincronización real del ahorro disponible
  const ahorroDisponible = ensureSavingsSynced(user);

  // Montos por categoría
  const vC = Math.round(amount * d.c / 100);
  const vA = ahorroDisponible;
  const vS = Math.round(amount * d.s / 100);

  // ===== 🎨 DONA PREMIUM =====
  const cDeg = (d.c / 100) * 360;
  const aDeg = (d.a / 100) * 360;

  donut.style.background = `
    conic-gradient(
      var(--consumo) 0deg ${cDeg}deg,
      var(--ahorro)  ${cDeg}deg ${cDeg + aDeg}deg,
      var(--serv)    ${cDeg + aDeg}deg 360deg
    )
  `;

  // ===== Texto =====
  dAmount.textContent = fmtFull(amount);

  cPct.textContent = d.c + "%";
  aPct.textContent = d.a + "%";
  sPct.textContent = d.s + "%";

  cVal.textContent = fmtFull(vC);
  aVal.textContent = fmtFull(vA);
  sVal.textContent = fmtFull(vS);

  wCons.textContent = fmtFull(vC);
  wAho.textContent  = fmtFull(vA);

  // KPIs
  kpiAhorroDisp.textContent = fmtFull(vA);
  kpiAhorroMes.textContent  = fmtFull(Math.round(amount * d.a / 100));
  kpiPctAhorro.textContent  = d.a + "%";

  renderEvolucion(d.a);
  renderStackMetas();
}

// ======================================================
//     EVOLUCIÓN DE AHORRO — VERSIÓN PREMIUM REALISTA
// ======================================================
function renderEvolucion(pctAhorro) {
  const KEY = "remi_savings_history";

  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch {}

  const base = Math.round((user.amount || 0) * pctAhorro / 100);

  // Si no existe historial → lo generamos progresivo con variación realista
  if (!Array.isArray(arr) || arr.length === 0) {
    arr = [];
    let current = base * 0.75; // arranca ligeramente más abajo

    for (let i = 0; i < 6; i++) {
      const growth = (Math.random() * 0.15) + 0.05; // crecimiento 5%–20%
      current = current * (1 + growth);
      arr.push(Math.round(current));
    }

    localStorage.setItem(KEY, JSON.stringify(arr));
  }

  // ==== Render ====
  bars.innerHTML = "";
  const max = Math.max(...arr, 1);

  const labels = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const today = new Date();

  for (let i = 0; i < arr.length; i++) {
    const h = Math.round((arr[i] / max) * 100);
    const month = labels[(today.getMonth() - (arr.length - 1 - i) + 12) % 12];

    const growth = i === 0 ? null : ((arr[i] - arr[i - 1]) / arr[i - 1]) * 100;
    const growthTxt = growth ? `${growth > 0 ? "+" : ""}${growth.toFixed(1)}%` : "";

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = h + "%";

    // % crecimiento arriba
    if (growthTxt) {
      const g = document.createElement("div");
      g.className = "bar-growth";
      g.textContent = growthTxt;
      bar.appendChild(g);
    }

    // Mes debajo
    const lbl = document.createElement("div");
    lbl.className = "bar-label";
    lbl.textContent = month;
    bar.appendChild(lbl);

    bars.appendChild(bar);
  }
}

// ======================================================
//                 STACK DE METAS
// ======================================================
function renderStackMetas() {
  const raw = localStorage.getItem("remi_goals");
  let goals = [];
  try { goals = JSON.parse(raw || "[]"); } catch {}

  stack.innerHTML = "";
  stackLegend.innerHTML = "";

  if (!Array.isArray(goals) || goals.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Aún no has creado metas.";
    stackLegend.appendChild(empty);
    return;
  }

  goals.sort((a,b)=> (b.saved||0)-(a.saved||0));
  const total = goals.reduce((acc,g)=> acc + (Number(g.saved)||0), 0);

  if (total <= 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Todavía no has aportado a ninguna meta.";
    stackLegend.appendChild(empty);
    return;
  }

  goals.slice(0,5).forEach((g,idx)=>{
    const pct = Math.max(2, Math.round((g.saved||0) * 100 / total));

    const chunk = document.createElement("div");
    chunk.className = `chunk chunk-${idx}`;
    chunk.style.width = pct + "%";
    stack.appendChild(chunk);

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.innerHTML = `<span class="dot-sm"></span> ${g.name} — <b>${pct}%</b>`;

    const colors = ["#19b169","#f4bf28","#156646","#2c8d6e","#88d1b3"];
    tag.querySelector(".dot-sm").style.background = colors[idx % colors.length];

    stackLegend.appendChild(tag);
  });
}

// ======================================================
//                   EVENTOS
// ======================================================
window.addEventListener("storage", (e) => {
  if (e.key === "remi_savings_available" || e.key === "remi_goals") render();
});

goMetas && (goMetas.onclick = () => location.href = "metas.html");
goEdu   && (goEdu.onclick   = () => location.href = "educacion.html");

document.getElementById('btnConsumo')?.addEventListener('click', () => alert('Ver movimientos (demo)'));
document.getElementById('btnAhorro') ?.addEventListener('click', () => location.href='metas.html');

// ===== Render final =====
render();
