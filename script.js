document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "shottracker_v7";

  const dateInput = document.getElementById("dateInput");
  const prevDayBtn = document.getElementById("prevDayBtn");
  const nextDayBtn = document.getElementById("nextDayBtn");
  const deleteDayBtn = document.getElementById("deleteDayBtn");
  const exportBtn = document.getElementById("exportBtn");
  const undoBtn = document.getElementById("undoBtn");

  const sessionSelect = document.getElementById("sessionSelect");
  const newSessionBtn = document.getElementById("newSessionBtn");
  const renameSessionBtn = document.getElementById("renameSessionBtn");
  const deleteSessionBtn = document.getElementById("deleteSessionBtn");

  const hitBtn = document.getElementById("hitBtn");
  const missBtn = document.getElementById("missBtn");

  const selectedZoneInfo = document.getElementById("selectedZoneInfo");
  const sessionStatsEl = document.getElementById("sessionStats");
  const dayStatsEl = document.getElementById("dayStats");
  const allTimeStatsEl = document.getElementById("allTimeStats");
  const zoneStatsEl = document.getElementById("zoneStats");

  const dayListEl = document.getElementById("dayList");
  const currentDateLabel = document.getElementById("currentDateLabel");
  const currentSessionLabel = document.getElementById("currentSessionLabel");

  const courtCanvas = document.getElementById("courtCanvas");
  const sessionHeatCanvas = document.getElementById("sessionHeatCanvas");
  const allTimeHeatCanvas = document.getElementById("allTimeHeatCanvas");

  let db = loadDB();
  let selectedDate = isoToday();
  let selectedSessionId = null;
  let selectedZone = null;
  let snapshot = null;

  function R(x1, y1, x2, y2) {
    return [
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
    ];
  }

  const ZONES = [
    { id: 0, short: "CL3", name: "Corner Left 3", points: R(0.00, 0.72, 0.20, 1.00) },
    { id: 1, short: "WL3", name: "Wing Left 3", points: R(0.00, 0.42, 0.20, 0.72) },
    { id: 2, short: "TOP3", name: "Top of Key 3", points: R(0.20, 0.13, 0.80, 0.42) },
    { id: 3, short: "WR3", name: "Wing Right 3", points: R(0.80, 0.42, 1.00, 0.72) },
    { id: 4, short: "CR3", name: "Corner Right 3", points: R(0.80, 0.72, 1.00, 1.00) },

    { id: 5, short: "FT", name: "FT Line Area", points: R(0.36, 0.42, 0.64, 0.58) },

    { id: 6, short: "LM1", name: "Left Midrange High", points: R(0.20, 0.42, 0.36, 0.58) },
    { id: 7, short: "LM2", name: "Left Midrange Low", points: R(0.20, 0.58, 0.36, 0.72) },
    { id: 8, short: "RM2", name: "Right Midrange Low", points: R(0.64, 0.58, 0.80, 0.72) },
    { id: 9, short: "RM1", name: "Right Midrange High", points: R(0.64, 0.42, 0.80, 0.58) },

    { id: 10, short: "PLU", name: "Paint Left Upper", points: R(0.36, 0.58, 0.50, 0.78) },
    { id: 11, short: "PRU", name: "Paint Right Upper", points: R(0.50, 0.58, 0.64, 0.78) },
    { id: 12, short: "PLL", name: "Paint Left Lower", points: R(0.36, 0.78, 0.50, 1.00) },
    { id: 13, short: "PRL", name: "Paint Right Lower", points: R(0.50, 0.78, 0.64, 1.00) },
  ];

  const ZONE_PRIORITY = [12, 13, 10, 11, 5, 6, 7, 8, 9, 2, 1, 3, 0, 4];

  const zoneCentroids = ZONES.map(z => centroid(z.points));

  function loadDB() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_) {}
    return {};
  }

  function saveDB() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function isoToday() {
    const d = new Date();
    return isoFromDate(d);
  }

  function isoFromDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeSession(name) {
    return {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name,
      shots: [],
      createdAt: Date.now(),
    };
  }

  function ensureDate(date) {
    if (!db[date]) db[date] = { sessions: [] };
    if (!db[date].sessions || !db[date].sessions.length) {
      db[date].sessions = [makeSession("Session 1")];
    }
  }

  function currentDay() {
    ensureDate(selectedDate);
    return db[selectedDate];
  }

  function currentSession() {
    const day = currentDay();
    return day.sessions.find(s => s.id === selectedSessionId) || day.sessions[0] || null;
  }

  function setSelectedDate(date) {
    selectedDate = date;
    ensureDate(selectedDate);
    selectedSessionId = currentDay().sessions[0]?.id || null;
    render();
  }

  function snapshotState() {
    snapshot = {
      db: clone(db),
      selectedDate,
      selectedSessionId,
      selectedZone,
    };
    undoBtn.disabled = false;
  }

  function undo() {
    if (!snapshot) return;
    db = snapshot.db;
    selectedDate = snapshot.selectedDate;
    selectedSessionId = snapshot.selectedSessionId;
    selectedZone = snapshot.selectedZone;
    snapshot = null;
    saveDB();
    render();
    undoBtn.disabled = true;
  }

  function formatPct(made, attempts) {
    return attempts ? `${Math.round((made / attempts) * 100)}%` : "0%";
  }

  function emptyZoneStats() {
    return ZONES.map(() => ({ made: 0, attempts: 0 }));
  }

  function summarizeShots(shots) {
    const zones = emptyZoneStats();
    let made = 0;
    let attempts = 0;

    for (const shot of shots || []) {
      if (!shot || typeof shot.zone !== "number") continue;
      const z = zones[shot.zone];
      if (!z) continue;
      z.attempts++;
      attempts++;
      if (shot.made) {
        z.made++;
        made++;
      }
    }

    return { made, attempts, zones };
  }

  function summarizeSessions(sessions) {
    const shots = [];
    for (const s of sessions || []) {
      if (s.shots && s.shots.length) shots.push(...s.shots);
    }
    return summarizeShots(shots);
  }

  function allDaysSorted() {
    return Object.keys(db).sort();
  }

  function allTimeSummary() {
    const shots = [];
    for (const day of Object.keys(db)) {
      for (const session of db[day].sessions || []) {
        if (session.shots && session.shots.length) shots.push(...session.shots);
      }
    }
    return summarizeShots(shots);
  }

  function pointInPolygon(point, polygon) {
    const x = point[0];
    const y = point[1];
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];

      const intersect =
        ((yi > y) !== (yj > y)) &&
        (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);

      if (intersect) inside = !inside;
    }

    return inside;
  }

  function centroid(points) {
    let x = 0;
    let y = 0;
    for (const p of points) {
      x += p[0];
      y += p[1];
    }
    return [x / points.length, y / points.length];
  }

  function getZoneAtPoint(nx, ny) {
    for (const id of ZONE_PRIORITY) {
      if (pointInPolygon([nx, ny], ZONES[id].points)) return id;
    }

    let bestId = 0;
    let bestDist = Infinity;
    for (let i = 0; i < ZONES.length; i++) {
      const c = zoneCentroids[i];
      const dx = nx - c[0];
      const dy = ny - c[1];
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        bestId = i;
      }
    }
    return bestId;
  }

  function colorForPct(pct, attempts) {
    if (!attempts) {
      return {
        fill: "rgba(148, 163, 184, 0.14)",
        border: "rgba(148, 163, 184, 0.40)",
        text: "#e2e8f0",
      };
    }

    const hue = Math.max(0, Math.min(120, pct * 1.2));
    const opacity = 0.24 + Math.min(attempts, 20) / 20 * 0.48;

    return {
      fill: `hsla(${hue}, 88%, 50%, ${opacity})`,
      border: `hsla(${hue}, 96%, 64%, 0.95)`,
      text: "#ffffff",
    };
  }

  function prepareCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { ctx, width, height };
  }

  function polyToPixels(points, width, height) {
    return points.map(([x, y]) => [x * width, y * height]);
  }

  function drawPolygon(ctx, points, fill, stroke, lineWidth = 1) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function drawText(ctx, text, x, y, opts = {}) {
    ctx.save();
    ctx.font = opts.font || "700 14px system-ui";
    ctx.fillStyle = opts.fillStyle || "#fff";
    ctx.textAlign = opts.align || "center";
    ctx.textBaseline = opts.baseline || "middle";
    if (opts.shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 6;
    }
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawCourtBase(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#0f1b31";
    ctx.fillRect(0, 0, width, height);

    const line = "rgba(255,255,255,0.82)";
    const soft = "rgba(255,255,255,0.18)";

    ctx.strokeStyle = line;
    ctx.lineWidth = 2;

    ctx.strokeRect(0, 0, width, height);

    const x1 = width * 0.20;
    const x2 = width * 0.36;
    const x3 = width * 0.50;
    const x4 = width * 0.64;
    const x5 = width * 0.80;

    const y1 = height * 0.42;
    const y2 = height * 0.58;
    const y3 = height * 0.72;
    const y4 = height * 0.78;

    ctx.strokeStyle = soft;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1, y3);
    ctx.moveTo(x5, y1);
    ctx.lineTo(x5, y3);
    ctx.moveTo(x2, y1);
    ctx.lineTo(x2, height);
    ctx.moveTo(x4, y1);
    ctx.lineTo(x4, height);
    ctx.moveTo(x3, y2);
    ctx.lineTo(x3, height);
    ctx.moveTo(0, y1);
    ctx.lineTo(width, y1);
    ctx.moveTo(0, y2);
    ctx.lineTo(width, y2);
    ctx.moveTo(0, y3);
    ctx.lineTo(width, y3);
    ctx.moveTo(0, y4);
    ctx.lineTo(width, y4);
    ctx.stroke();

    ctx.strokeStyle = line;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(width / 2, height * 0.91, Math.min(width, height) * 0.035, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width * 0.43, height * 0.94);
    ctx.lineTo(width * 0.57, height * 0.94);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width / 2, height * 0.91, width * 0.34, Math.PI * 1.04, Math.PI * -0.04, true);
    ctx.stroke();
  }

  function renderCourtMap(canvas, stats, mode, highlightedZoneId) {
    const { ctx, width, height } = prepareCanvas(canvas);
    drawCourtBase(ctx, width, height);

    const labelFont = `${Math.max(10, Math.round(width * 0.024))}px system-ui`;
    const pctFont = `${Math.max(14, Math.round(width * 0.034))}px system-ui`;

    for (const zone of ZONES) {
      const pxPoints = polyToPixels(zone.points, width, height);
      const zoneStats = stats ? stats.zones[zone.id] : null;
      const attempts = zoneStats ? zoneStats.attempts : 0;
      const made = zoneStats ? zoneStats.made : 0;
      const pct = attempts ? Math.round((made / attempts) * 100) : 0;

      let style;
      if (mode === "selected") {
        style = {
          fill: "rgba(148,163,184,0.10)",
          border: "rgba(255,255,255,0.25)",
          text: "#ffffff",
        };
        if (highlightedZoneId === zone.id) {
          style.fill = "rgba(245, 158, 11, 0.38)";
          style.border = "rgba(245, 158, 11, 0.98)";
        }
      } else {
        style = colorForPct(pct, attempts);
        if (highlightedZoneId === zone.id) {
          style.border = "rgba(245, 158, 11, 0.98)";
        }
      }

      drawPolygon(ctx, pxPoints, style.fill, style.border, highlightedZoneId === zone.id ? 2.6 : 1.2);

      const c = centroid(pxPoints);
      drawText(ctx, zone.short, c[0], c[1] - 12, {
        font: labelFont,
        fillStyle: style.text,
        shadow: true,
      });
      drawText(ctx, attempts ? `${pct}%` : "--", c[0], c[1] + 10, {
        font: pctFont,
        fillStyle: style.text,
        shadow: true,
      });
    }
  }

  function renderSessionHeatmap() {
    const session = currentSession();
    const stats = summarizeShots(session ? session.shots : []);
    renderCourtMap(sessionHeatCanvas, stats, "heatmap", selectedZone);
  }

  function renderAllTimeHeatmap() {
    const stats = allTimeSummary();
    renderCourtMap(allTimeHeatCanvas, stats, "heatmap", selectedZone);
  }

  function renderInteractiveCourt() {
    const session = currentSession();
    const stats = summarizeShots(session ? session.shots : []);
    renderCourtMap(courtCanvas, stats, "selected", selectedZone);
  }

  function updateSessionSelect() {
    const day = currentDay();

    const summaryBySession = day.sessions.map(s => {
      const sum = summarizeShots(s.shots);
      return {
        id: s.id,
        name: s.name,
        attempts: sum.attempts,
        made: sum.made,
      };
    });

    sessionSelect.innerHTML = "";
    for (const s of summaryBySession) {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.made}/${s.attempts})`;
      sessionSelect.appendChild(opt);
    }

    if (!selectedSessionId || !day.sessions.some(s => s.id === selectedSessionId)) {
      selectedSessionId = day.sessions[0]?.id || null;
    }

    sessionSelect.value = selectedSessionId || "";
  }

  function updateDayList() {
    const keys = allDaysSorted().reverse();
    dayListEl.innerHTML = "";

    for (const day of keys) {
      const summary = summarizeSessions(db[day].sessions);
      const item = document.createElement("div");
      item.className = "day-item" + (day === selectedDate ? " active" : "");
      item.innerHTML = `
        <div class="top">
          <strong>${day}</strong>
          <span>${summary.attempts} Würfe</span>
        </div>
        <div class="bottom">${summary.made}/${summary.attempts} • ${formatPct(summary.made, summary.attempts)}</div>
      `;
      item.addEventListener("click", () => {
        selectedDate = day;
        ensureDate(selectedDate);
        selectedSessionId = currentDay().sessions[0]?.id || null;
        render();
      });
      dayListEl.appendChild(item);
    }
  }

  function updateStats() {
    const session = currentSession();
    const sessionSummary = summarizeShots(session ? session.shots : []);
    const daySummary = summarizeSessions(currentDay().sessions);
    const allSummary = allTimeSummary();

    sessionStatsEl.textContent = session
      ? `Session: ${sessionSummary.made}/${sessionSummary.attempts} (${formatPct(sessionSummary.made, sessionSummary.attempts)})`
      : "Session: -";

    dayStatsEl.textContent = `Tag: ${daySummary.made}/${daySummary.attempts} (${formatPct(daySummary.made, daySummary.attempts)})`;
    allTimeStatsEl.textContent = `All Time: ${allSummary.made}/${allSummary.attempts} (${formatPct(allSummary.made, allSummary.attempts)})`;

    currentDateLabel.textContent = selectedDate;
    currentSessionLabel.textContent = session ? session.name : "";

    if (selectedZone === null) {
      selectedZoneInfo.textContent = "Keine Zone gewählt";
      zoneStatsEl.textContent = "Zone: -";
      return;
    }

    const z = ZONES[selectedZone];
    const sessionZone = sessionSummary.zones[selectedZone] || { made: 0, attempts: 0 };
    const allZone = allSummary.zones[selectedZone] || { made: 0, attempts: 0 };

    selectedZoneInfo.innerHTML = `
      <strong>${z.name}</strong><br>
      Session: ${sessionZone.made}/${sessionZone.attempts} (${formatPct(sessionZone.made, sessionZone.attempts)})<br>
      All Time: ${allZone.made}/${allZone.attempts} (${formatPct(allZone.made, allZone.attempts)})
    `;

    zoneStatsEl.textContent = `Zone: ${z.short}`;
  }

  function render() {
    ensureDate(selectedDate);

    dateInput.value = selectedDate;
    if (!selectedSessionId || !currentDay().sessions.some(s => s.id === selectedSessionId)) {
      selectedSessionId = currentDay().sessions[0]?.id || null;
    }

    updateSessionSelect();
    updateDayList();
    updateStats();
    renderInteractiveCourt();
    renderSessionHeatmap();
    renderAllTimeHeatmap();
  }

  function recordShot(made) {
    const session = currentSession();
    if (!session) return;
    if (selectedZone === null) {
      alert("Erst eine Zone auf dem Court wählen.");
      return;
    }

    snapshotState();

    session.shots.push({
      zone: selectedZone,
      made: made,
      ts: Date.now(),
      date: selectedDate,
    });

    saveDB();
    render();
  }

  function deleteCurrentSession() {
    const day = currentDay();
    const session = currentSession();
    if (!session) return;
    if (!confirm("Session wirklich löschen?")) return;

    snapshotState();

    day.sessions = day.sessions.filter(s => s.id !== session.id);
    if (!day.sessions.length) day.sessions.push(makeSession("Session 1"));
    selectedSessionId = day.sessions[0].id;

    saveDB();
    render();
  }

  function renameCurrentSession() {
    const session = currentSession();
    if (!session) return;

    const nextName = prompt("Neuer Session-Name:", session.name);
    if (nextName === null) return;

    snapshotState();
    session.name = nextName.trim() || session.name;

    saveDB();
    render();
  }

  function newSession() {
    snapshotState();

    const day = currentDay();
    const defaultName = `Session ${day.sessions.length + 1}`;
    const name = prompt("Session-Name:", defaultName);
    const session = makeSession((name && name.trim()) ? name.trim() : defaultName);

    day.sessions.push(session);
    selectedSessionId = session.id;

    saveDB();
    render();
  }

  function deleteCurrentDay() {
    if (!confirm("Tag wirklich löschen?")) return;

    snapshotState();

    delete db[selectedDate];

    const remaining = allDaysSorted();
    if (remaining.length) {
      selectedDate = remaining[0];
    } else {
      selectedDate = isoToday();
    }

    ensureDate(selectedDate);
    selectedSessionId = currentDay().sessions[0]?.id || null;

    saveDB();
    render();
  }

  function exportCSV() {
    const rows = [["date", "session", "zone", "zone_name", "made", "ts"]];

    for (const day of allDaysSorted()) {
      for (const session of db[day].sessions || []) {
        for (const shot of session.shots || []) {
          const zone = ZONES[shot.zone];
          rows.push([
            day,
            session.name,
            zone ? zone.short : String(shot.zone),
            zone ? zone.name : "",
            shot.made ? "1" : "0",
            shot.ts || "",
          ]);
        }
      }
    }

    const csv = rows
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "3pt-tracker-export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  prevDayBtn.addEventListener("click", () => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    selectedDate = isoFromDate(d);
    ensureDate(selectedDate);
    selectedSessionId = currentDay().sessions[0]?.id || null;
    render();
  });

  nextDayBtn.addEventListener("click", () => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    selectedDate = isoFromDate(d);
    ensureDate(selectedDate);
    selectedSessionId = currentDay().sessions[0]?.id || null;
    render();
  });

  dateInput.addEventListener("change", (e) => {
    selectedDate = e.target.value;
    ensureDate(selectedDate);
    selectedSessionId = currentDay().sessions[0]?.id || null;
    render();
  });

  sessionSelect.addEventListener("change", (e) => {
    selectedSessionId = e.target.value;
    render();
  });

  newSessionBtn.addEventListener("click", newSession);
  renameSessionBtn.addEventListener("click", renameCurrentSession);
  deleteSessionBtn.addEventListener("click", deleteCurrentSession);
  deleteDayBtn.addEventListener("click", deleteCurrentDay);
  exportBtn.addEventListener("click", exportCSV);
  undoBtn.addEventListener("click", undo);

  hitBtn.addEventListener("click", () => recordShot(true));
  missBtn.addEventListener("click", () => recordShot(false));

  courtCanvas.addEventListener("click", (e) => {
    const rect = courtCanvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    selectedZone = getZoneAtPoint(nx, ny);
    render();
  });

  window.addEventListener("resize", () => render());

  ensureDate(selectedDate);
  selectedSessionId = currentDay().sessions[0]?.id || null;
  undoBtn.disabled = true;
  render();
});
