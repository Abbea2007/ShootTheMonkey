/**
 * simulation.js — Motor de animación del canvas
 * ==============================================
 * Este archivo maneja:
 *   1. Leer los controles HTML (sliders)
 *   2. Pedir los datos calculados a Flask (fetch API)
 *   3. Animar la simulación frame a frame con requestAnimationFrame
 *   4. Dibujar todo en el <canvas> con la Canvas 2D API
 *
 * Conceptos clave de JavaScript que usamos:
 *   - fetch()                → hace peticiones HTTP (como un navegador)
 *   - async/await            → espera una respuesta sin bloquear la página
 *   - requestAnimationFrame  → llama a una función ~60 veces por segundo
 *   - Canvas 2D API          → dibuja formas, líneas, texto en el canvas
 */

// ─── Referencia al canvas y su contexto de dibujo ───────────────────────────
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");  // "2d" → contexto de dibujo 2D
const W = canvas.width;   // 700
const H = canvas.height;  // 420

// ─── Estado de la simulación ─────────────────────────────────────────────────
let frames = [];       // lista de frames que devuelve Flask
let frameIndex = 0;   // frame actual de la animación
let animId = null;    // ID del requestAnimationFrame (para cancelarlo)
let running = false;
let resultado = null; // objeto con angulo, tiempo_impacto, impacto

// ─── Márgenes del área de dibujo ─────────────────────────────────────────────
const PAD = { l: 55, r: 20, t: 25, b: 45 };
const plotW = W - PAD.l - PAD.r;
const plotH = H - PAD.t - PAD.b;

// ─── Leer valores actuales de los sliders ────────────────────────────────────
function getParams() {
  return {
    vel:      parseFloat(document.getElementById("vel").value),
    dist:     parseFloat(document.getElementById("dist").value),
    altura:   parseFloat(document.getElementById("altura").value),
    gravedad: parseFloat(document.getElementById("gravedad").value),
  };
}

// ─── Convertir coordenadas del mundo (metros) a pixels del canvas ─────────────
function worldToCanvas(wx, wy, maxX, maxY) {
  const cx = PAD.l + (wx / maxX) * plotW;
  const cy = H - PAD.b - (wy / maxY) * plotH;
  return [cx, cy];
}

// ─── Actualizar etiquetas de los sliders en tiempo real ───────────────────────
function actualizarLabels() {
  const p = getParams();
  document.getElementById("vel-val").textContent     = p.vel;
  document.getElementById("dist-val").textContent    = p.dist;
  document.getElementById("altura-val").textContent  = p.altura;
  document.getElementById("gravedad-val").textContent = p.gravedad.toFixed(1);
}

["vel", "dist", "altura", "gravedad"].forEach(id => {
  document.getElementById(id).addEventListener("input", () => {
    actualizarLabels();
    resetear();
    dibujarEscena(null, null, getParams());
  });
});

// ─── DIBUJAR ESCENA COMPLETA ──────────────────────────────────────────────────
/**
 * @param {number|null} frameIdx  - índice del frame actual (null = estado inicial)
 * @param {Array|null}  framesData - lista completa de frames
 * @param {Object}      params     - parámetros actuales
 */
function dibujarEscena(frameIdx, framesData, params) {
  ctx.clearRect(0, 0, W, H);

  const { dist, altura } = params;
  const maxX = Math.max(60, dist + 6);
  const maxY = Math.max(28, altura + 6);

  // ── Fondo y grilla ──────────────────────────────────────────────────────────
  ctx.fillStyle = "#0a1628";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 6; i++) {
    const gx = PAD.l + (i / 6) * plotW;
    ctx.beginPath(); ctx.moveTo(gx, PAD.t); ctx.lineTo(gx, H - PAD.b); ctx.stroke();
  }
  for (let i = 0; i <= 5; i++) {
    const gy = PAD.t + (i / 5) * plotH;
    ctx.beginPath(); ctx.moveTo(PAD.l, gy); ctx.lineTo(W - PAD.r, gy); ctx.stroke();
  }

  // ── Ejes ────────────────────────────────────────────────────────────────────
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.l, H - PAD.b); ctx.lineTo(W - PAD.r, H - PAD.b); // eje X
  ctx.moveTo(PAD.l, H - PAD.b); ctx.lineTo(PAD.l, PAD.t);          // eje Y
  ctx.stroke();

  // Etiquetas numéricas de los ejes
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  for (let i = 0; i <= 5; i++) {
    const val = Math.round((i / 5) * maxX);
    const gx = PAD.l + (i / 5) * plotW;
    ctx.fillText(val + "m", gx, H - PAD.b + 14);
  }
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const val = Math.round((i / 4) * maxY);
    const gy = H - PAD.b - (i / 4) * plotH;
    ctx.fillText(val + "m", PAD.l - 6, gy + 3);
  }

  // Etiquetas de ejes
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Distancia (m)", PAD.l + plotW / 2, H - 5);
  ctx.save();
  ctx.translate(14, PAD.t + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Altura (m)", 0, 0);
  ctx.restore();

  // ── Árbol ───────────────────────────────────────────────────────────────────
  const [tx, ty0] = worldToCanvas(dist, 0, maxX, maxY);
  const [, ty2]   = worldToCanvas(dist, altura + 3, maxX, maxY);

  // Tronco
  ctx.strokeStyle = "#5a3d1e";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(tx, H - PAD.b);
  ctx.lineTo(tx, ty2 + 10);
  ctx.stroke();

  // Follaje
  ctx.fillStyle = "#1a4a1a";
  ctx.beginPath(); ctx.ellipse(tx, ty2 - 5, 30, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1e5c1e";
  ctx.beginPath(); ctx.ellipse(tx - 14, ty2 + 4, 20, 15, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(tx + 12, ty2 + 2, 18, 15, 0.3, 0, Math.PI * 2); ctx.fill();

  // ── Línea de referencia sin gravedad (línea recta al mono) ──────────────────
  if (!running) {
    const [ox, oy] = worldToCanvas(0, 0, maxX, maxY);
    const [mx0, my0] = worldToCanvas(dist, altura, maxX, maxY);
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(mx0, my0);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Estado inicial (sin animar): mono en su posición y cañón ────────────────
  if (frameIdx === null || framesData === null) {
    // Mono estático
    dibujarMono(ctx, ...worldToCanvas(dist, altura, maxX, maxY), false);

    // Cañón
    const angle = Math.atan2(altura, dist);
    dibujarCanon(ctx, ...worldToCanvas(0, 0, maxX, maxY), angle);

    // Ángulo label
    const angDeg = (Math.atan2(altura, dist) * 180 / Math.PI).toFixed(1);
    ctx.fillStyle = "rgba(245,166,35,0.7)";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("θ = " + angDeg + "°", PAD.l + 35, H - PAD.b - 10);
    return;
  }

  // ── Animación: dibujar trayectoria hasta el frame actual ─────────────────────
  const frame = framesData[frameIdx];

  // Trail del proyectil
  if (frameIdx > 0) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(245,166,35,0.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= frameIdx && i < framesData.length; i++) {
      const f = framesData[i];
      const [cx, cy] = worldToCanvas(f.px, Math.max(f.py, -1), maxX, maxY);
      if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // Trail del mono
    ctx.beginPath();
    ctx.strokeStyle = "rgba(94,207,240,0.35)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= frameIdx && i < framesData.length; i++) {
      const f = framesData[i];
      const [cx, cy] = worldToCanvas(f.mx, Math.max(f.my, -1), maxX, maxY);
      if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Proyectil actual
  if (frame.py >= -1 && frame.px <= maxX) {
    const [px, py] = worldToCanvas(frame.px, frame.py, maxX, maxY);
    // Glow
    const grad = ctx.createRadialGradient(px, py, 0, px, py, 18);
    grad.addColorStop(0, "rgba(245,166,35,0.6)");
    grad.addColorStop(1, "rgba(245,166,35,0)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(px, py, 18, 0, Math.PI * 2); ctx.fill();
    // Bola
    ctx.fillStyle = "#f5a623";
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
  }

  // Mono en caída
  if (frame.my >= -1) {
    const [mx, my] = worldToCanvas(frame.mx, frame.my, maxX, maxY);
    dibujarMono(ctx, mx, my, true);
  }

  // ── Explosión si hubo impacto ────────────────────────────────────────────────
  if (resultado && resultado.impacto && frame.t >= resultado.impacto.t) {
    const { x, y } = resultado.impacto;
    const [ix, iy] = worldToCanvas(x, y, maxX, maxY);
    const elapsed = frame.t - resultado.impacto.t;
    const alpha = Math.max(0, 1 - elapsed * 2.5);

    ctx.globalAlpha = alpha;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 20 + elapsed * 80;
      ctx.fillStyle = i % 2 === 0 ? "#ff6b6b" : "#f5a623";
      ctx.beginPath();
      ctx.arc(ix + Math.cos(a) * r, iy + Math.sin(a) * r, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (elapsed < 1.5) {
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("¡Impacto! 🎯", ix, iy - 30 - elapsed * 30);
    }
  }
}

// ─── Dibujar el mono ──────────────────────────────────────────────────────────
function dibujarMono(ctx, x, y, cayendo) {
  // Cuerpo
  ctx.fillStyle = "#5ecff0";
  ctx.beginPath(); ctx.arc(x, y - 8, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3ab0d5";
  ctx.beginPath(); ctx.arc(x, y + 2, 6, 0, Math.PI * 2); ctx.fill();
  // Ojos
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(x - 3, y - 9, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 3, y - 9, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.arc(x - 3, y - 9, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 3, y - 9, 1, 0, Math.PI * 2); ctx.fill();
  // Cola
  ctx.strokeStyle = "#3ab0d5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 5, y + 6);
  ctx.quadraticCurveTo(x + 18, y + 14, x + 12, y + 22);
  ctx.stroke();

  if (cayendo) {
    ctx.fillStyle = "rgba(94,207,240,0.6)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("¡Cayendo!", x, y - 22);
  }
}

// ─── Dibujar el cañón ─────────────────────────────────────────────────────────
function dibujarCanon(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-angle);
  ctx.fillStyle = "#7a8090";
  ctx.beginPath();
  ctx.roundRect(-5, -5, 28, 10, 3);
  ctx.fill();
  ctx.fillStyle = "#555";
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ─── FETCH a Flask: pedir el cálculo físico ───────────────────────────────────
/**
 * fetch() hace una petición HTTP desde JavaScript.
 * - method: "POST" → enviamos datos al servidor
 * - headers: le decimos a Flask que enviamos JSON
 * - body: los parámetros convertidos a texto JSON
 *
 * async/await → esperamos la respuesta sin bloquear la UI
 */
async function pedirSimulacion(params) {
  const response = await fetch("/calcular", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(params),
  });

  // .json() convierte la respuesta a objeto JavaScript
  const data = await response.json();
  return data;
}

// ─── ANIMAR frame a frame ─────────────────────────────────────────────────────
/**
 * requestAnimationFrame(callback) → el navegador llama a callback
 * antes del siguiente repintado de pantalla (~60 veces por segundo).
 * Es más eficiente que setInterval para animaciones.
 */
function animar(params) {
  if (frameIndex >= frames.length) {
    running = false;
    document.getElementById("btn-disparar").textContent = "▶ Disparar";
    return;
  }

  dibujarEscena(frameIndex, frames, params);
  frameIndex++;

  // Velocidad de animación: saltamos frames para ir más rápido
  frameIndex++;  // 2 frames por tick ≈ 30fps simulado

  animId = requestAnimationFrame(() => animar(params));
}

// ─── Actualizar info box con los datos de Flask ───────────────────────────────
function actualizarInfoBox(data) {
  const box = document.getElementById("info-box");
  const imp = data.impacto;
  box.innerHTML = `
    <div class="dato">
      <span class="etiqueta">Ángulo de disparo</span>
      <span class="numero">${data.angulo}°</span>
    </div>
    <div class="dato">
      <span class="etiqueta">Tiempo de impacto</span>
      <span class="numero">${data.tiempo_impacto} s</span>
    </div>
    <div class="dato">
      <span class="etiqueta">¿Impacto?</span>
      <span class="numero" style="color:${imp ? '#3fb950' : '#ff6b6b'}">
        ${imp ? `✓ t=${imp.t}s` : "✗ No alcanzó"}
      </span>
    </div>
    ${imp ? `
    <div class="dato">
      <span class="etiqueta">Posición impacto</span>
      <span class="numero">(${imp.x}m, ${imp.y}m)</span>
    </div>` : ""}
  `;
}

// ─── Resetear simulación ──────────────────────────────────────────────────────
function resetear() {
  cancelAnimationFrame(animId);
  running = false;
  frames = [];
  frameIndex = 0;
  resultado = null;
  document.getElementById("btn-disparar").textContent = "▶ Disparar";
}

// ─── Botón DISPARAR ───────────────────────────────────────────────────────────
document.getElementById("btn-disparar").addEventListener("click", async () => {
  if (running) return;

  resetear();
  const params = getParams();

  // 1. Pedimos la física a Flask (esto es asíncrono — esperamos la respuesta)
  document.getElementById("btn-disparar").textContent = "⏳ Calculando...";
  resultado = await pedirSimulacion(params);

  if (resultado.error) {
    alert("Error: " + resultado.error);
    return;
  }

  // 2. Guardamos los frames y actualizamos la UI
  frames = resultado.frames;
  actualizarInfoBox(resultado);

  // 3. Arrancamos la animación
  running = true;
  document.getElementById("btn-disparar").textContent = "⏸ Simulando...";
  animar(params);
});

// ─── Botón REINICIAR ──────────────────────────────────────────────────────────
document.getElementById("btn-reset").addEventListener("click", () => {
  resetear();
  dibujarEscena(null, null, getParams());
  document.getElementById("info-box").innerHTML =
    "<p>Ajustá los parámetros y presioná <strong>Disparar</strong>.</p>";
});

// ─── Dibujo inicial ───────────────────────────────────────────────────────────
actualizarLabels();
dibujarEscena(null, null, getParams());