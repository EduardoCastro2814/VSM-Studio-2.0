import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  X, 
  Activity, 
  Clock, 
  Layers, 
  Gauge, 
  AlertTriangle,
  Award
} from 'lucide-react';
import { parseTimeToSeconds, formatSeconds } from '../layout/TimelinePanel';

interface MetricsDashboardProps {
  onClose: () => void;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ onClose }) => {
  const { nodes } = useProject();

  // 1. Filter nodes by type
  const processNodes = nodes
    .filter(n => n.type === 'process')
    .sort((a, b) => a.position.x - b.position.x);

  const inventoryNodes = nodes
    .filter(n => n.type === 'inventory')
    .sort((a, b) => a.position.x - b.position.x);

  const kaizenNodes = nodes.filter(n => n.type === 'kaizen');

  // 2. Calculations
  let totalVa = 0;
  let totalNva = 0;
  let operatorsCount = 0;

  processNodes.forEach(node => {
    const nodeData = node.data as any;
    totalVa += parseTimeToSeconds(nodeData.ct || '0s', 's');
    operatorsCount += Number(nodeData.operators || 1);
  });

  inventoryNodes.forEach(node => {
    const nodeData = node.data as any;
    totalNva += parseTimeToSeconds(nodeData.time || '0d', 'd');
  });

  const totalLeadTime = totalVa + totalNva;
  const pce = totalLeadTime > 0 ? (totalVa / totalLeadTime) * 100 : 0;

  // 3. Formulate charts data
  const processChartData = processNodes.map(node => {
    const nodeData = node.data as any;
    const ctSec = parseTimeToSeconds(nodeData.ct || '0s', 's');
    const coSec = parseTimeToSeconds(nodeData.co || '0s', 's');
    return {
      name: String(nodeData.label || 'Proceso'),
      'Cycle Time (s)': ctSec,
      'Changeover (s)': coSec,
      OEE: Number(nodeData.oee || 100),
      Scrap: Number(nodeData.scrap || 0)
    };
  });

  const inventoryChartData = inventoryNodes.map((node, idx) => {
    const nodeData = node.data as any;
    return {
      name: `Inv #${idx + 1}`,
      Cantidad: Number(nodeData.quantity || 0),
      'Equivalente (s)': parseTimeToSeconds(nodeData.time || '0d', 'd')
    };
  });

  const pieData = [
    { name: 'Tiempo Valor Agregado (VA)', value: totalVa, color: '#10b981' },
    { name: 'Tiempo Sin Valor Agregado (NVA)', value: totalNva, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  // Render cards helper
  const StatCard = ({ title, value, icon, colorClass }: { title: string; value: string | number; icon: React.ReactNode; colorClass: string }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex items-center justify-between select-none">
      <div>
        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-1">{title}</p>
        <h4 className="text-lg font-black text-slate-900 dark:text-slate-100">{value}</h4>
      </div>
      <div className={`p-2.5 rounded-lg ${colorClass}`}>
        {icon}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-40 overflow-y-auto flex flex-col p-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-50">VSM Studio Analytics</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Cuadro de mando e indicadores de rendimiento Lean Manufacturing</p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-lg transition-colors text-slate-700 dark:text-slate-300"
        >
          <X size={15} />
          <span>Volver al Lienzo</span>
        </button>
      </div>

      {/* Grid of KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Lead Time Total" 
          value={formatSeconds(totalLeadTime)} 
          icon={<Clock size={20} />} 
          colorClass="bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
        />
        <StatCard 
          title="Process Time (VA)" 
          value={formatSeconds(totalVa)} 
          icon={<Activity size={20} />} 
          colorClass="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard 
          title="Ciclo de Eficiencia (PCE)" 
          value={`${pce.toFixed(2)}%`} 
          icon={<Gauge size={20} />} 
          colorClass="bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400"
        />
        <StatCard 
          title="Ratio de Desperdicios (NVA)" 
          value={formatSeconds(totalNva)} 
          icon={<AlertTriangle size={20} />} 
          colorClass="bg-amber-50 dark:bg-amber-950/20 text-amber-500 dark:text-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-100/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 px-4 py-3 rounded-lg flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Procesos Totales:</span>
          <span className="font-extrabold text-slate-800 dark:text-slate-200">{processNodes.length}</span>
        </div>
        <div className="bg-slate-100/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 px-4 py-3 rounded-lg flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Puntos de Inventario:</span>
          <span className="font-extrabold text-slate-800 dark:text-slate-200">{inventoryNodes.length}</span>
        </div>
        <div className="bg-slate-100/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 px-4 py-3 rounded-lg flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Oportunidades Kaizen:</span>
          <span className="font-extrabold text-red-500">{kaizenNodes.length}</span>
        </div>
        <div className="bg-slate-100/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 px-4 py-3 rounded-lg flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Operadores Totales:</span>
          <span className="font-extrabold text-slate-800 dark:text-slate-200">{operatorsCount}</span>
        </div>
      </div>

      {/* Grid of Charts */}
      {processChartData.length === 0 && inventoryChartData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-400 dark:text-slate-500 select-none">
          <Layers size={36} className="mb-2 stroke-1" />
          <p className="text-sm font-bold">Sin Datos Disponibles</p>
          <p className="text-xs mt-0.5">Agrega procesos e inventarios en el lienzo VSM para generar reportes analíticos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Chart 1: Cycle Time vs Changeover */}
          {processChartData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[320px]">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
                <Activity size={14} className="text-blue-500" />
                <span>Análisis de Procesos: C/T vs C/O</span>
              </h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processChartData} margin={{ left: -10, right: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#33415520" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Cycle Time (s)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Changeover (s)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Chart 2: Inventory quantities */}
          {inventoryChartData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[320px]">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
                <Layers size={14} className="text-blue-500" />
                <span>Nivel de Inventarios (Unidades)</span>
              </h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventoryChartData} margin={{ left: -10, right: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#33415520" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Cantidad" fill="#eab308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Chart 3: Pie chart VA vs NVA */}
          {pieData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[320px]">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
                <Gauge size={14} className="text-blue-500" />
                <span>Distribución del Flujo de Valor (VA vs NVA)</span>
              </h3>
              <div className="flex-1 flex items-center justify-center min-h-0">
                <div className="w-[180px] h-[180px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatSeconds(Number(value)) as any} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">PCE Eficiencia</span>
                    <span className="text-lg font-black text-slate-900 dark:text-slate-100">{pce.toFixed(1)}%</span>
                  </div>
                </div>
                
                {/* Custom Legend */}
                <div className="ml-4 space-y-2 text-[10px]">
                  {pieData.map((d, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-700 dark:text-slate-300 font-bold">{d.name}:</span>
                      <span className="text-slate-900 dark:text-slate-100 font-mono">{formatSeconds(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chart 4: Process Performance details */}
          {processChartData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[320px] overflow-hidden">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <Award size={14} className="text-blue-500" />
                <span>Rendimiento OEE de Procesos</span>
              </h3>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 font-bold">
                      <th className="py-2">Proceso</th>
                      <th className="py-2">OEE %</th>
                      <th className="py-2">Scrap %</th>
                      <th className="py-2">Operadores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processNodes.map(node => {
                      const nodeData = node.data as any;
                      return (
                        <tr key={node.id} className="border-b border-slate-100 dark:border-slate-800/40 text-slate-700 dark:text-slate-300">
                          <td className="py-2 font-bold truncate max-w-[120px]">{String(nodeData.label || 'Proceso')}</td>
                          <td className="py-2 font-mono">
                            <span className={`px-1.5 py-0.5 rounded font-extrabold ${
                              Number(nodeData.oee || 100) >= 85 
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-500'
                            }`}>
                              {String(nodeData.oee || 100)}%
                            </span>
                          </td>
                          <td className="py-2 font-mono text-red-500">{String(nodeData.scrap || 0)}%</td>
                          <td className="py-2 font-mono">{String(nodeData.operators || 1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
