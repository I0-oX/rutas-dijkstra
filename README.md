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

## 🔍 ¿Por qué Hono? (Explicación Sencilla)

Imagina que tu aplicación necesita dos partes:
1. **Frontend** (lo que ves en el navegador)
2. **Backend** (el servidor que procesa el algoritmo de Dijkstra en Python)

**Hono es el "puente"** que conecta ambas partes de forma eficiente. Es como un cartero ultrarrápido que:
- Recibe las peticiones del frontend (ej: "calcula la ruta más corta")
- Las envía al script de Python
- Devuelve la respuesta al navegador

### ¿Por qué lo usamos?
- 🪶 **Ligero**: Ocupa muy poco (~14KB), no ralentiza tu app
- 🚀 **Rápido**: Responde en milisegundos
- 🔄 **Versátil**: Funciona en Vercel, Cloudflare, Node.js, etc.
- 🛠️ **Fácil**: No requiere configuraciones complejas

---

## ☁️ Hono con Vercel y Cloudflare (Explicación Sencilla)

### El Problema
Tu algoritmo está en **Python**, pero necesitas desplegarlo en internet. Aquí es donde entran Vercel y Cloudflare:

### 🟢 Vercel (Donde está este proyecto)
- **Qué hace**: Ejecuta tu código Python en servidores bajo demanda
- **Cómo ayuda Hono**: Actúa como intermediario entre el usuario y Python
- **Ventaja**: Soporta Python nativamente ✅
- **Flujo simple**:
  ```
  Usuario → Hono (en Vercel) → Python → Resultado → Usuario
  ```

### 🔵 Cloudflare Workers (Alternativa)
- **Qué hace**: Ejecuta código JavaScript cerca del usuario (en el "edge")
- **Limitación**: NO soporta Python directamente ❌
- **Cuándo usarlo**: Si tu backend fuera solo JavaScript/TypeScript

### ¿En qué se diferencian?

| Aspecto | Vercel | Cloudflare |
|---------|--------|------------|
| **Soporta Python** | ✅ Sí | ❌ No |
| **Velocidad** | Rápida | Más rápida (edge) |
| **Ideal para** | Backend con Python | APIs ligeras en JS |
| **Precio** | Gratis hasta cierto límite | Gratis más generoso |

> 💡 **Conclusión**: Usamos **Vercel + Hono** porque necesitamos ejecutar Python. Si el algoritmo estuviera en JavaScript, Cloudflare sería una opción más rápida y económica.

---

## 🔍 ¿Por qué Hono? (Explicación Técnica Detallada)

**Hono** es un framework web moderno, ultraligero y rápido diseñado para funcionar en múltiples entornos de ejecución (runtimes). Se eligió para este proyecto por las siguientes razones:

### ✅ Ventajas Clave de Hono

1. **Ultraligero y Rápido**: Hono tiene una huella mínima (~14KB) y está optimizado para ofrecer un rendimiento excepcional, incluso en entornos con recursos limitados.

2. **Multi-Runtime**: A diferencia de frameworks tradicionales como Express, Hono puede ejecutarse en:
   - **Node.js** (servidores tradicionales)
   - **Cloudflare Workers** (Edge Computing)
   - **Vercel Edge Functions** 
   - **Bun**, **Deno**, y otros runtimes modernos

3. **API Moderna y TypeScript Nativo**: Hono ofrece una API intuitiva similar a Express pero con soporte completo de TypeScript desde el primer momento, proporcionando autocompletado y tipado seguro para rutas, parámetros y respuestas.

4. **Zero-Config para Serverless**: Hono se adapta automáticamente al entorno donde se ejecuta, lo que facilita el despliegue en plataformas como Vercel o Cloudflare sin necesidad de configuraciones complejas.

5. **Middleware Integrado**: Incluye middleware común como CORS, logging, autenticación y manejo de errores de forma nativa o mediante extensiones oficiales.

---

## ☁️ Hono con Vercel y Cloudflare (Explicación Técnica Detallada)

### 🟢 Despliegue en Vercel

Vercel es una plataforma serverless que ejecuta funciones bajo demanda. Hono se integra perfectamente mediante **Vercel Edge Functions** o **Serverless Functions**:

#### Cómo Funciona:
1. **Rutas Automáticas**: Cada archivo en la carpeta `/api` se convierte automáticamente en un endpoint serverless.
2. **Adaptador de Hono**: Hono detecta el entorno de Vercel y adapta su fetch handler para funcionar con el modelo de funciones serverless.
3. **Cold Start Mínimo**: Gracias a su tamaño reducido, Hono tiene tiempos de inicialización (cold start) muy bajos, crucial para funciones serverless.
4. **Configuración Simple**: Con `vercel.json` defines reescrituras de rutas para que todo el tráfico SPA redirija al `index.html`, mientras que las rutas `/api/*` son manejadas por Hono.

#### Ejemplo de Flujo en Vercel:
```
Usuario → Vercel Edge → /api/dijkstra (Hono) → Python Script → Respuesta JSON
```

### 🔵 Despliegue en Cloudflare Workers

Cloudflare Workers ejecuta código en el **edge** (borde de la red), cerca del usuario final. Hono fue diseñado pensando en esta arquitectura:

#### Cómo Funciona:
1. **Runtime Compatible**: Hono usa Web Standards API (Request/Response) que Cloudflare Workers soporta nativamente.
2. **Ejecución en el Edge**: Tu aplicación se distribuye globalmente en más de 275 centros de datos de Cloudflare.
3. **Sin Servidores Tradicionales**: No hay que gestionar instancias; Cloudflare escala automáticamente.
4. **Costo Eficiente**: Los Workers tienen un generoso plan gratuito y cobran solo por tiempo de CPU real usado.

#### Configuración Típica para Cloudflare:
```ts
// worker.ts
import { Hono } from 'hono';
const app = new Hono();

app.get('/', (c) => c.text('Hello from Cloudflare!'));

export default app;
```

### 📊 Comparativa Técnica Completa

| Característica | Vercel | Cloudflare Workers |
|---------------|--------|-------------------|
| **Tipo** | Serverless Functions | Edge Computing |
| **Latencia** | Baja (regiones específicas) | Ultra baja (edge global) |
| **Cold Start** | ~100-300ms | ~5-50ms |
| **Tiempo Máx.** | 10-60 segundos | 50ms (CPU time) |
| **Ideal para** | APIs, SSR, Backend completo | Edge APIs, Middleware, Cache |
| **Python** | ✅ Soporte nativo | ❌ Solo JavaScript/WebAssembly |
| **Escalado** | Automático | Automático y global |
| **Persistencia** | Limitada (stateless) | Con KV Storage y Durable Objects |

> **Nota**: Este proyecto usa Vercel porque el algoritmo de Dijkstra está implementado en Python, y Vercel soporta funciones serverless de Python de forma nativa. Para Cloudflare, necesitarías reimplementar el algoritmo en JavaScript/TypeScript o usar WebAssembly.

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
