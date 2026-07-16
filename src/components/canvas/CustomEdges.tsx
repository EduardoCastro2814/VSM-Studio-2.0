import React from 'react';
import { 
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
  BaseEdge,
  EdgeLabelRenderer
} from '@xyflow/react';
import { useProject } from '../../context/ProjectContext';

// Custom Markers definition component to put in the flow canvas
export const EdgeMarkers: React.FC = () => (
  <svg id="vsm-markers-svg" style={{ position: 'absolute', width: 0, height: 0 }} key="vsm-markers">
    <defs>
      {/* Dynamic Custom Flow Marker - Uses currentColor to match stroke color */}
      <marker
        id="vsm-arrow-custom"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
      </marker>
    </defs>
  </svg>
);

export const VsmEdge: React.FC<EdgeProps> = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  selected,
  data = {}
}) => {
  const { edges, debugConnections } = useProject();
  const edgeData = data as any;
  const edgeType = edgeData.type || 'physical'; // physical, info_manual, info_electronic, custom
  const routeStyle = edgeData.routeStyle || 'orthogonal'; // orthogonal, straight, curve

  // 1. Calculate path type
  let edgePath = '';
  let labelX = 0;
  let labelY = 0;

  if (routeStyle === 'straight') {
    const [path, lx, ly] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY
    });
    edgePath = path;
    labelX = lx;
    labelY = ly;
  } else if (routeStyle === 'curve') {
    // Quadratic bezier with parallel spacing offsets
    const parallelEdges = edges.filter(
      e => (e.source === source && e.target === target) || (e.source === target && e.target === source)
    );
    const total = parallelEdges.length;
    const idx = parallelEdges.findIndex(e => e.id === id);

    const mx = (sourceX + targetX) / 2;
    const my = (sourceY + targetY) / 2;
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const L = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;

    const spacing = 28;
    const offset = total > 1 ? (idx - (total - 1) / 2) * spacing : 0;

    const cx = mx + nx * offset;
    const cy = my + ny * offset;

    edgePath = `M ${sourceX},${sourceY} Q ${cx},${cy} ${targetX},${targetY}`;
    labelX = 0.25 * sourceX + 0.5 * cx + 0.25 * targetX;
    labelY = 0.25 * sourceY + 0.5 * cy + 0.25 * targetY;
  } else {
    // default: orthogonal (smooth step)
    const [path, lx, ly] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 8
    });
    edgePath = path;
    labelX = lx;
    labelY = ly;
  }

  // 2. Resolve edge visual configurations
  let strokeColor = '#1e293b'; // High visibility Dark Slate/Black
  let strokeDasharray = undefined;
  let strokeWidth = 3.0; // Minimum 3px for physical flows

  if (debugConnections) {
    // DEBUG MODE HIGHLIGHTS
    if (edgeType === 'physical') {
      strokeColor = '#ef4444'; // Red physical
      strokeWidth = 4.0;
      strokeDasharray = undefined;
    } else if (edgeType === 'info_manual') {
      strokeColor = '#2563eb'; // Blue manual
      strokeWidth = 3.0;
      strokeDasharray = '2,3';
    } else if (edgeType === 'info_electronic') {
      strokeColor = '#a855f7'; // Purple system
      strokeWidth = 3.0;
      strokeDasharray = '6,3';
    } else {
      strokeColor = '#f59e0b'; // Amber custom
      strokeWidth = 3.5;
    }
  } else {
    // STANDARD STYLING
    if (edgeType === 'physical') {
      strokeColor = edgeData.color || '#1e293b';
      strokeWidth = Number(edgeData.strokeWidth || 3.0);
      
      const lineStyle = edgeData.lineStyle || 'solid';
      if (lineStyle === 'dashed') {
        strokeDasharray = '6,4';
      } else if (lineStyle === 'dotted') {
        strokeDasharray = '2,3';
      }
    } else if (edgeType === 'info_manual') {
      strokeColor = edgeData.color || '#2563eb'; // Blue
      strokeWidth = Number(edgeData.strokeWidth || 2.0);
      strokeDasharray = '2,3'; // Dotted
    } else if (edgeType === 'info_electronic') {
      strokeColor = edgeData.color || '#a855f7'; // Purple
      strokeWidth = Number(edgeData.strokeWidth || 2.0);
      strokeDasharray = '8,4'; // Dashed
    } else if (edgeType === 'custom') {
      strokeColor = edgeData.color || '#475569';
      strokeWidth = Number(edgeData.strokeWidth || 2.5);
      
      const lineStyle = edgeData.lineStyle || 'solid';
      if (lineStyle === 'dashed') {
        strokeDasharray = '6,4';
      } else if (lineStyle === 'dotted') {
        strokeDasharray = '2,3';
      }
    }
  }

  // Selected state override highlight
  if (selected) {
    strokeColor = '#2563eb';
    strokeWidth = strokeWidth + 0.5;
  }

  const customStyle = {
    ...style,
    stroke: strokeColor,
    strokeDasharray,
    strokeWidth,
    opacity: 1, // 100% opacity
    color: strokeColor,
  };

  const showArrow = Boolean(edgeData.showArrow);
  const customMarkerEnd = showArrow ? 'url(#vsm-arrow-custom)' : undefined;
  const label = edgeData.label || '';

  // Log error if connectivity maps have missing vertices but still register
  if (!source || !target) {
    console.error(`Edge ERROR: Conexión huérfana detectada (ID: ${id})`);
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={customMarkerEnd} style={customStyle} id={id} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-2 py-0.5 text-[9px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-355 rounded shadow-sm select-none"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
