// =========================
// 3PT TRACKER FULL SCRIPT
// =========================

const STORAGE_KEY = "shotTrackerData_v3";

// =========================
// GLOBAL STATE
// =========================

let db = loadDB();

let selectedDate = todayISO();
let selectedSessionId = null;
let selectedZone = null;

let sessionChart = null;
let allTimeChart = null;

// =========================
// COURT ZONES
// =========================

const ZONES = [
  { id: 0, name: "Corner Left", short: "CL", x: 0,   y: 0,   w: 150, h: 680 },
  { id: 1, name: "Wing Left",   short: "WL", x: 150, y: 0,   w: 190, h: 350 },
  { id: 2, name: "Top",         short: "TOP",x: 340, y: 0,   w: 320, h: 350 },
  { id: 3, name: "Wing Right",  short: "WR", x: 660, y: 0,   w: 190, h: 350 },
  { id: 4, name: "Corner Right",short: "CR", x: 850, y: 0,   w: 150, h: 680 },

  { id: 5, name: "Mid Left Upper",  short: "MLU", x: 0,   y: 350, w: 190, h: 160 },
  { id: 6, name: "Mid Left Lower",  short: "MLL", x: 190, y: 350, w: 150, h: 330 },
  { id: 7, name: "Free Throw",      short: "FT",  x: 340, y: 350, w: 320, h: 190 },
  { id: 8, name: "Mid Right Lower", short: "MRL", x: 660, y: 350, w: 150, h: 330 },
  { id: 9, name: "Mid Right Upper", short: "MRU", x: 810, y: 350, w: 190, h: 160 },

  { id: 10, name: "Paint UL", short: "PUL", x: 340, y: 540, w: 160, h: 70 },
  { id: 11, name: "Paint UR", short: "PUR", x: 500, y: 540, w: 160, h: 70 },
  { id: 12, name: "Paint LL", short: "PLL", x: 340, y: 610, w: 160, h: 70 },
  { id: 13, name: "Paint LR", short: "PLR", x: 500, y: 610, w: 160, h: 70 }
];

// =========================
// DOM
// =========================

const datePicker = document.getElementById("datePicker");

const sessionSelect = document.getElementById("sessionSelect");

const hitBtn = document.getElementById("hitBtn");
const missBtn = document.getElementById("missBtn");

const newSessionBtn = document.getElementById("newSessionBtn");
const renameSessionBtn = document.getElementById("renameSessionBtn");
const deleteSessionBtn = document.getElementById("deleteSessionBtn");

const sessionStats = document.getElementById("sessionStats");
const totalStats = document.getElementById("totalStats");

const statusBox = document.getElementById("statusBox");

const interactiveSvg = document.getElementById("interactiveSvg");
const sessionSvg = document.getElementById("sessionSvg");
const allSvg = document.getElementById("allSvg");

// =========================
// INIT
// =========================

boot();

function boot(){

  ensureDay(selectedDate);

  if(currentDay().sessions.length === 0){

    createSession("Session 1");
  }

  selectedSessionId = currentDay().sessions[0].id;

  datePicker.value = selectedDate;

  renderAll();

  updateStatus("System OK");
}

// =========================
// STORAGE
// =========================

function loadDB(){

  const raw = localStorage.getItem(STORAGE_KEY);

  if(!raw){

    return {};
  }

  try{

    return JSON.parse(raw);

  }catch{

    return {};
  }
}

function saveDB(){

  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// =========================
// DATE
// =========================

function todayISO(){

  const d = new Date();

  const y = d.getFullYear();

  const m = String(d.getMonth() + 1).padStart(2, "0");

  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

// =========================
// HELPERS
// =========================

function ensureDay(date){

  if(!db[date]){

    db[date] = {
      sessions:[]
    };
  }
}

function currentDay(){

  return db[selectedDate];
}

function currentSession(){

  return currentDay().sessions.find(s => s.id === selectedSessionId);
}

function createSession(name){

  const session = {

    id: crypto.randomUUID(),

    name,

    shots:[]
  };

  currentDay().sessions.push(session);

  saveDB();

  return session;
}

// =========================
// SESSION UI
// =========================

function renderSessionSelect(){

  sessionSelect.innerHTML = "";

  const sessions = currentDay().sessions;

  if(!sessions.some(s => s.id === selectedSessionId)){

    selectedSessionId = sessions[0].id;
  }

  for(const s of sessions){

    const opt = document.createElement("option");

    opt.value = s.id;

    opt.textContent = s.name;

    sessionSelect.appendChild(opt);
  }

  sessionSelect.value = selectedSessionId;
}

// =========================
// EVENTS
// =========================

datePicker.addEventListener("change", () => {

  selectedDate = datePicker.value;

  ensureDay(selectedDate);

  if(currentDay().sessions.length === 0){

    createSession("Session 1");
  }

  selectedSessionId = currentDay().sessions[0].id;

  renderAll();
});

sessionSelect.addEventListener("change", () => {

  selectedSessionId = sessionSelect.value;

  renderAll();
});

newSessionBtn.addEventListener("click", () => {

  const name = prompt("Session Name");

  if(!name) return;

  const s = createSession(name);

  selectedSessionId = s.id;

  renderAll();
});

renameSessionBtn.addEventListener("click", () => {

  const s = currentSession();

  const name = prompt("New Name", s.name);

  if(!name) return;

  s.name = name;

  saveDB();

  renderAll();
});

deleteSessionBtn.addEventListener("click", () => {

  currentDay().sessions =
    currentDay().sessions.filter(s => s.id !== selectedSessionId);

  if(currentDay().sessions.length === 0){

    createSession("Session 1");
  }

  selectedSessionId = currentDay().sessions[0].id;

  saveDB();

  renderAll();
});

hitBtn.addEventListener("click", () => {

  addShot(true);
});

missBtn.addEventListener("click", () => {

  addShot(false);
});

// =========================
// SHOTS
// =========================

function addShot(made){

  if(selectedZone === null){

    alert("Select a zone");

    return;
  }

  currentSession().shots.push({

    zone:selectedZone,

    made
  });

  saveDB();

  renderAll();
}

// =========================
// STATS
// =========================

function getZoneStats(shots, zoneId){

  const arr = shots.filter(s => s.zone === zoneId);

  const made = arr.filter(s => s.made).length;

  const attempts = arr.length;

  const pct = attempts
    ? Math.round((made / attempts) * 100)
    : 0;

  return {
    made,
    attempts,
    pct
  };
}

function allShots(){

  return Object.values(db)
    .flatMap(day => day.sessions)
    .flatMap(s => s.shots);
}

// =========================
// COLORS
// =========================

function zoneColor(pct){

  if(pct >= 70){

    return {
      fill:"#16a34a",
      stroke:"#14532d"
    };
  }

  if(pct >= 45){

    return {
      fill:"#f59e0b",
      stroke:"#78350f"
    };
  }

  return {
    fill:"#dc2626",
    stroke:"#7f1d1d"
  };
}

// =========================
// SVG
// =========================

function createSvgEl(tag, attrs){

  const el = document.createElementNS(
    "http://www.w3.org/2000/svg",
    tag
  );

  for(const k in attrs){

    el.setAttribute(k, attrs[k]);
  }

  return el;
}

function renderSvg(svg, shots, interactive=false){

  svg.innerHTML = "";

  for(const zone of ZONES){

    const stats = getZoneStats(shots, zone.id);

    const colors = zoneColor(stats.pct);

    const rect = createSvgEl("rect", {
      x: zone.x,
      y: zone.y,
      width: zone.w,
      height: zone.h,
      fill: colors.fill,
      stroke: colors.stroke,
      "stroke-width": selectedZone === zone.id && interactive ? "5" : "2",
      opacity:"0.78",
      rx:"10",
      class:
        selectedZone === zone.id && interactive
          ? "selected-zone zone"
          : "zone"
    });

    if(interactive){

      rect.style.cursor = "pointer";

      rect.addEventListener("click", () => {

        selectedZone = zone.id;

        renderAll();
      });
    }

    svg.appendChild(rect);

    const label = createSvgEl("text", {
      x: zone.x + zone.w / 2,
      y: zone.y + zone.h / 2 - 10,
      "text-anchor":"middle",
      class:"zone-label"
    });

    label.textContent = zone.short;

    svg.appendChild(label);

    const pct = createSvgEl("text", {
      x: zone.x + zone.w / 2,
      y: zone.y + zone.h / 2 + 22,
      "text-anchor":"middle",
      class:"zone-percent"
    });

    pct.textContent = `${stats.pct}%`;

    svg.appendChild(pct);
  }
}

// =========================
// STATUS
// =========================

function updateStatus(text){

  statusBox.textContent = text;
}

// =========================
// RENDER
// =========================

function renderStats(){

  const shots = currentSession().shots;

  const made = shots.filter(s => s.made).length;

  const attempts = shots.length;

  const pct = attempts
    ? Math.round((made / attempts) * 100)
    : 0;

  sessionStats.textContent =
    `Session: ${made}/${attempts} (${pct}%)`;

  const all = allShots();

  const allMade = all.filter(s => s.made).length;

  const allAttempts = all.length;

  const allPct = allAttempts
    ? Math.round((allMade / allAttempts) * 100)
    : 0;

  totalStats.textContent =
    `All Time: ${allMade}/${allAttempts} (${allPct}%)`;
}

function renderAll(){

  renderSessionSelect();

  renderStats();

  renderSvg(
    interactiveSvg,
    currentSession().shots,
    true
  );

  renderSvg(
    sessionSvg,
    currentSession().shots,
    false
  );

  renderSvg(
    allSvg,
    allShots(),
    false
  );

  updateStatus(
    `Loaded ${allShots().length} shots`
  );
   }
