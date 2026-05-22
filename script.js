const KEY = "3pt_v2";

let db = JSON.parse(localStorage.getItem(KEY) || "{}");

let selectedDate = new Date().toISOString().slice(0,10);
let currentSession = null;

let sessionChart, dayChart;
let snapshot = null;

function save(){
  localStorage.setItem(KEY, JSON.stringify(db));
}

function ensureDay(d){
  if(!db[d]) db[d] = {sessions:[]};
}

function snap(){
  snapshot = JSON.parse(JSON.stringify(db));
}

function undo(){
  if(!snapshot) return;
  db = snapshot;
  snapshot=null;
  save();
  render();
}

function session(){
  return db[selectedDate].sessions.find(s=>s.id===currentSession);
}

function pct(m,a){
  return a?Math.round(m/a*100):0;
}

function totalDay(d){
  let m=0,a=0;
  db[d].sessions.forEach(s=>{
    m+=s.made;
    a+=s.attempts;
  });
  return {m,a};
}

function totalAll(){
  let m=0,a=0;
  Object.values(db).forEach(day=>{
    day.sessions.forEach(s=>{
      m+=s.made;
      a+=s.attempts;
    });
  });
  return {m,a};
}

function changeDate(d){
  selectedDate=d;
  ensureDay(d);
  currentSession=db[d].sessions[0]?.id;
  render();
}

/* ---------------- HIT MISS ---------------- */

function hit(){
  let s=session();
  if(!s) return;

  snap();
  s.attempts++;
  s.made++;
  s.shots.push(1);
  save(); render();
}

function miss(){
  let s=session();
  if(!s) return;

  snap();
  s.attempts++;
  s.shots.push(0);
  save(); render();
}

/* ---------------- SESSION ---------------- */

function newSession(){
  snap();
  const s={
    id:Date.now().toString(),
    name:"Session",
    attempts:0,
    made:0,
    shots:[]
  };
  db[selectedDate].sessions.push(s);
  currentSession=s.id;
  save(); render();
}

/* ---------------- CHARTS ---------------- */

function renderCharts(){

  if(sessionChart) sessionChart.destroy();
  if(dayChart) dayChart.destroy();

  const s=session();

  let data=[];
  let m=0,a=0;

  (s?.shots||[]).forEach(x=>{
    a++;
    if(x) m++;
    data.push(pct(m,a));
  });

  sessionChart=new Chart(document.getElementById("sessionChart"),{
    type:"line",
    data:{labels:data.map((_,i)=>i+1),datasets:[{data}]},
    options:{scales:{y:{min:0,max:100}}}
  });

  const days=Object.keys(db);

  dayChart=new Chart(document.getElementById("dayChart"),{
    type:"line",
    data:{
      labels:days,
      datasets:[{
        data:days.map(d=>{
          let t=totalDay(d);
          return pct(t.m,t.a);
        })
      }]
    },
    options:{scales:{y:{min:0,max:100}}}
  });
}

/* ---------------- HEATMAP ---------------- */

function renderHeatmap(){
  const box=document.getElementById("heatmap");
  box.innerHTML="";

  const s=session();
  const shots=s?.shots||[];

  let grid=Array(25).fill(0);

  shots.forEach((x,i)=>{
    let pos=i%25;
    if(x) grid[pos]++;
  });

  grid.forEach(v=>{
    const div=document.createElement("div");
    div.className="cell";
    div.style.background=`rgba(34,197,94,${Math.min(v*0.2,1)})`;
    box.appendChild(div);
  });
}

/* ---------------- RENDER ---------------- */

function render(){

  ensureDay(selectedDate);

  document.getElementById("todayLabel").textContent=selectedDate;

  const day=db[selectedDate];

  const sel=document.createElement("select");
  sel.id="sessionSelect";

  day.sessions.forEach(s=>{
    const o=document.createElement("option");
    o.value=s.id;
    o.textContent=s.name;
    sel.appendChild(o);
  });

  sel.value=currentSession;

  sel.onchange=e=>{
    currentSession=e.target.value;
    render();
  };

  const stats=session();

  document.getElementById("sessionStats").textContent=
    stats?`${stats.made}/${stats.attempts} (${pct(stats.made,stats.attempts)}%)`:"-";

  const t=totalDay(selectedDate);
  document.getElementById("dayStats").textContent=`${t.m}/${t.a}`;

  const all=totalAll();
  document.getElementById("totalStats").textContent=`${all.m}/${all.a}`;

  /* sidebar */
  const list=document.getElementById("dayList");
  list.innerHTML="";

  Object.keys(db).reverse().forEach(d=>{
    const div=document.createElement("div");
    div.textContent=d;
    div.onclick=()=>changeDate(d);
    list.appendChild(div);
  });

  renderCharts();
  renderHeatmap();
}

/* ---------------- INIT ---------------- */

ensureDay(selectedDate);
if(!db[selectedDate].sessions.length){
  db[selectedDate].sessions.push({
    id:Date.now().toString(),
    name:"Session 1",
    attempts:0,
    made:0,
    shots:[]
  });
}

currentSession=db[selectedDate].sessions[0].id;

/* EVENTS */

document.addEventListener("click",e=>{
  if(e.target.id==="hitBtn") hit();
  if(e.target.id==="missBtn") miss();
  if(e.target.id==="undoBtn") undo();
  if(e.target.id==="newSessionBtn") newSession();
});

render();
