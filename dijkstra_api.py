import sys
import json

class Grafo:
    INF = float('inf')

    def __init__(self, primero=None):
        self._grafo = {}
        self._primero = primero
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

def run():
    input_data = sys.stdin.read()
    if not input_data:
        return
    data = json.loads(input_data)
    
    g = Grafo()
    for origen, destino, peso in data.get("aristas", []):
        g.agregar_aristas(origen, destino, float(peso))
    
    origen = data.get("origen")
    if not origen:
        origen = list(g._grafo.keys())[0] if g._grafo else None
    
    if not origen:
        print(json.dumps({"error": "No origin provided"}))
        return
        
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
        if S[i] != Grafo.INF: # Solo accesibles
            resultados.append({
                "destino": nombre[i],
                "distancia": S[i],
                "camino": g._camino(P, i, nombre)
            })
        
    print(json.dumps({
        "origen": origen_calc,
        "traza": traza,
        "resultados": resultados
    }))

if __name__ == "__main__":
    run()
