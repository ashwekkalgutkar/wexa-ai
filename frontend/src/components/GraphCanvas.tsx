import React, { useRef, useCallback, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide } from 'd3-force';
import { NodeData, LinkData, PathResult } from '../types/graph';
import { ACCENT_COLOR, DEFAULT_LINK_COLOR, hexToRgba, darkenHex } from '../utils/colors';
import { getArtistAvatarData } from '../utils/avatar';

interface GraphCanvasProps {
  nodes: NodeData[];
  links: LinkData[];
  selectedArtist: NodeData | null;
  activePath: PathResult | null;
  onNodeClick: (node: NodeData) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  links,
  selectedArtist,
  activePath,
  onNodeClick,
}) => {
  const fgRef = useRef<any>(null);
  const imageMapRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // --- Refs for all render-critical state ---
  const hoverNodeRef = useRef<NodeData | null>(null);
  const hoverNeighborsRef = useRef<Set<string>>(new Set());
  const pathNodeNamesRef = useRef<Set<string>>(new Set());
  const pathLinkKeysRef = useRef<Set<string>>(new Set());

  // Keep refs for props too so callbacks never go stale
  const selectedArtistRef = useRef(selectedArtist);
  const activePathRef = useRef(activePath);
  const linksRef = useRef(links);
  const nodesRef = useRef(nodes);

  useEffect(() => { selectedArtistRef.current = selectedArtist; }, [selectedArtist]);
  useEffect(() => { activePathRef.current = activePath; }, [activePath]);
  useEffect(() => { linksRef.current = links; }, [links]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // Continuous animation loop for breathing nodes & energy pulses
  useEffect(() => {
    let animId: number;
    const animate = () => {
      if (fgRef.current) {
        fgRef.current.refresh();
      }
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Configure D3 Force Physics
  useEffect(() => {
    if (fgRef.current && nodes.length > 0) {
      const radius = 320;
      nodes.forEach((node, i) => {
        if (node.x === undefined || (node.x === 0 && node.y === 0)) {
          const angle = (i / nodes.length) * 2 * Math.PI;
          const r = radius + (i % 4) * 80;
          node.x = Math.cos(angle) * r;
          node.y = Math.sin(angle) * r;
        }
      });

      const charge = fgRef.current.d3Force('charge');
      if (charge) charge.strength(-800);

      const linkForce = fgRef.current.d3Force('link');
      if (linkForce) linkForce.distance(180);

      fgRef.current.d3Force('collide', forceCollide().radius(40));
      fgRef.current.d3ReheatSimulation();
    }
  }, [nodes, links]);

  // Update path highlight sets and force immediate repaint
  useEffect(() => {
    if (activePath && activePath.chain.length > 0) {
      const names = new Set<string>(activePath.chain.map((n) => n.name));
      const edgeKeys = new Set<string>();
      for (let i = 0; i < activePath.chain.length - 1; i++) {
        const a = activePath.chain[i].name;
        const b = activePath.chain[i + 1].name;
        edgeKeys.add([a, b].sort().join(':::'));
      }
      pathNodeNamesRef.current = names;
      pathLinkKeysRef.current = edgeKeys;

      if (fgRef.current && activePath.chain.length > 0) {
        setTimeout(() => {
          fgRef.current?.zoomToFit(800, 140, (node: any) => names.has(node.name));
        }, 300);
      }
    } else {
      pathNodeNamesRef.current = new Set();
      pathLinkKeysRef.current = new Set();
    }
    fgRef.current?.refresh();
  }, [activePath]);

  // Center on selected artist
  useEffect(() => {
    if (selectedArtist && fgRef.current) {
      const nodeObj = nodes.find((n) => n.name === selectedArtist.name || n.id === selectedArtist.id);
      if (nodeObj && nodeObj.x !== undefined && nodeObj.y !== undefined) {
        fgRef.current.centerAt(nodeObj.x, nodeObj.y, 800);
        fgRef.current.zoom(2.0, 800);
      }
    }
  }, [selectedArtist, nodes]);

  // Handle Node Hover
  const handleNodeHover = useCallback((node: NodeData | null) => {
    hoverNodeRef.current = node;
    if (node) {
      const neighbors = new Set<string>();
      linksRef.current.forEach((link) => {
        const sourceId = typeof link.source === 'object' ? (link.source as NodeData).name : link.source;
        const targetId = typeof link.target === 'object' ? (link.target as NodeData).name : link.target;
        if (sourceId === node.name) neighbors.add(targetId);
        if (targetId === node.name) neighbors.add(sourceId);
      });
      hoverNeighborsRef.current = neighbors;
    } else {
      hoverNeighborsRef.current = new Set();
    }
    fgRef.current?.refresh();
  }, []);

  // Custom Node Renderer — Cognodb-style volumetric radial halo glow & 3D orb spheres
  const drawNode = useCallback(
    (node: NodeData, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const time = Date.now() / 1000;
      const nodeSeed = (node.name ? node.name.charCodeAt(0) : 0) + (node.degree || 1);
      const pulse = Math.sin(time * 2.2 + nodeSeed) * 0.12 + 1.0; // Smooth breathing pulse

      const hoverNode = hoverNodeRef.current;
      const hoverNeighbors = hoverNeighborsRef.current;
      const pathNodeNames = pathNodeNamesRef.current;
      const activePath = activePathRef.current;
      const selectedArtist = selectedArtistRef.current;

      const isPathNode = pathNodeNames.has(node.name);
      const isHovered = hoverNode?.name === node.name;
      const isNeighbor = hoverNeighbors.has(node.name);
      const isSelected = selectedArtist?.name === node.name;

      const hasActiveContext = hoverNode !== null || activePath !== null || selectedArtist !== null;
      const isFocused = isPathNode || isHovered || isNeighbor || isSelected;

      const baseRadius = Math.max(14, Math.min(22, 14 + (node.degree || 2) * 1.1));
      const r = (isFocused ? baseRadius * 1.25 : baseRadius) * pulse;

      const x = node.x || 0;
      const y = node.y || 0;

      const avatar = getArtistAvatarData(node.name);
      const coreColor = isFocused ? ACCENT_COLOR : (avatar.color1 || '#00F2FE');
      const outerGlowColor = isFocused ? ACCENT_COLOR : (avatar.color2 || '#4FACFE');

      ctx.save();

      // Unfocused nodes recede smoothly
      ctx.globalAlpha = hasActiveContext && !isFocused ? 0.15 : 1.0;

      // 1. VOLUMETRIC RADIAL HALO GLOW (Cognodb Style Multi-layer Aura)
      const glowRadius = r * (isFocused ? 4.5 : 3.2) * pulse;
      const glowGrad = ctx.createRadialGradient(x, y, r * 0.15, x, y, glowRadius);
      glowGrad.addColorStop(0, hexToRgba(coreColor, isFocused ? 0.70 : 0.45));
      glowGrad.addColorStop(0.3, hexToRgba(outerGlowColor, isFocused ? 0.40 : 0.22));
      glowGrad.addColorStop(0.65, hexToRgba(outerGlowColor, isFocused ? 0.15 : 0.06));
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, 2 * Math.PI, false);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // 2. GLOSSY 3D SPHERICAL ORB CORE
      const orbGrad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      orbGrad.addColorStop(0, '#FFFFFF'); // Specular highlight
      orbGrad.addColorStop(0.2, coreColor);
      orbGrad.addColorStop(0.8, outerGlowColor);
      orbGrad.addColorStop(1, darkenHex(outerGlowColor, 40));

      // Outer Ring Rim
      ctx.beginPath();
      ctx.arc(x, y, r + 1.5, 0, 2 * Math.PI, false);
      ctx.fillStyle = isFocused ? '#FFFFFF' : hexToRgba(coreColor, 0.85);
      ctx.fill();

      // Orb Core Body
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI, false);
      ctx.fillStyle = orbGrad;
      ctx.fill();

      // 3. ARTIST AVATAR / INITIALS INSIDE ORB CORE
      let imageObj: HTMLImageElement | null = null;
      if (node.image_url) {
        if (!imageMapRef.current.has(node.image_url)) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = node.image_url;
          img.onload = () => fgRef.current?.refresh();
          img.onerror = () => { (img as any)._failed = true; };
          imageMapRef.current.set(node.image_url, img);
        }
        const cachedImg = imageMapRef.current.get(node.image_url);
        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0 && !(cachedImg as any)._failed) {
          imageObj = cachedImg;
        }
      }

      if (imageObj) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r * 0.85, 0, 2 * Math.PI, false);
        ctx.clip();
        ctx.drawImage(imageObj, x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);

        // Glass Sheen Overlay
        const sheenGrad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
        sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        sheenGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.05)');
        sheenGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
        ctx.fillStyle = sheenGrad;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.restore();
      } else {
        const initialsFontSize = Math.max(r * 0.65, 8);
        ctx.font = `800 ${initialsFontSize}px Inter, Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.fillText(avatar.initials, x, y + 1);
      }

      // Specular Top-Left Lens Highlight Dot
      ctx.beginPath();
      ctx.arc(x - r * 0.32, y - r * 0.32, r * 0.22, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.70)';
      ctx.fill();

      // 4. COGNODB MONOSPACE DARK GLASS PILL LABELS (:ArtistName)
      if (isFocused || globalScale > 1.25) {
        const fontSize = Math.max(12 / globalScale, 6);
        ctx.font = `600 ${fontSize}px "JetBrains Mono", "Fira Code", Monaco, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const labelText = `: ${node.name}`;
        const textWidth = ctx.measureText(labelText).width;
        const textY = y + r + glowRadius * 0.3 + fontSize;

        ctx.beginPath();
        ctx.roundRect(
          x - textWidth / 2 - 8,
          textY - fontSize / 2 - 4,
          textWidth + 16,
          fontSize + 8,
          6
        );
        ctx.fillStyle = isFocused ? 'rgba(15, 23, 42, 0.92)' : 'rgba(15, 23, 42, 0.75)';
        ctx.fill();
        ctx.strokeStyle = isFocused ? hexToRgba(ACCENT_COLOR, 0.8) : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = isFocused ? '#38BDF8' : '#F1F5F9';
        ctx.fillText(labelText, x, textY);
      }

      ctx.restore();
    },
    []
  );

  // Custom Edge Canvas Renderer with Energy Flow Particles
  const drawLink = useCallback(
    (link: LinkData, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const hoverNode = hoverNodeRef.current;
      const pathLinkKeys = pathLinkKeysRef.current;
      const activePath = activePathRef.current;
      const time = Date.now() / 1000;

      let sourceNode: NodeData | undefined;
      let targetNode: NodeData | undefined;

      if (typeof link.source === 'object') {
        sourceNode = link.source as NodeData;
      } else {
        sourceNode = nodesRef.current.find((n) => n.id === link.source || n.name === link.source);
      }

      if (typeof link.target === 'object') {
        targetNode = link.target as NodeData;
      } else {
        targetNode = nodesRef.current.find((n) => n.id === link.target || n.name === link.target);
      }

      if (!sourceNode || !targetNode || sourceNode.x === undefined || targetNode.x === undefined) return;

      const sourceName = sourceNode.name;
      const targetName = targetNode.name;
      const key = [sourceName, targetName].sort().join(':::');

      const isPathEdge = pathLinkKeys.has(key);
      const isHoverEdge = hoverNode && (hoverNode.name === sourceName || hoverNode.name === targetName);
      const hasActiveContext = hoverNode !== null || activePath !== null;

      const sx = sourceNode.x;
      const sy = sourceNode.y || 0;
      const tx = targetNode.x;
      const ty = targetNode.y || 0;

      ctx.save();

      if (isPathEdge) {
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = 3.5 / globalScale;
        ctx.strokeStyle = ACCENT_COLOR;
        ctx.shadowColor = ACCENT_COLOR;
        ctx.shadowBlur = 12;
      } else if (isHoverEdge) {
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 2.2 / globalScale;
        ctx.strokeStyle = ACCENT_COLOR;
        ctx.shadowColor = ACCENT_COLOR;
        ctx.shadowBlur = 8;
      } else if (hasActiveContext) {
        ctx.globalAlpha = 0.05;
        ctx.lineWidth = 1.0 / globalScale;
        ctx.strokeStyle = DEFAULT_LINK_COLOR;
      } else {
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 1.2 / globalScale;
        ctx.strokeStyle = DEFAULT_LINK_COLOR;
      }

      // Draw base edge line
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // Energy Pulse Particles along path/hover edges
      if (isPathEdge || isHoverEdge) {
        const linkSeed = (sourceName.charCodeAt(0) + targetName.charCodeAt(0)) % 10;
        const progress = ((time * 0.8 + linkSeed * 0.1) % 1);
        const px = sx + (tx - sx) * progress;
        const py = sy + (ty - sy) * progress;

        ctx.beginPath();
        ctx.arc(px, py, 3.5 / globalScale, 0, 2 * Math.PI, false);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = ACCENT_COLOR;
        ctx.shadowBlur = 10;
        ctx.fill();
      }

      ctx.restore();
    },
    []
  );

  const drawNodePointerArea = useCallback(
    (node: NodeData, color: string, ctx: CanvasRenderingContext2D) => {
      const baseRadius = Math.max(16, Math.min(24, 16 + (node.degree || 2) * 1.2));
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x || 0, node.y || 0, baseRadius + 14, 0, 2 * Math.PI, false);
      ctx.fill();
    },
    []
  );

  return (
    <div className="w-full h-screen bg-[#FAFAF8] relative">
      <ForceGraph2D
        ref={fgRef}
        graphData={{ nodes, links }}
        nodeId="name"
        nodeLabel={() => ''}
        nodeCanvasObject={drawNode}
        nodePointerAreaPaint={drawNodePointerArea}
        linkCanvasObject={drawLink}
        onNodeClick={(node) => onNodeClick(node as NodeData)}
        onNodeHover={(node) => handleNodeHover(node as NodeData | null)}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        cooldownTicks={200}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        backgroundColor="#FAFAF8"
      />
    </div>
  );
};
