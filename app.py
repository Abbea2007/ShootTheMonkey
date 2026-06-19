"""
Servidor Flask para la simulacion "Shoot the Monkey".

La interfaz vive en templates/index.html y el navegador pide los calculos
fisicos a POST /calcular. La respuesta conserva el mismo formato que usa
static/simulation.js.
"""

import math

from flask import Flask, jsonify, render_template, request


app = Flask(__name__)


DT = 0.016
IMPACT_RADIUS = 1.5


@app.route("/")
def index():
    return render_template("index.html")


def read_params(data):
    return {
        "vel": float(data["vel"]),
        "dist": float(data["dist"]),
        "altura": float(data["altura"]),
        "gravedad": float(data["gravedad"]),
    }


def point(px, py, mx, my, t):
    return {
        "t": round(t, 4),
        "px": round(px, 4),
        "py": round(py, 4),
        "mx": round(mx, 4),
        "my": round(my, 4),
    }


def calculate_trajectory(vel, dist, altura, gravedad):
    angle = math.atan2(altura, dist)
    vx = vel * math.cos(angle) #componente horizontal de la velocidad
    vy = vel * math.sin(angle) # componente vertical de la velocidad

    if abs(vx) < 1e-9:
        raise ValueError("Velocidad horizontal cero")

    impact_time = dist / vx
    frames = []
    impact = None
    t = 0.0

    #calculos de cad instante 
    while t <= impact_time:
        px = vx * t
        py = vy * t - 0.5 * gravedad * t * t
        mx = dist
        my = altura - 0.5 * gravedad * t * t

        frames.append(point(px, py, mx, my, t))

        #calcula distancia real entre proctil y el mono 
        if impact is None and math.hypot(px - mx, py - my) < IMPACT_RADIUS:
            impact = {"t": round(t, 3), "x": round(px, 2), "y": round(py, 2)}

        if py < -2 and my < -2:
            break

        t += DT

    return {
        "angulo": round(math.degrees(angle), 2),
        "tiempo_impacto": round(impact_time, 3),
        "frames": frames,
        "impacto": impact,
    }


@app.route("/calcular", methods=["POST"])
def calcular():
    try:
        params = read_params(request.get_json(silent=True) or {})
        return jsonify(calculate_trajectory(**params))
    except (KeyError, TypeError, ValueError) as error:
        return jsonify({"error": str(error)}), 400


if __name__ == "__main__":
    app.run(debug=True)
