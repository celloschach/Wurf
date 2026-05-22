const canvas = document.getElementById("court");
const ctx = canvas.getContext("2d");

canvas.width = 500;
canvas.height = 700;

const KEY = "tracker_v5";

/* ---------------- STATE ---------------- */

let db = JSON.parse(localStorage.getItem(KEY) || "{}");

let date = new Date().toISOString().slice(0,10);
let sessionId = null;
let selectedZone = null;
let snapshot = null;

/* ---------------- INIT ---------------- */

function ensure(){
  if(!db[date]) db[date] = {sessions:[]};

  if(db[date].sessions.length === 0){
    db[date].sessions.push(createSession());
  }

  sessionId = db[date].sessions[0].id;
}

function createSession(){
  return {
    id: Date.now().toString(),
    made: 0,
    attempts: 0,
    shots: [],
    zones:{
      0:{m:0,a:0},
      1:{m:0,a:0},
      2:{m:0,a:0},
      3:{m:0,a:0},
      4:{m:0,a:0},
      5:{m:0,a:0}
    }
  };
}

ensure();

/* ---------------- SAVE ---------------- */

function save(){
  localStorage.setItem(KEY, JSON.stringify(db));
}

/* ---------------- SNAPSHOT ---------------- */

function snap(){
  snapshot = JSON.parse(JSON.stringify(db));
}

function undo(){
  if(!snapshot) return;
  db = snapshot;
  snapshot = null;
  save();
  render();
}

/* ---------------- SESSION ---------------- */

function getSession(){
  return db[date].sessions.find(s=>s.id===sessionId);
}

/* ---------------- ZONE ---------------- */

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

/* ---------------- CLICK ---------------- */

canvas.addEventListener("click",(e)=>{
  const r = canvas.getBoundingClientRect();

  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;

  selectedZone = getZone(x,y);

  document.getElementById("info").innerText =
    "Zone: " + selectedZone;

  draw();
});

/* ---------------- ACTIONS ---------------- */

function hit(){
  const s=getSession();
  if(!s || selectedZone===null) return;

  snap();

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

  snap();

  s.attempts++;
  s.shots.push(0);

  s.zones[selectedZone].a++;

  save(); render();
}

function newSession(){
  snap();

  db[date].sessions.push(createSession());
  sessionId = db[date].sessions.at(-1).id;

  save(); render();
}

/* ---------------- STATS ---------------- */

function pct(m,a){
  return a ? Math.round(m/a*100) : 0;
}

/* ---------------- COLORS ---------------- */

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
  const s=getSession();
  if(!s) return;

  const w=500,h=700;
  const zw=w/3;
  const zh=h/2;

  for(let i=0;i<6;i++){

    const z=s.zones[i];
    const p = z.a ? pct(z.m,z.a) : 0;

    const x=(i%3)*zw;
    const y=i<3?0:zh;

    ctx.fillStyle=color(p);
    ctx.globalAlpha=0.6;
    ctx.fillRect(x,y,zw,zh);
    ctx.globalAlpha=1;

    ctx.fillStyle="white";
    ctx.font="20px system-ui";
    ctx.fillText(p+"%", x+zw/2-15, y+zh/2);
  }
}

/* ---------------- RENDER ---------------- */

function render(){

  const s=getSession();

  document.getElementById("stats").innerHTML =
    s ? `${s.made}/${s.attempts} (${pct(s.made,s.attempts)}%)` : "-";

  const list=document.getElementById("days");
  list.innerHTML="";

  Object.keys(db).reverse().forEach(d=>{
    const el=document.createElement("div");
    el.textContent=d;
    el.onclick=()=>{date=d; ensure(); render();};
    list.appendChild(el);
  });

  draw();
}

/* ---------------- DRAW ---------------- */

function draw(){
  drawCourt();
  drawZones();
}

/* ---------------- EVENTS ---------------- */

document.getElementById("hit").onclick=hit;
document.getElementById("miss").onclick=miss;
document.getElementById("newSession").onclick=newSession;
document.getElementById("undo").onclick=undo;

/* ---------------- INIT RENDER ---------------- */

render();
