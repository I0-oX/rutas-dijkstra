import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Edge } from '../types';

// Map Spanish cities to their relative geographic positions on the map of Spain
// X: 0 (West) to 1 (East), Y: 0 (North) to 1 (South)
const GEOGRAPHIC_COORDS: Record<string, { x: number, y: number }> = {
  "Madrid": { x: 0.50, y: 0.50 },
  "Zaragoza": { x: 0.70, y: 0.32 },
  "Barcelona": { x: 0.90, y: 0.28 },
  "Bilbao": { x: 0.48, y: 0.10 },
  "Valencia": { x: 0.76, y: 0.55 },
  "Sevilla": { x: 0.22, y: 0.80 },
  "Málaga": { x: 0.30, y: 0.90 },
  "Granada": { x: 0.42, y: 0.86 }
};

// Helper to calculate exact line offsets to seat the arrowheads perfectly at circle edges
const updateLineCoords = (svgElement: d3.Selection<SVGSVGElement, any, any, any>, currentActive: string | null | undefined) => {
  const link = svgElement.selectAll<SVGLineElement, any>(".graph-link");
  const linkLabels = svgElement.selectAll<SVGTextElement, any>(".graph-link-label");
  
  link.each(function(d: any) {
    if (!d.source || !d.target || d.source.x === undefined || d.target.x === undefined) return;
    
    const dx = d.target.x - d.source.x;
    const dy = d.target.y - d.source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist === 0) return;

    const sIsActive = (d.source.id === currentActive);
    const tIsActive = (d.target.id === currentActive);

    // Precise circumference seated positions taking stroke width & arrowhead scale into account
    const rSource = sIsActive ? 22 : 18;
    const rTarget = tIsActive ? 23 : 19; // 3px larger than node radius to give arrow tip beautiful offset clearance

    const x1 = d.source.x + (dx * rSource) / dist;
    const y1 = d.source.y + (dy * rSource) / dist;
    const x2 = d.target.x - (dx * rTarget) / dist;
    const y2 = d.target.y - (dy * rTarget) / dist;

    d3.select(this)
      .attr("x1", x1)
      .attr("y1", y1)
      .attr("x2", x2)
      .attr("y2", y2);
  });

  linkLabels.each(function(d: any) {
    if (!d.source || !d.target || d.source.x === undefined || d.target.x === undefined) return;
    d3.select(this)
      .attr("x", (d.source.x + d.target.x) / 2)
      .attr("y", (d.source.y + d.target.y) / 2 - 5);
  });
};

export default function GraphViz({ 
  edges, 
  activeNode,
  highlightEdges = [],
  nodeDistances = {}
}: { 
  edges: Edge[], 
  activeNode?: string | null,
  highlightEdges?: {source: string, target: string}[],
  nodeDistances?: Record<string, number | string>
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // Update size settings automatically when the parent layout shifts or resizes
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      if (!entries || !entries.length) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Force simulation initializer
  useEffect(() => {
    if (!containerRef.current || edges.length === 0) return;
    
    // Clear dynamic stale svg layouts
    d3.select(containerRef.current).select('svg').remove();
    
    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('display', 'block');

    const defs = svg.append('defs');
    
    // Dynamic marching trace styling for tracing optimum paths cleanly
    defs.append('style').text(`
      @keyframes pathDash {
        to {
          stroke-dashoffset: -16;
        }
      }
      .opt-path-active {
        stroke-dasharray: 8 4 !important;
        animation: pathDash 0.7s linear infinite !important;
      }
    `);

    // CRISP ARROWHEADS: Using userSpaceOnUse to maintain constant scale irrespective of stroke width increases.
    // orient="auto" is much more reliable and standard than "auto-start-reverse"
    defs.append("marker")
      .attr("id", "arrow-std")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 8.5)
      .attr("markerHeight", 8.5)
      .attr("markerUnits", "userSpaceOnUse")
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-2.5L7,0L0,2.5Z")
      .attr("fill", "#1c1917");

    defs.append("marker")
      .attr("id", "arrow-highlighted")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 9.5)
      .attr("markerHeight", 9.5)
      .attr("markerUnits", "userSpaceOnUse")
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-2.5L7,0L0,2.5Z")
      .attr("fill", "#dc2626");

    const g = svg.append('g').attr('class', 'graph-container-group');
    
    const containerW = containerRef.current?.clientWidth || 600;
    const containerH = containerRef.current?.clientHeight || 400;

    // Margins for geographic distribution layout within the SVG coordinates
    const padding = 35;
    const innerW = containerW - padding * 2;
    const innerH = containerH - padding * 2;

    const _nodes = Array.from(new Set<string>(edges.flatMap(e => [e.origen, e.destino]))).map(id => {
      const geo = GEOGRAPHIC_COORDS[id];
      // Initialize nodes precisely at Spain's relative maps coordinates so they occupy 100% space automatically!
      const initialX = geo ? padding + geo.x * innerW : containerW / 2 + (Math.random() - 0.5) * 80;
      const initialY = geo ? padding + geo.y * innerH : containerH / 2 + (Math.random() - 0.5) * 80;
      return { id, x: initialX, y: initialY };
    });
    
    const _links = edges.map(e => ({ source: e.origen, target: e.destino, weight: e.peso }));

    // GEOGRAPHICALLY ALIGNED force simulation system
    // We gently pull nodes towards their true placement using forceX and forceY.
    // We also use link distance constraint & lightweight charge so they settle in a clean, non-overlapping way.
    const simulation = d3.forceSimulation(_nodes as d3.SimulationNodeDatum[])
        .force("link", d3.forceLink(_links).id((d: any) => d.id).distance(85).strength(0.25))
        .force("charge", d3.forceManyBody().strength(-140))
        .force("collide", d3.forceCollide().radius(32))
        .force("x", d3.forceX((d: any) => {
          const geo = GEOGRAPHIC_COORDS[d.id];
          return geo ? padding + geo.x * innerW : containerW / 2;
        }).strength(0.50))
        .force("y", d3.forceY((d: any) => {
          const geo = GEOGRAPHIC_COORDS[d.id];
          return geo ? padding + geo.y * innerH : containerH / 2;
        }).strength(0.50));

    // Link/Edge connections
    const link = g.append("g")
        .selectAll("line")
        .data(_links)
        .join("line")
        .attr("class", "graph-link")
        .attr("stroke", "#1c1917")
        .attr("stroke-width", 2.2)
        .attr("marker-end", "url(#arrow-std)");

    // Link labels representing Edge Weights
    const linkLabels = g.append("g")
        .selectAll("text")
        .data(_links)
        .join("text")
        .text(d => d.weight)
        .attr("class", "graph-link-label")
        .attr("font-size", "9.5px")
        .attr("fill", "#1c1917")
        .attr("font-weight", "950")
        .attr("text-anchor", "middle")
        .attr("paint-order", "stroke")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", "2.5px");

    // Node groups
    const nodeGroup = g.append("g")
        .selectAll("g")
        .data(_nodes)
        .join("g")
        .attr("class", "graph-node-group")
        .style("cursor", "grab");

    // Node shadow circle (bold offset brutalist shadow)
    nodeGroup.append("circle")
        .attr("class", "graph-node-shadow")
        .attr("r", 16)
        .attr("cx", 2.5)
        .attr("cy", 2.5)
        .attr("fill", "#1c1917");

    // Foreground main node circle
    nodeGroup.append("circle")
        .attr("class", "graph-node")
        .attr("r", 16)
        .attr("fill", "#ffffff")
        .attr("stroke", "#1c1917")
        .attr("stroke-width", 2.5);

    // Node Name Label - Neatly seated above circle center without overlaps
    nodeGroup.append("text")
        .attr("class", "graph-node-text")
        .text((d: any) => d.id)
        .attr("y", -22)
        .attr("font-size", "11px")
        .attr("font-weight", "900")
        .attr("font-family", "system-ui, sans-serif")
        .attr("text-anchor", "middle")
        .attr("fill", "#1c1917")
        .attr("paint-order", "stroke")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", "2.5px");

    // Dynamic cost label - Centered inside the circle
    nodeGroup.append("text")
        .attr("class", "graph-dist-text")
        .attr("y", 0)
        .attr("dy", "0.3em")
        .attr("font-size", "9.5px")
        .attr("font-weight", "900")
        .attr("font-family", "monospace")
        .attr("text-anchor", "middle")
        .attr("fill", "#1c1917");

    // Support drags
    const drag = d3.drag<any, any>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.12).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroup.call(drag);

    // Compute dynamic fit layouts on simulation ticks to ensure perfect scaling
    simulation.on("tick", () => {
      // Dynamic boundary clearances for arrowheads based on active status
      updateLineCoords(svg, activeNode);

      nodeGroup.attr("transform", (d: any) => `translate(${d.x},${d.y})`);

      // ------------------------------------------------------------------------
      // AUTOMATIC FIT-TO-CONTAINER SCALE & CENTER ROUTINE (MAKES MAX USE OF SPACE)
      // ------------------------------------------------------------------------
      const xs = _nodes.map((n: any) => n.x ?? 0);
      const ys = _nodes.map((n: any) => n.y ?? 0);
      
      const minX = d3.min(xs) ?? 0;
      const maxX = d3.max(xs) ?? containerW;
      const minY = d3.min(ys) ?? 0;
      const maxY = d3.max(ys) ?? containerH;

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const graphW = maxX - minX || 1;
      const graphH = maxY - minY || 1;

      // Ultra-low bounding cushion (15px) so the graph spans virtually close to the absolute margins
      const borderCushion = 15;
      const scaleX = (containerW - borderCushion * 2) / graphW;
      const scaleY = (containerH - borderCushion * 2) / graphH;
      
      // Let it zoom up to maximize area utilization perfectly
      let scale = Math.min(scaleX, scaleY);
      scale = Math.max(0.35, Math.min(scale, 2.0));

      const translateX = containerW / 2 - centerX * scale;
      const translateY = containerH / 2 - centerY * scale;

      g.attr("transform", `translate(${translateX},${translateY}) scale(${scale})`);
    });

    simulationRef.current = simulation as any;

    return () => {
      simulation.stop();
    };
  }, [edges, dimensions]);

  // Reactive state stylings (Active highlights and optimum path flows)
  useEffect(() => {
    if (!containerRef.current) return;
    const svg = d3.select(containerRef.current);
    
    svg.selectAll<SVGCircleElement, any>(".graph-node")
       .transition().duration(200)
       .attr("fill", d => d.id === activeNode ? "#facc15" : "#ffffff")
       .attr("stroke-width", d => d.id === activeNode ? 3.5 : 2.5)
       .attr("r", d => d.id === activeNode ? 20 : 16);
       
    svg.selectAll<SVGCircleElement, any>(".graph-node-shadow")
       .transition().duration(200)
       .attr("r", d => d.id === activeNode ? 20 : 16);

    updateLineCoords(svg, activeNode);

    svg.selectAll<SVGLineElement, any>(".graph-link")
       .attr("marker-end", d => {
           const s = d.source.id;
           const t = d.target.id;
           const isHighlighted = highlightEdges.some(he => 
               (he.source === s && he.target === t) ||
               (he.source === t && he.target === s)
           );
           return isHighlighted ? "url(#arrow-highlighted)" : "url(#arrow-std)";
       });

    svg.selectAll<SVGLineElement, any>(".graph-link")
       .transition().duration(200)
       .attr("stroke", d => {
           const s = d.source.id;
           const t = d.target.id;
           const isHighlighted = highlightEdges.some(he => 
               (he.source === s && he.target === t) ||
               (he.source === t && he.target === s)
           );
           return isHighlighted ? "#dc2626" : "#1c1917"; 
       })
       .attr("stroke-width", d => {
           const s = d.source.id;
           const t = d.target.id;
           const isHighlighted = highlightEdges.some(he => 
               (he.source === s && he.target === t) ||
               (he.source === t && he.target === s)
           );
           return isHighlighted ? 3.8 : 2.2;
       })
       .attr("stroke-opacity", d => {
           const s = d.source.id;
           const t = d.target.id;
           const isHighlighted = highlightEdges.some(he => 
               (he.source === s && he.target === t) ||
               (he.source === t && he.target === s)
           );
           return (isHighlighted || activeNode === s || activeNode === t) ? 1.0 : 0.35;
       });

    svg.selectAll<SVGLineElement, any>(".graph-link")
       .classed("opt-path-active", d => {
           const s = d.source.id;
           const t = d.target.id;
           return highlightEdges.some(he => 
               (he.source === s && he.target === t) ||
               (he.source === t && he.target === s)
           );
       });
       
    svg.selectAll<SVGTextElement, any>(".graph-dist-text")
       .text(d => {
         const dist = nodeDistances[d.id];
         return (dist === undefined || dist === null) ? '∞' : `${dist}`;
       })
       .attr("fill", "#1c1917");

  }, [activeNode, highlightEdges, nodeDistances]);

  return (
    <div ref={containerRef} className="w-full h-full bg-stone-50 select-none overflow-hidden relative border-4 border-black" />
  );
}
