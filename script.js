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

  const ZONES = [
    {
      id: 0,
      name: "Corner Left",
      short: "CL",
      points: [
        [0, 0],
        [145, 0],
        [145, 470],
        [0, 470]
      ],
      labelX: 72,
      labelY: 205
    },
    {
      id: 1,
      name: "Wing Left",
      short: "WL",
      points: [
        [145, 0],
        [355, 0],
        [330, 470],
        [145, 470]
      ],
      labelX: 245,
      labelY: 190
    },
    {
      id: 2,
      name: "Top",
      short: "TOP",
      points: [
        [355, 0],
        [645, 0],
        [670, 470],
        [330, 470]
      ],
      labelX: 500,
      labelY: 175
    },
    {
      id: 3,
      name: "Wing Right",
      short: "WR",
      points: [
        [645, 0],
        [855, 0],
        [855, 470],
        [670, 470]
      ],
      labelX: 755,
      labelY: 190
    },
    {
      id: 4,
      name: "Corner Right",
      short: "CR",
      points: [
        [855, 0],
        [1000, 0],
        [1000, 470],
        [855, 470]
      ],
      labelX: 928,
      labelY: 205
    },
    {
      id: 5,
      name: "Mid Left Upper",
      short: "MLU",
      points: [
        [145, 470],
        [330, 470],
        [330, 560],
        [145, 560]
      ],
      labelX: 238,
      labelY: 510
    },
    {
      id: 6,
      name: "Mid Left Lower",
      short: "MLL",
      points: [
        [145, 560],
        [330, 560],
        [330, 680],
        [145, 680]
      ],
      labelX: 238,
      labelY: 620
    },
    {
      id: 7,
      name: "Free Throw",
      short: "FT",
      points: [
        [330, 470],
        [670, 470],
        [670, 600],
        [330, 600]
      ],
      labelX: 500,
      labelY: 540
    },
    {
      id: 8,
      name: "Mid Right Lower",
      short: "MRL",
      points: [
        [670, 560],
        [855, 560],
        [855, 680],
        [670, 680]
      ],
      labelX: 762,
      labelY: 620
    },
    {
      id: 9,
      name: "Mid Right Upper",
      short: "MRU",
      points: [
        [670, 470],
        [855, 470],
        [855, 560],
        [670, 560]
      ],
      labelX: 762,
      labelY: 510
    },
    {
      id: 10,
      name: "Paint UL",
      short: "PUL",
      points: [
        [330, 600],
        [500, 600],
        [500, 640],
        [330, 640]
      ],
      labelX: 415,
      labelY: 620
    },
    {
      id: 11,
      name: "Paint UR",
      short: "PUR",
      points: [
        [500, 600],
        [670, 600],
        [670, 640],
        [500, 640]
      ],
      labelX: 585,
      labelY: 620
    },
    {
      id: 12,
      name: "Paint LL",
      short: "PLL",
      points: [
        [330, 640],
        [500, 640],
        [500, 680],
        [330, 680]
      ],
      labelX: 415,
      labelY: 660
    },
    {
      id: 13,
      name: "Paint LR",
      short: "PLR",
      points: [
        [500, 640],
        [670, 640],
        [670, 680],
        [500, 680]
      ],
      labelX: 585,
      labelY: 660
    }
  ];

  boot();

  function boot() {
    ensureDay(selectedDate);

    if (currentDay().sessions.length === 0) {
      createSession("Session 1");
    }

    selectedSessionId = currentDay().sessions[0].id;
    dateInput.value = selectedDate;

    renderAll();
    updateStatus("System OK");
  }

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

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function shiftISO(dateISO, deltaDays) {
    const [y, m, d] = dateISO.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + deltaDays);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  function ensureDay(date) {
    if (!db[date]) {
      db[date] = { sessions: [] };
    }
  }

  function currentDay() {
    ensureDay(selectedDate);
    return db[selectedDate];
  }

  function currentSession() {
    const sess = currentDay().sessions.find((s) => s.id === selectedSessionId);
    return sess || currentDay().sessions[0];
  }

  function createSession(name) {
    const session = {
      id: crypto.randomUUID(),
      name,
      shots: []
    };
    currentDay().sessions.push(session);
    saveDB();
    return session;
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
    renderAll();
  }

  function renderSessionSelect() {
    sessionSelect.innerHTML = "";

    const sessions = currentDay().sessions;

    if (!sessions.some((s) => s.id === selectedSessionId)) {
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

  function getAllShots() {
    return Object.values(db)
      .flatMap((day) => day.sessions)
      .flatMap((session) => session.shots);
  }

  function summarizeShots(shots) {
    const result = {
      made: 0,
      attempts: 0,
      zones: []
    };

    for (let i = 0; i < ZONES.length; i++) {
      result.zones.push({ made: 0, attempts: 0 });
    }

    for (const shot of shots) {
      result.attempts++;
      if (shot.made) result.made++;
      if (result.zones[shot.zone]) {
        result.zones[shot.zone].attempts++;
        if (shot.made) result.zones[shot.zone].made++;
      }
    }

    return result;
  }

  function getZoneStats(shots, zoneId) {
    const arr = shots.filter((s) => s.zone === zoneId);
    const made = arr.filter((s) => s.made).length;
    const attempts = arr.length;
    const pct = attempts ? Math.round((made / attempts) * 100) : 0;
    return { made, attempts, pct };
  }

  function zoneColor(pct) {
    if (pct >= 70) {
      return { fill: "#16a34a", stroke: "#14532d" };
    }
    if (pct >= 45) {
      return { fill: "#f59e0b", stroke: "#78350f" };
    }
    return { fill: "#dc2626", stroke: "#7f1d1d" };
  }

  function createSvgEl(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const k in attrs) {
      el.setAttribute(k, attrs[k]);
    }
    return el;
  }

  function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i][0], yi = points[i][1];
      const xj = points[j][0], yj = points[j][1];

      const intersect =
        ((yi > y) !== (yj > y)) &&
        (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);

      if (intersect) inside = !inside;
    }
    return inside;
  }

  function findZoneByPoint(nx, ny) {
    const x = nx * 1000;
    const y = ny * 680;

    for (const zone of ZONES) {
      if (pointInPolygon(x, y, zone.points)) {
        return zone.id;
      }
    }

    let closest = null;
    let bestDist = Infinity;

    for (const zone of ZONES) {
      const cx = zone.labelX;
      const cy = zone.labelY;
      const dx = x - cx;
      const dy = y - cy;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        closest = zone.id;
      }
    }

    return closest;
  }

  function polygonPointsString(points) {
    return points.map(([x, y]) => `${x},${y}`).join(" ");
  }

  function renderSvg(svg, shots, interactive = false) {
    svg.innerHTML = "";

    for (const zone of ZONES) {
      const stats = getZoneStats(shots, zone.id);
      const colors = zoneColor(stats.pct);

      const poly = createSvgEl("polygon", {
        points: polygonPointsString(zone.points),
        fill: colors.fill,
        stroke: colors.stroke,
        "stroke-width": selectedZone === zone.id && interactive ? "5" : "2",
        opacity: "0.78",
        rx: "10",
        class: selectedZone === zone.id && interactive ? "selected-zone zone" : "zone"
      });

      if (interactive) {
        poly.style.cursor = "pointer";
        poly.addEventListener("click", (e) => {
          e.stopPropagation();
          selectedZone = zone.id;
          renderAll();
        });
      }

      svg.appendChild(poly);

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
    }

    if (interactive) {
      svg.addEventListener(
        "click",
        (e) => {
          const rect = svg.getBoundingClientRect();
          const nx = (e.clientX - rect.left) / rect.width;
          const ny = (e.clientY - rect.top) / rect.height;
          const zone = findZoneByPoint(nx, ny);
          if (zone !== null) {
            selectedZone = zone;
            renderAll();
          }
        },
        { once: true }
      );
    }
  }

  function renderStats() {
    const session = currentSession();
    const sessionSum = summarizeShots(session ? session.shots : []);
    sessionStats.textContent = `Session: ${sessionSum.made}/${sessionSum.attempts} (${sessionSum.attempts ? Math.round((sessionSum.made / sessionSum.attempts) * 100) : 0}%)`;

    const dayShots = currentDay().sessions.flatMap((s) => s.shots);
    const daySum = summarizeShots(dayShots);
    dayStats.textContent = `Tag: ${daySum.made}/${daySum.attempts} (${daySum.attempts ? Math.round((daySum.made / daySum.attempts) * 100) : 0}%)`;

    const allShots = getAllShots();
    const allSum = summarizeShots(allShots);
    allStats.textContent = `All Time: ${allSum.made}/${allSum.attempts} (${allSum.attempts ? Math.round((allSum.made / allSum.attempts) * 100) : 0}%)`;

    if (selectedZone !== null) {
      const zone = ZONES[selectedZone];
      const z = allSum.zones[selectedZone];
      selectedZoneInfo.innerHTML = `<b>${zone.name}</b><br>All Time: ${z.made}/${z.attempts}`;
      zoneStats.textContent = `${zone.name}: ${z.made}/${z.attempts}`;
    } else {
      selectedZoneInfo.textContent = "Keine Zone gewählt";
      zoneStats.textContent = "";
    }

    currentDateLabel.textContent = selectedDate;
    currentSessionLabel.textContent = session ? session.name : "";
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
        ensureDay(selectedDate);
        selectedSessionId = currentDay().sessions[0].id;
        selectedZone = null;
        renderAll();
      };

      dayList.appendChild(div);
    }
  }

  function renderStatus() {
    const imageOk = courtImageLoaded || courtImage.complete;
    const session = currentSession();
    const shotCount = session ? session.shots.length : 0;

    statusBox.textContent =
      `Bild geladen: ${imageOk ? "JA" : "NEIN"}\n` +
      `Interactive SVG: ${!!interactiveSvg ? "JA" : "NEIN"}\n` +
      `Session SVG: ${!!sessionSvg ? "JA" : "NEIN"}\n` +
      `All Time SVG: ${!!allSvg ? "JA" : "NEIN"}\n` +
      `Datum: ${selectedDate}\n` +
      `Session: ${session ? session.name : "keine"}\n` +
      `Aktive Zone: ${selectedZone !== null ? ZONES[selectedZone].name : "keine"}\n` +
      `Shots in Session: ${shotCount}\n` +
      `Lokale Daten-Tage: ${Object.keys(db).length}`;
  }

  function renderAll() {
    renderSessionSelect();
    renderStats();
    renderDayList();

    const sessionShots = currentSession() ? currentSession().shots : [];
    const allShots = getAllShots();

    renderSvg(interactiveSvg, sessionShots, true);
    renderSvg(sessionSvg, sessionShots, false);
    renderSvg(allSvg, allShots, false);

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
    renderAll();
  }

  hitBtn.onclick = () => addShot(true);
  missBtn.onclick = () => addShot(false);
  undoBtn.onclick = undo;

  statusBtn.onclick = () => {
    renderStatus();
  };

  sessionSelect.onchange = () => {
    selectedSessionId = sessionSelect.value;
    renderAll();
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
    renderAll();
  };

  renameSessionBtn.onclick = () => {
    const session = currentSession();
    const name = prompt("Neuer Name", session.name);
    if (!name) return;

    saveHistory();
    session.name = name;
    renderAll();
  };

  deleteSessionBtn.onclick = () => {
    if (!confirm("Session löschen?")) return;

    saveHistory();

    currentDay().sessions = currentDay().sessions.filter(
      (s) => s.id !== currentSession().id
    );

    ensureDay(selectedDate);
    if (currentDay().sessions.length === 0) {
      createSession("Session 1");
    }
    selectedSessionId = currentDay().sessions[0].id;
    selectedZone = null;
    renderAll();
  };

  deleteDayBtn.onclick = () => {
    if (!confirm("Tag löschen?")) return;

    saveHistory();

    delete db[selectedDate];

    const remaining = Object.keys(db).sort();
    selectedDate = remaining.length ? remaining[remaining.length - 1] : todayISO();
    ensureDay(selectedDate);
    if (currentDay().sessions.length === 0) {
      createSession("Session 1");
    }
    selectedSessionId = currentDay().sessions[0].id;
    selectedZone = null;
    renderAll();
  };

  prevDayBtn.onclick = () => {
    selectedDate = shiftISO(selectedDate, -1);
    ensureDay(selectedDate);
    if (currentDay().sessions.length === 0) {
      createSession("Session 1");
    }
    selectedSessionId = currentDay().sessions[0].id;
    selectedZone = null;
    renderAll();
  };

  nextDayBtn.onclick = () => {
    selectedDate = shiftISO(selectedDate, 1);
    ensureDay(selectedDate);
    if (currentDay().sessions.length === 0) {
      createSession("Session 1");
    }
    selectedSessionId = currentDay().sessions[0].id;
    selectedZone = null;
    renderAll();
  };

  dateInput.onchange = () => {
    selectedDate = dateInput.value;
    ensureDay(selectedDate);
    if (currentDay().sessions.length === 0) {
      createSession("Session 1");
    }
    selectedSessionId = currentDay().sessions[0].id;
    selectedZone = null;
    renderAll();
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

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "3pt-tracker.csv";
    a.click();

    URL.revokeObjectURL(url);
  };

  ensureDay(selectedDate);
  if (currentDay().sessions.length === 0) {
    createSession("Session 1");
  }
  selectedSessionId = currentDay().sessions[0].id;
  renderAll();
  renderStatus();
});
