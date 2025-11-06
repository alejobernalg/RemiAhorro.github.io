// Persistencia en localStorage
const K = {
  EDU: 'remi_edu_state',  // {lessons:{id:{done}}, quizScore, streak, lastDay, habits:{id:bool}}
};

const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const fmt = n => "$" + Number(n||0).toLocaleString("es-CO", {maximumFractionDigits:0});

// Estado base
function loadState(){
  const raw = localStorage.getItem(K.EDU);
  if(raw){ try{ return JSON.parse(raw); }catch(e){} }
  const s = { lessons:{}, quizScore:0, streak:0, lastDay:null, habits:{} };
  localStorage.setItem(K.EDU, JSON.stringify(s));
  return s;
}
function saveState(s){ localStorage.setItem(K.EDU, JSON.stringify(s)); }

let state = loadState();

// Lecciones (puedes añadir más)
const LESSONS = [
  { id:'l1', ico:'🎯', title:'Cómo ahorrar con remesas', dur:'5 min', tag:'Básico' },
  { id:'l2', ico:'📊', title:'Presupuesto 50/30/20',     dur:'6 min', tag:'Básico' },
  { id:'l3', ico:'🏦', title:'Fondo de emergencia',       dur:'4 min', tag:'Esencial' },
  { id:'l4', ico:'💳', title:'Tarjetas: buenas prácticas',dur:'7 min', tag:'Intermedio' },
  { id:'l5', ico:'📈', title:'Interés compuesto',         dur:'5 min', tag:'Básico' },
  { id:'l6', ico:'🎯', title:'Metas SMART',               dur:'5 min', tag:'Esencial' },
];

const HABITS = [
  { id:'h1', text:'Separé primero mi % de ahorro' },
  { id:'h2', text:'Registré gastos de hoy' },
  { id:'h3', text:'Revisé mis metas activas' },
  { id:'h4', text:'Evité compras impulsivas' },
  { id:'h5', text:'Revisé mi fondo de emergencia' },
  { id:'h6', text:'Leí 5 min sobre finanzas' },
];

const BADGES = [
  { id:'b1', ico:'🥉', name:'Primer paso', req: s=> Object.values(s.lessons).filter(x=>x?.done).length >= 1 },
  { id:'b2', ico:'🥈', name:'Aprendiz',    req: s=> Object.values(s.lessons).filter(x=>x?.done).length >= 3 },
  { id:'b3', ico:'🏅', name:'Constante',   req: s=> s.streak >= 3 },
  { id:'b4', ico:'🏆', name:'Experto',     req: s=> (Object.values(s.lessons).filter(x=>x?.done).length >= LESSONS.length) && s.quizScore >= 3 },
];

// KPI / streak
function updateStreak(){
  const today = new Date(); today.setHours(0,0,0,0);
  const todayNum = today.getTime();
  if(state.lastDay === null){
    state.streak = 1; state.lastDay = todayNum; return;
  }
  const delta = (todayNum - state.lastDay) / (1000*60*60*24);
  if(delta === 0) return;        // ya contado hoy
  if(delta === 1) state.streak += 1;
  else state.streak = 1;
  state.lastDay = todayNum;
}
updateStreak();
saveState(state);

// Render KPIs
function renderKPIs(){
  const done = Object.values(state.lessons).filter(x=>x?.done).length;
  const total = LESSONS.length;
  $('#kpiLessons').textContent = String(done);
  const pct = Math.round(((done + (state.quizScore>0?1:0)) / (total+1)) * 100);
  $('#kpiProgress').style.width = Math.min(100, pct) + '%';
  $('#kpiStreak').textContent = (state.streak||0) + ' días';
}

// Render lecciones
function renderLessons(){
  const grid = $('#lessonGrid');
  grid.innerHTML = LESSONS.map(l=>{
    const done = state.lessons[l.id]?.done;
    return `
      <div class="lesson" data-id="${l.id}">
        <div class="lesson-ico">${l.ico}</div>
        <div style="flex:1">
          <h3>${l.title}</h3>
          <div class="muted">${l.dur} · <span class="pill-mini">${l.tag}</span></div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn primary js-play">Ver</button>
            <button class="btn secondary js-quiz">Quiz</button>
            <button class="btn ghost js-done">${done ? '✔ Completada' : 'Marcar como vista'}</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // listeners
  $$('#lessonGrid .js-play').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = e.currentTarget.closest('.lesson').dataset.id;
      openVideo(id);
    });
  });
  $$('#lessonGrid .js-quiz').forEach(btn=>{
    btn.addEventListener('click', openQuiz);
  });
  $$('#lessonGrid .js-done').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = e.currentTarget.closest('.lesson').dataset.id;
      markLesson(id, true);
    });
  });
}

function markLesson(id, done=true){
  state.lessons[id] = { done };
  saveState(state);
  renderLessons(); renderKPIs(); renderBadges();
}

// Video modal (demo)
const videoModal = $('#videoModal');
$('#videoClose').addEventListener('click', ()=> videoModal.close());
$('#videoComplete').addEventListener('click', ()=>{
  const id = videoModal.dataset.id;
  if(id) markLesson(id, true);
  videoModal.close();
});
function openVideo(id){
  const lesson = LESSONS.find(x=>x.id===id);
  $('#videoTitle').textContent = 'Lección — ' + (lesson?.title || '');
  videoModal.dataset.id = id;
  videoModal.showModal();
}

// Quiz modal
const quizModal = $('#quizModal');
$('#quizClose').addEventListener('click', ()=> quizModal.close());
$('#quizSubmit').addEventListener('click', ()=>{
  const f = $('#quizForm');
  const a1 = new FormData(f).get('q1');
  const a2 = new FormData(f).get('q2');
  const a3 = new FormData(f).get('q3');
  let score = 0;
  if(a1==='b') score++;
  if(a2==='a') score++;
  if(a3==='b') score++;
  state.quizScore = score;
  saveState(state);
  $('#quizFeedback').textContent = `Resultado: ${score}/3`;
  renderKPIs(); renderBadges();
});
function openQuiz(){ $('#quizFeedback').textContent=''; $('#quizForm').reset(); quizModal.showModal(); }

// Hábitos
function renderHabits(){
  const box = $('#habitList');
  box.innerHTML = HABITS.map(h=>{
    const on = !!state.habits[h.id];
    return `
      <div class="habit" data-id="${h.id}">
        <div>${h.text}</div>
        <label class="switch">
          <input type="checkbox" ${on?'checked':''}>
          <span></span>
        </label>
      </div>
    `;
  }).join('');
  // toggle
  $$('#habitList .habit input').forEach(inp=>{
    inp.addEventListener('change', e=>{
      const id = e.currentTarget.closest('.habit').dataset.id;
      state.habits[id] = e.currentTarget.checked;
      saveState(state);
      renderBadges(); // por si algún badge depende de hábitos en el futuro
    });
  });
}

// Insignias
function renderBadges(){
  const box = $('#badgeGrid');
  box.innerHTML = BADGES.map(b=>{
    const unlocked = b.req(state);
    return `
      <div class="badge ${unlocked?'':'locked'}">
        <div class="b-ico">${b.ico}</div>
        <div style="font-weight:800;margin-top:6px">${b.name}</div>
        <div class="muted-sm">${unlocked ? 'Desbloqueada' : 'Bloqueada'}</div>
      </div>
    `;
  }).join('');
}

// Simuladores
function money(n){ return "$" + Number(n||0).toLocaleString("es-CO"); }
$('#btnIC')?.addEventListener('click', ()=>{
  const P = Number($('#icP').value)||0;
  const r = Number($('#icR').value)||0;
  const t = Number($('#icT').value)||0;
  const n = Number($('#icN').value)||1;
  const A = P * Math.pow(1 + (r/100)/n, n*t);
  $('#icOut').textContent = money(Math.round(A));
});
$('#btnAM')?.addEventListener('click', ()=>{
  const goal = Number($('#amGoal').value)||0;
  const m    = Number($('#amMonths').value)||0;
  if(!goal || !m) { $('#amOut').textContent = "$0"; return; }
  $('#amOut').textContent = money(Math.ceil(goal / m));
});

// Descargar guía (PDF simulado)
$('#dlGuia')?.addEventListener('click', ()=>{
  const blob = new Blob([
    'Guía rápida de ahorro con remesas\n\n1) Ahorra primero\n2) Crea metas\n3) Automatiza\n'
  ], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'Guia_RemiAhorro.txt'; a.click();
  URL.revokeObjectURL(url);
});

// Reset educación
$('#resetEdu').addEventListener('click', ()=>{
  if(!confirm('¿Reiniciar todo tu progreso educativo?')) return;
  state = { lessons:{}, quizScore:0, streak:0, lastDay:null, habits:{} };
  saveState(state);
  renderLessons(); renderKPIs(); renderHabits(); renderBadges();
});

// Bootstrap
renderLessons();
renderKPIs();
renderHabits();
renderBadges();
