 document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "tracker_v_final";

  const dateInput = document.getElementById("dateInput");
  const prevDayBtn = document.getElementById("prevDayBtn");
  const nextDayBtn = document.getElementById("nextDayBtn");

  const deleteDayBtn = document.getElementById("deleteDayBtn");
  const exportBtn = document.getElementById("exportBtn");
  const undoBtn = document.getElementById("undoBtn");
  const statusBtn = document.getElementById("statusBtn");
  const statusBox = document.getElementById("statusBox");

  const sessionSelect = document.getElementById("sessionSelect");

  const newSessionBtn = document.getElementById("newSessionBtn");
  const renameSessionBtn = document.getElementById("renameSessionBtn");
  const deleteSessionBtn = document.getElementById("deleteSessionBtn");

  const hitBtn = document.getElementById("hitBtn");
  const missBtn = document.getElementById("missBtn");

  const selectedZoneInfo = document.getElementById("selectedZoneInfo");

  const sessionStats = document.getElementById("sessionStats");
  const dayStats = document.getElementById("dayStats");
  const allStats = document.getElementById("allStats");
  const zoneStats = document.getElementById("zoneStats");

  const dayList = document.getElementById("dayList");

  const interactiveSvg = document.getElementById("interactiveSvg");
  const sessionSvg = document.getElementById("sessionSvg");
  const allSvg = document.getElementById("allSvg");

  const currentDateLabel = document.getElementById("currentDateLabel");
  const currentSessionLabel = document.getElementById("currentSessionLabel");
  const courtImage = document.getElementById("courtImage");

  let db = loadDB();
  let selectedDate = todayISO();
  let selectedSessionId = null;
  let selectedZone = null;
  let history = null;
  let courtImageLoaded = false;

  courtImage.addEventListener("load", () => {
    courtImageLoaded = true;
  });

  courtImage.addEventListener("error", () => {
    courtImageLoaded = false;
  });

  function todayISO() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function loadDB() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveDB() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function saveHistory() {
    history = clone(db);
  }

  function undo() {
    if (!history) return;
    db = history;
    saveDB();
    render();
  }

  function ensureDate(date) {
    if (!db[date]) {
      db[date] = { sessions: [] };
    }

    if (db[date].sessions.length === 0) {
      db[date].sessions.push({
        id: crypto.randomUUID(),
        name: "Session 1",
        shots: []
      });
    }
  }

  function currentDay() {
    ensureDate(selectedDate);
    return db[selectedDate];
  }

  function currentSession() {
    const sessions = currentDay().sessions;
    return sessions.find(s => s.id === selectedSessionId) || sessions[0];
  }

  const ZONES = [
    { id: 0, name: "Corner Left", short: "CL", x: 0, y: 0, w: 170, h: 350 },
    { id: 1, name: "Wing Left", short: "WL", x: 170, y: 0, w: 190, h: 350 },
    { id: 2, name: "Top", short: "TOP", x: 360, y: 0, w: 280, h: 350 },
    { id: 3, name: "Wing Right", short: "WR", x: 640, y: 0, w: 190, h: 350 },
    { id: 4, name: "Corner Right", short: "CR", x: 830, y: 0, w: 170, h: 350 },

    { id: 5, name: "Mid Left Upper", short: "MLU", x: 0, y: 350, w: 200, h: 140 },
    { id: 6, name: "Mid Left Lower", short: "MLL", x: 200, y: 350, w: 180, h: 180 },
    { id: 7, name: "Free Throw", short: "FT", x: 380, y: 350, w: 240, h: 180 },
    { id: 8, name: "Mid Right Lower", short: "MRL", x: 620, y: 350, w: 180, h: 180 },
    { id: 9, name: "Mid Right Upper", short: "MRU", x: 800, y: 350, w: 200, h: 140 },

    { id: 10, name: "Paint UL", short: "PUL", x: 350, y: 530, w: 150, h: 70 },
    { id: 11, name: "Paint UR", short: "PUR", x: 500, y: 530, w: 150, h: 70 },
    { id: 12, name: "Paint LL", short: "PLL", x: 350, y: 600, w: 150, h: 80 },
    { id: 13, name: "Paint LR", short: "PLR", x: 500, y: 600, w: 150, h: 80 }
  ];

  function zoneColor(made, attempts) {
    if (attempts === 0) {
      return {
        fill: "rgba(59,130,246,0.18)",
        stroke: "rgba(255,255,255,0.22)"
      };
    }

    const pct = made / attempts;
    const hue = pct * 120;

    return {
      fill: `hsla(${hue},90%,50%,0.40)`,
      stroke: `hsla(${hue},95%,55%,0.95)`
    };
  }

  function summarizeShots(session) {
    const result = {
      made: 0,
      attempts: 0,
      zones: []
    };

    for (let i = 0; i < ZONES.length; i++) {
      result.zones.push({ made: 0, attempts: 0 });
    }

    for (const shot of session.shots) {
      result.attempts++;
      if (shot.made) result.made++;
      result.zones[shot.zone].attempts++;
      if (shot.made) result.zones[shot.zone].made++;
    }

    return result;
  }

  function allTimeSummary() {
    const allShots = [];

    for (const dayKey of Object.keys(db)) {
      for (const session of db[dayKey].sessions) {
        allShots.push(...session.shots);
      }
    }

    return summarizeShots({ shots: allShots });
  }

  function zoneAtPoint(nx, ny) {
    const x = nx * 1000;
    const y = ny * 680;

    for (const zone of ZONES) {
      if (
        x >= zone.x &&
        x <= zone.x + zone.w &&
        y >= zone.y &&
        y <= zone.y + zone.h
      ) {
        return zone.id;
      }
    }

    return null;
  }

  function createSvgEl(tag, attrs = {}, text = "") {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, String(value));
    }
    if (text) el.textContent = text;
    return el;
  }

  function renderSvg(svg, stats, interactive = false) {
    svg.innerHTML = "";

    for (const zone of ZONES) {
      const z = stats.zones[zone.id];
      const colors = zoneColor(z.made, z.attempts);

      const pct = z.attempts
        ? Math.round((z.made / z.attempts) * 100)
        : null;

      const rect = createSvgEl("rect", {
        x: zone.x,
        y: zone.y,
        width: zone.w,
        height: zone.h,
        fill: colors.fill,
        stroke: colors.stroke,
        "stroke-width": selectedZone === zone.id && interactive ? "5" : "2",
        class: selectedZone === zone.id && interactive ? "selected-zone zone" : "zone"
      });

      if (interactive) {
        rect.style.cursor = "pointer";
        rect.addEventListener("click", (e) => {
          e.stopPropagation();
          selectedZone = zone.id;
          render();
        });
      }

      svg.appendChild(rect);

      const label = createSvgEl("text", {
        x: zone.x + zone.w / 2,
        y: zone.y + zone.h / 2 - 10,
        "text-anchor": "middle",
        class: "zone-label"
      }, zone.short);
      svg.appendChild(label);

      const percent = createSvgEl("text", {
        x: zone.x + zone.w / 2,
        y: zone.y + zone.h / 2 + 20,
        "text-anchor": "middle",
        class: "zone-percent"
      }, pct === null ? "--" : `${pct}%`);
      svg.appendChild(percent);
    }

    if (interactive) {
      svg.addEventListener("click", (e) => {
        const rect = svg.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;
        const zone = zoneAtPoint(nx, ny);
        if (zone !== null) {
          selectedZone = zone;
          render();
        }
      }, { once: true });
    }
  }

  function renderSessionSelect() {
    sessionSelect.innerHTML = "";

    const sessions = currentDay().sessions;

    if (!sessions.some(s => s.id === selectedSessionId)) {
      selectedSessionId = sessions[0].id;
    }

    for (const s of sessions) {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      sessionSelect.appendChild(opt);
    }

    sessionSelect.value = selectedSessionId;
  }

  function renderDayList() {
    dayList.innerHTML = "";

    const days = Object.keys(db).sort().reverse();

    for (const day of days) {
      let shots = 0;
      for (const s of db[day].sessions) {
        shots += s.shots.length;
      }

      const div = document.createElement("div");
      div.className = "day-item";
      if (day === selectedDate) div.classList.add("active");
      div.innerHTML = `<b>${day}</b><br>${shots} Würfe`;

      div.onclick = () => {
        selectedDate = day;
        ensureDate(selectedDate);
        selectedSessionId = currentDay().sessions[0].id;
        selectedZone = null;
        render();
      };

      dayList.appendChild(div);
    }
  }

  function renderStats() {
    const session = currentSession();
    const s = summarizeShots(session);

    sessionStats.textContent = `Session: ${s.made}/${s.attempts}`;

    let dayMade = 0;
    let dayAttempts = 0;
    for (const sess of currentDay().sessions) {
      const sum = summarizeShots(sess);
      dayMade += sum.made;
      dayAttempts += sum.attempts;
    }
    dayStats.textContent = `Tag: ${dayMade}/${dayAttempts}`;

    const all = allTimeSummary();
    allStats.textContent = `All Time: ${all.made}/${all.attempts}`;

    if (selectedZone !== null) {
      const zone = ZONES[selectedZone];
      const z = all.zones[selectedZone];
      selectedZoneInfo.innerHTML = `<b>${zone.name}</b><br>All Time: ${z.made}/${z.attempts}`;
      zoneStats.textContent = `${zone.name}: ${z.made}/${z.attempts}`;
    } else {
      selectedZoneInfo.textContent = "Keine Zone gewählt";
      zoneStats.textContent = "";
    }

    currentDateLabel.textContent = selectedDate;
    currentSessionLabel.textContent = session ? session.name : "";
  }

  function renderStatus() {
    const interactiveExists = !!document.getElementById("interactiveSvg");
    const sessionExists = !!document.getElementById("sessionSvg");
    const allExists = !!document.getElementById("allSvg");
    const imageOk = courtImageLoaded || courtImage.complete;

    const session = currentSession();
    const shotCount = session ? session.shots.length : 0;

    statusBox.textContent =
      `Bild geladen: ${imageOk ? "JA" : "NEIN"}\n` +
      `Interactive SVG: ${interactiveExists ? "JA" : "NEIN"}\n` +
      `Session SVG: ${sessionExists ? "JA" : "NEIN"}\n` +
      `All Time SVG: ${allExists ? "JA" : "NEIN"}\n` +
      `Datum: ${selectedDate}\n` +
      `Session: ${session ? session.name : "keine"}\n` +
      `Aktive Zone: ${selectedZone !== null ? ZONES[selectedZone].name : "keine"}\n` +
      `Shots in Session: ${shotCount}\n` +
      `Lokale Daten-Tage: ${Object.keys(db).length}`;
  }

  function render() {
    ensureDate(selectedDate);
    renderSessionSelect();
    renderStats();
    renderDayList();

    renderSvg(interactiveSvg, summarizeShots(currentSession()), true);
    renderSvg(sessionSvg, summarizeShots(currentSession()));
    renderSvg(allSvg, allTimeSummary());

    dateInput.value = selectedDate;
    saveDB();
  }

  function addShot(made) {
    if (selectedZone === null) {
      alert("Zone auswählen");
      return;
    }

    saveHistory();

    currentSession().shots.push({
      zone: selectedZone,
      made
    });

    saveDB();
    render();
  }

  hitBtn.onclick = () => addShot(true);
  missBtn.onclick = () => addShot(false);
  undoBtn.onclick = undo;

  statusBtn.onclick = () => {
    renderStatus();
  };

  sessionSelect.onchange = () => {
    selectedSessionId = sessionSelect.value;
    render();
  };

  newSessionBtn.onclick = () => {
    saveHistory();

    const sessions = currentDay().sessions;
    const session = {
      id: crypto.randomUUID(),
      name: `Session ${sessions.length + 1}`,
      shots: []
    };

    sessions.push(session);
    selectedSessionId = session.id;
    render();
  };

  renameSessionBtn.onclick = () => {
    const session = currentSession();
    const name = prompt("Neuer Name", session.name);
    if (!name) return;

    saveHistory();
    session.name = name;
    render();
  };

  deleteSessionBtn.onclick = () => {
    if (!confirm("Session löschen?")) return;

    saveHistory();

    currentDay().sessions = currentDay().sessions.filter(
      s => s.id !== currentSession().id
    );

    ensureDate(selectedDate);
    selectedSessionId = currentDay().sessions[0].id;
    selectedZone = null;
    render();
  };

  deleteDayBtn.onclick = () => {
    if (!confirm("Tag löschen?")) return;

    saveHistory();

    delete db[selectedDate];

    const remaining = Object.keys(db).sort();
    selectedDate = remaining.length ? remaining[remaining.length - 1] : todayISO();
    ensureDate(selectedDate);
    selectedSessionId = currentDay().sessions[0].id;
    selectedZone = null;
    render();
  };

  prevDayBtn.onclick = () => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    selectedDate = d.toISOString().slice(0, 10);
    ensureDate(selectedDate);
    selectedSessionId = currentDay().sessions[0].id;
    selectedZone = null;
    render();
  };

  nextDayBtn.onclick = () => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    selectedDate = d.toISOString().slice(0, 10);
    ensureDate(selectedDate);
    selectedSessionId = currentDay().sessions[0].id;
    selectedZone = null;
    render();
  };

  dateInput.onchange = () => {
    selectedDate = dateInput.value;
    ensureDate(selectedDate);
    selectedSessionId = currentDay().sessions[0].id;
    selectedZone = null;
    render();
  };

  exportBtn.onclick = () => {
    const rows = [["date", "session", "zone", "made"]];

    for (const dayKey of Object.keys(db)) {
      for (const session of db[dayKey].sessions) {
        for (const shot of session.shots) {
          rows.push([
            dayKey,
            session.name,
            ZONES[shot.zone].name,
            shot.made ? 1 : 0
          ]);
        }
      }
    }

    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "3pt-tracker.csv";
    a.click();

    URL.revokeObjectURL(url);
  };

  ensureDate(selectedDate);
  selectedSessionId = currentDay().sessions[0].id;
  render();
  renderStatus();
}); 
