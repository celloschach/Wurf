document.addEventListener("DOMContentLoaded", () => {
  const KEY = "3pt_tracker_v1";

  let db = JSON.parse(localStorage.getItem(KEY) || "{}");
  let snapshot = null;

  let selectedDate = new Date().toISOString().slice(0,10);
  let currentSession = null;

  let sessionChart, dayChart;

  const $ = id => document.getElementById(id);

  function save() {
    localStorage.setItem(KEY, JSON.stringify(db));
  }

  function ensureDay(d) {
    if (!db[d]) db[d] = { sessions: [] };
  }

  function snap() {
    snapshot = JSON.parse(JSON.stringify(db));
  }

  function undo() {
    if (!snapshot) return;
    db = snapshot;
    snapshot = null;
    save();
    render();
  }

  function getSession() {
    return db[selectedDate].sessions.find(s => s.id === currentSession);
  }

  function pct(m, a) {
    return a ? Math.round(m/a*100) : 0;
  }

  function totalDay(d) {
    let m=0,a=0;
    db[d].sessions.forEach(s => {
      m+=s.made; a+=s.attempts;
    });
    return {m,a};
  }

  function totalAll() {
    let m=0,a=0;
    Object.values(db).forEach(day => {
      day.sessions.forEach(s => {
        m+=s.made; a+=s.attempts;
      });
    });
    return {m,a};
  }

  function changeDate(d) {
    selectedDate = d;
    ensureDay(d);
    currentSession = db[d].sessions[0]?.id;
    render();
  }

  $("datePicker").onchange = e => changeDate(e.target.value);

  $("prevDayBtn").onclick = () => {
    let d = new Date(selectedDate);
    d.setDate(d.getDate()-1);
    changeDate(d.toISOString().slice(0,10));
  };

  $("nextDayBtn").onclick = () => {
    let d = new Date(selectedDate);
    d.setDate(d.getDate()+1);
    changeDate(d.toISOString().slice(0,10));
  };

  $("newSessionBtn").onclick = () => {
    snap();
    const s = {
      id: Date.now().toString(),
      name: "Session",
      attempts:0,
      made:0,
      shots:[]
    };
    db[selectedDate].sessions.push(s);
    currentSession = s.id;
    save(); render();
  };

  $("hitBtn").onclick = () => {
    const s = getSession();
    if (!s) return;
    snap();
    s.attempts++; s.made++; s.shots.push(1);
    save(); render();
  };

  $("missBtn").onclick = () => {
    const s = getSession();
    if (!s) return;
    snap();
    s.attempts++; s.shots.push(0);
    save(); render();
  };

  $("undoBtn").onclick = undo;

  $("exportCsvBtn").onclick = () => {
    let csv = "day,made,attempts\n";
    Object.keys(db).forEach(d=>{
      const t = totalDay(d);
      csv += `${d},${t.m},${t.a}\n`;
    });
    const blob = new Blob([csv]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data.csv";
    a.click();
  };

  $("deleteDayBtn").onclick = () => {
    delete db[selectedDate];
    changeDate(Object.keys(db)[0] || new Date().toISOString().slice(0,10));
    save();
  };

  function render() {
    ensureDay(selectedDate);

    const day = db[selectedDate];

    const sel = $("sessionSelect");
    sel.innerHTML = "";

    day.sessions.forEach(s=>{
      const o = document.createElement("option");
      o.value=s.id;
      o.textContent=s.name;
      sel.appendChild(o);
    });

    sel.onchange = e => {
      currentSession = e.target.value;
      render();
    };

    sel.value = currentSession;

    const s = getSession();

    $("sessionStats").textContent =
      s ? `${s.made}/${s.attempts} (${pct(s.made,s.attempts)}%)` : "-";

    const t = totalDay(selectedDate);
    $("dayStats").textContent = `Tag: ${t.m}/${t.a}`;

    const all = totalAll();
    $("totalStats").textContent = `Total: ${all.m}/${all.a}`;

    renderCharts();
    renderList();
  }

  function renderCharts() {
    if (sessionChart) sessionChart.destroy();
    if (dayChart) dayChart.destroy();

    const s = getSession();

    let data=[];
    let m=0,a=0;

    (s?.shots||[]).forEach((x,i)=>{
      a++;
      if (x) m++;
      data.push(Math.round(m/a*100));
    });

    sessionChart = new Chart($("sessionChart"), {
      type:"line",
      data:{labels:data.map((_,i)=>i+1),datasets:[{data}]},
      options:{scales:{y:{min:0,max:100}}}
    });

    const days = Object.keys(db);
    const ddata = days.map(d=>{
      const t=totalDay(d);
      return t.a?Math.round(t.m/t.a*100):0;
    });

    dayChart = new Chart($("dayChart"), {
      type:"line",
      data:{labels:days,datasets:[{data:ddata}]},
      options:{scales:{y:{min:0,max:100}}}
    });
  }

  function renderList() {
    const box = $("pastDaysList");
    box.innerHTML="";

    Object.keys(db).reverse().forEach(d=>{
      const div=document.createElement("div");
      div.textContent=d;
      div.onclick=()=>changeDate(d);
      box.appendChild(div);
    });
  }

  ensureDay(selectedDate);
  currentSession = db[selectedDate].sessions[0]?.id;

  render();
});
