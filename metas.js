// metas.js
// Sincroniza Saldo Ahorro con el % Ahorro del perfil * remi_amount EN CADA NUEVA SESIÓN.
// Si la sesión ya fue aplicada, conserva el saldo (no pisa lo que moviste a metas).

import { PROFILES, getUser } from './app.js';

const K = {
  GOALS: 'remi_goals',
  SAVINGS_AVAIL: 'remi_savings_available',   // saldo libre para mover a metas
  SESSION_ID: 'remi_session_id',             // se setea en login
  SESSION_APPLIED: 'remi_session_applied'    // último session_id aplicado en Metas
};

// ==== Helpers & estado ====
const $  = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const fmt = n => "$" + Number(n||0).toLocaleString("es-CO",{maximumFractionDigits:0});
const escapeHTML = s => String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

// Lee monto y perfil
function getAmountAndProfile(){
  const u = (typeof getUser === "function" ? getUser() : {}) || {};
  let amount = Number(localStorage.getItem("remi_amount"));
  let profileKey = localStorage.getItem("remi_profile");

  if(!amount || amount<=0) amount = Number(u.amount || 0);
  if(!profileKey) profileKey = u.profile || "equilibrado";

  const key = PROFILES[profileKey] ? profileKey : "equilibrado";
  return { amount, profileKey: key, dist: PROFILES[key].dist };
}

// Deriva la cuota de ahorro (monto * % ahorro del perfil)
function deriveAhorroShare(){
  const { amount, dist } = getAmountAndProfile();
  const share = Math.round((amount || 0) * (dist.a / 100));
  return { amount, pctAhorro: dist.a, ahorroShare: share };
}

// Goals
function loadGoals() {
  const raw = localStorage.getItem(K.GOALS);
  if (raw) return JSON.parse(raw);
  const seed = [
    { id: crypto.randomUUID(), name: "Viaje a Medellín", target: 1000000, saved: 350000 }
  ];
  localStorage.setItem(K.GOALS, JSON.stringify(seed));
  return seed;
}
function saveGoals(arr){ localStorage.setItem(K.GOALS, JSON.stringify(arr)); }

// Savings
function getSavingsAvailRaw(){ 
  const raw = localStorage.getItem(K.SAVINGS_AVAIL);
  return raw === null ? null : Number(raw);
}
function saveSavingsAvail(v){ localStorage.setItem(K.SAVINGS_AVAIL, String(v)); }

// Sincronización por sesión (clave del fix)
function ensureSessionSynced(){
  const sid = localStorage.getItem(K.SESSION_ID);
  const applied = localStorage.getItem(K.SESSION_APPLIED);

  // 1) Primera vez con sesión nueva -> inicializa saldo con la cuota de ahorro
  if (sid && sid !== applied) {
    const { ahorroShare } = deriveAhorroShare();
    saveSavingsAvail(ahorroShare);
    localStorage.setItem(K.SESSION_APPLIED, sid);
    return ahorroShare;
  }

  // 2) Sin sesión (flujo antiguo) o ya aplicada -> usa lo que haya guardado
  const existing = getSavingsAvailRaw();

  // Si nunca hubo saldo guardado, inicializa desde cuota de ahorro
  if (existing === null || Number.isNaN(existing)) {
    const { ahorroShare } = deriveAhorroShare();
    saveSavingsAvail(ahorroShare);
    return ahorroShare;
  }

  // Si había la semilla vieja de 80.000 de versiones anteriores, reemplázala por la cuota real
  if (existing === 80000) {
    const { ahorroShare } = deriveAhorroShare();
    saveSavingsAvail(ahorroShare);
    return ahorroShare;
  }

  // En cualquier otro caso, respeta el saldo existente
  return existing;
}

// ==== Estado global de esta página ====
let goals = loadGoals();
import { ensureSavingsSynced } from './app.js';

let savingsAvail = ensureSavingsSynced(getUser());


// ==== Render principal ====
const grid = $("#goalsGrid");
const saldoLbl = $("#saldoLbl");
const goalModal = $("#goalModal");
const moveModal = $("#moveModal");

let editingGoalId = null;  // si es edición guardamos el id
let movingGoalId  = null;  // meta destino para mover dinero

function renderHeaderOrigen(){
  const origenEl = $("#origenAhorro");
  if(!origenEl) return;
  const { amount, pctAhorro, ahorroShare } = (()=>{
    const { amount, pctAhorro, ahorroShare } = (()=>{
      const d = deriveAhorroShare();
      return { amount: d.amount, pctAhorro: d.pctAhorro, ahorroShare: d.ahorroShare };
    })();
    return { amount, pctAhorro, ahorroShare };
  })();
  origenEl.textContent = `Origen ahorro: ${pctAhorro}% de ${fmt(amount)} = ${fmt(ahorroShare)}`;
}

function render(){
  saldoLbl.textContent = fmt(savingsAvail);
  renderHeaderOrigen();
  grid.innerHTML = goals.map(g => goalCardHTML(g)).join("");

  // wiring botones por tarjeta
  $$("[data-action='aportar']", grid).forEach(btn=>{
    btn.addEventListener("click", () => openMove(btn.dataset.id));
  });
  $$("[data-action='editar']", grid).forEach(btn=>{
    btn.addEventListener("click", () => openEdit(btn.dataset.id));
  });
  $$("[data-action='eliminar']", grid).forEach(btn=>{
    btn.addEventListener("click", () => deleteGoal(btn.dataset.id));
  });
}

function goalCardHTML(g){
  const pct = Math.min(100, Math.floor((g.saved / g.target) * 100));
  return `
    <div class="goal-card card">
      <div class="goal-head" style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div>
          <div class="goal-title" style="font-size:18px;font-weight:800;color:#1e523b;margin:0">${escapeHTML(g.name)}</div>
          <div class="muted">Objetivo: ${fmt(g.target)}</div>
        </div>
        <div class="goal-actions" style="display:flex;gap:8px">
          <button class="chip" data-action="editar"  data-id="${g.id}">Editar</button>
          <button class="chip danger" data-action="eliminar" data-id="${g.id}">Eliminar</button>
        </div>
      </div>

      <div class="row" style="margin-top:12px">
        <div class="lbl">Progreso</div>
        <div class="track"><div class="fill" style="width:${pct}%"></div></div>
        <div class="perc">${pct}%</div>
      </div>
      <div class="muted">Acumulado: <b>${fmt(g.saved)}</b> / ${fmt(g.target)}</div>

      <div class="goal-cta" style="margin-top:12px;display:flex;gap:10px">
        <button class="btn primary" data-action="aportar" data-id="${g.id}">Aportar desde ahorro</button>
      </div>
    </div>
  `;
}

// ==== Crear / Editar metas ====
$("#btnNuevaMeta").addEventListener("click", ()=> openCreate());

function openCreate(){
  editingGoalId = null;
  $("#modalTitle").textContent = "Nueva meta";
  $("#gName").value = "";
  $("#gTarget").value = "";
  $("#gSaved").value = "";
  goalModal.showModal();
}
function openEdit(id){
  const g = goals.find(x=>x.id===id);
  if(!g) return;
  editingGoalId = id;
  $("#modalTitle").textContent = "Editar meta";
  $("#gName").value = g.name;
  $("#gTarget").value = g.target;
  $("#gSaved").value = g.saved;
  goalModal.showModal();
}
$("#goalForm").addEventListener("submit", (e)=>{
  e.preventDefault();
  const name   = $("#gName").value.trim();
  const target = Number($("#gTarget").value);
  const saved  = Number($("#gSaved").value || 0);
  if(!name || !target || target<10000) return;

  if(editingGoalId){
    goals = goals.map(g => g.id===editingGoalId ? {...g, name, target, saved: Math.min(saved, target)} : g);
  }else{
    goals.push({ id: crypto.randomUUID(), name, target, saved: Math.min(saved, target) });
  }
  saveGoals(goals);
  goalModal.close();
  render();
});
goalModal.addEventListener("close", ()=> { editingGoalId=null; });

// ==== Eliminar meta ====
function deleteGoal(id){
  const g = goals.find(x=>x.id===id);
  if(!g) return;
  if(confirm(`¿Eliminar la meta "${g.name}"?`)){
    goals = goals.filter(x=>x.id!==id);
    saveGoals(goals);
    render();
  }
}

// ==== Mover dinero desde ahorro disponible ====
function openMove(id){
  movingGoalId = id;
  const g = goals.find(x=>x.id===id);
  if(!g) return;
  $("#moveInfo").innerHTML = `Desde ahorro disponible a: <b>${escapeHTML(g.name)}</b>`;
  $("#mvAmount").value = Math.min(20000, savingsAvail, g.target - g.saved);
  $("#mvAmount").max   = Math.max(0, Math.min(savingsAvail, g.target - g.saved));
  $("#mvHint").textContent = `Saldo disponible: ${fmt(savingsAvail)} | Restante en meta: ${fmt(g.target - g.saved)}`;
  moveModal.showModal();
}
$("#moveForm").addEventListener("submit", (e)=>{
  e.preventDefault();
  const g = goals.find(x=>x.id===movingGoalId);
  if(!g){ moveModal.close(); return; }
  const max = Math.max(0, Math.min(savingsAvail, g.target - g.saved));
  let amount = Number($("#mvAmount").value);
  if(!amount || amount<=0){ alert("Monto inválido"); return; }
  if(amount > max){ alert("El monto supera el disponible o lo necesario para la meta."); return; }

  // aplicar movimiento
  g.saved += amount;
  savingsAvail -= amount;

  saveGoals(goals);
  saveSavingsAvail(savingsAvail);
  moveModal.close();
  render();
});
moveModal.addEventListener("close", ()=> { movingGoalId=null; });
saveSavingsAvail(savingsAvail);


// ==== Inicio ====
render();
