document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "shottracker_v8";

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

  const courtSvg = document.getElementById("courtSvg");
  const sessionSvg = document.getElementById("sessionSvg");
  const allTimeSvg = document.getElementById("allTimeSvg");

  let db = loadDB();
  let selectedDate = isoToday();
  let selectedSessionId = null;
  let selectedZone = null;
  let snapshot = null;

  function loadDB() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveDB() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function isoToday() {
    return isoFromDate(new Date());
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

  function migrateDB() {
    for (const dayKey of Object.keys(db)) {
      const day = db[dayKey];
      if (!day.sessions || !Array.isArray(day.sessions)) day.sessions = [];
      for (const session of day.sessions) {
        if (!Array.isArray(session.shots)) session.shots = [];
        if (!session.name) session.name = "Session";
        if (!session.createdAt) session.createdAt = Date.now();
      }
    }
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
      if (Array.isArray(s.shots) && s.shots.length) shots.push(...s.shots);
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
        if (Array.isArray(session.shots) && session.shots.length) shots.push(...session.shots);
      }
    }
    return summarizeShots(shots);
  }

  function rect(x1, y1, x2, y2) {
    return { x1, y1, x2, y2 };
  }

  function rectPoints(r) {
    return [
      [r.x1, r.y1],
      [r.x2, r.y1],
      [r.x2, r.y2],
      [r.x1, r.y2],
    ];
  }

  function rectContains(nx, ny, r) {
    return nx >= r.x1 && nx <= r.x2 && ny >= r.y1 && ny <= r.y2;
  }

  function centroidRect(r) {
    return [(r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2];
  }

  const ZONES = [
    { id: 0, short: "CL", name: "Corner Left", rect: rect(0, 0, 180, 380) },
    { id: 1, short: "WL", name: "Wing Left", rect: rect(180, 0, 340, 380) },
    { id: 2, short: "TOP", name: "Top of Key", rect: rect(340, 0, 660, 380) },
    { id: 3, short: "WR", name: "Wing Right", rect: rect(660, 0, 820, 380) },
    { id: 4, short: "CR", name: "Corner Right", rect: rect(820, 0, 1000, 380) },

    { id: 5, short: "MU-L", name: "Midrange Upper Left", rect: rect(0, 380, 180, 520) },
    { id: 6, short: "ML-L", name: "Midrange Lower Left", rect: rect(180, 380, 340, 560) },
    { id: 7, short: "FT", name: "FT Line Zone", rect: rect(340, 380, 660, 560) },
    { id: 8, short: "ML-R", name: "Midrange Lower Right", rect: rect(660, 380, 820, 560) },
    { id: 9, short: "MU-R", name: "Midrange Upper Right", rect: rect(820, 380, 1000, 520) },

    { id: 10, short: "PUL", name: "Paint Upper Left", rect: rect(340, 560, 500, 605) },
    { id: 11, short: "PUR", name: "Paint Upper Right", rect: rect(500, 560, 660, 605) },
    { id: 12, short: "PLL", name: "Paint Lower Left", rect: rect(340, 605, 500, 680) },
    { id: 13, short: "PLR", name: "Paint Lower Right", rect: rect(500, 605, 660, 680) },
  ];

  function zoneLabelPos(zone) {
    return centroidRect(zone.rect);
  }

  function zoneColor(pct, attempts) {
    if (!attempts) {
      return {
        fill: "rgba(255,255,255,0.38)",
        stroke: "rgba(255,255,255,0.95)",
        text: "#475569",
      };
    }
    const hue = Math.max(0, Math.min(120, pct * 1.2));
    const opacity = 0.30 + Math.min(attempts, 20) / 20 * 0.38;
    return {
      fill: `hsla(${hue}, 88%, 52%, ${opacity})`,
      stroke: `hsla(${hue}, 96%, 64%, 0.95)`,
      text: "#0f172a",
    };
  }

  function pointInPolygon(point, polygon) {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      const intersect =
        ((yi > y) !== (yj > y)) &&
        (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }

    return inside;
  }

  function getZonesPolygons() {
    return ZONES.map(z => ({
      ...z,
      points: rectPoints(z.rect),
      centroid: zoneLabelPos(z),
    }));
  }

  const ZONE_POLYGONS = getZonesPolygons();

  function getZoneAtPoint(nx, ny) {
    for (const z of ZONE_POLYGONS) {
      if (rectContains(nx, ny, z.rect)) return z.id;
    }
    let best = ZONE_POLYGONS[0].id;
    let bestD = Infinity;
    for (const z of ZONE_POLYGONS) {
      const [cx, cy] = z.centroid;
      const dx = nx * 1000 - cx;
      const dy = ny * 680 - cy;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = z.id;
      }
    }
    return best;
  }

  function svgEl(tag, attrs = {}, children = "") {
    const attrText = Object.entries(attrs)
      .map(([k, v]) => `${k}="${String(v)}"`)
      .join(" ");
    return children
      ? `<${tag} ${attrText}>${children}</${tag}>`
      : `<${tag} ${attrText} />`;
  }

  function renderCourtBase() {
    const line = "rgba(255,255,255,0.98)";
    const soft = "rgba(255,255,255,0.90)";
    const hoopX = 500;
    const hoopY = 620;

    const lineElems = [
      svgEl("rect", { x: 0, y: 0, width: 1000, height: 680, fill: "#ececec" }),
      svgEl("rect", { x: 0, y: 0, width: 1000, height: 680, fill: "none", stroke: line, "stroke-width": 3 }),
      svgEl("rect", { x: 340, y: 560, width: 320, height: 120, fill: "none", stroke: soft, "stroke-width": 2 }),
      svgEl("line", { x1: 500, y1: 560, x2: 500, y2: 680, stroke: soft, "stroke-width": 2 }),
      svgEl("line", { x1: 340, y1: 605, x2: 660, y2: 605, stroke: soft, "stroke-width": 2 }),
      svgEl("circle", { cx: hoopX, cy: hoopY, r: 10, fill: "none", stroke: line, "stroke-width": 3 }),
      svgEl("path", { d: "M 500 680 A 45 45 0 0 1 500 590", fill: "none", stroke: line, "stroke-width": 3 }),
      svgEl("path", { d: "M 0 380 Q 500 610 1000 380", fill: "none", stroke: line, "stroke-width": 4 }),
      svgEl("line", { x1: 0, y1: 380, x2: 0, y2: 0, stroke: line, "stroke-width": 3 }),
      svgEl("line", { x1: 1000, y1: 380, x2: 1000, y2: 0, stroke: line, "stroke-width": 3 }),
    ];

    return lineElems.join("");
  }

  function makeZonePolygon(zone, style, selected, isInteractive) {
    const points = zone.points.map(p => p.join(",")).join(" ");
    const base = svgEl("polygon", {
      points,
      fill: style.fill,
      stroke: style.stroke,
      "stroke-width": selected ? 4 : 2,
      "data-zone-id": zone.id,
      class: selected ? "zone-hit" : "",
      style: isInteractive ? "cursor:pointer" : "",
    });

    const [x, y] = zoneLabelPos(zone);
    const label = svgEl("text", {
      x,
      y: y - 9,
      "text-anchor": "middle",
      class: "zone-label",
      fill: style.text,
      "pointer-events": "none",
    }, zone.short);

    const pctText = svgEl("text", {
      x,
      y: y + 19,
      "text-anchor": "middle",
      class: "zone-pct",
      fill: style.text,
      "pointer-events": "none",
    }, style.pctLabel);

    return base + label + pctText;
  }

  function renderSvg(svg, stats, interactive) {
    const session = currentSession();
    const selected = selectedZone;
    const zoneMarkup = ZONE_POLYGONS.map(z => {
      const zStats = stats.zones[z.id] || { made: 0, attempts: 0 };
      const pct = zStats.attempts ? Math.round((zStats.made / zStats.attempts) * 100) : 0;
      let style = zoneColor(pct, zStats.attempts);

      if (interactive && selected === z.id) {
        style = {
          fill: "rgba(245,158,11,0.34)",
          stroke: "rgba(245,158,11,0.98)",
          text: "#0f172a",
          pctLabel: zStats.attempts ? `${pct}%` : "--",
        };
      } else {
        style = {
          ...style,
          pctLabel: zStats.attempts ? `${pct}%` : "--",
        };
      }

      return makeZonePolygon(z, style, interactive && selected === z.id, interactive);
    }).join("");

    svg.innerHTML = `
      ${renderCourtBase()}
      ${zoneMarkup}
    `;

    if (interactive) {
      svg.querySelectorAll("[data-zone-id]").forEach(node => {
        node.addEventListener("click", (e) => {
          e.stopPropagation();
          selectedZone = Number(node.getAttribute("data-zone-id"));
          render();
        });
      });

      svg.addEventListener("click", (e) => {
        const rect = svg.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;
        selectedZone = getZoneAtPoint(nx, ny);
        render();
      }, { once: true });
    }
  }

  function renderInteractiveCourt() {
    const session = currentSession();
    const stats = summarizeShots(session ? session.shots : []);
    renderSvg(courtSvg, stats, true);
  }

  function renderSessionHeatmap() {
    const session = currentSession();
    const stats = summarizeShots(session ? session.shots : []);
    renderSvg(sessionSvg, stats, false);
  }

  function renderAllTimeHeatmap() {
    const stats = allTimeSummary();
    renderSvg(allTimeSvg, stats, false);
  }

  function updateSessionSelect() {
    const day = currentDay();
    sessionSelect.innerHTML = "";

    for (const s of day.sessions) {
      const sum = summarizeShots(s.shots);
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.name} (${sum.made}/${sum.attempts})`;
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

    const z = ZONE_POLYGONS[selectedZone];
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
      made,
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
    selectedDate = remaining.length ? remaining[0] : isoToday();

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
          const zone = ZONE_POLYGONS[shot.zone];
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
  deleteDayBtn.addEventListener("
  function renderInteractiveCourt() {
    const session = currentSession();
    const stats = summarizeShots(session ? session.shots : []);
    renderCourtMap(courtCanvas, stats, "selected", selectedZone);
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

  function updateSessionSelect() {
    const day = currentDay();

    sessionSelect.innerHTML = "";
    for (const s of day.sessions) {
      const sum = summarizeShots(s.shots);
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.name} (${sum.made}/${sum.attempts})`;
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
      made,
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

  window.addEventListener("resize", () => render());

  migrateDB();
  ensureDate(selectedDate);
  selectedSessionId = currentDay().sessions[0]?.id || null;
  undoBtn.disabled = true;
  render();
});
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

  function loadDB() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveDB() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function isoToday() {
    return isoFromDate(new Date());
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

  function migrateDB() {
    for (const dayKey of Object.keys(db)) {
      const day = db[dayKey];
      if (!day.sessions || !Array.isArray(day.sessions)) {
        day.sessions = [];
      }
      for (const session of day.sessions) {
        if (!Array.isArray(session.shots)) session.shots = [];
        if (!session.name) session.name = "Session";
        if (!session.createdAt) session.createdAt = Date.now();
      }
    }
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
      if (Array.isArray(s.shots) && s.shots.length) shots.push(...s.shots);
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
        if (Array.isArray(session.shots) && session.shots.length) shots.push(...session.shots);
      }
    }
    return summarizeShots(shots);
  }

  function rect(x1, y1, x2, y2) {
    return { x1, y1, x2, y2 };
  }

  function rectContains(nx, ny, r) {
    return nx >= r.x1 && nx <= r.x2 && ny >= r.y1 && ny <= r.y2;
  }

  function centroidRect(r) {
    return [(r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2];
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

  function clonePoints(points) {
    return points.map(([x, y]) => [x, y]);
  }

  const COURT = {
    hoopX: 0.50,
    hoopY: 0.92,
    arcR: 0.36,
    arcTopY: 0.56,
    arcBottomY: 0.56,
  };

  function arcX(y) {
    const dx = Math.sqrt(
      Math.max(
        0,
        COURT.arcR * COURT.arcR - Math.pow(y - COURT.hoopY, 2)
      )
    );
    return COURT.hoopX + dx;
  }

  function buildArcBandPolygon(y1, y2, steps = 18) {
    const pts = [];
    pts.push([arcX(y1), y1]);
    pts.push([1.0, y1]);
    pts.push([1.0, y2]);
    pts.push([arcX(y2), y2]);

    for (let i = steps - 1; i >= 0; i--) {
      const t = i / steps;
      const y = y1 + (y2 - y1) * t;
      pts.push([arcX(y), y]);
    }

    return pts;
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
    ctx.fillStyle = opts.fillStyle || "#0f172a";
    ctx.textAlign = opts.align || "center";
    ctx.textBaseline = opts.baseline || "middle";
    if (opts.shadow) {
      ctx.shadowColor = "rgba(255,255,255,0.18)";
      ctx.shadowBlur = 2;
    }
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function colorForPct(pct, attempts) {
    if (!attempts) {
      return {
        fill: "rgba(255,255,255,0.30)",
        border: "rgba(255,255,255,0.55)",
        text: "#475569",
      };
    }

    const hue = Math.max(0, Math.min(120, pct * 1.2));
    const opacity = 0.28 + Math.min(attempts, 20) / 20 * 0.34;

    return {
      fill: `hsla(${hue}, 88%, 52%, ${opacity})`,
      border: `hsla(${hue}, 96%, 64%, 0.95)`,
      text: "#0f172a",
    };
  }

  const ZONES = [
    { id: 0, short: "C1", name: "Corner Left 3", points: clonePoints([[0.00, 0.00], [0.18, 0.00], [0.18, 0.56], [0.00, 0.56]]) },
    { id: 1, short: "W1", name: "Wing Left 3", points: clonePoints([[0.18, 0.00], [0.34, 0.00], [0.34, 0.56], [0.18, 0.56]]) },
    { id: 2, short: "TOP", name: "Top of Key 3", points: clonePoints([[0.34, 0.00], [0.66, 0.00], [0.66, 0.56], [0.34, 0.56]]) },
    { id: 3, short: "W2", name: "Wing Right 3", points: clonePoints([[0.66, 0.00], [0.82, 0.00], [0.82, 0.56], [0.66, 0.56]]) },
    { id: 4, short: "C2", name: "Corner Right 3", points: clonePoints([[0.82, 0.00], [1.00, 0.00], [1.00, 0.56], [0.82, 0.56]]) },

    { id: 5, short: "MU-L", name: "Midrange Upper Left", points: clonePoints([[0.00, 0.56], [0.18, 0.56], [0.18, 0.72], [0.00, 0.72]]) },
    { id: 6, short: "ML-L", name: "Midrange Lower Left", points: clonePoints([[0.18, 0.56], [0.34, 0.56], [0.34, 0.82], [0.18, 0.82]]) },
    { id: 7, short: "FT", name: "FT Line Zone", points: clonePoints([[0.34, 0.56], [0.66, 0.56], [0.66, 0.82], [0.34, 0.82]]) },
    { id: 8, short: "ML-R", name: "Midrange Lower Right", points: clonePoints([[0.66, 0.56], [0.82, 0.56], [0.82, 0.82], [0.66, 0.82]]) },
    { id: 9, short: "MU-R", name: "Midrange Upper Right", points: clonePoints([[0.82, 0.56], [1.00, 0.56], [1.00, 0.72], [0.82, 0.72]]) },

    { id: 10, short: "PUL", name: "Paint Upper Left", points: clonePoints([[0.34, 0.82], [0.50, 0.82], [0.50, 0.91], [0.34, 0.91]]) },
    { id: 11, short: "PUR", name: "Paint Upper Right", points: clonePoints([[0.50, 0.82], [0.66, 0.82], [0.66, 0.91], [0.50, 0.91]]) },
    { id: 12, short: "PLL", name: "Paint Lower Left", points: clonePoints([[0.34, 0.91], [0.50, 0.91], [0.50, 1.00], [0.34, 1.00]]) },
    { id: 13, short: "PLR", name: "Paint Lower Right", points: clonePoints([[0.50, 0.91], [0.66, 0.91], [0.66, 1.00], [0.50, 1.00]]) },
  ];

  const ZONE_PRIORITY = [12, 13, 10, 11, 7, 5, 6, 8, 9, 2, 1, 3, 0, 4];
  const zoneCentroids = ZONES.map(z => {
    let x = 0;
    let y = 0;
    for (const p of z.points) {
      x += p[0];
      y += p[1];
    }
    return [x / z.points.length, y / z.points.length];
  });

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

  function drawCourtBase(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#ececec";
    ctx.fillRect(0, 0, width, height);

    const line = "rgba(255,255,255,0.95)";
    const soft = "rgba(255,255,255,0.82)";

    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    const hoopX = width * 0.50;
    const hoopY = height * 0.92;

    ctx.strokeStyle = soft;
    ctx.lineWidth = 1.5;

    // Key / paint
    ctx.beginPath();
    ctx.rect(width * 0.34, height * 0.56, width * 0.32, height * 0.44);
    ctx.stroke();

    // Lane split
    ctx.beginPath();
    ctx.moveTo(width * 0.50, height * 0.56);
    ctx.lineTo(width * 0.50, height * 1.00);
    ctx.stroke();

    // FT line
    ctx.beginPath();
    ctx.moveTo(width * 0.34, height * 0.82);
    ctx.lineTo(width * 0.66, height * 0.82);
    ctx.stroke();

    // Basket
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hoopX, hoopY, Math.min(width, height) * 0.018, 0, Math.PI * 2);
    ctx.stroke();

    // Restricted area
    ctx.beginPath();
    ctx.arc(hoopX, hoopY, width * 0.09, Math.PI, 0, true);
    ctx.stroke();

    // 3PT arc
    ctx.beginPath();
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = 0.56 + (0.92 - 0.56) * t;
      const dx = Math.sqrt(Math.max(0, 0.36 * 0.36 - Math.pow(y - 0.92, 2)));
      const x = 0.50 + dx;
      if (i === 0) ctx.moveTo(x * width, y * height);
      else ctx.lineTo(x * width, y * height);
    }
    ctx.stroke();

    // Corner lines
    ctx.beginPath();
    ctx.moveTo(arcX(0.56) * width, 0.56 * height);
    ctx.lineTo(width, 0.56 * height);
    ctx.moveTo(arcX(0.56) * width, 0.56 * height);
    ctx.lineTo(0, 0.56 * height);
    ctx.stroke();
  }

  function drawPolygonZone(ctx, zone, style, highlightedZoneId, width, height) {
    const px = zone.points.map(([x, y]) => [x * width, y * height]);
    drawPolygon(ctx, px, style.fill, style.border, highlightedZoneId === zone.id ? 2.4 : 1.0);

    let x = 0;
    let y = 0;
    for (const p of px) {
      x += p[0];
      y += p[1];
    }
    x /= px.length;
    y /= px.length;

    return { x, y };
  }

  function renderCourtMap(canvas, stats, mode, highlightedZoneId) {
    const { ctx, width, height } = prepareCanvas(canvas);
    drawCourtBase(ctx, width, height);

    const labelFont = `${Math.max(10, Math.round(width * 0.016))}px system-ui`;
    const pctFont = `${Math.max(14, Math.round(width * 0.022))}px system-ui`;

    for (const zone of ZONES) {
      const z = stats ? stats.zones[zone.id] : null;
      const attempts = z ? z.attempts : 0;
      const made = z ? z.made : 0;
      const pct = attempts ? Math.round((made / attempts) * 100) : 0;

      let style;
      if (mode === "selected") {
        style = {
          fill: "rgba(148,163,184,0.10)",
          border: "rgba(255,255,255,0.30)",
          text: "#0f172a",
        };
        if (highlightedZoneId === zone.id) {
          style.fill = "rgba(245,158,11,0.32)";
          style.border = "rgba(245,158,11,0.98)";
        }
      } else {
        style = colorForPct(pct, attempts);
        if (highlightedZoneId === zone.id) {
          style.border = "rgba(245,158,11,0.98)";
        }
      }

      const c = drawPolygonZone(ctx, zone, style, highlightedZoneId, width, height);

      drawText(ctx, zone.short, c.x, c.y - 10, {
        font: labelFont,
        fillStyle: style.text,
      });

      drawText(ctx, attempts ? `${pct}%` : "--", c.x, c.y + 12, {
        font: pctFont,
        fillStyle: style.text,
      });
    }
  }

  function renderInteractiveCourt() {
    const session = currentSession();
    const stats = summarizeShots(session ? session.shots : []);
    renderCourtMap(courtCanvas, stats, "selected", selectedZone);
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

  function updateSessionSelect() {
    const day = currentDay();

    sessionSelect.innerHTML = "";
    for (const s of day.sessions) {
      const sum = summarizeShots(s.shots);
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.name} (${sum.made}/${sum.attempts})`;
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
      made,
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

