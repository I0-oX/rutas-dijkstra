import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = new Hono();

  app.post("/api/dijkstra", async (c) => {
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }
    
    return new Promise<Response>((resolve) => {
      const pythonProcess = spawn("python3", ["dijkstra_api.py"]);
      
      let outputData = "";
      let errorData = "";

      pythonProcess.stdout.on("data", (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        errorData += data.toString();
      });

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          resolve(c.json({ error: "Failed to run algorithm" }, 500));
          return;
        }
        try {
          const result = JSON.parse(outputData);
          resolve(c.json(result));
        } catch (err) {
          resolve(c.json({ error: "Invalid response from algorithm" }, 500));
        }
      });

      pythonProcess.stdin.write(JSON.stringify(body));
      pythonProcess.stdin.end();
    });
  });

  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    const honoFetch = app.fetch;

    const { createServer } = await import('http');
    const server = createServer((req, res) => {
      if (req.url?.startsWith('/api')) {
        import('@hono/node-server').then(({ getRequestListener }) => {
           getRequestListener(honoFetch)(req, res);
        });
      } else {
        vite.middlewares(req, res, () => {
          res.statusCode = 404;
          res.end("Not found");
        });
      }
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server (Dev) running on http://0.0.0.0:${PORT}`);
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    app.get("*", async (c, next) => {
      if (c.req.path.startsWith('/api')) {
        return next();
      }
      
      // Serve static files if they exist
      const filePath = path.join(distPath, c.req.path === '/' ? 'index.html' : c.req.path);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const mimeType = getMimeType(filePath);
        c.header('Content-Type', mimeType);
        return c.body(fs.readFileSync(filePath));
      }
      
      // Fallback to index.html for SPA routing
      const html = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
      return c.html(html);
    });

    serve({
      fetch: app.fetch,
      port: PORT,
      hostname: "0.0.0.0",
    }, (info) => {
      console.log(`Server (Prod) running on http://${info.address}:${info.port}`);
    });
  }
}

function getMimeType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html';
    case '.js': return 'application/javascript';
    case '.css': return 'text/css';
    case '.json': return 'application/json';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    default: return 'application/octet-stream';
  }
}

startServer();
