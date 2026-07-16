import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useProject } from '../../context/ProjectContext';
import { 
  ProcessNode, 
  InventoryNode, 
  SupplierCustomerNode, 
  KaizenNode, 
  TransportNode, 
  InformationNode, 
  AuxiliaryNode,
  WaypointNode,
  WarehouseNode,
  KaizenImplementedNode
} from './CustomNodes';
import { VsmEdge, EdgeMarkers } from './CustomEdges';

const nodeTypes = {
  process: ProcessNode,
  inventory: InventoryNode,
  supplierCustomer: SupplierCustomerNode,
  kaizen: KaizenNode,
  transport: TransportNode,
  information: InformationNode,
  auxiliary: AuxiliaryNode,
  waypoint: WaypointNode,
  warehouse: WarehouseNode,
  kaizen_implemented: KaizenImplementedNode
};

const edgeTypes = {
  physical: VsmEdge,
  custom: VsmEdge,
  info_manual: VsmEdge,
  info_electronic: VsmEdge,
  push: VsmEdge,
  pull: VsmEdge
};

const CanvasInner: React.FC = () => {
  const { 
    nodes, 
    edges, 
    setNodes, 
    setEdges,
    onNodesChange, 
    onEdgesChange, 
    onConnect,
    selectedElement,
    setSelectedElement,
    theme,
    undo,
    redo,
    debugConnections,
    setDebugConnections
  } = useProject();

  const { screenToFlowPosition, fitView } = useReactFlow();
  const [gridVisible, setGridVisible] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [legendOpen, setLegendOpen] = useState(true);
  
  // Clipboard reference
  const copiedNodeRef = useRef<any>(null);

  // Drag and Drop implementation
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow-type');
      const label = event.dataTransfer.getData('application/reactflow-label');
      const details = event.dataTransfer.getData('application/reactflow-details');

      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Parse details
      const parsedDetails = details ? JSON.parse(details) : {};
      
      // Default node details
      let nodeData: any = { label };
      if (type === 'process') {
        nodeData = {
          label,
          ct: '10s',
          co: '5m',
          uptime: '95',
          operators: '1',
          scrap: '1.5',
          oee: '85',
          shifts: '1',
          notes: ''
        };
      } else if (type === 'inventory') {
        nodeData = {
          quantity: 200,
          time: '2d',
          dailyDemand: 100
        };
      } else if (type === 'supplierCustomer') {
        nodeData = {
          label,
          type: parsedDetails.type || 'cliente'
        };
      } else if (type === 'kaizen') {
        nodeData = {
          label: 'Idea Kaizen'
        };
      } else if (type === 'warehouse') {
        nodeData = {
          label: 'Almacén'
        };
      } else if (type === 'kaizen_implemented') {
        nodeData = {
          label: 'Kaizen Imp'
        };
      } else if (type === 'transport') {
        nodeData = {
          label,
          subType: parsedDetails.subType || 'camion'
        };
      } else if (type === 'information') {
        nodeData = {
          label,
          infoType: parsedDetails.infoType || 'programacion'
        };
      } else if (type === 'auxiliary') {
        nodeData = {
          label,
          auxType: parsedDetails.auxType || 'operador'
        };
      }

      const newNode = {
        id: `node-${crypto.randomUUID()}`,
        type,
        position,
        data: nodeData,
        // Allow canvas sizing style settings to hook in correctly
        style: { width: undefined, height: undefined }
      };

      setNodes((prev) => [...prev, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );

  // Key Event listeners for Hotkeys
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.getAttribute('contenteditable') === 'true'
      );

      if (isInputFocused) return;

      // Delete Node/Edge
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedElement) {
        event.preventDefault();
        const elementId = selectedElement.id;
        
        if ('position' in selectedElement) {
          // It's a Node
          setNodes((prev) => prev.filter((n) => n.id !== elementId));
          setEdges((prev) => prev.filter((e) => e.source !== elementId && e.target !== elementId));
        } else {
          // It's an Edge
          setEdges((prev) => prev.filter((e) => e.id !== elementId));
        }
        setSelectedElement(null);
      }

      // Copy: Ctrl + C
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        if (selectedElement && 'position' in selectedElement) {
          event.preventDefault();
          copiedNodeRef.current = selectedElement;
        }
      }

      // Duplicate Selection: Ctrl + D
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length > 0) {
          const clones = selectedNodes.map(n => ({
            ...n,
            id: `node-${crypto.randomUUID()}`,
            position: { x: n.position.x + 30, y: n.position.y + 30 },
            selected: true
          }));
          setNodes(prev => {
            const deselected = prev.map(n => n.selected ? { ...n, selected: false } : n);
            return [...deselected, ...clones];
          });
        }
      }

      // Paste: Ctrl + V
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        if (copiedNodeRef.current) {
          event.preventDefault();
          const sourceNode = copiedNodeRef.current;
          
          const newNode = {
            id: `node-${crypto.randomUUID()}`,
            type: sourceNode.type,
            position: {
              x: sourceNode.position.x + 40,
              y: sourceNode.position.y + 40,
            },
            data: JSON.parse(JSON.stringify(sourceNode.data)),
            style: sourceNode.style ? JSON.parse(JSON.stringify(sourceNode.style)) : undefined
          };
          
          setNodes((prev) => [...prev, newNode]);
        }
      }

      // Undo: Ctrl + Z
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        undo();
      }

      // Redo: Ctrl + Y
      if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElement, setNodes, setEdges, setSelectedElement, undo, redo]);

  return (
    <div className="w-full h-full relative" onDragOver={onDragOver} onDrop={onDrop}>
      <EdgeMarkers />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        snapToGrid={snapToGrid}
        snapGrid={[10, 10]}
        fitView
        colorMode={theme}
        className="w-full h-full"
      >
        {gridVisible && (
          <Background 
            color={theme === 'dark' ? '#334155' : '#cbd5e1'} 
            gap={20} 
            size={1} 
          />
        )}
        <MiniMap 
          style={{ height: 80, width: 120 }} 
          zoomable 
          pannable 
          className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800"
          nodeColor={(n) => {
            if (n.type === 'process') return '#10b981';
            if (n.type === 'inventory') return '#f59e0b';
            if (n.type === 'kaizen') return '#ef4444';
            if (n.type === 'kaizen_implemented') return '#22c55e';
            if (n.type === 'warehouse') return '#475569';
            return '#3b82f6';
          }}
        />
        <Controls 
          className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800 !text-slate-800 dark:!text-slate-200" 
        />
        
        {/* Toggle Panel top-right of canvas */}
        <Panel position="top-right" className="flex gap-2 bg-white dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg shadow-md select-none text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
            <input 
              type="checkbox" 
              checked={gridVisible} 
              onChange={() => setGridVisible(!gridVisible)} 
              className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Rejilla</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
            <input 
              type="checkbox" 
              checked={snapToGrid} 
              onChange={() => setSnapToGrid(!snapToGrid)} 
              className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Imán Grid</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-amber-650 dark:text-amber-500 font-bold select-none">
            <input 
              type="checkbox" 
              checked={debugConnections} 
              onChange={(e) => setDebugConnections(e.target.checked)} 
              className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
            />
            <span>Depurar Flujos</span>
          </label>
          <button 
            onClick={() => fitView({ duration: 500 })}
            className="px-2 py-1 text-blue-600 dark:text-blue-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
          >
            Ajustar
          </button>
        </Panel>

        {/* Collapsible VSM Flow Legend bottom-left */}
        <Panel position="bottom-left" className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shadow-md select-none text-[10px] w-44 transition-all">
          <button 
            onClick={() => setLegendOpen(!legendOpen)}
            className="w-full flex items-center justify-between font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider outline-none cursor-pointer"
          >
            <span>Leyenda de Flujos</span>
            <span className="font-mono text-xs text-slate-400">{legendOpen ? '▼' : '▲'}</span>
          </button>

          {legendOpen && (
            <div className="mt-2 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-2 text-slate-700 dark:text-slate-350 font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-7 h-1 bg-slate-800 dark:bg-slate-200 rounded" />
                <span>Flujo Físico</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 border-t border-dotted border-blue-500 border-2" />
                <span>Info Manual (Azul)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 border-t border-dashed border-purple-500 border-2" />
                <span>Info Electrónica (Morada)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 border-t border-dashed border-slate-450 dark:border-slate-600 border-2" />
                <span>Flujo Personalizado</span>
              </div>
            </div>
          )}
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const VsmCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
};
