const canvas = document.getElementById("court");
const ctx = canvas.getContext("2d");

canvas.width = 500;
canvas.height = 700;

const KEY = "tracker_v4";

let db = JSON.parse(localStorage.getItem(KEY) || "{}");

let date = new Date().toISOString().slice(0,10);
let sessionId = null;
let selectedZone = null;
let snap = null;

let sessionChart, dayChart;

/* ---------------- INIT DATA ---------------- */

function ensureDay(d){
  if(!db[d]) db[d] = {sessions:[]};
}

ensureDay(date);

/* ---------------- SAVE ---------------- */

function save(){
  localStorage.setItem(KEY, JSON.stringify(db));
}

/* ---------------- SNAPSHOT ---------------- */

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

/* ---------------- SESSION ---------------- */

function getSession(){
  return db[date].sessions.find(s=>s.id===sessionId);
}

function newSession(){
  snapshot();

  const s={
    id:Date.now().toString(),
    name:"Session",
    attempts:0,
    made:0,
    shots:[],
    zones:{0:{m:0,a:0},1:{m:0,a:0},2:{m:0,a:0},3:{m:0,a:0},4:{m:0,a:0},5:{m:0,a:0}}
  };

  db[date].sessions.push(s);
  sessionId=s.id;

  save();
  render();
}

/* ---------------- ZONE LOGIC ---------------- */

function getZone(x,y){
  if(y < 0.5){
    if(x < 0.33) return 0;
    if(x < 0.66) return 1;
    return 2;
  } else {
    if(x < 0.33) return 3;
    if(x < 0.66) return 4;
    return 5;
  }
}

/* ---------------- CLICK COURT ---------------- */

canvas.addEventListener("click",(e)=>{
  const rect = canvas.getBoundingClientRect();

  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;

  selectedZone = getZone(x,y);

  document.getElementById("selectedInfo").innerText =
    "Zone: " + selectedZone;

  draw();
});

/* ---------------- HIT / MISS ---------------- */

function hit(){
  const s=getSession();
  if(!s || selectedZone===null) return;

  snapshot();

  s.attempts++;
  s.made++;

  s.shots.push(1);

  s.zones[selectedZone].m++;
  s.zones[selectedZone].a++;

  save(); render();
}

function miss(){
  const s=getSession();
  if(!s || selectedZone===null) return;

  snapshot();

  s.attempts++;
  s.shots.push(0);

  s.zones[selectedZone].a++;

  save(); render();
}

/* ---------------- STATS ---------------- */

function pct(m,a){
  return a?Math.round(m/a*100):0;
}

function totalDay(){
  let m=0,a=0;

  db[date].sessions.forEach(s=>{
    m+=s.made;
    a+=s.attempts;
  });

  return {m,a};
}

/* ---------------- COLOR ---------------- */

function color(p){
  if(p===0) return "#1f2937";
  if(p<30) return "#ef4444";
  if(p<60) return "#f97316";
  return "#22c55e";
}

/* ---------------- COURT ---------------- */

function drawCourt(){
  ctx.clearRect(0,0,500,700);

  ctx.fillStyle="#1b2a44";
  ctx.fillRect(0,0,500,700);

  ctx.strokeStyle="#fff";
  ctx.lineWidth=2;

  ctx.strokeRect(0,0,500,700);

  ctx.beginPath();
  ctx.moveTo(166,0);
  ctx.lineTo(166,700);
  ctx.moveTo(332,0);
  ctx.lineTo(332,700);
  ctx.moveTo(0,350);
  ctx.lineTo(500,350);
  ctx.stroke();
}

/* ---------------- HEATMAP ---------------- */

function drawZones(){

  const w=500,h=700;
  const zw=w/3;
  const zh=h/2;

  const s=getSession();
  if(!s) return;

  for(let i=0;i<6;i++){

    const z=s.zones[i];
    const p=z.a?Math.round(z.m/z.a*100):0;

    const x=(i%3)*zw;
    const y=i<3?0:zh;

    ctx.fillStyle=color(p);
    ctx.globalAlpha=0.55;
    ctx.fillRect(x,y,zw,zh);
    ctx.globalAlpha=1;

    ctx.fillStyle="#fff";
    ctx.font="20px sans-serif";
    ctx.fillText(p+"%", x+zw/2-15, y+zh/2);
  }
}

/* ---------------- CHARTS ---------------- */

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

  sessionChart=new Chart(document.getElementById("sessionChart"),{
    type:"line",
    data:{labels:data.map((_,i)=>i+1),datasets:[{data}]},
    options:{scales:{y:{min:0,max:100}}}
  });

  const keys=Object.keys(db);

  dayChart=new Chart(document.getElementById("dayChart"),{
    type:"line",
    data:{
      labels:keys,
      datasets:[{
        data:keys.map(k=>{
          let t=totalDay(k);
          return pct(t.m,t.a);
        })
      }]
    },
    options:{scales:{y:{min:0,max:100}}}
  });
}

/* ---------------- RENDER ---------------- */

function render(){

  ensureDay(date);

  const day=db[date];

  if(!sessionId && day.sessions.length){
    sessionId=day.sessions[0].id;
  }

  const s=getSession();

  document.getElementById("stats").innerHTML=
    s?`${s.made}/${s.attempts} (${pct(s.made,s.attempts)}%)`:"-";

  const d=totalDay();
  document.getElementById("stats").innerHTML+=
    `<br>Tag: ${d.m}/${d.a}`;

  const list=document.getElementById("days");
  list.innerHTML="";

  Object.keys(db).reverse().forEach(d=>{
    const el=document.createElement("div");
    el.textContent=d;
    el.onclick=()=>{date=d; sessionId=null; render();};
    list.appendChild(el);
  });

  draw();
  renderCharts();
}

/* ---------------- DRAW ---------------- */

function draw(){
  drawCourt();
  drawZones();
}

/* ---------------- EVENTS ---------------- */

document.getElementById("hitBtn").onclick=hit;
document.getElementById("missBtn").onclick=miss;
document.getElementById("newSessionBtn").onclick=newSession;
document.getElementById("undoBtn").onclick=undo;

/* ---------------- INIT ---------------- */

if(!db[date].sessions.length){
  newSession();
}else{
  sessionId=db[date].sessions[0].id;
}

render();
