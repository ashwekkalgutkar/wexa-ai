import React, { useRef, useCallback, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide } from 'd3-force';
import { NodeData, LinkData } from '../types/graph';
import { ACCENT_COLOR, DEFAULT_LINK_COLOR, DEFAULT_NODE_RING } from '../utils/colors';
import { getArtistAvatarData } from '../utils/avatar';
import { motion } from 'framer-motion';
import { X, Compass, Flame, Sparkles } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';

interface ExploreGraphViewProps {
  centerArtist: NodeData;
  neighbors: NodeData[];
  links: LinkData[];
  onSelectArtist: (artist: NodeData) => void;
  onClose: () => void;
}

const MAX_VISIBLE_NEIGHBORS = 16;

export const ExploreGraphView: React.FC<ExploreGraphViewProps> = ({
  centerArtist,
  neighbors,
  links,
  onSelectArtist,
  onClose,
}) => {
  const fgRef = useRef<any>(null);
  const imageMapRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [hoverNode, setHoverNode] = useState<NodeData | null>(null);

  // Cap visible collaborators to max 16 to avoid canvas clutter
  const visibleNeighbors = neighbors.slice(0, MAX_VISIBLE_NEIGHBORS);
  const overflowCount = Math.max(0, neighbors.length - MAX_VISIBLE_NEIGHBORS);

  // Prepare graph dataset containing ONLY center artist + capped 1-hop neighbors
  const displayNodes: NodeData[] = [centerArtist, ...visibleNeighbors];
  const displayNodeNames = new Set(displayNodes.map((n) => n.name));

  const displayLinks = links
    .map((l: any) => ({
      ...l,
      source: typeof l.source === 'object' ? l.source.name : l.source || l.from,
      target: typeof l.target === 'object' ? l.target.name : l.target || l.to,
    }))
    .filter((l: any) => displayNodeNames.has(l.source) && displayNodeNames.has(l.target));

  // Seed radial initial positions around center node so layout settles smoothly
  useEffect(() => {
    if (fgRef.current && displayNodes.length > 0) {
      centerArtist.x = 0;
      centerArtist.y = 0;

      visibleNeighbors.forEach((node, i) => {
        const angle = (i / visibleNeighbors.length) * 2 * Math.PI;
        const r = 200;
        node.x = Math.cos(angle) * r;
        node.y = Math.sin(angle) * r;
      });

      const charge = fgRef.current.d3Force('charge');
      if (charge) charge.strength(-600);

      const linkForce = fgRef.current.d3Force('link');
      if (linkForce) linkForce.distance(180);

      fgRef.current.d3Force('collide', forceCollide().radius(45));
      fgRef.current.d3ReheatSimulation();

      fgRef.current.centerAt(0, 0, 400);
      fgRef.current.zoom(1.4, 400);
    }
  }, [centerArtist.name]);

  // Custom Node Canvas Renderer
  const drawNode = useCallback(
    (node: NodeData, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isCenter = node.name === centerArtist.name;
      const isHovered = hoverNode?.name === node.name;
      const hasActiveHover = hoverNode !== null;

      const isFocused = isCenter || isHovered;

      const r = isCenter ? 26 : isHovered ? 24 : 20;
      const avatar = getArtistAvatarData(node.name);

      ctx.save();

      // Opacity: non-hovered neighbors recede to 15% when a neighbor is hovered
      if (hasActiveHover && !isFocused) {
        ctx.globalAlpha = 0.15;
      } else {
        ctx.globalAlpha = 1.0;
      }

      // Outer Ring Shadow / Glow for center or hovered node
      if (isFocused) {
        ctx.shadowColor = ACCENT_COLOR;
        ctx.shadowBlur = 14 * (globalScale / 2);
      }

      // 1. Draw Outer Ring Border
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

      // 4. Node Labels: Render artist name under every node in 1-hop explore view
      const fontSize = Math.max(12 / globalScale, 6);
      ctx.font = `700 ${fontSize}px Outfit, Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const textWidth = ctx.measureText(node.name).width;
      const textY = (node.y || 0) + r + fontSize * 1.1;

      // Glass pill background for label
      ctx.fillStyle = isFocused ? 'rgba(108, 92, 231, 0.95)' : 'rgba(255, 255, 255, 0.92)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
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

      // Text label
      ctx.fillStyle = isFocused ? '#FFFFFF' : '#1A1A1A';
      ctx.fillText(node.name, node.x || 0, textY);

      ctx.restore();
    },
    [centerArtist.name, hoverNode]
  );

  // Custom Edge Canvas Renderer: Real visible line connecting node centers
  const drawLink = useCallback(
    (link: LinkData, ctx: CanvasRenderingContext2D, globalScale: number) => {
      let sourceNode = typeof link.source === 'object' ? (link.source as NodeData) : displayNodes.find((n) => n.name === link.source);
      let targetNode = typeof link.target === 'object' ? (link.target as NodeData) : displayNodes.find((n) => n.name === link.target);

      if (!sourceNode || !targetNode || sourceNode.x === undefined || targetNode.x === undefined) return;

      const isHoverLink = hoverNode && (hoverNode.name === sourceNode.name || hoverNode.name === targetNode.name);

      ctx.save();
      if (isHoverLink) {
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 2.5 / globalScale;
        ctx.strokeStyle = ACCENT_COLOR;
      } else {
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 1.5 / globalScale;
        ctx.strokeStyle = DEFAULT_LINK_COLOR;
      }

      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y || 0);
      ctx.lineTo(targetNode.x, targetNode.y || 0);
      ctx.stroke();
      ctx.restore();
    },
    [displayNodes, hoverNode]
  );

  // Hit area detection for cursor hover & click events over canvas nodes
  const drawNodePointerArea = useCallback(
    (node: NodeData, color: string, ctx: CanvasRenderingContext2D) => {
      const r = node.name === centerArtist.name ? 30 : 26;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x || 0, node.y || 0, r + 4, 0, 2 * Math.PI, false);
      ctx.fill();
    },
    [centerArtist.name]
  );

  return (
    <div className="w-full h-screen bg-[#FAFAF8] relative z-0">
      {/* Top Floating Glass Header: Explore Info */}
      <div className="fixed top-20 left-6 z-30 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-4 rounded-3xl border border-white/90 shadow-xl max-w-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#6C5CE7]" />
              <span className="text-xs font-mono uppercase font-bold text-slate-400">1-Hop Neighborhood</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-2">
            {centerArtist.image_url && (
              <img src={centerArtist.image_url} alt={centerArtist.name} className="w-10 h-10 rounded-full object-cover shadow-sm shrink-0 border border-white" />
            )}
            <div>
              <h2 className="text-lg font-extrabold text-[#1A1A1A] font-display">
                {centerArtist.name}
              </h2>
              <p className="text-xs text-slate-500">
                Showing {visibleNeighbors.length} direct collaborators
                {overflowCount > 0 && <span className="font-semibold text-[#6C5CE7]"> (+{overflowCount} more)</span>}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono italic">
            Click any collaborator to re-center graph
          </p>
        </motion.div>
      </div>

      {/* Force-Directed Canvas for 1-hop view */}
      <ErrorBoundary fallbackTitle="Graph Canvas Render Error">
        <ForceGraph2D
          ref={fgRef}
          graphData={{ nodes: displayNodes, links: displayLinks }}
          nodeId="name"
          nodeLabel={() => ''}
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={drawNodePointerArea}
          linkCanvasObject={drawLink}
          onNodeClick={(node) => onSelectArtist(node as NodeData)}
          onNodeHover={(node) => {
            setHoverNode(node as NodeData | null);
            if (fgRef.current) {
              const canvas = fgRef.current.canvas?.();
              if (canvas) canvas.style.cursor = node ? 'pointer' : 'default';
            }
          }}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          cooldownTicks={150}
          d3AlphaDecay={0.015}
          backgroundColor="#FAFAF8"
        />
      </ErrorBoundary>
    </div>
  );
};
