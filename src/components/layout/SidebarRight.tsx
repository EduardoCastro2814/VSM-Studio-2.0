import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { 
  Settings, 
  Trash2, 
  Sliders, 
  Activity, 
  Layers, 
  RefreshCw,
  Palette,
  Maximize2,
  MessageSquare
} from 'lucide-react';

export const SidebarRight: React.FC = () => {
  const { 
    selectedElement, 
    updateNodeData, 
    updateEdgeData, 
    setNodes, 
    setEdges, 
    setSelectedElement 
  } = useProject();

  if (!selectedElement) {
    return (
      <aside className="w-[280px] h-full border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col items-center justify-center p-6 text-center select-none text-slate-400 dark:text-slate-500">
        <Sliders size={28} className="mb-2 stroke-1" />
        <p className="text-xs font-semibold">Inspector de Propiedades</p>
        <p className="text-[10px] mt-1">Selecciona un elemento en el lienzo para editar sus datos.</p>
      </aside>
    );
  }

  const isNode = 'position' in selectedElement;
  const id = selectedElement.id;
  const element = selectedElement as any;

  const handleDelete = () => {
    if (isNode) {
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    } else {
      setEdges((prev) => prev.filter((e) => e.id !== id));
    }
    setSelectedElement(null);
  };

  // Helper to adjust node sizes directly in React Flow state
  const handleUpdateSize = (width: number | undefined, height: number | undefined) => {
    setNodes(prev => prev.map(n => {
      if (n.id === id) {
        return {
          ...n,
          style: {
            ...n.style,
            width: width ?? undefined,
            height: height ?? undefined
          },
          width: width ?? undefined,
          height: height ?? undefined
        };
      }
      return n;
    }));
  };

  const handleResetSize = () => {
    handleUpdateSize(undefined, undefined);
  };

  const handleUpdateKaizenStatus = (newStatus: string) => {
    const newType = newStatus === 'closed' ? 'kaizen_implemented' : 'kaizen';
    setNodes(prev => prev.map(n => {
      if (n.id === id) {
        return {
          ...n,
          type: newType,
          data: {
            ...n.data,
            status: newStatus
          }
        };
      }
      return n;
    }));
    setSelectedElement({
      ...selectedElement,
      type: newType,
      data: {
        ...(selectedElement as any).data,
        status: newStatus
      }
    } as any);
  };

  return (
    <aside className="w-[280px] h-full border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col p-4 overflow-y-auto select-none shrink-0">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
        <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Settings size={14} className="text-blue-500" />
          <span>PROPIEDADES</span>
        </div>
        <button
          onClick={handleDelete}
          className="text-red-500 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
          title="Eliminar elemento"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="flex-1 space-y-4">
        {isNode ? (
          // NODE (SYMBOL) PROPERTIES
          <>
            {/* 1. Name & Text */}
            {element.type !== 'inventory' && (
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 mb-1">
                  Nombre del Símbolo
                </label>
                <input
                  type="text"
                  value={element.data.label || ''}
                  onChange={(e) => updateNodeData(id, { label: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {/* 2. Visual Styling (Colors) */}
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <div className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-2">
                <Palette size={11} className="text-blue-500" />
                <span>Diseño y Colores</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] text-slate-450 dark:text-slate-500 mb-0.5">
                    Fondo (Color)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="color"
                      value={element.data.bgColor || '#ffffff'}
                      onChange={(e) => updateNodeData(id, { bgColor: e.target.value })}
                      className="w-7 h-7 p-0.5 rounded border border-slate-200 dark:border-slate-800 bg-transparent cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={element.data.bgColor || ''}
                      onChange={(e) => updateNodeData(id, { bgColor: e.target.value })}
                      placeholder="#ffffff"
                      className="flex-1 w-0 px-2 py-0.5 text-[10px] border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] text-slate-455 dark:text-slate-500 mb-0.5">
                    Borde (Color)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="color"
                      value={element.data.borderColor || '#94a3b8'}
                      onChange={(e) => updateNodeData(id, { borderColor: e.target.value })}
                      className="w-7 h-7 p-0.5 rounded border border-slate-200 dark:border-slate-800 bg-transparent cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={element.data.borderColor || ''}
                      onChange={(e) => updateNodeData(id, { borderColor: e.target.value })}
                      placeholder="#94a3b8"
                      className="flex-1 w-0 px-2 py-0.5 text-[10px] border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Manual Resizing */}
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <div className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-2">
                <Maximize2 size={11} className="text-blue-500" />
                <span>Dimensiones (Tamaño)</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] text-slate-455 dark:text-slate-500 mb-0.5">
                    Ancho (Width)
                  </label>
                  <input
                    type="number"
                    min="40"
                    value={element.style?.width || element.width || ''}
                    placeholder="Auto"
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      handleUpdateSize(val, element.style?.height || element.height);
                    }}
                    className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-455 dark:text-slate-500 mb-0.5">
                    Alto (Height)
                  </label>
                  <input
                    type="number"
                    min="30"
                    value={element.style?.height || element.height || ''}
                    placeholder="Auto"
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      handleUpdateSize(element.style?.width || element.width, val);
                    }}
                    className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              
              <button
                onClick={handleResetSize}
                className="w-full mt-1.5 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-350 rounded font-semibold border border-slate-200 dark:border-slate-700/60"
              >
                Restablecer Tamaño
              </button>
            </div>

            {/* 4. PROCESS NODE METRICS */}
            {element.type === 'process' && (
              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <div className="text-[10px] uppercase font-black text-blue-500 dark:text-blue-400 flex items-center gap-1.5">
                  <Activity size={10} />
                  <span>Métricas de Proceso</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                      Cycle Time (CT)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 10s, 2.5m"
                      value={element.data.ct || ''}
                      onChange={(e) => updateNodeData(id, { ct: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                      Changeover (CO)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5m, 1h"
                      value={element.data.co || ''}
                      onChange={(e) => updateNodeData(id, { co: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                      Uptime (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={element.data.uptime || ''}
                      onChange={(e) => updateNodeData(id, { uptime: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                      OEE (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={element.data.oee || ''}
                      onChange={(e) => updateNodeData(id, { oee: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                      Operadores
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={element.data.operators || ''}
                      onChange={(e) => updateNodeData(id, { operators: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                      Scrap (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={element.data.scrap || ''}
                      onChange={(e) => updateNodeData(id, { scrap: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                      Turnos (Shifts)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={element.data.shifts || ''}
                      onChange={(e) => updateNodeData(id, { shifts: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. INVENTORY NODE SPECIALIZED FIELDS */}
            {element.type === 'inventory' && (
              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <div className="text-[10px] uppercase font-black text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
                  <Layers size={10} />
                  <span>Datos de Inventario</span>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                    Cantidad (Unidades)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={element.data.quantity || 0}
                    onChange={(e) => {
                      const qty = Number(e.target.value);
                      const demand = Number(element.data.dailyDemand || 100);
                      const calculatedTime = demand > 0 ? `${(qty / demand).toFixed(1)}d` : '0d';
                      updateNodeData(id, { quantity: qty, time: calculatedTime });
                    }}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                    Demanda Diaria
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={element.data.dailyDemand || 100}
                    onChange={(e) => {
                      const demand = Number(e.target.value);
                      const qty = Number(element.data.quantity || 0);
                      const calculatedTime = demand > 0 ? `${(qty / demand).toFixed(1)}d` : '0d';
                      updateNodeData(id, { dailyDemand: demand, time: calculatedTime });
                    }}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1 flex justify-between">
                    <span>Tiempo de Inventario</span>
                    <span className="text-[8px] text-slate-400 flex items-center gap-0.5 select-none font-bold">
                      <RefreshCw size={8} /> Calculado
                    </span>
                  </label>
                  <input
                    type="text"
                    value={element.data.time || ''}
                    onChange={(e) => updateNodeData(id, { time: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    placeholder="e.g. 2d, 12h"
                  />
                </div>
              </div>
            )}

            {/* 6. OTHER SPECIALIZED FIELDS */}
            {element.type === 'transport' && (
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  Medio de Transporte
                </label>
                <select
                  value={element.data.subType || 'camion'}
                  onChange={(e) => updateNodeData(id, { subType: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="camion">🚗 Camión / Furgón</option>
                  <option value="montacargas">🚜 Montacargas</option>
                  <option value="barco">🚢 Barco / Envío Internacional</option>
                  <option value="carrito">🛒 Carrito de Arrastre</option>
                  <option value="interno">⚙️ Cinta Transportadora</option>
                </select>
              </div>
            )}

            {element.type === 'information' && (
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  Tipo de Información
                </label>
                <select
                  value={element.data.infoType || 'programacion'}
                  onChange={(e) => updateNodeData(id, { infoType: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="programacion">🗓️ Planificación / Semanal</option>
                  <option value="kanban_prod">🎴 Kanban Producción</option>
                  <option value="kanban_ret">🎴 Kanban Retiro</option>
                </select>
              </div>
            )}

            {element.type === 'supplierCustomer' && (
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  Rol de Entidad
                </label>
                <select
                  value={element.data.type || 'cliente'}
                  onChange={(e) => updateNodeData(id, { type: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="cliente">Cliente (Demandador)</option>
                  <option value="proveedor">Proveedor (Abastecedor)</option>
                </select>
              </div>
            )}

            {element.type === 'auxiliary' && (
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  Tipo Auxiliar
                </label>
                <select
                  value={element.data.auxType || 'operador'}
                  onChange={(e) => updateNodeData(id, { auxType: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="operador">👤 Operador</option>
                  <option value="espera">⏳ Espera / Demora</option>
                  <option value="inspeccion">🔍 Inspección</option>
                  <option value="calidad">🏆 Control de Calidad</option>
                </select>
              </div>
            )}

            {/* Kaizen Node Specialized Fields */}
            {(element.type === 'kaizen' || element.type === 'kaizen_implemented') && (
              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <div className="text-[10px] uppercase font-black text-red-500 dark:text-red-400 flex items-center gap-1.5">
                  <Activity size={10} />
                  <span>Gestión de Evento Kaizen</span>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                    Responsable
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ing. Gómez"
                    value={element.data.responsible || ''}
                    onChange={(e) => updateNodeData(id, { responsible: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                      F. Compromiso
                    </label>
                    <input
                      type="date"
                      value={element.data.commitDate || ''}
                      onChange={(e) => updateNodeData(id, { commitDate: e.target.value })}
                      className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                      F. Cierre
                    </label>
                    <input
                      type="date"
                      value={element.data.closeDate || ''}
                      onChange={(e) => updateNodeData(id, { closeDate: e.target.value })}
                      className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">
                      Costo ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={element.data.cost || ''}
                      onChange={(e) => updateNodeData(id, { cost: e.target.value })}
                      className="w-full px-1.5 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">
                      B. Esp ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={element.data.expectedBenefit || ''}
                      onChange={(e) => updateNodeData(id, { expectedBenefit: e.target.value })}
                      className="w-full px-1.5 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">
                      B. Real ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={element.data.realBenefit || ''}
                      onChange={(e) => updateNodeData(id, { realBenefit: e.target.value })}
                      className="w-full px-1.5 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                    Estado Kaizen
                  </label>
                  <select
                    value={element.data.status || (element.type === 'kaizen_implemented' ? 'closed' : 'open')}
                    onChange={(e) => handleUpdateKaizenStatus(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                  >
                    <option value="open">🔴 Abierto (Oportunidad)</option>
                    <option value="in_progress">🟡 En Progreso</option>
                    <option value="closed">🟢 Cerrado / Implementado</option>
                  </select>
                </div>
              </div>
            )}

            {/* 7. Comments / Observations */}
            <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <label className="block text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                <MessageSquare size={10} className="text-blue-550" />
                <span>Comentarios</span>
              </label>
              <textarea
                rows={3}
                value={element.data.notes || ''}
                onChange={(e) => updateNodeData(id, { notes: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans"
                placeholder="Notas u observaciones del símbolo..."
              />
            </div>
          </>
        ) : (
          // EDGE (CONNECTION) PROPERTIES
          <>
            {/* 1. Connection Text */}
            <div>
              <label className="block text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 mb-1">
                Etiqueta / Texto de la línea
              </label>
              <input
                type="text"
                placeholder="e.g. Push, Pull, Diario"
                value={element.data?.label || ''}
                onChange={(e) => updateEdgeData(id, { label: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Arrowhead toggle */}
            <div className="mt-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-350 select-none">
                <input
                  type="checkbox"
                  checked={Boolean(element.data?.showArrow)}
                  onChange={(e) => updateEdgeData(id, { showArrow: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span className="font-semibold">Mostrar punta de flecha</span>
              </label>
            </div>

            {/* 2. Connection Type (Flow category) */}
            <div>
              <label className="block text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 mb-1 mt-4">
                Tipo de Flujo / Conexión
              </label>
              <select
                value={element.data?.type || 'physical'}
                onChange={(e) => {
                  const val = e.target.value;
                  let defaultColor = '#1f2937';
                  let defaultStyle = 'solid';
                  if (val === 'info_manual') {
                    defaultColor = '#2563eb';
                    defaultStyle = 'dotted';
                  } else if (val === 'info_electronic') {
                    defaultColor = '#a855f7';
                    defaultStyle = 'dashed';
                  }
                  updateEdgeData(id, { 
                    type: val, 
                    color: defaultColor, 
                    lineStyle: defaultStyle 
                  });
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="physical">⚫ Flujo Físico</option>
                <option value="info_manual">🔵 Flujo Información Manual</option>
                <option value="info_electronic">🟣 Flujo Información Sistema</option>
                <option value="custom">🎨 Flujo Personalizado</option>
              </select>
            </div>

            {/* Route Style Selector */}
            <div>
              <label className="block text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 mb-1 mt-3.5">
                Estilo de Ruta
              </label>
              <select
                value={element.data?.routeStyle || 'orthogonal'}
                onChange={(e) => updateEdgeData(id, { routeStyle: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="orthogonal">📐 Ortogonal (90°)</option>
                <option value="straight">直線 Línea Recta</option>
                <option value="curve">➰ Curva Bezier</option>
              </select>
            </div>

            {/* 3. Style & Color Settings (Universal) */}
            <div className="space-y-3.5 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4">
              <div className="text-[10px] uppercase font-black text-slate-450 dark:text-slate-500 flex items-center gap-1.5">
                <Palette size={11} className="text-blue-500" />
                <span>Personalizar Estilo de Línea</span>
              </div>

              {/* Custom Color */}
              <div>
                <label className="block text-[9px] text-slate-400 dark:text-slate-500 mb-1">
                  Color de la línea
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="color"
                    value={element.data?.color || (element.data?.type === 'info_manual' ? '#2563eb' : element.data?.type === 'info_electronic' ? '#a855f7' : '#1f2937')}
                    onChange={(e) => updateEdgeData(id, { color: e.target.value })}
                    className="w-7 h-7 p-0.5 rounded border border-slate-200 dark:border-slate-800 bg-transparent cursor-pointer"
                  />
                  <input 
                    type="text"
                    value={element.data?.color || ''}
                    onChange={(e) => updateEdgeData(id, { color: e.target.value })}
                    placeholder="#1f2937"
                    className="flex-1 w-0 px-2 py-0.5 text-[10px] border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-slate-100 text-center font-mono"
                  />
                </div>
              </div>

              {/* Custom thickness (strokeWidth) */}
              <div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1">
                  <span>Grosor (Stroke Width)</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-350">{element.data?.strokeWidth || (element.data?.type === 'physical' ? 3.0 : 2.0)}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={element.data?.strokeWidth || (element.data?.type === 'physical' ? 3.0 : 2.0)}
                  onChange={(e) => updateEdgeData(id, { strokeWidth: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Custom style (solid, dashed, dotted) */}
              <div>
                <label className="block text-[9px] text-slate-400 dark:text-slate-500 mb-1">
                  Estilo de Línea
                </label>
                <select
                  value={element.data?.lineStyle || (element.data?.type === 'info_manual' ? 'dotted' : element.data?.type === 'info_electronic' ? 'dashed' : 'solid')}
                  onChange={(e) => updateEdgeData(id, { lineStyle: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="solid">Sólida (Solid)</option>
                  <option value="dashed">Segmentada (Dashed)</option>
                  <option value="dotted">Punteada (Dotted)</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Connection ID footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[9px] text-slate-400 font-mono shrink-0">
        ID: {id}
      </div>
    </aside>
  );
};
