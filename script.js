const STORAGE_KEY = "arclab-shot-tracker-v1";
const MAX_UNDO = 40;

const zones = [
  {
    id: "left-corner-3",
    name: "Left Corner 3",
    type: "3PT",
    d: "M0 0 H111 V268 H0 Z",
    label: [57, 134],
  },
  {
    id: "left-wing-3",
    name: "Left Wing 3",
    type: "3PT",
    d: "M0 268 H111 C143 333 191 379 250 402 L250 507 H0 Z",
    label: [116, 397],
  },
  {
    id: "top-3",
    name: "Top 3",
    type: "3PT",
    d: "M250 402 C328 433 420 433 499 402 V507 H250 Z",
    label: [374, 456],
  },
  {
    id: "right-wing-3",
    name: "Right Wing 3",
    type: "3PT",
    d: "M635 268 H746 V507 H499 V402 C558 379 603 333 635 268 Z",
    label: [631, 397],
  },
  {
    id: "right-corner-3",
    name: "Right Corner 3",
    type: "3PT",
    d: "M635 0 H746 V268 H635 Z",
    label: [690, 134],
  },
  {
    id: "left-mid-upper",
    name: "Left Mid Upper",
    type: "Midrange",
    d: "M111 0 H249 V156 H111 Z",
    label: [180, 79],
  },
  {
    id: "left-mid-lower",
    name: "Left Mid Lower",
    type: "Midrange",
    d: "M111 156 H249 V389 C187 365 140 322 111 268 Z",
    label: [181, 258],
  },
  {
    id: "free-throw-area",
    name: "Free Throw Area",
    type: "Midrange",
    d: "M249 319 H499 V402 C420 433 328 433 249 402 Z",
    label: [374, 374],
  },
  {
    id: "right-mid-lower",
    name: "Right Mid Lower",
    type: "Midrange",
    d: "M499 156 H635 V268 C606 322 560 365 499 389 Z",
    label: [568, 258],
  },
  {
    id: "right-mid-upper",
    name: "Right Mid Upper",
    type: "Midrange",
    d: "M499 0 H635 V156 H499 Z",
    label: [568, 79],
  },
  {
    id: "paint-upper-left",
    name: "Paint Upper Left",
    type: "Paint",
    d: "M249 0 H374 V156 H249 Z",
    label: [312, 78],
  },
  {
    id: "paint-upper-right",
    name: "Paint Upper Right",
    type: "Paint",
    d: "M374 0 H499 V156 H374 Z",
    label: [437, 78],
  },
  {
    id: "paint-lower-left",
    name: "Paint Lower Left",
    type: "Paint",
    d: "M249 156 H374 V319 H249 Z",
    label: [312, 239],
  },
  {
    id: "paint-lower-right",
    name: "Paint Lower Right",
    type: "Paint",
    d: "M374 156 H499 V319 H374 Z",
    label: [437, 239],
  },
];

const els = {
  datePicker: document.getElementById("datePicker"),
  prevDayBtn: document.getElementById("prevDayBtn"),
  nextDayBtn: document.getElementById("nextDayBtn"),
  deleteDayBtn: document.getElementById("deleteDayBtn"),
  dateSummary: document.getElementById("dateSummary"),
  sessionSelect: document.getElementById("sessionSelect"),
  newSessionBtn: document.getElementById("newSessionBtn"),
  renameSessionBtn: document.getElementById("renameSessionBtn"),
  deleteSessionBtn: document.getElementById("deleteSessionBtn"),
  sessionNotes: document.getElementById("sessionNotes"),
  notesSavedBadge: document.getElementById("notesSavedBadge"),
  sessionAttemptGoal: document.getElementById("sessionAttemptGoal"),
  sessionPctGoal: document.getElementById("sessionPctGoal"),
  zoneAttemptGoal: document.getElementById("zoneAttemptGoal"),
  zonePctGoal: document.getElementById("zonePctGoal"),
  goalSummary: document.getElementById("goalSummary"),
  goalProgress: document.getElementById("goalProgress"),
  sessionStat: document.getElementById("sessionStat"),
  sessionPct: document.getElementById("sessionPct"),
  dayStat: document.getElementById("dayStat"),
  dayPct: document.getElementById("dayPct"),
  allTimeStat: document.getElementById("allTimeStat"),
  allTimePct: document.getElementById("allTimePct"),
  selectedZoneName: document.getElementById("selectedZoneName"),
  selectedZoneStat: document.getElementById("selectedZoneStat"),
  statusBtn: document.getElementById("statusBtn"),
  statusDetails: document.getElementById("statusDetails"),
  dayCountBadge: document.getElementById("dayCountBadge"),
  pastDaysList: document.getElementById("pastDaysList"),
  exportBtn: document.getElementById("exportBtn"),
  undoBtn: document.getElementById("undoBtn"),
  courtTitle: document.getElementById("courtTitle"),
  courtImage: document.getElementById("courtImage"),
  courtSvg: document.getElementById("courtSvg"),
  makeBtn: document.getElementById("makeBtn"),
  missBtn: document.getElementById("missBtn"),
  shotPopover: document.getElementById("shotPopover"),
  shotPopoverTitle: document.getElementById("shotPopoverTitle"),
  popoverMakeBtn: document.getElementById("popoverMakeBtn"),
  popoverMissBtn: document.getElementById("popoverMissBtn"),
  focusHeatmap: document.getElementById("focusHeatmap"),
  focusHeatmapMeta: document.getElementById("focusHeatmapMeta"),
  focusHeatmapSelect: document.getElementById("focusHeatmapSelect"),
  insightScope: document.getElementById("insightScope"),
  streakGrid: document.getElementById("streakGrid"),
  comparisonGrid: document.getElementById("comparisonGrid"),
  bestZonesList: document.getElementById("bestZonesList"),
  weakZonesList: document.getElementById("weakZonesList"),
  importBtn: document.getElementById("importBtn"),
  csvImportInput: document.getElementById("csvImportInput"),
  sessionChart: document.getElementById("sessionChart"),
  dailyChart: document.getElementById("dailyChart"),
  tabButtons: Array.from(document.querySelectorAll("[data-tab-target]")),
  tabPanels: Array.from(document.querySelectorAll("[data-tab-panel]")),
};

let state = loadState();
let selectedDate = state.settings.selectedDate || localDateKey();
let selectedSessionId = state.settings.selectedSessionId || null;
let selectedZoneId = null;
let selectedRange = state.settings.selectedRange || "session";
let activeTab = state.settings.activeTab || "track";
let courtImageLoaded = false;
let sessionChart;
let dailyChart;

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shiftDateKey(key, offset) {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + offset);
  return localDateKey(date);
}

function formatDateLabel(key) {
  return dateFromKey(key).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadState() {
  const fallback = { version: 1, days: {}, undo: [], settings: {} };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || typeof parsed !== "object") return fallback;
    return {
      version: 1,
      days: parsed.days || {},
      undo: Array.isArray(parsed.undo) ? parsed.undo.slice(-MAX_UNDO) : [],
      settings: parsed.settings || {},
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  state.settings.selectedDate = selectedDate;
  state.settings.selectedSessionId = selectedSessionId;
  state.settings.selectedRange = selectedRange;
  state.settings.activeTab = activeTab;
  state.settings.goals = normalizeGoals(state.settings.goals);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeGoals(goals = {}) {
  return {
    sessionAttempts: Number(goals.sessionAttempts) || 0,
    sessionPct: Number(goals.sessionPct) || 0,
    zoneAttempts: Number(goals.zoneAttempts) || 0,
    zonePct: Number(goals.zonePct) || 0,
  };
}

function snapshot(action) {
  state.undo.push({
    action,
    at: new Date().toISOString(),
    state: JSON.stringify({ days: state.days, settings: state.settings }),
  });
  state.undo = state.undo.slice(-MAX_UNDO);
}

function ensureDay(dateKey = selectedDate) {
  if (!state.days[dateKey]) {
    state.days[dateKey] = {
      date: dateKey,
      notes: "",
      sessions: {},
      sessionOrder: [],
      createdAt: Date.now(),
    };
  }
  const day = state.days[dateKey];
  if (!day.sessionOrder.length) {
    const session = createSessionObject("Main Session");
    day.sessions[session.id] = session;
    day.sessionOrder.push(session.id);
  }
  return day;
}

function createSessionObject(name) {
  return {
    id: uid("session"),
    name,
    notes: "",
    shots: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function currentDay() {
  return ensureDay(selectedDate);
}

function currentSession() {
  const day = currentDay();
  if (!selectedSessionId || !day.sessions[selectedSessionId]) {
    selectedSessionId = day.sessionOrder[0];
  }
  if (typeof day.sessions[selectedSessionId].notes !== "string") {
    day.sessions[selectedSessionId].notes = "";
  }
  return day.sessions[selectedSessionId];
}

function allShots() {
  return Object.values(state.days).flatMap((day) =>
    day.sessionOrder.flatMap((sessionId) => {
      const session = day.sessions[sessionId];
      return session ? session.shots : [];
    }),
  );
}

function dayShots(dateKey = selectedDate) {
  const day = ensureDay(dateKey);
  return day.sessionOrder.flatMap((sessionId) => day.sessions[sessionId]?.shots || []);
}

function storedDayShots(dateKey) {
  const day = state.days[dateKey];
  if (!day) return [];
  return day.sessionOrder.flatMap((sessionId) => day.sessions[sessionId]?.shots || []);
}

function shotsBetween(startKey, endKey) {
  return Object.keys(state.days)
    .filter((dateKey) => dateKey >= startKey && dateKey <= endKey)
    .flatMap((dateKey) => storedDayShots(dateKey));
}

function statsFor(shots, zoneId = null) {
  const filtered = zoneId ? shots.filter((shot) => shot.zoneId === zoneId) : shots;
  const attempts = filtered.length;
  const made = filtered.filter((shot) => shot.made).length;
  return { made, attempts, pct: attempts ? Math.round((made / attempts) * 100) : 0 };
}

function threePointShots(shots) {
  const threeIds = new Set(zones.filter((zone) => zone.type === "3PT").map((zone) => zone.id));
  return shots.filter((shot) => threeIds.has(shot.zoneId));
}

function getScopeShots(scope = selectedRange) {
  if (scope === "session") return currentSession().shots;
  if (scope === "previous-day") return storedDayShots(shiftDateKey(selectedDate, -1));
  if (scope === "last-week") return shotsBetween(shiftDateKey(selectedDate, -6), selectedDate);
  if (scope === "last-month") return shotsBetween(shiftDateKey(selectedDate, -29), selectedDate);
  if (scope === "all-time") return allShots();
  return dayShots(selectedDate);
}

function getScopeLabel(scope = selectedRange) {
  if (scope === "session") return currentSession().name;
  if (scope === "previous-day") return formatDateLabel(shiftDateKey(selectedDate, -1));
  if (scope === "last-week") {
    return `${formatDateLabel(shiftDateKey(selectedDate, -6))} - ${formatDateLabel(selectedDate)}`;
  }
  if (scope === "last-month") {
    return `${formatDateLabel(shiftDateKey(selectedDate, -29))} - ${formatDateLabel(selectedDate)}`;
  }
  if (scope === "all-time") return "All Time";
  return formatDateLabel(selectedDate);
}

function computeStreaks(shots) {
  const ordered = [...shots].sort((a, b) => a.timestamp - b.timestamp);
  let bestMake = 0;
  let bestMiss = 0;
  let runType = null;
  let runLength = 0;

  ordered.forEach((shot) => {
    const type = shot.made ? "make" : "miss";
    if (type === runType) {
      runLength += 1;
    } else {
      runType = type;
      runLength = 1;
    }
    if (type === "make") bestMake = Math.max(bestMake, runLength);
    if (type === "miss") bestMiss = Math.max(bestMiss, runLength);
  });

  const last = ordered[ordered.length - 1];
  return {
    bestMake,
    bestMiss,
    current: ordered.length ? runLength : 0,
    currentType: last ? (last.made ? "makes" : "misses") : "none",
  };
}

function rankedZones(shots) {
  return zones
    .map((zone) => ({ zone, ...statsFor(shots, zone.id) }))
    .filter((item) => item.attempts > 0)
    .sort((a, b) => b.pct - a.pct || b.attempts - a.attempts);
}

function progressPercent(value, target) {
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

function colorFor(stat) {
  if (!stat.attempts) return "rgba(215, 220, 229, 0.72)";
  if (stat.pct < 34) return "rgba(255, 92, 108, 0.76)";
  if (stat.pct < 43) return "rgba(255, 179, 71, 0.78)";
  return "rgba(41, 209, 125, 0.78)";
}

function renderCourt() {
  els.courtSvg.innerHTML = "";
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  `;
  els.courtSvg.appendChild(defs);

  zones.forEach((zone) => {
    const stat = statsFor(currentSession().shots, zone.id);
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("data-zone-id", zone.id);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", zone.d);
    path.setAttribute("fill", colorFor(stat));
    path.setAttribute("class", `zone-path${selectedZoneId === zone.id ? " selected" : ""}`);
    path.setAttribute("filter", "url(#softShadow)");
    path.addEventListener("click", () => selectZone(zone.id));
    group.appendChild(path);

    const mainText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    mainText.setAttribute("x", zone.label[0]);
    mainText.setAttribute("y", zone.label[1] - 8);
    mainText.setAttribute("class", "zone-label");
    mainText.textContent = stat.attempts ? `${stat.pct}%` : "0%";
    group.appendChild(mainText);

    const subText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    subText.setAttribute("x", zone.label[0]);
    subText.setAttribute("y", zone.label[1] + 10);
    subText.setAttribute("class", "zone-label zone-sub-label");
    subText.textContent = `${stat.made}/${stat.attempts}`;
    group.appendChild(subText);

    els.courtSvg.appendChild(group);
  });
}

function selectZone(zoneId) {
  selectedZoneId = zoneId;
  const zone = zones.find((item) => item.id === zoneId);
  els.courtTitle.textContent = zone.name;
  els.makeBtn.disabled = false;
  els.missBtn.disabled = false;
  renderAll();
  renderShotPopover();
}

function recordShot(made) {
  if (!selectedZoneId) return;
  snapshot(made ? "Made shot" : "Missed shot");
  const shot = {
    id: uid("shot"),
    date: selectedDate,
    sessionId: selectedSessionId,
    zoneId: selectedZoneId,
    made,
    timestamp: Date.now(),
  };
  const session = currentSession();
  session.shots.push(shot);
  session.updatedAt = Date.now();
  els.shotPopover.classList.add("hidden");
  saveState();
  renderAll();
}

function renderShotPopover() {
  if (!selectedZoneId) {
    els.shotPopover.classList.add("hidden");
    return;
  }
  const zone = zones.find((item) => item.id === selectedZoneId);
  const [x, y] = zone.label;
  els.shotPopoverTitle.textContent = zone.name;
  els.shotPopover.style.left = `${(x / 746) * 100}%`;
  els.shotPopover.style.top = `${Math.max(18, (y / 507) * 100)}%`;
  els.shotPopover.classList.remove("hidden");
}

function renderSessions() {
  const day = currentDay();
  els.sessionSelect.innerHTML = "";
  day.sessionOrder.forEach((sessionId) => {
    const session = day.sessions[sessionId];
    if (!session) return;
    const option = document.createElement("option");
    option.value = session.id;
    option.textContent = `${session.name} (${session.shots.length})`;
    els.sessionSelect.appendChild(option);
  });
  els.sessionSelect.value = currentSession().id;
}

function renderSessionNotes() {
  const session = currentSession();
  if (document.activeElement !== els.sessionNotes) {
    els.sessionNotes.value = session.notes || "";
  }
  els.notesSavedBadge.textContent = "Saved";
  els.notesSavedBadge.classList.remove("dirty");
}

function renderGoals() {
  const goals = normalizeGoals(state.settings.goals);
  if (document.activeElement !== els.sessionAttemptGoal) {
    els.sessionAttemptGoal.value = goals.sessionAttempts || "";
  }
  if (document.activeElement !== els.sessionPctGoal) {
    els.sessionPctGoal.value = goals.sessionPct || "";
  }
  if (document.activeElement !== els.zoneAttemptGoal) {
    els.zoneAttemptGoal.value = goals.zoneAttempts || "";
  }
  if (document.activeElement !== els.zonePctGoal) {
    els.zonePctGoal.value = goals.zonePct || "";
  }

  const sessionStats = statsFor(currentSession().shots);
  const zoneStats = selectedZoneId ? statsFor(currentSession().shots, selectedZoneId) : null;
  const rows = [
    ["Session attempts", sessionStats.attempts, goals.sessionAttempts, ""],
    ["Session FG%", sessionStats.pct, goals.sessionPct, "%"],
  ];

  if (selectedZoneId && zoneStats) {
    const zoneName = zones.find((zone) => zone.id === selectedZoneId)?.name || "Zone";
    rows.push([`${zoneName} attempts`, zoneStats.attempts, goals.zoneAttempts, ""]);
    rows.push([`${zoneName} FG%`, zoneStats.pct, goals.zonePct, "%"]);
  }

  const activeRows = rows.filter(([, , target]) => target > 0);
  const averageProgress = activeRows.length
    ? Math.round(activeRows.reduce((sum, [, value, target]) => sum + progressPercent(value, target), 0) / activeRows.length)
    : 0;
  els.goalSummary.textContent = `${averageProgress}%`;
  els.goalProgress.innerHTML = activeRows.length
    ? activeRows
        .map(([label, value, target, unit]) => {
          const pct = progressPercent(value, target);
          return `<div class="goal-row"><span><b>${label}</b><em>${value}${unit} / ${target}${unit}</em></span><div class="goal-track"><div class="goal-fill" style="width:${pct}%"></div></div></div>`;
        })
        .join("")
    : `<div class="goal-row"><span><b>No goals set</b><em>Set a target above</em></span><div class="goal-track"><div class="goal-fill" style="width:0%"></div></div></div>`;
}

function renderStats() {
  const sessionStats = statsFor(currentSession().shots);
  const todayStats = statsFor(dayShots());
  const lifetimeStats = statsFor(allShots());
  const zone = zones.find((item) => item.id === selectedZoneId);
  const selectedStats = selectedZoneId ? statsFor(allShots(), selectedZoneId) : null;

  els.sessionStat.textContent = `${sessionStats.made}/${sessionStats.attempts}`;
  els.sessionPct.textContent = `${sessionStats.pct}% FG`;
  els.dayStat.textContent = `${todayStats.made}/${todayStats.attempts}`;
  els.dayPct.textContent = `${todayStats.pct}% FG`;
  els.allTimeStat.textContent = `${lifetimeStats.made}/${lifetimeStats.attempts}`;
  els.allTimePct.textContent = `${lifetimeStats.pct}% FG`;
  els.selectedZoneName.textContent = zone ? zone.name : "None";
  els.selectedZoneStat.textContent = selectedStats
    ? `${selectedStats.made}/${selectedStats.attempts} • ${selectedStats.pct}% all time`
    : "Pick a zone";
}

function renderDate() {
  const shots = dayShots();
  const sessions = currentDay().sessionOrder.length;
  els.datePicker.value = selectedDate;
  els.dateSummary.textContent = `${formatDateLabel(selectedDate)} • ${sessions} session${sessions === 1 ? "" : "s"} • ${shots.length} shot${shots.length === 1 ? "" : "s"}`;
}

function renderPastDays() {
  const dayKeys = Object.keys(state.days).sort((a, b) => b.localeCompare(a));
  els.dayCountBadge.textContent = String(dayKeys.length);
  els.pastDaysList.innerHTML = "";

  dayKeys.forEach((dateKey) => {
    const shots = dayShots(dateKey);
    const stat = statsFor(shots);
    const item = document.createElement("button");
    item.type = "button";
    item.className = `day-pill${dateKey === selectedDate ? " active" : ""}`;
    item.innerHTML = `<span>${formatDateLabel(dateKey)}<small>${stat.made}/${stat.attempts} • ${stat.pct}%</small></span><strong>${state.days[dateKey].sessionOrder.length}</strong>`;
    item.addEventListener("click", () => {
      selectedDate = dateKey;
      selectedSessionId = state.days[dateKey].sessionOrder[0];
      selectedZoneId = null;
      saveState();
      renderAll();
    });
    els.pastDaysList.appendChild(item);
  });
}

function renderHeatmap(container, shots) {
  container.innerHTML = "";
  const image = document.createElement("img");
  image.src = els.courtImage.currentSrc || els.courtImage.src || "court.png";
  image.alt = "";
  container.appendChild(image);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 746 507");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("aria-label", "Mini shot heatmap");
  container.appendChild(svg);

  zones.forEach((zone) => {
    const stat = statsFor(shots, zone.id);
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("data-zone-id", zone.id);
    group.setAttribute("aria-label", `${zone.name}: ${stat.made} made of ${stat.attempts}`);

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${zone.name}: ${stat.made}/${stat.attempts} • ${stat.pct}%`;
    group.appendChild(title);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", zone.d);
    path.setAttribute("fill", colorFor(stat));
    path.setAttribute("class", `mini-zone-path${selectedZoneId === zone.id ? " selected" : ""}`);
    path.addEventListener("click", () => selectZone(zone.id));
    group.appendChild(path);

    const pctText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    pctText.setAttribute("x", zone.label[0]);
    pctText.setAttribute("y", zone.label[1] - 7);
    pctText.setAttribute("class", "mini-zone-label");
    pctText.textContent = stat.attempts ? `${stat.pct}%` : "0%";
    group.appendChild(pctText);

    const volumeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    volumeText.setAttribute("x", zone.label[0]);
    volumeText.setAttribute("y", zone.label[1] + 10);
    volumeText.setAttribute("class", "mini-zone-label mini-zone-sub-label");
    volumeText.textContent = `${stat.made}/${stat.attempts}`;
    group.appendChild(volumeText);

    svg.appendChild(group);
  });
}

function renderHeatmaps() {
  const focusShots = getScopeShots();
  els.focusHeatmapSelect.value = selectedRange;
  els.focusHeatmapMeta.textContent = `${getScopeLabel()} • ${focusShots.length} shot${focusShots.length === 1 ? "" : "s"}`;
  renderHeatmap(els.focusHeatmap, focusShots);
}

function renderInsights() {
  const focusShots = getScopeShots();
  const selectedZoneShots = selectedZoneId ? focusShots.filter((shot) => shot.zoneId === selectedZoneId) : [];
  const streaks = [
    ["Scope make streak", computeStreaks(focusShots), "All selected shots"],
    ["3PT make streak", computeStreaks(threePointShots(focusShots)), "Only three-point zones"],
    [
      "Zone make streak",
      computeStreaks(selectedZoneShots),
      selectedZoneId ? zones.find((zone) => zone.id === selectedZoneId).name : "Pick a zone",
    ],
  ];

  els.insightScope.textContent = getScopeLabel();
  els.streakGrid.innerHTML = streaks
    .map(
      ([label, streak, note]) =>
        `<article class="metric-tile"><span>${label}</span><strong>${streak.bestMake}</strong><small>Current: ${streak.current} ${streak.currentType} • ${note}</small></article>`,
    )
    .join("");

  const today = statsFor(storedDayShots(selectedDate));
  const previous = statsFor(storedDayShots(shiftDateKey(selectedDate, -1)));
  const week = statsFor(shotsBetween(shiftDateKey(selectedDate, -6), selectedDate));
  const previousWeek = statsFor(shotsBetween(shiftDateKey(selectedDate, -13), shiftDateKey(selectedDate, -7)));
  els.comparisonGrid.innerHTML = [
    ["Today vs prev", today.pct - previous.pct, `${today.pct}% / ${previous.pct}%`],
    ["Week vs prev", week.pct - previousWeek.pct, `${week.pct}% / ${previousWeek.pct}%`],
  ]
    .map(([label, diff, detail]) => {
      const sign = diff > 0 ? "+" : "";
      return `<article class="metric-tile"><span>${label}</span><strong>${sign}${diff} pts</strong><small>${detail}</small></article>`;
    })
    .join("");

  const ranked = rankedZones(focusShots);
  const best = ranked.slice(0, 3);
  const weak = [...ranked].sort((a, b) => a.pct - b.pct || b.attempts - a.attempts).slice(0, 3);
  els.bestZonesList.innerHTML = renderZoneRankRows(best, "No makes yet");
  els.weakZonesList.innerHTML = renderZoneRankRows(weak, "No focus zones yet");
}

function renderZoneRankRows(items, emptyText) {
  if (!items.length) {
    return `<div class="zone-rank-row"><span>${emptyText}<small>Record shots to populate this.</small></span><strong>0%</strong></div>`;
  }
  return items
    .map(
      (item) =>
        `<button type="button" class="zone-rank-row" data-zone-rank="${item.zone.id}"><span>${item.zone.name}<small>${item.made}/${item.attempts}</small></span><strong>${item.pct}%</strong></button>`,
    )
    .join("");
}

function chartDefaults() {
  Chart.defaults.color = "#9ca7b6";
  Chart.defaults.borderColor = "rgba(255,255,255,0.1)";
  Chart.defaults.font.family =
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
}

function renderCharts() {
  const shots = currentSession().shots;
  const labels = shots.map((_, index) => String(index + 1));
  let makes = 0;
  const progression = shots.map((shot, index) => {
    if (shot.made) makes += 1;
    return Math.round((makes / (index + 1)) * 100);
  });
  const dayKeys = Object.keys(state.days).sort();
  const dayLabels = dayKeys.map((key) => key.slice(5));
  const dayPercents = dayKeys.map((key) => statsFor(dayShots(key)).pct);

  if (!window.Chart) {
    drawLineChart(els.sessionChart, labels, progression, "FG%");
    drawBarChart(els.dailyChart, dayLabels, dayPercents, dayKeys);
    return;
  }

  chartDefaults();

  if (sessionChart) sessionChart.destroy();
  sessionChart = new Chart(els.sessionChart, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "FG%",
          data: progression,
          borderColor: "#f7c948",
          backgroundColor: "rgba(247, 201, 72, 0.14)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (value) => `${value}%` } } },
      plugins: { legend: { display: false } },
    },
  });

  if (dailyChart) dailyChart.destroy();
  dailyChart = new Chart(els.dailyChart, {
    type: "bar",
    data: {
      labels: dayLabels,
      datasets: [
        {
          label: "Daily FG%",
          data: dayPercents,
          backgroundColor: dayKeys.map((key) =>
            key === selectedDate ? "rgba(247, 201, 72, 0.9)" : "rgba(41, 209, 125, 0.65)",
          ),
          borderRadius: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (value) => `${value}%` } } },
      plugins: { legend: { display: false } },
    },
  });
}

function prepareCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function drawChartFrame(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#9ca7b6";
  for (let i = 0; i <= 4; i += 1) {
    const y = 20 + ((height - 48) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(38, y);
    ctx.lineTo(width - 14, y);
    ctx.stroke();
    ctx.fillText(`${100 - i * 25}%`, 4, y + 4);
  }
}

function drawLineChart(canvas, labels, values) {
  const { ctx, width, height } = prepareCanvas(canvas);
  drawChartFrame(ctx, width, height);
  if (!values.length) {
    ctx.fillStyle = "#9ca7b6";
    ctx.fillText("No shots yet", 42, height / 2);
    return;
  }
  const left = 42;
  const right = width - 18;
  const top = 20;
  const bottom = height - 28;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? left : left + ((right - left) * index) / (values.length - 1);
    const y = bottom - ((bottom - top) * value) / 100;
    return [x, y];
  });

  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#f7c948";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.lineTo(points[points.length - 1][0], bottom);
  ctx.lineTo(points[0][0], bottom);
  ctx.closePath();
  ctx.fillStyle = "rgba(247, 201, 72, 0.14)";
  ctx.fill();

  ctx.fillStyle = "#f7c948";
  points.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#9ca7b6";
  ctx.fillText(`Shots: ${labels.length}`, left, height - 7);
}

function drawBarChart(canvas, labels, values, dayKeys) {
  const { ctx, width, height } = prepareCanvas(canvas);
  drawChartFrame(ctx, width, height);
  if (!values.length) {
    ctx.fillStyle = "#9ca7b6";
    ctx.fillText("No days yet", 42, height / 2);
    return;
  }
  const left = 42;
  const right = width - 18;
  const top = 20;
  const bottom = height - 28;
  const gap = 8;
  const barWidth = Math.max(8, (right - left - gap * (values.length - 1)) / values.length);

  values.forEach((value, index) => {
    const x = left + index * (barWidth + gap);
    const barHeight = ((bottom - top) * value) / 100;
    ctx.fillStyle = dayKeys[index] === selectedDate ? "#f7c948" : "rgba(41, 209, 125, 0.75)";
    roundedRect(ctx, x, bottom - barHeight, barWidth, barHeight, 7);
    ctx.fill();
    if (barWidth > 24) {
      ctx.fillStyle = "#9ca7b6";
      ctx.fillText(labels[index], x, height - 7);
    }
  });
}

function roundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function renderStatus() {
  const totalShots = allShots().length;
  const storageSize = new Blob([localStorage.getItem(STORAGE_KEY) || ""]).size;
  const rows = [
    ["court.png loaded", courtImageLoaded],
    ["SVG loaded", Boolean(els.courtSvg)],
    ["14 zones exist", zones.length === 14 && els.courtSvg.querySelectorAll(".zone-path").length === 14],
    ["selected zone", selectedZoneId ? zones.find((zone) => zone.id === selectedZoneId).name : "None"],
    ["total stored shots", totalShots],
    ["total days", Object.keys(state.days).length],
    ["localStorage size", `${(storageSize / 1024).toFixed(1)} KB`],
    ["current session", currentSession().name],
    ["current date", selectedDate],
  ];

  els.statusDetails.innerHTML = rows
    .map(([label, value]) => {
      const ok = typeof value === "boolean" ? value : value !== "None" && value !== 0;
      const text = typeof value === "boolean" ? (value ? "Yes" : "No") : value;
      return `<div class="status-row"><span><i class="status-dot ${ok ? "good" : ""}"></i> ${label}</span><strong>${text}</strong></div>`;
    })
    .join("");
}

function setActiveTab(tabName) {
  activeTab = tabName;
  els.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tabTarget === tabName);
  });
  els.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tabPanel === tabName);
  });
  saveState();
  if (tabName === "analyze") {
    renderHeatmaps();
    renderInsights();
    renderCharts();
  }
}

function renderAll() {
  currentDay();
  currentSession();
  setActiveTab(activeTab);
  renderSessions();
  renderSessionNotes();
  renderDate();
  renderCourt();
  renderStats();
  renderGoals();
  renderHeatmaps();
  renderInsights();
  renderPastDays();
  if (activeTab === "analyze") renderCharts();
  renderStatus();
  renderShotPopover();
  els.undoBtn.disabled = state.undo.length === 0;
  saveState();
}

function changeDate(offset) {
  saveSessionNotes();
  const date = dateFromKey(selectedDate);
  date.setDate(date.getDate() + offset);
  selectedDate = localDateKey(date);
  selectedSessionId = null;
  selectedZoneId = null;
  renderAll();
}

function createSession() {
  const name = prompt("Session name", `Session ${currentDay().sessionOrder.length + 1}`);
  if (!name || !name.trim()) return;
  snapshot("Create session");
  const session = createSessionObject(name.trim());
  const day = currentDay();
  day.sessions[session.id] = session;
  day.sessionOrder.push(session.id);
  selectedSessionId = session.id;
  saveState();
  renderAll();
}

function renameSession() {
  const session = currentSession();
  const name = prompt("Rename session", session.name);
  if (!name || !name.trim() || name.trim() === session.name) return;
  snapshot("Rename session");
  session.name = name.trim();
  session.updatedAt = Date.now();
  saveState();
  renderAll();
}

function deleteSession() {
  const day = currentDay();
  if (day.sessionOrder.length <= 1) {
    alert("A day must keep at least one session.");
    return;
  }
  const session = currentSession();
  if (!confirm(`Delete "${session.name}" and ${session.shots.length} shots?`)) return;
  snapshot("Delete session");
  delete day.sessions[session.id];
  day.sessionOrder = day.sessionOrder.filter((id) => id !== session.id);
  selectedSessionId = day.sessionOrder[0];
  selectedZoneId = null;
  saveState();
  renderAll();
}

function deleteDay() {
  const day = currentDay();
  const shots = dayShots().length;
  if (!confirm(`Delete ${formatDateLabel(selectedDate)} and ${shots} shots?`)) return;
  snapshot("Delete day");
  delete state.days[selectedDate];
  const remaining = Object.keys(state.days).sort();
  selectedDate = remaining[remaining.length - 1] || localDateKey();
  selectedSessionId = null;
  selectedZoneId = null;
  saveState();
  renderAll();
}

function undoLast() {
  const entry = state.undo.pop();
  if (!entry) return;
  const restored = JSON.parse(entry.state);
  state.days = restored.days || {};
  state.settings = restored.settings || {};
  selectedDate = state.settings.selectedDate || localDateKey();
  selectedSessionId = state.settings.selectedSessionId || null;
  selectedRange = state.settings.selectedRange || "session";
  activeTab = state.settings.activeTab || "track";
  selectedZoneId = null;
  saveState();
  renderAll();
}

function exportCsv() {
  const header = ["date", "session", "zone", "zone_type", "made", "timestamp"];
  const rows = allShots().map((shot) => {
    const day = state.days[shot.date];
    const session = day?.sessions?.[shot.sessionId];
    const zone = zones.find((item) => item.id === shot.zoneId);
    return [
      shot.date,
      session?.name || "",
      zone?.name || shot.zoneId,
      zone?.type || "",
      shot.made ? "make" : "miss",
      new Date(shot.timestamp).toLocaleString(),
    ];
  });
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `arclab-shots-${localDateKey()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function saveSessionNotes() {
  const session = currentSession();
  const nextNotes = els.sessionNotes.value;
  if ((session.notes || "") === nextNotes) {
    els.notesSavedBadge.textContent = "Saved";
    els.notesSavedBadge.classList.remove("dirty");
    return;
  }
  snapshot("Edit session notes");
  session.notes = nextNotes;
  session.updatedAt = Date.now();
  els.notesSavedBadge.textContent = "Saved";
  els.notesSavedBadge.classList.remove("dirty");
  saveState();
}

function saveGoalsFromInputs() {
  state.settings.goals = normalizeGoals({
    sessionAttempts: els.sessionAttemptGoal.value,
    sessionPct: els.sessionPctGoal.value,
    zoneAttempts: els.zoneAttemptGoal.value,
    zonePct: els.zonePctGoal.value,
  });
  saveState();
  renderGoals();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function importCsvFile(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const rows = parseCsv(String(reader.result || ""));
    if (rows.length < 2) {
      alert("No shots found in this CSV.");
      return;
    }

    const headers = rows[0].map((header) => header.trim().toLowerCase());
    const indexOf = (name) => headers.indexOf(name);
    const dateIndex = indexOf("date");
    const sessionIndex = indexOf("session");
    const zoneIndex = indexOf("zone");
    const madeIndex = indexOf("made");
    const timestampIndex = indexOf("timestamp");

    if (dateIndex < 0 || zoneIndex < 0 || madeIndex < 0) {
      alert("CSV must include date, zone, and made columns.");
      return;
    }

    snapshot("Import CSV");
    let imported = 0;
    rows.slice(1).forEach((row) => {
      const date = row[dateIndex]?.trim();
      const zoneValue = row[zoneIndex]?.trim();
      const madeValue = row[madeIndex]?.trim().toLowerCase();
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !zoneValue) return;

      const zone = zones.find((item) => item.id === zoneValue || item.name.toLowerCase() === zoneValue.toLowerCase());
      if (!zone) return;

      const day = ensureDay(date);
      const sessionName = row[sessionIndex]?.trim() || "Imported Session";
      let sessionId = day.sessionOrder.find((id) => day.sessions[id]?.name === sessionName);
      if (!sessionId) {
        const session = createSessionObject(sessionName);
        day.sessions[session.id] = session;
        day.sessionOrder.push(session.id);
        sessionId = session.id;
      }

      const timestampRaw = row[timestampIndex]?.trim();
      const parsedTime = timestampRaw ? Date.parse(timestampRaw) : NaN;
      day.sessions[sessionId].shots.push({
        id: uid("shot"),
        date,
        sessionId,
        zoneId: zone.id,
        made: madeValue === "make" || madeValue === "made" || madeValue === "true" || madeValue === "1",
        timestamp: Number.isNaN(parsedTime) ? Date.now() : parsedTime,
      });
      day.sessions[sessionId].updatedAt = Date.now();
      imported += 1;
    });

    if (!imported) {
      undoLast();
      alert("No valid shots could be imported.");
      return;
    }
    saveState();
    renderAll();
    alert(`Imported ${imported} shots.`);
  });
  reader.readAsText(file);
}

function bindEvents() {
  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tabTarget));
  });
  els.prevDayBtn.addEventListener("click", () => changeDate(-1));
  els.nextDayBtn.addEventListener("click", () => changeDate(1));
  els.datePicker.addEventListener("change", (event) => {
    saveSessionNotes();
    selectedDate = event.target.value || localDateKey();
    selectedSessionId = null;
    selectedZoneId = null;
    renderAll();
  });
  els.deleteDayBtn.addEventListener("click", deleteDay);
  els.newSessionBtn.addEventListener("click", createSession);
  els.renameSessionBtn.addEventListener("click", renameSession);
  els.deleteSessionBtn.addEventListener("click", deleteSession);
  els.sessionNotes.addEventListener("input", () => {
    els.notesSavedBadge.textContent = "Unsaved";
    els.notesSavedBadge.classList.add("dirty");
  });
  els.sessionNotes.addEventListener("blur", saveSessionNotes);
  [els.sessionAttemptGoal, els.sessionPctGoal, els.zoneAttemptGoal, els.zonePctGoal].forEach((input) => {
    input.addEventListener("change", saveGoalsFromInputs);
  });
  els.sessionSelect.addEventListener("change", (event) => {
    saveSessionNotes();
    selectedSessionId = event.target.value;
    selectedZoneId = null;
    renderAll();
  });
  els.makeBtn.addEventListener("click", () => recordShot(true));
  els.missBtn.addEventListener("click", () => recordShot(false));
  els.popoverMakeBtn.addEventListener("click", () => recordShot(true));
  els.popoverMissBtn.addEventListener("click", () => recordShot(false));
  els.focusHeatmapSelect.addEventListener("change", (event) => {
    selectedRange = event.target.value;
    saveState();
    renderHeatmaps();
    renderInsights();
  });
  els.undoBtn.addEventListener("click", undoLast);
  els.exportBtn.addEventListener("click", exportCsv);
  els.importBtn.addEventListener("click", () => els.csvImportInput.click());
  els.csvImportInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) importCsvFile(file);
    event.target.value = "";
  });
  document.addEventListener("click", (event) => {
    const row = event.target.closest("[data-zone-rank]");
    if (row) selectZone(row.dataset.zoneRank);
  });
  els.statusBtn.addEventListener("click", () => {
    els.statusDetails.classList.toggle("collapsed");
    renderStatus();
  });
  els.courtImage.addEventListener("load", () => {
    courtImageLoaded = true;
    renderHeatmaps();
    renderStatus();
  });
  els.courtImage.addEventListener("error", () => {
    const fallbacks = ["/Wurf/court.png", "/Users/elija/Wurf/court.png"];
    const fallbackIndex = Number(els.courtImage.dataset.fallbackIndex || "0");
    if (fallbackIndex < fallbacks.length) {
      els.courtImage.dataset.fallbackIndex = String(fallbackIndex + 1);
      els.courtImage.src = fallbacks[fallbackIndex];
      return;
    }
    courtImageLoaded = false;
    renderStatus();
  });
}

bindEvents();
renderAll();
