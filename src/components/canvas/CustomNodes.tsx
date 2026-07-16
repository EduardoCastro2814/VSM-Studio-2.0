import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useProject } from '../../context/ProjectContext';
import { 
  User, 
  Settings, 
  HelpCircle, 
  Activity, 
  Clock, 
  Layers, 
  Percent
} from 'lucide-react';

// Inline Editable Label for double-click renaming
interface InlineEditableLabelProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
}

export const InlineEditableLabel: React.FC<InlineEditableLabelProps> = ({ value, onSave, className }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (text.trim() !== value) {
      onSave(text.trim());
    }
  };

  if (isEditing) {
    return (
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleBlur();
          }
        }}
        className="w-full p-1 text-[11px] font-bold border border-blue-500 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none resize-none font-sans"
        autoFocus
        rows={Math.max(1, text.split('\n').length)}
      />
    );
  }

  return (
    <span 
      onDoubleClick={() => setIsEditing(true)}
      className={`${className} cursor-text hover:bg-slate-205 dark:hover:bg-slate-800 rounded px-1 -mx-1 select-text whitespace-normal break-words leading-tight`}
      title="Doble clic para renombrar"
    >
      {value || 'Doble clic para editar'}
    </span>
  );
};

// 8 Bidirectional Connection Handles
const NodeHandles = () => (
  <>
    {/* Left (50% Y) */}
    <Handle type="target" position={Position.Left} id="l-tar" style={{ top: '50%' }} className="vsm-handle" />
    <Handle type="source" position={Position.Left} id="l-src" style={{ top: '50%' }} className="vsm-handle" />
    
    {/* Right (50% Y) */}
    <Handle type="target" position={Position.Right} id="r-tar" style={{ top: '50%' }} className="vsm-handle" />
    <Handle type="source" position={Position.Right} id="r-src" style={{ top: '50%' }} className="vsm-handle" />
    
    {/* Top (50% X) */}
    <Handle type="target" position={Position.Top} id="t-tar" style={{ left: '50%' }} className="vsm-handle" />
    <Handle type="source" position={Position.Top} id="t-src" style={{ left: '50%' }} className="vsm-handle" />
    
    {/* Bottom (50% X) */}
    <Handle type="target" position={Position.Bottom} id="b-tar" style={{ left: '50%' }} className="vsm-handle" />
    <Handle type="source" position={Position.Bottom} id="b-src" style={{ left: '50%' }} className="vsm-handle" />
    
    {/* Top-Left (20% X) */}
    <Handle type="target" position={Position.Top} id="tl-tar" style={{ left: '20%' }} className="vsm-handle" />
    <Handle type="source" position={Position.Top} id="tl-src" style={{ left: '20%' }} className="vsm-handle" />
    
    {/* Top-Right (80% X) */}
    <Handle type="target" position={Position.Top} id="tr-tar" style={{ left: '80%' }} className="vsm-handle" />
    <Handle type="source" position={Position.Top} id="tr-src" style={{ left: '80%' }} className="vsm-handle" />
    
    {/* Bottom-Left (20% X) */}
    <Handle type="target" position={Position.Bottom} id="bl-tar" style={{ left: '20%' }} className="vsm-handle" />
    <Handle type="source" position={Position.Bottom} id="bl-src" style={{ left: '20%' }} className="vsm-handle" />
    
    {/* Bottom-Right (80% X) */}
    <Handle type="target" position={Position.Bottom} id="br-tar" style={{ left: '80%' }} className="vsm-handle" />
    <Handle type="source" position={Position.Bottom} id="br-src" style={{ left: '80%' }} className="vsm-handle" />
  </>
);

// 1. Process Node + Data Box
export const ProcessNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useProject();
  const nodeData = data as any;
  const label = String(nodeData.label || 'Proceso');
  const ct = String(nodeData.ct !== undefined ? nodeData.ct : '0s');
  const co = String(nodeData.co !== undefined ? nodeData.co : '0s');
  const uptime = String(nodeData.uptime !== undefined ? nodeData.uptime : '100');
  const operators = String(nodeData.operators !== undefined ? nodeData.operators : '1');
  const scrap = String(nodeData.scrap !== undefined ? nodeData.scrap : '0');
  const oee = String(nodeData.oee !== undefined ? nodeData.oee : '100');
  const shifts = String(nodeData.shifts !== undefined ? nodeData.shifts : '1');

  // Custom styling
  const customBg = nodeData.bgColor || undefined;
  const customBorder = nodeData.borderColor || undefined;

  return (
    <div 
      className="flex flex-col shadow-lg rounded-lg border-2 text-xs w-full h-full overflow-hidden transition-colors bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
      style={{ backgroundColor: customBg, borderColor: customBorder }}
    >
      {selected && <NodeResizer minWidth={140} minHeight={110} color="#3b82f6" />}
      
      {/* Process Header */}
      <div className="bg-slate-100/90 dark:bg-slate-800/90 px-3 py-2 border-b border-slate-200 dark:border-slate-800 font-semibold flex items-start justify-between text-slate-800 dark:text-slate-200 gap-2 shrink-0">
        <InlineEditableLabel 
          value={label} 
          onSave={(val) => updateNodeData(id, { label: val })}
          className="flex-1 text-[11px] font-bold"
        />
        <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[9px] shrink-0 mt-0.5">
          <User size={9} />
          <span>{operators}</span>
        </div>
      </div>
      
      {/* Process Body / Icon */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-[30px] bg-white/40 dark:bg-transparent text-slate-400 dark:text-slate-500">
        <Settings size={18} className="animate-spin-slow text-slate-400 dark:text-slate-650" style={{ animationDuration: '10s' }} />
      </div>

      {/* Embedded Data Box */}
      <div className="bg-slate-50/90 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 p-2 font-mono text-[9px] text-slate-600 dark:text-slate-400 grid grid-cols-2 gap-x-2 gap-y-1 shrink-0">
        <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/40 pb-0.5">
          <span className="font-semibold text-slate-450 dark:text-slate-500">C/T:</span>
          <span className="text-slate-900 dark:text-slate-100 font-extrabold">{ct}</span>
        </div>
        <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/40 pb-0.5">
          <span className="font-semibold text-slate-450 dark:text-slate-500">C/O:</span>
          <span className="text-slate-900 dark:text-slate-100 font-extrabold">{co}</span>
        </div>
        <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/40 pb-0.5">
          <span className="font-semibold text-slate-450 dark:text-slate-500">Up:</span>
          <span className="text-slate-900 dark:text-slate-100 font-extrabold">{uptime}%</span>
        </div>
        <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/40 pb-0.5">
          <span className="font-semibold text-slate-450 dark:text-slate-500">OEE:</span>
          <span className="text-slate-900 dark:text-slate-100 font-extrabold">{oee}%</span>
        </div>
        <div className="flex justify-between pb-0.5">
          <span className="font-semibold text-slate-455 dark:text-slate-500">Scrap:</span>
          <span className="text-slate-900 dark:text-slate-100 font-extrabold">{scrap}%</span>
        </div>
        <div className="flex justify-between pb-0.5">
          <span className="font-semibold text-slate-455 dark:text-slate-500">Shifts:</span>
          <span className="text-slate-900 dark:text-slate-100 font-extrabold">{shifts}</span>
        </div>
      </div>
      
      <NodeHandles />
    </div>
  );
};

// 2. Inventory Node (Triangle)
export const InventoryNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useProject();
  const nodeData = data as any;
  const quantity = nodeData.quantity !== undefined ? Number(nodeData.quantity) : 0;
  const time = String(nodeData.time !== undefined ? nodeData.time : '0d');

  // Custom styling
  const customBg = nodeData.bgColor || undefined;
  const customBorder = nodeData.borderColor || undefined;

  return (
    <div className="flex flex-col items-center w-full h-full relative select-none">
      {selected && <NodeResizer minWidth={70} minHeight={80} color="#f59e0b" />}

      {/* Inventory Triangle Wrapper */}
      <div className="flex-1 w-full relative flex items-center justify-center min-h-[40px]">
        <svg 
          viewBox="0 0 100 85" 
          className="w-full h-full filter drop-shadow-md transition-all"
          fill="none"
        >
          <polygon 
            points="50,5 95,80 5,80" 
            className="fill-amber-50/90 dark:fill-amber-950/20"
            style={{ fill: customBg, stroke: customBorder || '#f59e0b', strokeWidth: selected ? 5 : 4 }}
          />
          <text 
            x="50" 
            y="58" 
            textAnchor="middle" 
            className="fill-amber-600 dark:fill-amber-500 font-black text-3xl"
            style={{ fill: customBorder }}
          >
            I
          </text>
        </svg>
      </div>

      {/* Inventory Labels */}
      <div className="mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 text-center shadow-sm w-full">
        <div className="text-[10px] font-black text-slate-800 dark:text-slate-200">
          <InlineEditableLabel 
            value={`${quantity} uds`} 
            onSave={(val) => {
              const parsed = parseInt(val);
              if (!isNaN(parsed)) updateNodeData(id, { quantity: parsed });
            }}
            className="font-bold text-[10px]"
          />
        </div>
        <div className="text-[9px] text-amber-650 dark:text-amber-500 font-bold mt-0.5">
          t: {time}
        </div>
      </div>

      <NodeHandles />
    </div>
  );
};

// 3. Customer / Supplier Node (Jagged roof factory outline)
export const SupplierCustomerNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useProject();
  const nodeData = data as any;
  const label = String(nodeData.label || 'Cliente');
  const type = String(nodeData.type || 'cliente');

  // Custom styling
  const customBg = nodeData.bgColor || undefined;
  const customBorder = nodeData.borderColor || undefined;

  return (
    <div 
      className="shadow-md border-2 rounded bg-white dark:bg-slate-900 overflow-hidden transition-colors w-full h-full flex flex-col border-indigo-500 dark:border-indigo-600"
      style={{ backgroundColor: customBg, borderColor: customBorder }}
    >
      {selected && <NodeResizer minWidth={110} minHeight={60} color="#6366f1" />}
      
      {/* Serrated Factory Roof SVG */}
      <div className="h-6 bg-indigo-500 dark:bg-indigo-600 relative overflow-hidden flex items-end shrink-0" style={{ backgroundColor: customBorder }}>
        <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-4 fill-white dark:fill-slate-900 absolute top-0" style={{ fill: customBg }}>
          <polygon points="0,0 20,20 20,0 40,20 40,0 60,20 60,0 80,20 80,0 100,20 100,0" />
        </svg>
        <span className="text-[8px] uppercase tracking-wider text-indigo-100 px-2 font-bold select-none pb-0.5">
          {type === 'proveedor' ? 'PROVEEDOR' : 'CLIENTE'}
        </span>
      </div>
      <div className="p-3 text-center text-xs font-bold text-slate-800 dark:text-slate-200 flex-1 flex items-center justify-center">
        <InlineEditableLabel 
          value={label} 
          onSave={(val) => updateNodeData(id, { label: val })}
          className="font-bold text-xs"
        />
      </div>
      
      <NodeHandles />
    </div>
  );
};

// 4. Kaizen Burst Node
export const KaizenNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useProject();
  const nodeData = data as any;
  const label = String(nodeData.label || 'Kaizen');

  // Custom styling
  const customBg = nodeData.bgColor || '#ef4444';
  const customBorder = nodeData.borderColor || '#f59e0b';

  return (
    <div className="flex items-center justify-center animate-kaizen relative cursor-pointer select-none w-full h-full">
      {selected && <NodeResizer minWidth={80} minHeight={80} color="#ef4444" />}
      
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full transition-all"
        style={{ filter: selected ? 'drop-shadow(0 0 8px rgba(37,99,235,0.7))' : 'drop-shadow(0 0 4px rgba(239,68,68,0.5))' }}
      >
        <polygon 
          points="50,5 60,25 80,20 72,40 95,50 72,60 80,80 60,75 50,95 40,75 20,80 28,60 5,50 28,40 20,20 40,25"
          className="fill-red-500 stroke-yellow-400"
          style={{ fill: customBg, stroke: customBorder, strokeWidth: selected ? 4 : 3 }}
        />
        <foreignObject x="18" y="25" width="64" height="50">
          <div className="w-full h-full flex items-center justify-center text-center p-0.5 overflow-hidden text-white">
            <InlineEditableLabel 
              value={label} 
              onSave={(val) => updateNodeData(id, { label: val })}
              className="font-black text-[9px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            />
          </div>
        </foreignObject>
      </svg>
      
      <NodeHandles />
    </div>
  );
};

// 5. Professional Logistics / Transport Node (Vector SVGs)
export const TransportNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useProject();
  const nodeData = data as any;
  const label = String(nodeData.label || 'Transporte');
  const sub = String(nodeData.subType || 'camion'); // camion, trailer, montacargas, tren, camioneta, carrito, barco, contenedor, puerto, avion, aeropuerto, express

  const customBg = nodeData.bgColor || undefined;
  const customBorder = nodeData.borderColor || undefined;

  // Custom visual SVG Renderers for the 12 Transport Types
  const renderTransportIcon = () => {
    switch (sub) {
      // LAND Logistics
      case 'camion':
        return (
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current text-emerald-650 dark:text-emerald-450">
            <path d="M19 8h-2.5V5.5c0-.8-.7-1.5-1.5-1.5H3c-.8 0-1.5.7-1.5 1.5v10c0 .8.7 1.5 1.5 1.5h1c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5h6c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5h1.5c.8 0 1.5-.7 1.5-1.5v-6L19 8zm-12.5 9.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm10 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5z" />
          </svg>
        );
      case 'trailer':
        return (
          <svg viewBox="0 0 24 24" className="w-10 h-7 fill-current text-emerald-600 dark:text-emerald-400">
            <rect x="1" y="6" width="13" height="10" rx="1" />
            <path d="M15 9h2v7h1.5l1.5-3v-4h-5z" />
            <circle cx="4" cy="18" r="2" />
            <circle cx="10" cy="18" r="2" />
            <circle cx="17" cy="18" r="2" />
          </svg>
        );
      case 'montacargas':
        return (
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-current stroke-2 text-emerald-650">
            <circle cx="6" cy="18" r="2" />
            <circle cx="15" cy="18" r="2" />
            <path d="M3 18h1v-7h6v7m3 0h3v-9h-5" />
            <path d="M21 5v13h-2" />
            <path d="M19 9h4" strokeWidth="1.5" />
            <path d="M19 14h4" strokeWidth="1.5" />
          </svg>
        );
      case 'tren':
        return (
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current text-emerald-700 dark:text-emerald-350">
            <rect x="2" y="6" width="20" height="9" rx="2" />
            <circle cx="6" cy="18" r="2" />
            <circle cx="12" cy="18" r="2" />
            <circle cx="18" cy="18" r="2" />
            <path d="M2 10h20M2 13h20" stroke="#fff" strokeWidth="1" />
          </svg>
        );
      case 'camioneta':
        return (
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current text-emerald-600">
            <path d="M18 10V6a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1.5a2.5 2.5 0 0 0 5 0h4a2.5 2.5 0 0 0 5 0H21a2 2 0 0 0 2-2v-4z" />
          </svg>
        );
      case 'carrito':
        return (
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-current stroke-2 text-emerald-500">
            <circle cx="8" cy="20" r="2" />
            <circle cx="18" cy="20" r="2" />
            <path d="M2 2h4l4 12h10l2-8H6.5" />
          </svg>
        );

      // SEA Logistics
      case 'barco':
        return (
          <svg viewBox="0 0 24 24" className="w-9 h-8 fill-current text-cyan-600 dark:text-cyan-400">
            <path d="M2 14.5l1.5 4h17l1.5-4H2z" />
            <rect x="5" y="8" width="4" height="5" />
            <rect x="10" y="6" width="4" height="7" />
            <rect x="15" y="9" width="4" height="4" />
            <path d="M1 20h22" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        );
      case 'contenedor':
        return (
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-current stroke-2 text-cyan-605">
            <rect x="2" y="5" width="20" height="12" rx="1.5" />
            <path d="M6 5v12M10 5v12M14 5v12M18 5v12" />
          </svg>
        );
      case 'puerto':
        return (
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-current stroke-2 text-cyan-700">
            <path d="M3 20h18M6 20v-8h4v8m5-12h3v12" />
            <path d="M11 6l3 2v-4zM2 10h12" />
          </svg>
        );

      // AIR Logistics
      case 'avion':
        return (
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current text-sky-500">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        );
      case 'aeropuerto':
        return (
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-current stroke-2 text-sky-600">
            <path d="M3 21h18M5 21V9h6v12M15 21v-7h4v7" />
            <circle cx="8" cy="5" r="2" />
            <path d="M13 10h4" />
          </svg>
        );
      case 'express':
        return (
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-current stroke-2 text-sky-400">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" className="fill-current" />
          </svg>
        );
      default:
        return <Activity size={20} />;
    }
  };

  return (
    <div 
      className="p-2.5 bg-white dark:bg-slate-900 border-2 rounded-lg shadow-md flex items-center gap-2.5 transition-colors text-xs w-full h-full border-emerald-500 dark:border-emerald-600"
      style={{ backgroundColor: customBg, borderColor: customBorder }}
    >
      {selected && <NodeResizer minWidth={110} minHeight={50} color="#10b981" />}
      
      <div className="shrink-0">
        {renderTransportIcon()}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <InlineEditableLabel 
          value={label} 
          onSave={(val) => updateNodeData(id, { label: val })}
          className="font-bold text-slate-800 dark:text-slate-200 leading-tight"
        />
        <div className="text-[9px] text-slate-400 dark:text-slate-500 capitalize select-none mt-0.5">{sub}</div>
      </div>
      
      <NodeHandles />
    </div>
  );
};

// 6. Information Flow Node (Manual, Electronic, Scheduling)
export const InformationNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useProject();
  const nodeData = data as any;
  const label = String(nodeData.label || 'Programación');
  const infoType = String(nodeData.infoType || 'programacion'); // programacion, kanban_prod, kanban_ret

  // Custom styling
  const customBg = nodeData.bgColor || undefined;
  const customBorder = nodeData.borderColor || undefined;

  return (
    <div 
      className="p-2.5 bg-white dark:bg-slate-900 border-2 rounded-lg shadow-md flex items-center gap-2.5 transition-colors text-xs w-full h-full border-purple-500 dark:border-purple-650"
      style={{ backgroundColor: customBg, borderColor: customBorder }}
    >
      {selected && <NodeResizer minWidth={110} minHeight={50} color="#a855f7" />}
      
      <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/20 text-purple-650 dark:text-purple-400 shrink-0">
        <Layers size={20} />
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <InlineEditableLabel 
          value={label} 
          onSave={(val) => updateNodeData(id, { label: val })}
          className="font-bold text-slate-800 dark:text-slate-200 leading-tight"
        />
        <div className="text-[9px] text-slate-400 dark:text-slate-500 select-none mt-0.5">
          {infoType === 'programacion' ? 'Prog. Semanal' : infoType === 'kanban_prod' ? 'Kanban Prod.' : 'Kanban Retiro'}
        </div>
      </div>
      
      <NodeHandles />
    </div>
  );
};

// 7. Auxiliary Icons (Operator, Delay, Inspection, Quality)
export const AuxiliaryNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useProject();
  const nodeData = data as any;
  const label = String(nodeData.label || 'Operador');
  const auxType = String(nodeData.auxType || 'operador'); // operador, espera, inspeccion, calidad

  // Custom styling
  const customBg = nodeData.bgColor || undefined;
  const customBorder = nodeData.borderColor || undefined;

  const getIcon = () => {
    switch (auxType) {
      case 'operador':
        return <User size={18} className="text-blue-650 dark:text-blue-400" />;
      case 'espera':
        return <Clock size={18} className="text-orange-500 dark:text-orange-450" />;
      case 'inspeccion':
        return <Activity size={18} className="text-amber-550 dark:text-amber-450" />;
      case 'calidad':
        return <Percent size={18} className="text-teal-600 dark:text-teal-400" />;
      default:
        return <HelpCircle size={18} />;
    }
  };

  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border shadow-sm rounded-full transition-colors text-[11px] font-semibold w-full h-full border-slate-300 dark:border-slate-700 justify-center"
      style={{ backgroundColor: customBg, borderColor: customBorder }}
    >
      {selected && <NodeResizer minWidth={80} minHeight={36} color="#64748b" />}
      
      <div className="shrink-0">{getIcon()}</div>
      <InlineEditableLabel 
        value={label} 
        onSave={(val) => updateNodeData(id, { label: val })}
        className="text-slate-750 dark:text-slate-350 font-bold"
      />
      
      <NodeHandles />
    </div>
  );
};

// 8. Waypoint Node (Route routing point)
export const WaypointNode: React.FC<NodeProps> = ({ selected }) => {
  return (
    <div 
      className={`w-3.5 h-3.5 rounded-full border border-white transition-all shadow ${
        selected ? 'bg-blue-600 scale-125 ring-2 ring-blue-400' : 'bg-slate-400 dark:bg-slate-650'
      }`}
    >
      <NodeHandles />
    </div>
  );
};

// 9. Warehouse Node (Lean Almacén)
export const WarehouseNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useProject();
  const nodeData = data as any;
  const label = String(nodeData.label || 'Almacén');

  return (
    <div className="flex flex-col items-center justify-center relative cursor-pointer select-none w-full h-full p-2 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm transition-all">
      {selected && <NodeResizer minWidth={80} minHeight={80} color="#2563eb" />}
      
      <svg 
        viewBox="0 0 100 100" 
        className="w-12 h-12 text-slate-600 dark:text-slate-400 mb-1 shrink-0"
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3.5"
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M10 90V40L35 25L60 40L85 25V90H10Z" fill="currentColor" fillOpacity="0.1" />
        <rect x="25" y="60" width="20" height="30" rx="1" fill="currentColor" fillOpacity="0.2" />
        <rect x="55" y="65" width="20" height="25" rx="1" fill="currentColor" fillOpacity="0.2" />
        <line x1="25" y1="70" x2="45" y2="70" />
        <line x1="25" y1="80" x2="45" y2="80" />
        <line x1="55" y1="75" x2="75" y2="75" />
      </svg>

      <div className="text-center w-full px-1 overflow-hidden">
        <InlineEditableLabel 
          value={label} 
          onSave={(val) => updateNodeData(id, { label: val })}
          className="font-bold text-[10px] text-slate-800 dark:text-slate-100"
        />
      </div>

      <NodeHandles />
    </div>
  );
};

// 10. Kaizen Implemented Node (Lean Kaizen Cerrado - Green Burst)
export const KaizenImplementedNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useProject();
  const nodeData = data as any;
  const label = String(nodeData.label || 'Kaizen Imp');
  
  const customBg = nodeData.bgColor || '#22c55e'; // Green
  const customBorder = nodeData.borderColor || '#15803d'; // Dark Green

  return (
    <div className="flex items-center justify-center relative cursor-pointer select-none w-full h-full">
      {selected && <NodeResizer minWidth={80} minHeight={80} color="#22c55e" />}
      
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full transition-all"
        style={{ filter: selected ? 'drop-shadow(0 0 8px rgba(34,197,94,0.7))' : 'drop-shadow(0 0 4px rgba(34,197,94,0.5))' }}
      >
        <polygon 
          points="50,5 60,25 80,20 72,40 95,50 72,60 80,80 60,75 50,95 40,75 20,80 28,60 5,50 28,40 20,20 40,25"
          className="fill-green-500 stroke-green-700"
          style={{ fill: customBg, stroke: customBorder, strokeWidth: selected ? 4 : 3 }}
        />
        <foreignObject x="18" y="20" width="64" height="60">
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-0.5 overflow-hidden text-white leading-tight">
            <svg className="w-3.5 h-3.5 text-white mb-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <InlineEditableLabel 
              value={label} 
              onSave={(val) => updateNodeData(id, { label: val })}
              className="font-black text-[9px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            />
          </div>
        </foreignObject>
      </svg>
      
      <NodeHandles />
    </div>
  );
};
