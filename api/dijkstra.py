from http.server import BaseHTTPRequestHandler
import json

class Grafo:
    INF = float('inf')

    def __init__(self, primero=None):
        self._grafo = {}
        self._primero = primeiro
        if primero:
            self._grafo[primero] = {}

    def agregar_nodo(self, nombre):
        self._grafo.setdefault(nombre, {})

    def agregar_aristas(self, *args):
        if len(args) == 3:
            o, d, p = args
            self._grafo.setdefault(o, {})[d] = p
            self._grafo.setdefault(d, {})[o] = p
        elif len(args) == 1:
            for o, d, p in args[0]:
                self.agregar_aristas(o, d, p)

    def dijkstra(self, origen=None):
        if origen is None:
            origen = self._primero
        nodos = list(self._grafo)
        n = len(nodos)
        idx = {nom: i + 1 for i, nom in enumerate(nodos)}
        nombre = {i + 1: nom for i, nom in enumerate(nodos)}

        A = [[self.INF] * (n + 1) for _ in range(n + 1)]
        for i in range(1, n + 1):
            A[i][i] = 0
        for nom in nodos:
            for vecino, p in self._grafo[nom].items():
                if nom in idx and vecino in idx:
                    A[idx[nom]][idx[vecino]] = p

        C = [1] * (n + 1)
        S = [self.INF] * (n + 1)
        P = [-1] * (n + 1)
        o = idx[origen]

        for j in range(1, n + 1):
            S[j] = A[o][j]
            if j != o and A[o][j] != self.INF:
                P[j] = o
        C[o] = 0

        t = []

        for _ in range(1, n):
            minimo = self.INF
            x = -1
            for v in range(1, n + 1):
                if C[v] and S[v] < minimo:
                    minimo = S[v]
                    x = v
            if x == -1:
                break
            C[x] = 0

            updates = []
            for j in range(1, n + 1):
                if C[j] and A[x][j] != self.INF and S[j] > S[x] + A[x][j]:
                    ant = S[j]
                    S[j] = S[x] + A[x][j]
                    P[j] = x
                    updates.append((j, ant, S[j]))
            t.append((x, updates))

        return S, P, nombre, idx, t, origen

    def _camino(self, P, destino, nombre):
        camino = []
        actual = destino
        while actual != -1:
            camino.append(nombre[actual])
            actual = P[actual]
        return " -> ".join(reversed(camino))

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('content-length', 0))
        if content_length == 0:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Empty request body"}).encode('utf-8'))
            return

        body = self.rfile.read(content_length).decode('utf-8')
        try:
            data = json.loads(body)
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Invalid JSON payload: {str(e)}"}).encode('utf-8'))
            return

        g = Grafo()
        
        aristas = data.get("aristas", [])
        for e in aristas:
            if len(e) == 3:
                g.agregar_aristas(e[0], e[1], float(e[2]))
        
        origen = data.get("origen")
        if not origen:
            origen = list(g._grafo.keys())[0] if g._grafo else None

        if not origen:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "No origin provided"}).encode('utf-8'))
            return

        try:
            S, P, nombre, idx, t, origen_calc = g.dijkstra(origen)
            
            # Format trace and results
            traza = []
            for i, (x, updates) in enumerate(t, 1):
                step_updates = []
                for j, ant, nuevo in updates:
                    step_updates.append({
                        "nodo": nombre[j],
                        "ant": None if ant == Grafo.INF else ant,
                        "nuevo": nuevo,
                        "via": nombre[x]
                    })
                traza.append({
                    "iteracion": i,
                    "vertice": nombre[x],
                    "distancia": S[x],
                    "updates": step_updates
                })
                
            resultados = []
            for i in range(1, len(nombre) + 1):
                if S[i] != Grafo.INF: # Accessible only
                    resultados.append({
                        "destino": nombre[i],
                        "distancia": S[i],
                        "camino": g._camino(P, i, nombre)
                    })
                
            response_payload = {
                "origen": origen_calc,
                "traza": traza,
                "resultados": resultados
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_payload).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Algorithm runtime failure: {str(e)}"}).encode('utf-8'))
