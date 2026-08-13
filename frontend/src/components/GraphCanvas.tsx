import React, { useRef, useCallback, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide } from 'd3-force';
import { NodeData, LinkData, PathResult } from '../types/graph';
import { ACCENT_COLOR, DEFAULT_LINK_COLOR, DEFAULT_NODE_RING } from '../utils/colors';
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

  // Handle Node Hover — write to refs, then immediately repaint
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

  // Custom Node Canvas Renderer — renders artist images inside canvas nodes
  const drawNode = useCallback(
    (node: NodeData, ctx: CanvasRenderingContext2D, globalScale: number) => {
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

      const baseRadius = Math.max(16, Math.min(24, 16 + (node.degree || 2) * 1.2));
      const r = isFocused ? baseRadius * 1.15 : baseRadius;

      const avatar = getArtistAvatarData(node.name);

      ctx.save();

      // Unfocused nodes recede when context is active
      ctx.globalAlpha = hasActiveContext && !isFocused ? 0.12 : 1.0;

      // Glow for focused nodes
      if (isFocused) {
        ctx.shadowColor = ACCENT_COLOR;
        ctx.shadowBlur = 14 * (globalScale / 2);
      }

      // 1. Outer ring border
      ctx.beginPath();
      ctx.arc(node.x || 0, node.y || 0, r + 2, 0, 2 * Math.PI, false);
      ctx.fillStyle = isFocused ? ACCENT_COLOR : DEFAULT_NODE_RING;
      ctx.fill();

      // 2. Load & Cache Artist Photo
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

      // 3. Render Node Avatar (Artist Image or Fallback Gradient + Initials)
      ctx.beginPath();
      ctx.arc(node.x || 0, node.y || 0, r, 0, 2 * Math.PI, false);

      if (imageObj) {
        ctx.save();
        ctx.clip();
        ctx.drawImage(imageObj, (node.x || 0) - r, (node.y || 0) - r, r * 2, r * 2);
        ctx.restore();
      } else {
        const gradient = ctx.createLinearGradient(
          (node.x || 0) - r,
          (node.y || 0) - r,
          (node.x || 0) + r,
          (node.y || 0) + r
        );
        gradient.addColorStop(0, avatar.color1);
        gradient.addColorStop(1, avatar.color2);
        ctx.fillStyle = gradient;
        ctx.fill();

        const initialsFontSize = Math.max(r * 0.75, 8);
        ctx.font = `700 ${initialsFontSize}px Outfit, Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = avatar.textColor;
        ctx.fillText(avatar.initials, node.x || 0, (node.y || 0) + 1);
      }

      // 4. Label: only on hover/focus/path/selection
      if (isFocused) {
        const fontSize = Math.max(12 / globalScale, 5);
        ctx.font = `700 ${fontSize}px Outfit, Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textWidth = ctx.measureText(node.name).width;
        const textY = (node.y || 0) + r + fontSize * 1.1;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(
          (node.x || 0) - textWidth / 2 - 6,
          textY - fontSize / 2 - 3,
          textWidth + 12,
          fontSize + 6,
          6
        );
        ctx.fill();

        ctx.fillStyle = '#1A1A1A';
        ctx.fillText(node.name, node.x || 0, textY);
      }

      ctx.restore();
    },
    [] // Empty deps — reads live values from refs
  );

  // Custom Edge Canvas Renderer — reads from refs
  const drawLink = useCallback(
    (link: LinkData, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const hoverNode = hoverNodeRef.current;
      const pathLinkKeys = pathLinkKeysRef.current;
      const activePath = activePathRef.current;

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

      ctx.save();

      if (isPathEdge) {
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = 3.5 / globalScale;
        ctx.strokeStyle = ACCENT_COLOR;
        ctx.shadowColor = ACCENT_COLOR;
        ctx.shadowBlur = 10;
      } else if (isHoverEdge) {
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 2.0 / globalScale;
        ctx.strokeStyle = ACCENT_COLOR;
      } else if (hasActiveContext) {
        ctx.globalAlpha = 0.05;
        ctx.lineWidth = 1.0 / globalScale;
        ctx.strokeStyle = DEFAULT_LINK_COLOR;
      } else {
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 1.2 / globalScale;
        ctx.strokeStyle = DEFAULT_LINK_COLOR;
      }

      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y || 0);
      ctx.lineTo(targetNode.x, targetNode.y || 0);
      ctx.stroke();

      ctx.restore();
    },
    [] // Empty deps — reads live values from refs
  );

  const drawNodePointerArea = useCallback(
    (node: NodeData, color: string, ctx: CanvasRenderingContext2D) => {
      const baseRadius = Math.max(16, Math.min(24, 16 + (node.degree || 2) * 1.2));
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x || 0, node.y || 0, baseRadius + 6, 0, 2 * Math.PI, false);
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
