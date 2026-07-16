import React, { useState } from 'react';
import { 
  Play, 
  Triangle, 
  ArrowRightLeft, 
  ArrowRight,
  Shuffle, 
  Truck, 
  FileText,
  User,
  Clock,
  Activity,
  Award,
  ChevronDown,
  ChevronRight,
  Database,
  Building,
  UserCheck,
  Ship,
  Plane,
  Anchor,
  Layers
} from 'lucide-react';

interface SymbolItemProps {
  type: string;
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  details?: object;
}

const SymbolItem: React.FC<SymbolItemProps> = ({ type, label, icon, bgColor, details = {} }) => {
  const onDragStart = (event: React.DragEvent, nodeType: string, nodeLabel: string) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.setData('application/reactflow-label', nodeLabel);
    event.dataTransfer.setData('application/reactflow-details', JSON.stringify(details));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type, label)}
      className="flex items-center gap-2 p-2 mb-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-grab hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm transition-all select-none group active:cursor-grabbing"
    >
      <div className={`p-1.5 rounded ${bgColor} text-white transition-transform group-hover:scale-105`}>
        {icon}
      </div>
      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 truncate">
        {label}
      </span>
    </div>
  );
};

export const SidebarLeft: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    procesos: true,
    material: true,
    info: true,
    transp: false,
    entidades: true,
    aux: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const SectionHeader: React.FC<{ id: string; title: string }> = ({ id, title }) => {
    const isExpanded = expandedSections[id];
    return (
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between py-1.5 px-1 mt-3 mb-1 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
      >
        <span>{title}</span>
        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
    );
  };

  return (
    <aside className="w-[200px] h-full border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col p-3 select-none overflow-y-auto">
      <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2 select-none">
        BIBLIOTECA LEAN
      </div>
      
      {/* 1. PROCESOS */}
      <SectionHeader id="procesos" title="Procesos" />
      {expandedSections.procesos && (
        <div className="grid grid-cols-1 gap-1">
          <SymbolItem 
            type="process" 
            label="Proceso" 
            bgColor="bg-emerald-500" 
            icon={<Activity size={13} />} 
          />
          <SymbolItem 
            type="process" 
            label="Proceso Compartido" 
            bgColor="bg-emerald-600" 
            icon={<Database size={13} />} 
            details={{ isShared: true }}
          />
        </div>
      )}

      {/* 2. MATERIAL */}
      <SectionHeader id="material" title="Material" />
      {expandedSections.material && (
        <div className="grid grid-cols-1 gap-1">
          <SymbolItem 
            type="inventory" 
            label="Inventario" 
            bgColor="bg-amber-500" 
            icon={<Triangle size={13} className="rotate-180 fill-current" />} 
          />
          <SymbolItem 
            type="inventory" 
            label="Supermercado" 
            bgColor="bg-amber-600" 
            icon={<Database size={13} />} 
            details={{ isSupermarket: true }}
          />
          <SymbolItem 
            type="inventory" 
            label="FIFO" 
            bgColor="bg-amber-700" 
            icon={<ArrowRightLeft size={13} />} 
            details={{ isFifo: true }}
          />
        </div>
      )}

      {/* 3. INFORMACIÓN */}
      <SectionHeader id="info" title="Información" />
      {expandedSections.info && (
        <div className="grid grid-cols-1 gap-1">
          <SymbolItem 
            type="information" 
            label="Programación" 
            bgColor="bg-purple-500" 
            icon={<FileText size={13} />} 
            details={{ infoType: 'programacion' }}
          />
          <SymbolItem 
            type="information" 
            label="Kanban Producción" 
            bgColor="bg-purple-600" 
            icon={<Shuffle size={13} />} 
            details={{ infoType: 'kanban_prod' }}
          />
          <SymbolItem 
            type="information" 
            label="Kanban Retiro" 
            bgColor="bg-purple-700" 
            icon={<ArrowRight size={13} />} 
            details={{ infoType: 'kanban_ret' }}
          />
        </div>
      )}

      {/* 4. TRANSPORTE */}
      <SectionHeader id="transp" title="Transporte" />
      {expandedSections.transp && (
        <div className="flex flex-col gap-2.5">
          {/* Terrestre */}
          <div>
            <div className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-slate-500 mb-1 pl-1 select-none">Terrestre</div>
            <div className="grid grid-cols-1 gap-1">
              <SymbolItem type="transport" label="Camión" bgColor="bg-indigo-500" icon={<Truck size={12} />} details={{ subType: 'camion' }} />
              <SymbolItem type="transport" label="Tráiler" bgColor="bg-indigo-500" icon={<Truck size={12} className="scale-x-125" />} details={{ subType: 'trailer' }} />
              <SymbolItem type="transport" label="Montacargas" bgColor="bg-indigo-600" icon={<Activity size={12} />} details={{ subType: 'montacargas' }} />
              <SymbolItem type="transport" label="Tren de Carga" bgColor="bg-indigo-600" icon={<Layers size={12} />} details={{ subType: 'tren' }} />
              <SymbolItem type="transport" label="Camioneta" bgColor="bg-indigo-700" icon={<Truck size={12} />} details={{ subType: 'camioneta' }} />
              <SymbolItem type="transport" label="Carrito Interno" bgColor="bg-indigo-700" icon={<User size={12} />} details={{ subType: 'carrito' }} />
            </div>
          </div>

          {/* Marítimo */}
          <div>
            <div className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-slate-500 mb-1 pl-1 select-none">Marítimo</div>
            <div className="grid grid-cols-1 gap-1">
              <SymbolItem type="transport" label="Barco de Carga" bgColor="bg-cyan-600" icon={<Ship size={12} />} details={{ subType: 'barco' }} />
              <SymbolItem type="transport" label="Contenedor Marítimo" bgColor="bg-cyan-600" icon={<Layers size={12} />} details={{ subType: 'contenedor' }} />
              <SymbolItem type="transport" label="Puerto de Carga" bgColor="bg-cyan-750" icon={<Anchor size={12} />} details={{ subType: 'puerto' }} />
            </div>
          </div>

          {/* Aéreo */}
          <div>
            <div className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-slate-500 mb-1 pl-1 select-none">Aéreo</div>
            <div className="grid grid-cols-1 gap-1">
              <SymbolItem type="transport" label="Avión de Carga" bgColor="bg-sky-500" icon={<Plane size={12} />} details={{ subType: 'avion' }} />
              <SymbolItem type="transport" label="Aeropuerto" bgColor="bg-sky-500" icon={<Plane size={12} className="rotate-45" />} details={{ subType: 'aeropuerto' }} />
              <SymbolItem type="transport" label="Aéreo Urgente" bgColor="bg-sky-600" icon={<Play size={12} className="rotate-90" />} details={{ subType: 'express' }} />
            </div>
          </div>
        </div>
      )}

      {/* 5. ENTIDADES */}
      <SectionHeader id="entidades" title="Cliente/Proveedor" />
      {expandedSections.entidades && (
        <div className="grid grid-cols-1 gap-1">
          <SymbolItem 
            type="supplierCustomer" 
            label="Proveedor" 
            bgColor="bg-teal-500" 
            icon={<Building size={13} />} 
            details={{ type: 'proveedor' }}
          />
          <SymbolItem 
            type="supplierCustomer" 
            label="Cliente" 
            bgColor="bg-teal-600" 
            icon={<UserCheck size={13} />} 
            details={{ type: 'cliente' }}
          />
        </div>
      )}

      {/* 6. ICONOS AUXILIARES */}
      <SectionHeader id="aux" title="Iconos Auxiliares" />
      {expandedSections.aux && (
        <div className="grid grid-cols-1 gap-1">
          <SymbolItem 
            type="kaizen" 
            label="Kaizen Burst" 
            bgColor="bg-red-500" 
            icon={<Play size={13} className="rotate-90 fill-current" />} 
          />
          <SymbolItem 
            type="auxiliary" 
            label="Operador" 
            bgColor="bg-sky-500" 
            icon={<User size={13} />} 
            details={{ auxType: 'operador' }}
          />
          <SymbolItem 
            type="auxiliary" 
            label="Espera / Demora" 
            bgColor="bg-orange-500" 
            icon={<Clock size={13} />} 
            details={{ auxType: 'espera' }}
          />
          <SymbolItem 
            type="auxiliary" 
            label="Inspección" 
            bgColor="bg-amber-500" 
            icon={<Activity size={13} />} 
            details={{ auxType: 'inspeccion' }}
          />
          <SymbolItem 
            type="auxiliary" 
            label="Control de Calidad" 
            bgColor="bg-emerald-600" 
            icon={<Award size={13} />} 
            details={{ auxType: 'calidad' }}
          />
          <SymbolItem 
            type="waypoint" 
            label="Punto de Ruta" 
            bgColor="bg-slate-500" 
            icon={<Layers size={12} />} 
          />
        </div>
      )}
    </aside>
  );
};
