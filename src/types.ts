export type Edge = {
  origen: string;
  destino: string;
  peso: number;
};

export type TraceUpdate = {
  nodo: string;
  ant: number | null;
  nuevo: number;
  via: string;
};

export type TraceStep = {
  iteracion: number;
  vertice: string;
  distancia: number;
  updates: TraceUpdate[];
};

export type ResultRow = {
  destino: string;
  distancia: number;
  camino: string;
};

export type DijkstraResponse = {
  origen: string;
  traza: TraceStep[];
  resultados: ResultRow[];
  error?: string;
};
