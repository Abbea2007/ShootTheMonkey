"""
app.py — Servidor Flask para "Shoot the Monkey"
================================================
Flask es un micro-framework web para Python.
Con él creamos rutas (URLs) que el navegador puede pedir.

Rutas que definimos:
  GET  /           → devuelve la página HTML principal
  POST /calcular   → recibe parámetros, calcula la física y devuelve JSON
"""

from flask import Flask, render_template, request, jsonify
import math

# Flask(__name__) crea la aplicación.
# __name__ le dice a Flask dónde buscar la carpeta templates/ y static/
app = Flask(__name__)


# ─── RUTA PRINCIPAL ────────────────────────────────────────────────────────────
@app.route("/")
def index():
    """
    Cuando el navegador entra a http://localhost:5000/
    Flask busca templates/index.html y lo devuelve.
    """
    return render_template("index.html")


# ─── RUTA DE CÁLCULO FÍSICO ────────────────────────────────────────────────────
@app.route("/calcular", methods=["POST"])
def calcular():
    """
    El navegador (JavaScript) envía los parámetros del disparo en formato JSON.
    Python calcula toda la trayectoria frame por frame y devuelve la lista de puntos.

    Parámetros recibidos (JSON):
        vel       → velocidad inicial en m/s
        dist      → distancia horizontal al mono en m
        altura    → altura del mono en m
        gravedad  → aceleración gravitacional en m/s²

    Respuesta (JSON):
        angulo          → ángulo de disparo en grados
        tiempo_impacto  → tiempo teórico de encuentro en segundos
        frames          → lista de {t, px, py, mx, my} por cada paso de tiempo
        impacto         → {t, x, y} del punto de encuentro o null si falla
    """

    # request.get_json() lee el cuerpo de la petición POST como diccionario
    datos = request.get_json()

    vel     = float(datos["vel"])      # velocidad inicial (m/s)
    dist    = float(datos["dist"])     # distancia al mono (m)
    altura  = float(datos["altura"])   # altura del mono (m)
    g       = float(datos["gravedad"]) # gravedad (m/s²)

    # ── Física ──────────────────────────────────────────────────────────────────
    # El ángulo de disparo apunta directo al mono
    angulo_rad = math.atan2(altura, dist)
    angulo_deg = math.degrees(angulo_rad)

    # Componentes de la velocidad inicial
    vx = vel * math.cos(angulo_rad)   # velocidad horizontal (constante)
    vy = vel * math.sin(angulo_rad)   # velocidad vertical inicial

    # Tiempo teórico de impacto: cuando el proyectil recorre la distancia horizontal
    if vx == 0:
        return jsonify({"error": "Velocidad horizontal cero"})

    tiempo_impacto = dist / vx

    # ── Generar frames ──────────────────────────────────────────────────────────
    # Simulamos con pasos de tiempo pequeños (dt = 0.016 s ≈ 60 fps)
    dt = 0.016
    frames = []
    impacto = None

    t = 0.0
    while t <= tiempo_impacto + 0.5:
        # Posición del proyectil (movimiento parabólico)
        px = vx * t
        py = vy * t - 0.5 * g * t * t

        # Posición del mono (caída libre desde su altura inicial)
        mx = dist
        my = altura - 0.5 * g * t * t

        frames.append({
            "t":  round(t, 4),
            "px": round(px, 4),
            "py": round(py, 4),
            "mx": round(mx, 4),
            "my": round(my, 4),
        })

        # Detectar impacto: distancia entre proyectil y mono < umbral
        dx = px - mx
        dy = py - my
        if math.sqrt(dx*dx + dy*dy) < 1.5 and impacto is None:
            impacto = {"t": round(t, 3), "x": round(px, 2), "y": round(py, 2)}

        # Detener si ambos cayeron al suelo o el proyectil pasó de largo
        if py < -2 and my < -2:
            break
        if px > dist + 5:
            break

        t += dt

    # jsonify() convierte el diccionario Python a formato JSON para el navegador
    return jsonify({
        "angulo":         round(angulo_deg, 2),
        "tiempo_impacto": round(tiempo_impacto, 3),
        "frames":         frames,
        "impacto":        impacto,
    })


# ─── PUNTO DE ENTRADA ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    # debug=True → recarga automática al guardar cambios
    # Abrí http://localhost:5000 en el navegador
    app.run(debug=True)
