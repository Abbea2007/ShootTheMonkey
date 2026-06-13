# Shoot the Monkey

Simulador web educativo del experimento clasico **"Shoot the Monkey"**, usado para visualizar movimiento parabolico y caida libre.

La aplicacion permite ajustar la velocidad inicial, la distancia horizontal al mono, la altura inicial y la gravedad. Al disparar, Flask calcula la trayectoria del proyectil y la caida del mono, y JavaScript anima el resultado en un canvas.

## Objetivo fisico

El experimento muestra que si el proyectil se dispara apuntando directamente al mono en el instante en que el mono empieza a caer, ambos se encuentran aunque exista gravedad.

Esto ocurre porque la gravedad afecta por igual al proyectil y al mono.

## Tecnologias

- Python
- Flask
- HTML5
- CSS3
- JavaScript
- Canvas 2D API

## Estructura del proyecto

```text
ShootTheMonkey/
+-- app.py
+-- static/
|   +-- simulation.js
|   +-- style.css
+-- templates/
    +-- index.html
```

## Requisitos

- Python 3.10 o superior
- Flask

## Instalacion

Desde la carpeta del proyecto, instala Flask:

```bash
pip install flask
```

Opcionalmente puedes crear un entorno virtual antes de instalar dependencias:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install flask
```

## Ejecucion

Inicia el servidor Flask:

```bash
python app.py
```

Luego abre en el navegador:

```text
http://localhost:5000
```

## Uso

1. Ajusta los parametros de la simulacion:
   - Velocidad inicial
   - Distancia al mono
   - Altura del mono
   - Gravedad
2. Presiona **Disparar**.
3. Observa la trayectoria del proyectil, la caida del mono y el punto de impacto.
4. Usa **Reiniciar** para limpiar la simulacion.

## Endpoints

### `GET /`

Renderiza la pagina principal desde `templates/index.html`.

### `POST /calcular`

Recibe los parametros fisicos en formato JSON y devuelve la trayectoria calculada.

Ejemplo de entrada:

```json
{
  "vel": 30,
  "dist": 35,
  "altura": 20,
  "gravedad": 9.8
}
```

Ejemplo de respuesta:

```json
{
  "angulo": 29.74,
  "tiempo_impacto": 1.343,
  "frames": [
    {
      "t": 0,
      "px": 0,
      "py": 0,
      "mx": 35,
      "my": 20
    }
  ],
  "impacto": {
    "t": 1.344,
    "x": 35,
    "y": 11.15
  }
}
```

## Notas

- El backend calcula los frames de la simulacion con pasos de tiempo pequenos.
- El frontend dibuja la animacion con `requestAnimationFrame`.
- No se usan librerias externas en el frontend.
