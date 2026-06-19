// Logica: recoge parametros, pide el calculo al servidor y dibuja cada frame.

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const ids = ["vel", "dist", "altura", "gravedad"];
const sliders = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
const fields = Object.fromEntries(ids.map((id) => [id, document.getElementById(`${id}-val`)]));
const shoot = document.getElementById("btn-disparar");
const reset = document.getElementById("btn-reset");
const info = document.getElementById("info-box");
const pad = { left: 55, right: 20, top: 25, bottom: 45 };
const plot = { width: 625, height: 350 };

let result = null;
let frame = 0;
let animation = null;
let running = false;

//función que lee los valores 
function params() {
  return Object.fromEntries(ids.map((id) => [id, Number(sliders[id].value)]));
}

function syncFields() {
  const values = params();
  ids.forEach((id) => {
    fields[id].value = id === "gravedad" ? values[id].toFixed(1) : values[id];
  });
}

function limits(input, value) {
  return Math.min(Math.max(value, Number(input.min)), Number(input.max));
}

function point(x, y, maxX, maxY) {
  return [
    pad.left + (x / maxX) * plot.width,
    canvas.height - pad.bottom - (y / maxY) * plot.height,
  ];
}

function line(x1, y1, x2, y2, color, width = 1, dash = []) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function circle(x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function text(value, x, y, color = "rgba(255,255,255,0.4)", font = "11px sans-serif") {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.fillText(value, x, y);
}

// Dibujo base de la simulacion: fondo, escala, ejes, arbol y linea objetivo.
function drawBase(values, maxX, maxY) {
  ctx.fillStyle = "#0a1628";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i <= 6; i++) {
    const x = pad.left + (i / 6) * plot.width;
    line(x, pad.top, x, canvas.height - pad.bottom, "rgba(255,255,255,0.04)", 0.5);
  }
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + (i / 5) * plot.height;
    line(pad.left, y, canvas.width - pad.right, y, "rgba(255,255,255,0.04)", 0.5);
  }

  line(pad.left, canvas.height - pad.bottom, canvas.width - pad.right, canvas.height - pad.bottom, "rgba(255,255,255,0.3)");
  line(pad.left, canvas.height - pad.bottom, pad.left, pad.top, "rgba(255,255,255,0.3)");

  for (let i = 0; i <= 5; i++) {
    text(`${Math.round((i / 5) * maxX)}m`, pad.left + (i / 5) * plot.width, canvas.height - pad.bottom + 14);
  }
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    text(`${Math.round((i / 4) * maxY)}m`, pad.left - 6, canvas.height - pad.bottom - (i / 4) * plot.height + 3);
  }
  text("Distancia (m)", pad.left + plot.width / 2, canvas.height - 5);

  const [treeX] = point(values.dist, 0, maxX, maxY);
  const [, crownY] = point(values.dist, values.altura + 3, maxX, maxY);
  line(treeX, canvas.height - pad.bottom, treeX, crownY + 10, "#5a3d1e", 5);
  [[treeX, crownY - 5, 30, 24], [treeX - 14, crownY + 4, 20, 15], [treeX + 12, crownY + 2, 18, 15]].forEach(([x, y, rx, ry]) => {
    ctx.fillStyle = "#1e5c1e";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  if (!running) {
    line(...point(0, 0, maxX, maxY), ...point(values.dist, values.altura, maxX, maxY), "rgba(255,255,255,0.15)", 1, [5, 7]);
  }
}

function drawMonkey(x, y, falling) {
  circle(x, y - 8, 8, "#5ecff0");
  circle(x, y + 2, 6, "#3ab0d5");
  circle(x - 3, y - 9, 2, "#fff");
  circle(x + 3, y - 9, 2, "#fff");
  circle(x - 3, y - 9, 1, "#000");
  circle(x + 3, y - 9, 1, "#000");
  line(x + 5, y + 6, x + 12, y + 22, "#3ab0d5", 2);
  if (falling) text("Cayendo", x, y - 22, "rgba(94,207,240,0.6)", "10px sans-serif");
}

function drawCannon(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-angle);
  ctx.fillStyle = "#7a8090";
  ctx.fillRect(-5, -5, 28, 10);
  circle(0, 0, 7, "#555");
  ctx.restore();
}

function drawPath(keyX, keyY, color, width, maxX, maxY) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  result.frames.slice(0, frame + 1).forEach((item, index) => {
    const [x, y] = point(item[keyX], Math.max(item[keyY], -1), maxX, maxY);
    index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.stroke();
}

// Logica visual: usa el frame actual, sin recalcular la fisica en el navegador.
function draw(values) {
  const maxX = Math.max(60, values.dist + 6);
  const maxY = Math.max(28, values.altura + 6);
  drawBase(values, maxX, maxY);

  if (!result) {
    const angle = Math.atan2(values.altura, values.dist);
    drawMonkey(...point(values.dist, values.altura, maxX, maxY), false);
    drawCannon(...point(0, 0, maxX, maxY), angle);
    text(`Angulo: ${(angle * 180 / Math.PI).toFixed(1)} grados`, pad.left + 80, canvas.height - pad.bottom - 10, "rgba(245,166,35,0.7)");
    return;
  }

  const current = result.frames[frame];
  drawPath("px", "py", "rgba(245,166,35,0.5)", 2, maxX, maxY);
  drawPath("mx", "my", "rgba(94,207,240,0.35)", 1.5, maxX, maxY);

  if (current.py >= -1) {
    const [x, y] = point(current.px, current.py, maxX, maxY);
    circle(x, y, 6, "#f5a623");
  }
  if (current.my >= -1) drawMonkey(...point(current.mx, current.my, maxX, maxY), true);
}

function stop() {
  cancelAnimationFrame(animation);
  result = null;
  frame = 0;
  running = false;
  shoot.textContent = "Disparar";
}

function showResult(data) {
  const impact = data.impacto;
  info.innerHTML = `
    <div class="dato"><span class="etiqueta">Angulo de disparo</span><span class="numero">${data.angulo} grados</span></div>
    <div class="dato"><span class="etiqueta">Tiempo de impacto</span><span class="numero">${data.tiempo_impacto} s</span></div>
    <div class="dato"><span class="etiqueta">Impacto</span><span class="numero" style="color:${impact ? "#3fb950" : "#ff6b6b"}">${impact ? `Si, t=${impact.t}s` : "No alcanzo"}</span></div>
    ${impact ? `<div class="dato"><span class="etiqueta">Posicion de impacto</span><span class="numero">(${impact.x}m, ${impact.y}m)</span></div>` : ""}`;
}

function animate(values) {
  if (frame >= result.frames.length) {
    running = false;
    shoot.textContent = "Disparar";
    return;
  }
  draw(values);
  frame += 2;
  animation = requestAnimationFrame(() => animate(values));
}

ids.forEach((id) => {
  sliders[id].addEventListener("input", () => {
    syncFields();
    stop();
    draw(params());
  });
  fields[id].addEventListener("input", () => {
    const value = Number(fields[id].value);
    if (fields[id].value === "" || Number.isNaN(value)) return;
    sliders[id].value = limits(sliders[id], value);
    syncFields();
    stop();
    draw(params());
  });
});

shoot.addEventListener("click", async () => {
  if (running) return;
  stop();
  shoot.textContent = "Calculando...";
  const values = params();
  const response = await fetch("/calcular", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
  result = await response.json();
  if (result.error) {
    alert(`Error: ${result.error}`);
    stop();
    draw(values);
    return;
  }
  showResult(result);
  running = true;
  shoot.textContent = "Simulando...";
  animate(values);
});

reset.addEventListener("click", () => {
  stop();
  info.innerHTML = "<p>Ajusta los parametros y presiona <strong>Disparar</strong>.</p>";
  draw(params());
});

syncFields();
draw(params());
