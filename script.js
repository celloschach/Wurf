const KEY = "3pt_v3";

let db = JSON.parse(localStorage.getItem(KEY) || "{}");

let date = new Date().toISOString().slice(0,10);
let sessionId = null;

let sessionChart, dayChart;
let snap = null;

function save(){
  localStorage.setItem(KEY, JSON.stringify(db));
}

function ensureDay(d){
  if(!db[d]) db[d] = {sessions:[]};
}

function getSession(){
  return db[date].sessions.find(s=>s.id===sessionId);
}

function snapshot(){
  snap = JSON.parse(JSON.stringify(db));
}

function undo(){
  if(!snap) return;
  db = snap;
  snap = null;
  save();
  render();
}

function pct(m,a){
  return a?Math.round(m/a*100):0;
}

function totalsDay(d){
  let m=0,a=0;
  db[d].sessions.forEach(s=>{
    m+=s.made;
    a+=s.attempts;
  });
  return {m,a};
}

function totalsAll(){
  let m=0,a=0;
  Object.values(db).forEach(day=>{
    day.sessions.forEach(s=>{
      m+=s.made;
      a+=s.attempts;
    });
  });
  return {m,a};
}

function changeDay(d){
  date=d;
  ensureDay(d);
  sessionId=db[d].sessions[0]?.id;
  render();
}

/* ---------------- actions ---------------- */

function hit(){
  const s=getSession();
  if(!s) return;

  snapshot();
  s.attempts++;
  s.made++;
  s.shots.push(1);
  save(); render();
}

function miss(){
  const s=getSession();
  if(!s) return;

  snapshot();
  s.attempts++;
  s.shots.push(0);
  save(); render();
}

function newSession(){
  snapshot();

  const s={
    id:Date.now().toString(),
    name:"Session",
    attempts:0,
    made:0,
    shots:[]
  };

  db[date].sessions.push(s);
  sessionId=s.id;

  save(); render();
}

/* ---------------- render ---------------- */

function render(){

  ensureDay(date);

  document.getElementById("dateLabel").textContent=date;

  const day=db[date];

  if(!sessionId && day.sessions.length){
    sessionId=day.sessions[0].id;
  }

  const s=getSession();

  document.getElementById("sessionStats").textContent=
    s?`${s.made}/${s.attempts} (${pct(s.made,s.attempts)}%)`:"-";

  const d=totalsDay(date);
  document.getElementById("dayStats").textContent=`${d.m}/${d.a}`;

  const all=totalsAll();
  document.getElementById("totalStats").textContent=`${all.m}/${all.a}`;

  /* sidebar */
  const box=document.getElementById("days");
  box.innerHTML="";

  Object.keys(db).reverse().forEach(d=>{
    const el=document.createElement("div");
    el.textContent=d;
    el.onclick=()=>changeDay(d);
    box.appendChild(el);
  });

  renderCharts();
}

/* ---------------- charts ---------------- */

function renderCharts(){

  if(sessionChart) sessionChart.destroy();
  if(dayChart) dayChart.destroy();

  const s=getSession();

  let data=[];
  let m=0,a=0;

  (s?.shots||[]).forEach(x=>{
    a++;
    if(x) m++;
    data.push(pct(m,a));
  });

  sessionChart=new Chart(
    document.getElementById("sessionChart"),
    {
      type:"line",
      data:{labels:data.map((_,i)=>i+1),datasets:[{data}]},
      options:{scales:{y:{min:0,max:100}}}
    }
  );

  const keys=Object.keys(db);

  dayChart=new Chart(
    document.getElementById("dayChart"),
    {
      type:"line",
      data:{
        labels:keys,
        datasets:[{
          data:keys.map(k=>{
            const t=totalsDay(k);
            return pct(t.m,t.a);
          })
        }]
      },
      options:{scales:{y:{min:0,max:100}}}
    }
  );
}

/* ---------------- events ---------------- */

document.getElementById("hit").onclick=hit;
document.getElementById("miss").onclick=miss;
document.getElementById("newSession").onclick=newSession;
document.getElementById("undo").onclick=undo;

/* ---------------- init ---------------- */

ensureDay(date);

if(!db[date].sessions.length){
  db[date].sessions.push({
    id:Date.now().toString(),
    name:"Session 1",
    attempts:0,
    made:0,
    shots:[]
  });
}

sessionId=db[date].sessions[0].id;

render();
