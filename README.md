# Rutas: Dijkstra Visualizer

Visualizador de grafos interactivo y paso a paso para el Algoritmo de Dijkstra. La aplicación cuenta con una cuidada interfaz de diseño *Neo-Brutalista* de alto contraste y ofrece una ejecución determinista exacta mediante un backend integrado en Python.

---

## 🚀 Características Clave

- **Visualización en Tiempo Real**: Grafos dibujados dinámicamente con **D3.js** que responden a las interacciones del usuario.
- **Entorno Interactivo**: Crea y elimina nodos o aristas especificando sus distancias (pesos) en tiempo real.
- **Reproductor Multimedia de Traza**: Ejecuta el algoritmo y navega paso a paso por cada una de las iteraciones. Ofrece controles de reproducción automática (`Play`, `Pause`, avanzar/retroceder paso y salto a resultado final).
- **Detalle de Actualización**: Cuadro detallado que explica qué distancias han sido actualizadas y por qué nodo se transita en cada instante de la traza de ejecución.
- **Ruta Histórica de Resultados**: Tabla final con los mejores caminos calculados, desglosando el costo total y la secuencia exacta de nodos del recorrido.
- **Bajo Peso y Eficiente**: Algoritmo ejecutado de forma nativa en Python 3 desde el backend de producción.

---

## 🛠️ Arquitectura Técnica

El proyecto sigue una estructura híbrida optimizable tanto para ejecución en servidores basados en contenedores como plataformas Serverless (como Vercel):

### Cliente (Frontend)
- **Vite** + **React 19** + **TypeScript**: Interfaz ultra rápida e interactiva.
- **Tailwind CSS**: Estilizado cohesivo con generoso espaciado negativo, tipografías marcadas y bordes gruesos negros (Neo-Brutalist).
- **D3.js**: Renderizado jerárquico y equilibrado del grafo con fuerzas físicas calculadas dinámicamente.
- **Lucide React**: Biblioteca moderna de íconos estéticamente consistentes.

### Servidor (Backend)
- **Hono Router**: Servidor ligero de Node.js que expone endpoints REST (`/api/dijkstra`) para resolver la ejecución rápidamente.
- **Python Integration**: El servidor ejecuta `/api/dijkstra.py` mediante entrada y salida para procesar de forma determinista la matriz de adyacencia del algoritmo de Dijkstra.
- **Vercel Functions Ready**: En despliegues Serverless, `/api/dijkstra.py` funciona de manera directa como una Función Serverless asíncrona mediante el estándar WSGI/ASGI de Python en Vercel.

---

## 💻 Instalación y Desarrollo Local

Sigue los siguientes pasos para instalar y ejecutar el proyecto en tu máquina local:

### Requisitos Previos
- **Node.js** (v18 o superior)
- **Python 3** (accesible en tu terminal o variable de entorno de sistema como `python3`)

### Pasos

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/I0-oX/rutas-dijkstra.git
   cd rutas-dijkstra
   ```

2. **Instalar dependencias de Node**:
   ```bash
   npm install
   ```

3. **Ejecutar el servidor local de desarrollo**:
   ```bash
   npm run dev
   ```

4. **Acceder a la aplicación**:
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador preferido.

---

## 📂 Estructura de Archivos Principal

```text
├── api/
│   └── dijkstra.py      # Script principal del algoritmo de Dijkstra (Maneja CLI / Servidor Vercel)
├── src/
│   ├── components/
│   │   └── GraphViz.tsx # Componente React que renderiza el grafo dinámicamente con D3.js
│   ├── App.tsx          # Pantalla principal de la aplicación y flujo de la traza
│   ├── index.css        # Estilos globales y configuraciones de Tailwind
│   └── types.ts         # Tipados globales estáticos de TypeScript
├── server.ts            # Entrada del servidor backend local (Hono)
└── vercel.json          # Configuración de despliegue de Vercel (Reescrituras estáticas)
```

---

## 📐 Cómo Funciona el Algoritmo Integrado

El componente matemático del algoritmo se ejecuta en `/api/dijkstra.py`:

1. Convierte el conjunto dinámico de aristas y pesos en una matriz de distancias.
2. Inicia un vector de distancias acumuladas inicializado a infinito (`∞`), excepto el origen que se asigna como `0`.
3. En cada iteración, selecciona el vértice no procesado con la menor distancia registrada.
4. Explora las adyacencias de dicho vértice y actualiza las distancias mediante el principio de relajación:
   $$\text{Distancia}[v] = \min(\text{Distancia}[v], \text{Distancia}[u] + \text{Peso}(u, v))$$
5. Registra el historial de cambios tras cada paso para proveer una traza interactiva exacta a la interfaz en el frontend.
