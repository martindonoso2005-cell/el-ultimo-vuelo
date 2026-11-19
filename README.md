# 66 millones de años: el último vuelo

Experiencia inmersiva web de 60 s (A-Frame / WebXR, 3D Low Poly) para el concurso
**Chile Re-Descubre · Congreso Futuro**, tema «Aves, los últimos dinosaurios».
Guion completo en [GUION.md](GUION.md).

## Cómo abrirla
WebXR necesita un servidor (no basta con doble clic en el HTML):

- **Windows:** doble clic en `iniciar.bat` (usa Python) y se abre `http://localhost:8765`.
- **Manual:** `python -m http.server 8765` dentro de esta carpeta.
- **Celular / Quest:** súbela a cualquier hosting HTTPS (GitHub Pages, Netlify, Vercel). En el visor, toca el botón de gafas VR.

Usa audífonos: el sonido es espacial (HRTF).

## Controles
- Escritorio: arrastrar para mirar · clic en un ave para elegirla.
- Celular: mover el teléfono (giroscopio) · tocar el ave.
- VR: mirar fijamente 1,2 s (retícula) o apuntar con el control y apretar el gatillo.

## Estructura
```
index.html          escena A-Frame, cámara, cursores y controles VR
css/estilo.css      pantallas de inicio y fin
js/lowpoly.js       todos los modelos procedurales (terreno, montañas, árboles,
                    dinosaurios y el "ave paramétrica" que evoluciona)
js/sonido.js        audio espacial generado con Web Audio (sin archivos)
js/experiencia.js   línea de tiempo de 60 s, escenas, interacción y textos en pantalla
```
No usa modelos ni audios externos: todo se genera por código y la escena pesa menos de 150 KB.

## Para editar
- Saltar a un segundo: `index.html?t=34` (y `&auto=1` para que parta sola).
- Desde la consola: `UV.seek(50)` congela la escena en ese segundo.
- Textos en pantalla y sus tiempos: arreglo `LINEAS` en `js/experiencia.js`.
- Colores del cielo, la niebla y la luz por escena: objeto `ENV` en `js/experiencia.js`.
- Especies (proporciones y colores): objeto `SP` en `js/lowpoly.js`.

## Textos
No hay voz en off: el relato se lee en pantalla, como subtítulos dentro del campo visual
(también visibles en VR). El sonido es solo ambiente, efectos y música.
