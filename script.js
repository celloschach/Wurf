document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "worf-3pt-tracker";

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
  const saveNoteBtn = document.getElementById("saveNoteBtn");
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
  const dayNote = document.getElementById("dayNote");

  let db = loadDB();
  let selectedDate = todayISO();
  let selectedSessionId = null;
  let selectedZone = null;
  let historyState = null;
  let courtImageLoaded = false;

  courtImage.addEventListener("load", () => {
    courtImageLoaded = true;
  });

  courtImage.addEventListener("error", () => {
    courtImageLoaded = false;
  });

  const ZONES = [
    { id: 0, name: "Corner Left", short: "CL", points: [[0, 0], [145, 0], [145, 470], [0, 470]], labelX: 72, labelY: 205 },
    { id: 1, name: "Wing Left", short: "WL", points: [[145, 0], [355, 0], [330, 470], [145, 470]], labelX: 245, labelY: 190 },
    { id: 2, name: "Top", short: "TOP", points: [[355, 0], [645, 0], [670, 470], [330, 470]], labelX: 500, labelY: 175 },
    { id: 3, name: "Wing Right", short: "WR", points: [[645, 0], [855, 0], [855, 470], [670, 470]], labelX: 755, labelY: 190 },
    { id: 4, name: "Corner Right", short: "CR", points: [[855, 0], [1000, 0], [1000, 470], [855, 470]], labelX: 928, labelY: 205 },
    { id: 5, name: "Mid Left Upper", short: "MLU", points: [[145, 470], [330, 470], [330, 560], [145, 560]], labelX: 238, labelY: 510 },
    { id: 6, name: "Mid Left Lower", short: "MLL", points: [[145, 560], [330, 560], [330, 680], [145, 680]], labelX: 238, labelY: 620 },
    { id: 7, name: "Free Throw", short: "FT", points: [[330, 470], [670, 470], [670, 600], [330, 600]], labelX: 500, labelY: 540 },
    { id: 8, name: "Mid Right Lower", short: "MRL", points: [[670, 560], [855, 560], [855, 680], [670, 680]], labelX: 762, labelY: 620 },
    { id: 9, name: "Mid Right Upper", short: "MRU", points: [[670, 470], [855, 470], [855, 560], [670, 560]], labelX: 762, labelY: 510 },
    { id: 10, name: "Paint UL", short: "PUL", points: [[330, 600], [500, 600], [500, 640], [330, 640]], labelX: 415, labelY: 620 },
    { id: 11, name: "Paint UR", short: "PUR", points: [[500, 600], [670, 600], [670, 640], [500, 640]], labelX: 585, labelY: 620 },
    { id: 12, name: "Paint LL", short: "PLL", points: [[330, 640], [500, 640], [500, 680], [330, 680]], labelX: 415, labelY: 660 },
    { id: 13, name: "Paint LR", short: "PLR", points: [[500, 640], [670, 640], [670, 680], [500, 680]], labelX: 585, labelY: 660 }
  ];

  init();

  function init() {
    ensureDay(selectedDate);
    if (!currentDay().sessions.length) createSession("Session 1");
    selectedSessionId = currentDay().sessions[0].id;
    dateInput.value = selectedDate;
    renderAll();
  }

  function loadDB() {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("tracker_v_final");
    if (!raw) return { notes: {}, days: {} };
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (!parsed.days) {
          const legacyDays = {};
          Object.entries(parsed).forEach(([key, value]) => {
            if (key !== "notes") {
              legacyDays[key] = value;
            }
          });
          return { notes: parsed.notes || {}, days: legacyDays };
        }
        return parsed;
      }
    } catch {
      return { notes: {}, days: {} };
    }
    return { notes: {}, days: {} };
  }

  function saveDB() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function shiftISO(dateISO, days) {
    const date = new Date(dateISO);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function ensureDay(date) {
    if (!db.days) db.days = {};
    if (!db.days[date]) db.days[date] = { sessions: [] };
  }

  function currentDay() {
    ensureDay(selectedDate);
    return db.days[selectedDate];
  }

  function currentSession() {
    const session = currentDay().sessions.find((item) => item.id === selectedSessionId);
    return session || currentDay().sessions[0];
  }

  function createSession(name) {
    const session = { id: crypto.randomUUID(), name, shots: [] };
    currentDay().sessions.push(session);
    saveDB();
    return session;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function pushHistory() {
    historyState = { db: clone(db), selectedDate, selectedSessionId, selectedZone };
  }

  function undo() {
    if (!historyState) {
      alert("Keine Aktion zum Rückgängigmachen vorhanden.");
      return;
    }
    db = clone(historyState.db);
    selectedDate = historyState.selectedDate;
    selectedSessionId = historyState.selectedSessionId;
    selectedZone = historyState.selectedZone;
    historyState = null;
    renderAll();
  }

  function summarizeShots(shots) {
    const summary = { made: 0, attempts: 0, zones: Array(ZONES.length).fill().map(() => ({ made: 0, attempts: 0 })) };
    shots.forEach((shot) => {
      summary.attempts += 1;
      if (shot.made) summary.made += 1;
      if (typeof summary.zones[shot.zone] !== "undefined") {
        summary.zones[shot.zone].attempts += 1;
        if (shot.made) summary.zones[shot.zone].made += 1;
      }
    });
    return summary;
  }

  function getZoneStats(shots, zoneId) {
    const filtered = shots.filter((shot) => shot.zone === zoneId);
    const made = filtered.filter((shot) => shot.made).length;
    const attempts = filtered.length;
    return { made, attempts, pct: attempts ? Math.round((made / attempts) * 100) : 0 };
  }

  function zoneColor(pct) {
    if (pct >= 70) return { fill: "#16a34a", stroke: "#14532d" };
    if (pct >= 45) return { fill: "#f59e0b", stroke: "#78350f" };
    return { fill: "#dc2626", stroke: "#7f1d1d" };
  }

  function createSvgEl(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  }

  function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i][0];
      const yi = points[i][1];
      const xj = points[j][0];
      const yj = points[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function findZoneByPoint(nx, ny) {
    const x = nx * 1000;
    const y = ny * 680;
    for (const zone of ZONES) {
      if (pointInPolygon(x, y, zone.points)) return zone.id;
    }
    let closest = null;
    let bestDist = Infinity;
    ZONES.forEach((zone) => {
      const dx = x - zone.labelX;
      const dy = y - zone.labelY;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        closest = zone.id;
      }
    });
    return closest;
  }

  function polygonPointsString(points) {
    return points.map(([x, y]) => `${x},${y}`).join(" ");
  }

  function renderSvg(svg, shots, interactive = false) {
    svg.innerHTML = "";
    const defs = createSvgEl("defs", {});
    const filter = createSvgEl("filter", { id: "heat-blur" });
    const blur = createSvgEl("feGaussianBlur", { in: "SourceGraphic", stdDeviation: "15" });
    filter.appendChild(blur);
    defs.appendChild(filter);
    svg.appendChild(defs);

    if (shots.length) {
      const heat = createSvgEl("g", { class: "heat-group", filter: "url(#heat-blur)" });
      shots.forEach((shot) => {
        const zone = ZONES[shot.zone];
        if (!zone) return;
        const jitter = () => (Math.random() - 0.5) * 36;
        const circle = createSvgEl("circle", {
          cx: zone.labelX + jitter(),
          cy: zone.labelY + jitter(),
          r: 28,
          fill: shot.made ? "#22c55e" : "#f97316",
          opacity: "0.12"
        });
        heat.appendChild(circle);
      });
      svg.appendChild(heat);
    }

    ZONES.forEach((zone) => {
      const stats = getZoneStats(shots, zone.id);
      const colors = zoneColor(stats.pct);
      const polygon = createSvgEl("polygon", {
        points: polygonPointsString(zone.points),
        fill: colors.fill,
        stroke: colors.stroke,
        "stroke-width": selectedZone === zone.id && interactive ? "5" : "2",
        opacity: "0.78",
        class: `zone ${selectedZone === zone.id && interactive ? "selected-zone" : ""}`
      });
      if (interactive) {
        polygon.style.cursor = "pointer";
      }
      svg.appendChild(polygon);
      const label = createSvgEl("text", {
        x: zone.labelX,
        y: zone.labelY - 10,
        "text-anchor": "middle",
        class: "zone-label"
      });
      label.textContent = zone.short;
      svg.appendChild(label);
      const pct = createSvgEl("text", {
        x: zone.labelX,
        y: zone.labelY + 22,
        "text-anchor": "middle",
        class: "zone-percent"
      });
      pct.textContent = `${stats.pct}%`;
      svg.appendChild(pct);
    });

    if (interactive) {
      svg.onclick = (event) => {
        const pt = svg.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;
        const ctm = svg.getScreenCTM();
        if (!ctm) return;
        const cursorPt = pt.matrixTransform(ctm.inverse());
        const zoneId = findZoneByPoint(cursorPt.x / 1000, cursorPt.y / 680);
        if (zoneId !== null) {
          selectedZone = zoneId;
          renderAll();
        }
      };
    } else {
      svg.onclick = null;
    }
  }

  function renderStats() {
    const session = currentSession();
    const sessionSummary = summarizeShots(session?.shots || []);
    const daySummary = summarizeShots(currentDay().sessions.flatMap((item) => item.shots));
    const allSummary = summarizeShots(getAllShots());

    sessionStats.textContent = `Session: ${sessionSummary.made}/${sessionSummary.attempts} (${sessionSummary.attempts ? Math.round((sessionSummary.made / sessionSummary.attempts) * 100) : 0}%)`;
    dayStats.textContent = `Tag: ${daySummary.made}/${daySummary.attempts} (${daySummary.attempts ? Math.round((daySummary.made / daySummary.attempts) * 100) : 0}%)`;
    allStats.textContent = `All Time: ${allSummary.made}/${allSummary.attempts} (${allSummary.attempts ? Math.round((allSummary.made / allSummary.attempts) * 100) : 0}%)`;

    if (selectedZone !== null) {
      const zone = ZONES[selectedZone];
      const stats = getZoneStats(getAllShots(), selectedZone);
      selectedZoneInfo.innerHTML = `<strong>${zone.name}</strong><br>${stats.made}/${stats.attempts}`;
      zoneStats.textContent = `${stats.made}/${stats.attempts} Treffer`;
    } else {
      selectedZoneInfo.textContent = "Klicke auf eine Zone, um sie auszuwählen.";
      zoneStats.textContent = "";
    }

    currentDateLabel.textContent = selectedDate;
    currentSessionLabel.textContent = session?.name || "Keine Session";
  }

  function renderDayList() {
    dayList.innerHTML = "";
    const dates = Object.keys(db.days).sort().reverse();
    dates.forEach((date) => {
      const day = db.days[date];
      const shotCount = day.sessions.flatMap((item) => item.shots).length;
      const item = document.createElement("div");
      item.className = `day-item${date === selectedDate ? " active" : ""}`;
      item.innerHTML = `<strong>${date}</strong><br>${shotCount} Würfe`;
      item.addEventListener("click", () => {
        selectedDate = date;
        ensureDay(selectedDate);
        selectedSessionId = currentDay().sessions[0]?.id || null;
        selectedZone = null;
        renderAll();
      });
      dayList.appendChild(item);
    });
  }

  function renderStatus() {
    const imageOk = courtImageLoaded || courtImage.complete;
    const current = currentSession();
    const shots = current?.shots.length || 0;
    statusBox.textContent = `Bild geladen: ${imageOk ? "JA" : "NEIN"}\n` +
      `Aktueller Tag: ${selectedDate}\n` +
      `Session: ${current?.name || "-"}\n` +
      `Aktive Zone: ${selectedZone !== null ? ZONES[selectedZone].name : "keine"}\n` +
      `Shots in Session: ${shots}\n` +
      `Tage gespeichert: ${Object.keys(db.days).length}`;
  }

  function formatShortDate(date) {
    const [year, month, day] = date.split("-");
    return `${day}.${month}.`;
  }

  function renderCharts() {
    const session = currentSession();
    const shots = session?.shots || [];
    const labels = shots.map((_, idx) => `${idx + 1}`);
    let made = 0;
    const values = shots.map((shot, idx) => {
      if (shot.made) made += 1;
      return Math.round((made / (idx + 1)) * 100);
    });

    const dates = Object.keys(db.days).sort();
    const trendLabels = dates.slice(-14).map(formatShortDate);
    const trendValues = dates.slice(-14).map((date) => {
      const summary = summarizeShots(db.days[date].sessions.flatMap((item) => item.shots));
      return summary.attempts ? Math.round((summary.made / summary.attempts) * 100) : 0;
    });

    if (!window.sessionChart) {
      window.sessionChart = new Chart(document.getElementById("sessionChart"), {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: "Session FG%",
            data: values,
            borderColor: "#60a5fa",
            backgroundColor: "rgba(96,165,250,0.22)",
            tension: 0.35,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: "#fff"
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y}%` } }
          },
          scales: {
            x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
            y: { beginAtZero: true, max: 100, ticks: { color: "#94a3b8", callback: (value) => `${value}%` }, grid: { color: "rgba(148,163,184,0.15)" } }
          }
        }
      });
    } else {
      window.sessionChart.data.labels = labels;
      window.sessionChart.data.datasets[0].data = values;
      window.sessionChart.update();
    }

    if (!window.dailyChart) {
      window.dailyChart = new Chart(document.getElementById("dailyChart"), {
        type: "bar",
        data: {
          labels: trendLabels,
          datasets: [{
            label: "Tägliche FG%",
            data: trendValues,
            backgroundColor: trendValues.map((value) => value >= 70 ? "#22c55e" : value >= 45 ? "#f97316" : "#ef4444"),
            borderRadius: 12
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
            y: { beginAtZero: true, max: 100, ticks: { color: "#94a3b8", callback: (value) => `${value}%` }, grid: { color: "rgba(148,163,184,0.15)" } }
          }
        }
      });
    } else {
      window.dailyChart.data.labels = trendLabels;
      window.dailyChart.data.datasets[0].data = trendValues;
      window.dailyChart.data.datasets[0].backgroundColor = trendValues.map((value) => value >= 70 ? "#22c55e" : value >= 45 ? "#f97316" : "#ef4444");
      window.dailyChart.update();
    }
  }

  function loadNote() {
    dayNote.value = db.notes?.[selectedDate] || "";
  }

  function saveNote() {
    db.notes = db.notes || {};
    db.notes[selectedDate] = dayNote.value.trim();
    saveDB();
    renderStatus();
  }

  function exportCsv() {
    const rows = [["date", "session", "zone", "made", "timestamp"]];
    Object.entries(db.days).forEach(([date, day]) => {
      day.sessions.forEach((session) => {
        session.shots.forEach((shot) => {
          rows.push([date, session.name, ZONES[shot.zone]?.name || "", shot.made ? "1" : "0", shot.timestamp]);
        });
      });
    });
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "3pt-shot-tracker.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function addShot(made) {
    if (selectedZone === null) {
      alert("Wähle zuerst eine Zone auf dem Spielfeld aus.");
      return;
    }
    const session = currentSession();
    if (!session) return;
    pushHistory();
    session.shots.push({ date: selectedDate, sessionId: session.id, zone: selectedZone, made, timestamp: new Date().toISOString() });
    saveDB();
    renderAll();
  }

  function renderAll() {
    ensureDay(selectedDate);
    renderSessionSelect();
    renderDayList();
    renderStats();
    loadNote();
    renderStatus();
    renderSvg(interactiveSvg, currentSession()?.shots || [], true);
    renderSvg(sessionSvg, currentSession()?.shots || [], false);
    renderSvg(allSvg, getAllShots(), false);
    renderCharts();
    saveDB();
  }

  dateInput.addEventListener("change", () => {
    selectedDate = dateInput.value || todayISO();
    ensureDay(selectedDate);
    selectedSessionId = currentDay().sessions[0]?.id || null;
    selectedZone = null;
    renderAll();
  });

  prevDayBtn.addEventListener("click", () => {
    selectedDate = shiftISO(selectedDate, -1);
    ensureDay(selectedDate);
    selectedSessionId = currentDay().sessions[0]?.id || null;
    selectedZone = null;
    renderAll();
  });

  nextDayBtn.addEventListener("click", () => {
    selectedDate = shiftISO(selectedDate, 1);
    ensureDay(selectedDate);
    selectedSessionId = currentDay().sessions[0]?.id || null;
    selectedZone = null;
    renderAll();
  });

  hitBtn.addEventListener("click", () => addShot(true));
  missBtn.addEventListener("click", () => addShot(false));
  undoBtn.addEventListener("click", undo);
  statusBtn.addEventListener("click", renderStatus);
  exportBtn.addEventListener("click", exportCsv);
  saveNoteBtn.addEventListener("click", () => {
    saveNote();
    alert("Notiz gespeichert.");
  });

  sessionSelect.addEventListener("change", () => {
    selectedSessionId = sessionSelect.value;
    selectedZone = null;
    renderAll();
  });

  newSessionBtn.addEventListener("click", () => {
    pushHistory();
    const session = createSession(`Session ${currentDay().sessions.length + 1}`);
    selectedSessionId = session.id;
    selectedZone = null;
    renderAll();
  });

  renameSessionBtn.addEventListener("click", () => {
    const session = currentSession();
    if (!session) return;
    const name = prompt("Neuer Session-Name:", session.name);
    if (!name) return;
    pushHistory();
    session.name = name.trim();
    saveDB();
    renderAll();
  });

  deleteSessionBtn.addEventListener("click", () => {
    const session = currentSession();
    if (!session || !confirm("Diese Session wirklich löschen?")) return;
    pushHistory();
    currentDay().sessions = currentDay().sessions.filter((item) => item.id !== session.id);
    if (!currentDay().sessions.length) {
      const fallback = createSession("Session 1");
      selectedSessionId = fallback.id;
    } else {
      selectedSessionId = currentDay().sessions[0].id;
    }
    selectedZone = null;
    renderAll();
  });

  deleteDayBtn.addEventListener("click", () => {
    if (!confirm("Diesen Tag vollständig löschen?")) return;
    pushHistory();
    delete db.days[selectedDate];
    const remaining = Object.keys(db.days).sort();
    selectedDate = remaining.length ? remaining[remaining.length - 1] : todayISO();
    ensureDay(selectedDate);
    selectedSessionId = currentDay().sessions[0]?.id || null;
    selectedZone = null;
    renderAll();
  });
});