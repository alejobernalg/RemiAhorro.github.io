// =========================================================
// RemiAhorro — EDUCACIÓN
// =========================================================

import { requireAuth, fmt } from "./app.js";

const user = requireAuth("educacion");

// =========================================================
// Utilidades
// =========================================================
const $ = (q) => document.querySelector(q);
const $$ = (q) => document.querySelectorAll(q);

function load(key, def) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? def;
  } catch {
    return def;
  }
}

function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// =========================================================
// Datos iniciales
// =========================================================
const lessons = [
  { id: 1, title: "Tus primeras metas", icon: "🎯", mins: 2 },
  { id: 2, title: "Ahorro automático", icon: "⚡", mins: 3 },
  { id: 3, title: "Fondo de emergencia", icon: "💼", mins: 3 },
  { id: 4, title: "Interés compuesto", icon: "📈", mins: 2 },
  { id: 5, title: "Cómo dividir tu remesa", icon: "🧮", mins: 1 },
  { id: 6, title: "Errores comunes", icon: "❗", mins: 2 }
];

const habits = [
  "Ahorré primero",
  "No gasté de más",
  "Revisé mis metas",
];

const badges = [
  { id: "first-lesson", name: "Primera lección", icon: "🏅" },
  { id: "streak-3", name: "Racha de 3 días", icon: "🔥" },
  { id: "streak-7", name: "Racha de 7 días", icon: "⚡" },
  { id: "all-complete", name: "100% lecciones", icon: "🌟" },
];

// =========================================================
// Estado persistente
// =========================================================
let state = load("edu_state", {
  lessons: {},    // {1:true, 2:true ...}
  streak: 0,
  lastDay: null,
  habits: {},
  badges: {},
});

function saveState() {
  save("edu_state", state);
  renderAll();
}

// =========================================================
// Render de KPIs
// =========================================================
function renderKPIs() {
  const done = Object.values(state.lessons).filter(Boolean).length;
  $("#kpiLessons").textContent = done;

  $("#kpiStreak").textContent = `${state.streak} días`;

  const pct = Math.round((done / lessons.length) * 100);
  $("#kpiProgress").style.width = pct + "%";
}

// =========================================================
// Render de lecciones
// =========================================================
function renderLessons() {
  const grid = $("#lessonGrid");
  grid.innerHTML = "";

  lessons.forEach((l) => {
    const done = state.lessons[l.id];

    const card = document.createElement("div");
    card.className = "lesson";
    card.innerHTML = `
      <div class="lesson-ico">${l.icon}</div>
      <div style="flex:1">
        <h3>${l.title}</h3>
        <div style="display:flex;justify-content:space-between">
          <span class="muted-sm">${l.mins} min</span>
          <span class="pill-mini">${done ? "Completada" : "Ver"}</span>
        </div>
        <div class="progress-lite" style="margin-top:6px"><span style="width:${done ? 100 : 0}%"></span></div>
      </div>
    `;

    card.onclick = () => openLesson(l);
    grid.appendChild(card);
  });
}

// =========================================================
// Abrir lección (video)
/////////////////////////////////////////////////////////////
let currentLessonId = null;

function openLesson(lesson) {
  currentLessonId = lesson.id;
  $("#videoTitle").textContent = lesson.title;
  $("#videoModal").showModal();
}

$("#videoClose").onclick = () => $("#videoModal").close();

$("#videoComplete").onclick = () => {
  if (currentLessonId) {
    state.lessons[currentLessonId] = true;
    giveBadge("first-lesson");

    if (Object.values(state.lessons).filter(Boolean).length === lessons.length) {
      giveBadge("all-complete");
    }
  }
  saveState();
  $("#videoModal").close();
};

// =========================================================
// Racha diaria
// =========================================================
function updateStreak() {
  const today = new Date().toDateString();

  if (state.lastDay === today) return;

  if (!state.lastDay) {
    state.streak = 1;
  } else {
    const last = new Date(state.lastDay);
    const diff = (new Date(today) - last) / (1000 * 3600 * 24);

    if (diff <= 1) state.streak += 1;
    else state.streak = 1;
  }

  state.lastDay = today;

  if (state.streak === 3) giveBadge("streak-3");
  if (state.streak === 7) giveBadge("streak-7");

  saveState();
}

// =========================================================
// Hábitos
// =========================================================
function renderHabits() {
  const list = $("#habitList");
  list.innerHTML = "";

  habits.forEach((h) => {
    const box = document.createElement("div");
    box.className = "habit";
    box.innerHTML = `
      <span>${h}</span>
      <input type="checkbox" ${state.habits[h] ? "checked" : ""}>
    `;

    box.querySelector("input").onchange = (e) => {
      state.habits[h] = e.target.checked;
      saveState();
    };

    list.appendChild(box);
  });
}

// =========================================================
// Insignias
// =========================================================
function giveBadge(id) {
  state.badges[id] = true;
}

function renderBadges() {
  const grid = $("#badgeGrid");
  grid.innerHTML = "";

  badges.forEach((b) => {
    const div = document.createElement("div");
    div.className = "badge " + (state.badges[b.id] ? "" : "locked");
    div.innerHTML = `
      <div class="b-ico">${b.icon}</div>
      <div style="font-weight:800;margin-top:4px">${b.name}</div>
    `;
    grid.appendChild(div);
  });
}

// =========================================================
// Quiz
// =========================================================
$("#quizSubmit").onclick = () => {
  const f = $("#quizForm");
  const q1 = f.q1.value;
  const q2 = f.q2.value;
  const q3 = f.q3.value;

  const ok = q1 === "b" && q2 === "a" && q3 === "b";

  $("#quizFeedback").textContent = ok
    ? "¡Muy bien! Respuestas correctas."
    : "Algunas respuestas son incorrectas.";

  if (ok) giveBadge("first-lesson");

  saveState();
};

$("#quizClose").onclick = () => $("#quizModal").close();

// =========================================================
// Descargar guía PDF (simulado)
// =========================================================
$("#dlGuia").onclick = () => {
  alert("Descarga simulada. Aquí iría tu PDF real.");
};

// =========================================================
// 🔥 SIMULADOR: ¿Cuánto necesito ahorrar al mes?
// =========================================================
$("#btnAM").onclick = () => {
  const g = Number($("#amGoal").value);
  const m = Number($("#amMonths").value);

  if (!g || !m || m <= 0) {
    $("#amOut").textContent = "—";
    return;
  }

  const res = g / m;

  $("#amOut").textContent = fmt(res);
};

// =========================================================
// Reset total
// =========================================================
$("#resetEdu").onclick = () => {
  if (confirm("¿Seguro que quieres reiniciar todo tu progreso?")) {
    localStorage.removeItem("edu_state");
    location.reload();
  }
};

// =========================================================
// Render global
// =========================================================
function renderAll() {
  renderKPIs();
  renderLessons();
  renderHabits();
  renderBadges();
}

updateStreak();
renderAll();
