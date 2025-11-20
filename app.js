// app.js (ESM)
export const PROFILES = {
  equilibrado:     { name:"Equilibrado",     desc:"Balanceo entre consumo y ahorro",   dist:{c:60,a:25,s:15} },
  ahorro_activo:   { name:"Ahorro Activo",   desc:"Prioriza tu futuro financiero",     dist:{c:50,a:35,s:15} },
  pago_prioritario:{ name:"Pago Prioritario",desc:"Enfoque en necesidades inmediatas", dist:{c:60,a:15,s:25} },
  recomendado:     { name:"Recomendado",     desc:"Sugerido por el sistema",           dist:{c:65,a:20,s:15} }, // usado en “Aceptar recomendación”
};

const STORAGE_KEY = "remi_user";

export function defaultUser(){
  return {
    name: "Usuario",
    amount: 120000,
    profile: "equilibrado",
    loggedIn: false
  };
}

export function getUser(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultUser(); }
  catch{ return defaultUser(); }
}

export function saveUser(u){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  return u;
}

export function signOut(){
  const u = getUser();
  u.loggedIn = false;
  saveUser(u);
  location.href = "login.html";
}

export function fmt(n){
  return "$" + Number(n).toLocaleString("es-CO",{maximumFractionDigits:0});
}

export function requireAuth(pageName){
  const u = getUser();
  // Navegación superior (si existe)
  const navUser = document.getElementById("navUser");
  const navLogout = document.getElementById("navLogout");
  if(navUser) navUser.textContent = `Hola, ${u.name}`;
  if(navLogout) navLogout.onclick = (e)=>{ e.preventDefault(); signOut(); };

  document.querySelectorAll('.nav a[data-page="'+pageName+'"]').forEach(a=>a.classList.add('active'));

  if(!u.loggedIn){ location.href = "login.html"; return null; }
  return u;
}

// Aplica la distribución del perfil y ejecuta callbacks para pintar
export function applyDistribution(user, setters){
  const d = PROFILES[user.profile].dist;
  const c = Math.round(user.amount * d.c/100);
  const a = Math.round(user.amount * d.a/100);
  const s = Math.round(user.amount * d.s/100);
  if(setters.consumo)  setters.consumo(fmt(c));
  if(setters.ahorro)   setters.ahorro(fmt(a));
  if(setters.servicios)setters.servicios(fmt(s));
}

export function setProfile(profileKey){
  const u = getUser();
  if(PROFILES[profileKey]){
    u.profile = profileKey;
    saveUser(u);
  }
  return u;
}

export function setAmount(val){
  const u = getUser();
  u.amount = Number(val) || u.amount;
  saveUser(u);
  return u;
}

// ====== GLOBAL SAVINGS SYNC ======

export const SAVINGS_KEY = "remi_savings_available";
export const GOALS_KEY = "remi_goals";
export const SESSION_ID_KEY = "remi_session_id";
export const SESSION_APPLIED_KEY = "remi_session_applied";

export function getDerivedAhorroShare(user) {
  const pKey = user.profile || "equilibrado";
  const dist = PROFILES[pKey].dist;
  const base = Number(localStorage.getItem("remi_amount")) || user.amount || 0;
  return Math.round(base * dist.a / 100);
}

export function ensureSavingsSynced(user){
  const sid = localStorage.getItem(SESSION_ID_KEY);
  const applied = localStorage.getItem(SESSION_APPLIED_KEY);

  // Sesión nueva
  if (sid && sid !== applied){
    const share = getDerivedAhorroShare(user);
    localStorage.setItem(SAVINGS_KEY, share);
    localStorage.setItem(SESSION_APPLIED_KEY, sid);
    return share;
  }

  // Si no existe, inicializar
  let current = localStorage.getItem(SAVINGS_KEY);
  if (current === null){
    const share = getDerivedAhorroShare(user);
    localStorage.setItem(SAVINGS_KEY, share);
    return share;
  }

  // Fix legado
  current = Number(current);
  if (current === 80000){
    const share = getDerivedAhorroShare(user);
    localStorage.setItem(SAVINGS_KEY, share);
    return share;
  }

  return current;
}

