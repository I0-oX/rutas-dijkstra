import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Network, Plus, Trash2, Play, Pause, ChevronLeft, ChevronRight, FastForward, Rewind } from 'lucide-react';
import GraphViz from './components/GraphViz';
import { Edge, DijkstraResponse, TraceStep, TraceUpdate, ResultRow } from './types';

const DEFAULT_EDGES: Edge[] = [
  { origen: "Madrid", destino: "Zaragoza", peso: 320 },
  { origen: "Madrid", destino: "Valencia", peso: 360 },
  { origen: "Madrid", destino: "Sevilla", peso: 540 },
  { origen: "Barcelona", destino: "Zaragoza", peso: 300 },
  { origen: "Barcelona", destino: "Valencia", peso: 350 },
  { origen: "Valencia", destino: "Sevilla", peso: 650 },
  { origen: "Zaragoza", destino: "Bilbao", peso: 300 },
  { origen: "Sevilla", destino: "Granada", peso: 250 },
  { origen: "Sevilla", destino: "Málaga", peso: 210 },
  { origen: "Granada", destino: "Málaga", peso: 130 },
  { origen: "Granada", destino: "Valencia", peso: 500 },
  { origen: "Bilbao", destino: "Barcelona", peso: 620 },
  { origen: "Málaga", destino: "Valencia", peso: 630 }
];

export default function App() {
  const [edges, setEdges] = useState<Edge[]>(DEFAULT_EDGES);
  const [origen, setOrigen] = useState<string>("Madrid");
  const [newOrigen, setNewOrigen] = useState("");
  const [newDestino, setNewDestino] = useState("");
  const [newPeso, setNewPeso] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DijkstraResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const traceContainerRef = useRef<HTMLDivElement>(null);

  const nodes = Array.from(new Set<string>(edges.flatMap(e => [e.origen, e.destino])));

  const nodeDistances = useMemo(() => {
    const dists: Record<string, number | string> = {};
    nodes.forEach(n => dists[n] = '∞');
    
    if (data && activeStep !== null && data.traza.length > 0) {
      dists[data.origen] = 0;
      for (let i = 0; i <= activeStep; i++) {
        const step = data.traza[i];
        dists[step.vertice] = step.distancia;
        step.updates.forEach(u => {
           if (u.nuevo !== null) {
              dists[u.nodo] = u.nuevo;
           }
        });
      }
    } else if (data && activeStep === null) {
      data.resultados.forEach(r => dists[r.destino] = r.distancia);
      dists[data.origen] = 0;
    }
    
    return dists;
  }, [data, activeStep, nodes]);

  useEffect(() => {
    if (!nodes.includes(origen) && nodes.length > 0) {
      setOrigen(nodes[0]);
    }
  }, [edges, origen, nodes]);

  // Handle Autoplay
  useEffect(() => {
    let interval: any;
    if (isPlaying && data) {
      interval = setInterval(() => {
        setActiveStep(prev => {
          if (prev === null) return 0;
          if (prev >= data.traza.length - 1) {
            setIsPlaying(false);
            return null; // end
          }
          return prev + 1;
        });
      }, 2000); // Slower playback (2 seconds)
    }
    return () => clearInterval(interval);
  }, [isPlaying, data]);

  useEffect(() => {
    if (activeStep !== null && stepRefs.current[activeStep] && traceContainerRef.current) {
      const container = traceContainerRef.current;
      const element = stepRefs.current[activeStep];
      if (element) {
        const padding = 20;

        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elemTop = element.offsetTop - container.offsetTop;
        const elemBottom = elemTop + element.clientHeight;

        if (elemTop < containerTop + padding) {
          container.scrollTo({ top: elemTop - padding, behavior: 'smooth' });
        } else if (elemBottom > containerBottom - padding) {
          container.scrollTo({ top: elemBottom - container.clientHeight + padding, behavior: 'smooth' });
        }
      }
    }
  }, [activeStep]);

  const handleAddEdge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrigen || !newDestino || !newPeso) return;
    setEdges([...edges, { origen: newOrigen, destino: newDestino, peso: Number(newPeso) }]);
    setNewOrigen("");
    setNewDestino("");
    setNewPeso("");
  };

  const handleRemoveEdge = (index: number) => {
    setEdges(edges.filter((_, i) => i !== index));
  };

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setActiveStep(null);
    setIsPlaying(false);
    try {
      const res = await fetch("/api/dijkstra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aristas: edges.map(e => [e.origen, e.destino, e.peso]),
          origen: origen
        })
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
        setActiveStep(0);
        setIsPlaying(true);
      }
    } catch (err: any) {
      setError(err.message || "Error de red.");
    } finally {
      setLoading(false);
    }
  };

  const currentActiveNode = activeStep !== null && data && data.traza[activeStep] ? data.traza[activeStep].vertice : origen;
  const currentHighlightEdges = activeStep !== null && data && data.traza[activeStep] ? data.traza[activeStep].updates.map(u => ({source: data.traza[activeStep].vertice, target: u.nodo})) : [];

  const handleNextStep = () => {
    setIsPlaying(false);
    if (data && activeStep !== null && activeStep < data.traza.length - 1) {
      setActiveStep(activeStep + 1);
    } else if (data && activeStep !== null && activeStep === data.traza.length - 1) {
      setActiveStep(null);
    }
  };

  const handlePrevStep = () => {
    setIsPlaying(false);
    if (data && activeStep === null) {
      setActiveStep(data.traza.length - 1);
    } else if (activeStep !== null && activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const togglePlay = () => {
    if (!data) return;
    if (activeStep === null) {
      setActiveStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 font-sans lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-[1500px] flex flex-col border-0 lg:border-8 border-black lg:shadow-2xl bg-white xl:h-[95vh] lg:min-h-[850px] lg:overflow-hidden">
        
        {/* Header */}
        <header className="p-3 md:p-6 border-b-4 border-black flex flex-col sm:flex-row sm:justify-between sm:items-baseline bg-yellow-400 shrink-0">
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-none uppercase">RUTAS</h1>
          <div className="text-left sm:text-right uppercase font-bold text-[10px] sm:text-xs md:text-sm lg:text-base tracking-widest leading-none mt-1 sm:mt-0">
            Algoritmo de Dijkstra<br/>Visualización Paso a Paso
          </div>
        </header>

        <div className="flex flex-col lg:flex-row flex-1 lg:overflow-hidden">
          
          {/* Config Column */}
          <section className="w-full lg:w-[32%] flex flex-col border-b-4 lg:border-b-0 lg:border-r-4 border-black bg-white lg:overflow-y-auto z-10 shrink-0 lg:shrink min-h-[320px] lg:min-h-0">
            <div className="p-3 md:p-5 flex-1 flex flex-col">
              <h2 className="text-sm md:text-lg font-black uppercase tracking-widest text-black mb-3">CONFIGURACIÓN</h2>
              
              <div className="mb-3">
                 <h3 className="text-[9px] uppercase font-black tracking-widest text-neutral-500 mb-1">NODO ORIGEN</h3>
                 <select value={origen} onChange={e => setOrigen(e.target.value)} className="w-full appearance-none bg-black text-white px-3 h-10 md:h-12 text-xs md:text-sm font-black uppercase outline-none border-4 border-black focus:border-yellow-400 focus:text-yellow-400 cursor-pointer rounded-none">
                   {nodes.map(n => <option key={n} value={n}>{n}</option>)}
                 </select>
              </div>

              <form onSubmit={handleAddEdge} className="flex flex-col gap-1.5 mb-3">
                <div className="flex flex-col sm:flex-row gap-1.5">
                  <div className="flex-[2] flex flex-col">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">Origen</label>
                    <input type="text" value={newOrigen} onChange={e => setNewOrigen(e.target.value)} className="w-full appearance-none bg-stone-50 border-2 border-black h-8 px-2 font-bold uppercase text-[11px] focus:outline-none focus:border-yellow-400 rounded-none" placeholder="MADRID" />
                  </div>
                  <div className="flex-[2] flex flex-col">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">Destino</label>
                    <input type="text" value={newDestino} onChange={e => setNewDestino(e.target.value)} className="w-full appearance-none bg-stone-50 border-2 border-black h-8 px-2 font-bold uppercase text-[11px] focus:outline-none focus:border-yellow-400 rounded-none" placeholder="VALENCIA" />
                  </div>
                  <div className="flex-[1] flex flex-col min-w-[60px]">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">Dist.</label>
                    <input type="number" min="0" value={newPeso} onChange={e => setNewPeso(e.target.value)} className="w-full appearance-none bg-stone-50 border-2 border-black h-8 px-2 font-bold uppercase text-[11px] focus:outline-none focus:border-yellow-400 rounded-none" placeholder="360" />
                  </div>
                </div>
                <button type="submit" className="w-full flex items-center justify-center gap-1.5 bg-black text-white h-8 px-2 font-black text-[10px] uppercase tracking-widest border-2 border-black hover:bg-yellow-400 hover:text-black transition-colors rounded-none">
                  <Plus className="w-3.5 h-3.5" /> AÑADIR NODO/ARISTA
                </button>
              </form>

              <div className="border-4 border-black p-1.5 bg-stone-50 max-h-[140px] md:max-h-[200px] lg:max-h-[300px] overflow-y-auto mb-4 custom-scrollbar lg:flex-1">
                {edges.map((e, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-neutral-200 gap-1.5">
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs font-black uppercase min-w-0 flex-wrap">
                      <span className="bg-neutral-200 px-1 py-0.5">{e.origen}</span>
                      <span className="text-neutral-400 font-bold">→</span>
                      <span className="bg-neutral-200 px-1 py-0.5">{e.destino}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="bg-yellow-400 border-2 border-black px-1 py-0.5 text-[9px] font-black min-w-8 text-center">{e.weight || e.peso}</span>
                      <button type="button" onClick={() => handleRemoveEdge(i)} className="border-2 border-black text-black hover:bg-red-500 hover:text-white p-0.5 transition-colors cursor-pointer">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {edges.length === 0 && (
                  <div className="p-3 text-center font-bold text-neutral-400 text-[10px] uppercase tracking-widest">Sin aristas</div>
                )}
              </div>

              <div className="mt-auto">
                <button 
                  onClick={handleRun} 
                  disabled={loading || nodes.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 bg-yellow-400 text-black border-4 border-black h-11 md:h-14 text-sm md:text-lg font-black uppercase tracking-tighter hover:bg-black hover:text-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
                >
                  {loading ? (
                    <div className="flex items-center gap-1.5 text-sm md:text-lg font-black animate-pulse">PROCESANDO...</div>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" /> EJECUTAR
                    </>
                  )}
                </button>
                {error && (
                  <div className="mt-3 p-2 bg-black text-red-500 font-bold text-[10px] uppercase tracking-widest border-2 border-red-500">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Graph & Trace Column */}
          <section className="w-full lg:w-[68%] flex flex-col relative bg-white lg:overflow-hidden flex-1">
            
            {/* Graph - Dynamic Upper segment */}
            <div 
              className="w-full h-[32vh] sm:h-[38vh] lg:h-[53%] border-b-4 border-black sticky top-0 lg:static z-30 shadow-[0_4px_15px_rgba(0,0,0,0.1)] bg-stone-50 group shrink-0 relative"
            >
                <div className="absolute top-1.5 left-1.5 z-40 px-1.5 py-0.5 bg-white border-2 border-black font-black text-[9px] uppercase tracking-widest pointer-events-none shadow-[1.5px_1.5px_0px_#000]">VISUALIZACIÓN DE GRAFO</div>
                <div className="w-full h-full absolute inset-0">
                  {!data && <div className="absolute inset-0 z-0 opacity-5 pointer-events-none flex items-center justify-center"><Network className="w-48 h-48" /></div>}
                  <GraphViz 
                    edges={edges} 
                    activeNode={currentActiveNode} 
                    highlightEdges={currentHighlightEdges} 
                    nodeDistances={nodeDistances} 
                  />
                </div>
            </div>

            {/* Trace - Lower half */}
            <div className="w-full flex-1 max-h-[50vh] lg:max-h-none lg:h-[47%] bg-white border-t-0 lg:border-t-4 border-black text-black flex flex-col relative overflow-hidden shrink-0">
               <div className="p-3 md:p-6 flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-center border-b-4 border-black pb-2 mb-3 shrink-0">
                    <h2 className="text-base sm:text-lg md:text-2xl font-black uppercase tracking-widest">TRAZA</h2>
                    {data && (
                      <div className="flex gap-1 shrink-0">
                          <button onClick={togglePlay} className={`border-2 border-black p-1 transition-colors ${isPlaying ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-white text-black hover:bg-stone-100'}`}>
                            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                          </button>
                          <button onClick={handlePrevStep} disabled={activeStep === 0} className="bg-white text-black p-1 hover:bg-yellow-400 hover:text-black disabled:opacity-30 disabled:hover:bg-white transition-colors border-2 border-black">
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex items-center justify-center bg-stone-100 border-2 border-black px-2 font-bold text-[10px] tracking-widest min-w-[85px]">
                            {activeStep === null ? 'FINAL' : `PASO ${activeStep + 1}/${data.traza.length}`}
                          </div>
                          <button onClick={handleNextStep} disabled={activeStep === null} className="bg-white text-black p-1 hover:bg-yellow-400 hover:text-black disabled:opacity-30 disabled:hover:bg-white transition-colors border-2 border-black">
                            {activeStep === data.traza.length - 1 ? <FastForward className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                      </div>
                    )}
                </div>

                <div id="trace-scroll-container" ref={traceContainerRef} className="flex-1 overflow-y-auto space-y-3 font-mono text-xs custom-scrollbar pr-1 pb-6 w-full">
                  {!data ? (
                      <div className="p-4 text-center border-4 border-dashed border-neutral-300 mt-4 text-neutral-500 uppercase font-bold tracking-widest text-[10px] leading-relaxed">Configura y ejecuta para ver la traza de pasos.</div>
                  ) : (
                      <>
                        <div className="space-y-3">
                          {data.traza.map((paso, idx) => {
                            const isLast = idx === data.traza.length - 1;
                            const isActive = activeStep === idx;
                            return (
                              <div 
                                key={idx} 
                                ref={el => stepRefs.current[idx] = el}
                                onClick={() => {
                                  setIsPlaying(false);
                                  setActiveStep(isActive ? null : idx);
                                }}
                                className={`border-2 md:border-4 p-2.5 md:p-4 cursor-pointer transition-all duration-300 flex flex-col ${
                                  isActive 
                                    ? 'border-black bg-yellow-400 shadow-[3px_3px_0px_#000] translate-y-[-1px] opacity-100 text-black' 
                                    : activeStep !== null
                                      ? 'border-neutral-200 hover:border-neutral-400 hover:bg-stone-50 opacity-40 hover:opacity-100 bg-white text-neutral-800'
                                      : 'border-neutral-200 hover:border-black hover:bg-stone-50 hover:shadow-[3px_3px_0px_#000] hover:translate-y-[-1px] opacity-100 bg-white text-black'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2 border-b border-current pb-1.5 opacity-80">
                                  <span className={`px-1.5 py-0.5 font-black uppercase tracking-widest text-[9px] ${isActive ? 'bg-black text-yellow-400' : 'bg-neutral-100 text-neutral-600'}`}>
                                    Iteración {String(paso.iteracion).padStart(2, '0')}
                                  </span>
                                  <span className="text-[9px] uppercase tracking-wider font-bold">
                                    Distancia: <span className="text-xs font-black">{paso.distancia}</span>
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1 mb-2">
                                  <span className="opacity-60 uppercase text-[9px] font-bold tracking-wider">Nodo Analizado:</span>
                                  <span className={`font-black text-xs uppercase px-2 py-1 self-start border-2 ${isActive ? 'bg-black text-yellow-400 border-black' : 'bg-neutral-100 border-neutral-300 text-black'}`}>{paso.vertice}</span>
                                </div>
                                
                                {paso.updates.length > 0 ? (
                                  <div className={`mt-1.5 space-y-1 p-2 border-2 ${isActive ? 'bg-white border-black' : 'bg-stone-50 border-neutral-200'}`}>
                                    <div className={`text-[9px] uppercase tracking-widest font-black mb-1.5 ${isActive ? 'text-black' : 'text-neutral-500'}`}>Actualizaciones de caminos</div>
                                    {paso.updates.map((upd, i) => (
                                      <div key={i} className={`flex justify-between items-center text-[11px] font-mono border-b py-1 gap-1.5 ${isActive ? 'border-neutral-300' : 'border-neutral-200'}`}>
                                        <span className="font-bold uppercase break-all">{upd.nodo}</span>
                                        <div className={`flex items-center font-bold px-1 whitespace-nowrap`}>
                                          <span className="line-through opacity-50 text-right w-7 text-[10px]">{upd.ant === null ? '∞' : upd.ant}</span>
                                          <span className="mx-0.5 opacity-50">→</span>
                                          <span className={`${isActive ? 'text-yellow-600 font-black text-xs' : 'text-black text-xs'}`}>{upd.nuevo}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className={`mt-1.5 p-2 border border-dashed font-bold text-[9px] uppercase tracking-wider text-center ${isActive ? 'bg-yellow-400/50 border-black text-black' : 'bg-stone-50 border-neutral-200 text-neutral-400'}`}>
                                    Ningún camino mejorado
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div ref={el => stepRefs.current[data.traza.length] = el} className="flex justify-center items-center gap-1.5 pt-4 pb-1">
                          <div className="h-1.5 w-1.5 bg-yellow-400 border border-black"></div>
                          <div className="h-1.5 w-1.5 bg-yellow-400 border border-black"></div>
                          <div className="h-1.5 w-1.5 bg-yellow-400 border border-black"></div>
                        </div>

                        <div
                          onClick={() => {
                            setIsPlaying(false);
                            setActiveStep(null);
                          }}
                          className={`mt-1.5 mb-3 border-2 md:border-4 p-3 transition-all cursor-pointer overflow-hidden ${activeStep === null ? 'bg-black text-white border-black shadow-[3px_3px_0px_#facc15] translate-y-[-1px]' : 'bg-white border-neutral-200 hover:border-black hover:shadow-[3px_3px_0px_#000] hover:translate-y-[-1px]'}`}
                        >
                          <h3 className="font-black uppercase tracking-widest text-xs mb-3 border-b border-current pb-1.5">Resultado Final</h3>
                          <div className="overflow-x-auto custom-scrollbar w-full">
                            <table className="w-full text-left text-xs uppercase tracking-wider min-w-[280px] border-collapse animate-fade-in">
                              <thead>
                                <tr className="opacity-60 border-b border-current font-black text-[10px]">
                                  <th className="py-1 px-1 w-1/3">Destino</th>
                                  <th className="py-1 px-1 text-center w-1/4">Costo</th>
                                  <th className="py-1 px-1 text-right">Ruta</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-current divide-opacity-10 font-bold">
                                {data.resultados.map((r, idx) => (
                                  <tr key={idx} className={`${activeStep === null ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-colors`}>
                                    <td className="py-1.5 px-0.5 text-[11px] font-black">{r.destino}</td>
                                    <td className={`py-1.5 px-0.5 text-center text-xs font-black ${activeStep === null ? "text-yellow-400" : ""}`}>{r.distancia}</td>
                                    <td className="py-1.5 px-1 text-right">
                                      <div className="flex flex-wrap justify-end items-center gap-0.5">
                                        {r.camino.split(" -> ").map((node, i, arr) => (
                                          <React.Fragment key={i}>
                                            <span className={`px-1 py-0.2 text-[9px] ${node === data.origen || node === r.destino ? (activeStep === null ? "bg-yellow-400 text-black border border-black font-black" : "bg-black text-white") : ""}`}>{node}</span>
                                            {i < arr.length - 1 && <span className="opacity-40 text-[9px] mx-0.5">→</span>}
                                          </React.Fragment>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                  )}
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
