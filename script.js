const canvas = document.getElementById("court");
const ctx = canvas.getContext("2d");

canvas.width = 500;
canvas.height = 800;

/* ---------------- STATE ---------------- */

let mode = "hit"; // hit | miss

let shots = JSON.parse(localStorage.getItem("shots") || "[]");

/* ---------------- UI ---------------- */

document.getElementById("hit").onclick = () => mode = "hit";
document.getElementById("miss").onclick = () => mode = "miss";

document.getElementById("clear").onclick = () => {
  shots = [];
  localStorage.removeItem("shots");
  draw();
  updateStats();
};

/* ---------------- CLICK SHOTS ---------------- */

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();

  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;

  shots.push({
    x,
    y,
    made: mode === "hit"
  });

  localStorage.setItem("shots", JSON.stringify(shots));

  draw();
  updateStats();
});

/* ---------------- COURT ---------------- */

function drawCourt(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = "#1b2a44";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;

  // Außenlinien
  ctx.strokeRect(40,40,420,720);

  // Center line
  ctx.beginPath();
  ctx.moveTo(40,400);
  ctx.lineTo(460,400);
  ctx.stroke();

  // 3pt arc (simple)
  ctx.beginPath();
  ctx.arc(250, 650, 180, Math.PI, 0, true);
  ctx.stroke();

  // Paint area
  ctx.strokeRect(170,40,160,180);
}

/* ---------------- HEATMAP ---------------- */

function drawShots(){

  shots.forEach(s => {

    const x = s.x * canvas.width;
    const y = s.y * canvas.height;

    if(s.made){
      ctx.fillStyle = "rgba(34,197,94,0.55)";
    } else {
      ctx.fillStyle = "rgba(239,68,68,0.55)";
    }

    ctx.beginPath();
    ctx.arc(x,y,10,0,Math.PI*2);
    ctx.fill();
  });
}

/* ---------------- STATS ---------------- */

function updateStats(){

  const made = shots.filter(s=>s.made).length;
  const total = shots.length;

  const pct = total ? Math.round(made/total*100) : 0;

  document.getElementById("stats").innerHTML = `
    <b>Made:</b> ${made}<br>
    <b>Total:</b> ${total}<br>
    <b>FG%:</b> ${pct}%<br>
    <b>Mode:</b> ${mode.toUpperCase()}
  `;
}

/* ---------------- RENDER ---------------- */

function draw(){
  drawCourt();
  drawShots();
}

/* ---------------- INIT ---------------- */

draw();
updateStats();
