# 66 millones de años: el último vuelo
**Asignatura:** Taller de Diseño de Interfaces (2026) | Universidad Adolfo Ibáñez  
**Entrega:** Proyecto Final · Unidad 3: Interfaces Gráficas  
**Estudiante:** Martín Donoso  
**Profesor:** Jorge Forero  
**Concurso:** Chile Re-Descubre · Congreso Futuro (ACHIPEC, CRTIC)

- **Experiencia publicada:** https://martindonoso2005-cell.github.io/el-ultimo-vuelo/
- **Cápsula audiovisual (1 min):** _enlace pendiente: se agrega al subir el video_
- **Guion técnico completo:** [GUION.md](GUION.md)

---

## Tema elegido
**Aves, los últimos dinosaurios** (hito del libro *Hecho en Chile. 50 ideas, descubrimientos e innovaciones*).

## Descripción conceptual
Experiencia inmersiva web de 60 segundos en 3D Low Poly, en primera persona y con audio espacial. El espectador viaja al final del Cretácico, presencia el impacto del asteroide de Chicxulub y la extinción masiva K-Pg, y **elige a uno de los tres pequeños dinosaurios emplumados que sobreviven**. A partir de esa elección ve evolucionar su linaje durante millones de años hasta llegar al presente, en Chile, donde lo reconoce convertido en un ave actual: un cóndor, un pingüino o un picaflor.

**Idea central:** las aves no son solo descendientes de los dinosaurios: son dinosaurios avianos que siguen vivos entre nosotros.

El relato se conecta con Chile a través de fósiles y especies locales: *Pelagornis chilensis* (Bahía Inglesa), pingüinos gigantes fósiles, titanosaurios de Atacama, araucarias que ya existían en el Mesozoico, y aves actuales como el cóndor andino, el flamenco chileno, el pingüino de Humboldt y el picaflor.

### Estructura narrativa (60 s)
| Tiempo | Escena |
|---|---|
| 0:00–0:10 | Un mundo lleno de vida: titanosaurios, pterosaurios, tiranosaurio y pequeños dinosaurios emplumados |
| 0:10–0:22 | El impacto: el asteroide cruza el cielo, impacta en Yucatán y el polvo cubre el planeta |
| 0:22–0:34 | El silencio y los supervivientes: el espectador elige a un aviano |
| 0:34–0:48 | El paso del tiempo: el ave elegida evoluciona y aparecen nuevos linajes |
| 0:48–1:00 | Los últimos dinosaurios: el presente en Chile y el mensaje final |

### Rigor divulgativo
Los datos científicos usados (impacto de Chicxulub hace unos 66 millones de años, asteroide de unos 10 km, desaparición de cerca del 75 % de las especies, pterosaurios que no eran dinosaurios, supervivencia de aves pequeñas y de dieta flexible) están detallados en la sección *Notas científicas* de [GUION.md](GUION.md).

## Instrucciones de uso e interacción
1. Abre la [experiencia publicada](https://martindonoso2005-cell.github.io/el-ultimo-vuelo/) y usa audífonos: el sonido es espacial.
2. Toca **Comenzar el viaje**.
3. Mira a tu alrededor en 360°:
   - **Computador:** arrastra con el mouse.
   - **Celular:** mueve el teléfono (giroscopio).
   - **Visor VR:** toca el botón de gafas VR.
4. Cuando caiga la ceniza, **elige a un superviviente**:
   - **Computador:** haz clic en el ave.
   - **Celular:** toca el ave.
   - **VR:** míralo fijamente 1,2 s (retícula) o apúntalo con el control y aprieta el gatillo.
   - Si no eliges, la historia continúa sola.
5. Al final, **Volver a vivirlo** reinicia la experiencia.

### Abrirla en local
WebXR necesita un servidor (no basta con doble clic en el HTML):
- **Windows:** doble clic en `iniciar.bat` (usa Python) y se abre `http://localhost:8765`.
- **Manual:** `python -m http.server 8765` dentro de esta carpeta.

## Tecnologías empleadas
- **A-Frame 1.6** (arquitectura Entity-Component sobre Three.js) y **WebXR** para la escena 3D y el modo VR.
- **Interacción por mirada (gaze):** retícula con tiempo de fijación, además de clic, toque y controles VR.
- **Web Audio API** con panoramización **HRTF** para el audio espacial. Todo el sonido se genera por código, sin archivos de audio.
- **Modelos Low Poly procedurales** en JavaScript (terreno, montañas, árboles, dinosaurios y el "ave paramétrica" que evoluciona). No usa modelos externos y la escena pesa menos de 150 KB.
- **HTML, CSS y JavaScript**, publicado con **GitHub Pages**.

## Estructura del código
```
index.html          escena A-Frame, cámara, cursores y controles VR
css/estilo.css      pantallas de inicio y fin
js/lowpoly.js       modelos procedurales (terreno, montañas, árboles,
                    dinosaurios y el "ave paramétrica" que evoluciona)
js/sonido.js        audio espacial generado con Web Audio (sin archivos)
js/experiencia.js   línea de tiempo de 60 s, escenas, interacción y textos en pantalla
GUION.md            guion técnico segundo a segundo y notas científicas
iniciar.bat         servidor local en Windows
```

## Para editar
- Saltar a un segundo: `index.html?t=34` (y `&auto=1` para que parta sola).
- Desde la consola: `UV.seek(50)` congela la escena en ese segundo.
- Textos en pantalla y sus tiempos: arreglo `LINEAS` en `js/experiencia.js`.
- Colores del cielo, la niebla y la luz por escena: objeto `ENV` en `js/experiencia.js`.
- Especies (proporciones y colores): objeto `SP` en `js/lowpoly.js`.

## Textos
No hay voz en off: el relato se lee en pantalla, como subtítulos dentro del campo visual (también visibles en VR). El sonido es solo ambiente, efectos y música.
