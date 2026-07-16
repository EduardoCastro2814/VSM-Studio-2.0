import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { 
  Clock, 
  AlertTriangle
} from 'lucide-react';

// Time parser helper
export const parseTimeToSeconds = (val: any, defaultUnit: 's' | 'd' = 's'): number => {
  if (val === undefined || val === null || val === '') return 0;
  
  const str = String(val).toLowerCase().trim();
  const num = parseFloat(str);
  if (isNaN(num)) return 0;

  // Check units
  if (str.includes('d') || str.includes('dia') || str.includes('day')) {
    return num * 24 * 3600;
  }
  if (str.includes('h') || str.includes('hor') || str.includes('hour')) {
    return num * 3600;
  }
  if (str.includes('m') && !str.includes('ms') && !str.includes('min') && !str.includes('mseg')) {
    return num * 60;
  }
  if (str.includes('min')) {
    return num * 60;
  }
  if (str.includes('ms') || str.includes('mseg')) {
    return num / 1000;
  }
  if (str.includes('s') || str.includes('seg') || str.includes('sec')) {
    return num;
  }

  // Fallback if no unit matches
  if (defaultUnit === 'd') {
    return num * 24 * 3600;
  }
  return num;
};

// Formatter to print seconds back in readable format
export const formatSeconds = (seconds: number): string => {
  if (seconds <= 0) return '0s';
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(2)}d`;
};

export const TimelinePanel: React.FC = () => {
  const { nodes } = useProject();

  // 1. Filter and sort main flow elements (processes & inventories) by X position
  const flowNodes = nodes
    .filter(n => n.type === 'process' || n.type === 'inventory')
    .sort((a, b) => a.position.x - b.position.x);

  // 2. Metrics calculation
  let totalVaSeconds = 0;
  let totalNvaSeconds = 0;
  let processCount = 0;
  let inventoryCount = 0;

  const timelineSteps = flowNodes.map(node => {
    const isProcess = node.type === 'process';
    const nodeData = node.data as any;
    const label = String(nodeData.label || (isProcess ? 'Proceso' : 'Inventario'));
    
    let duration = 0;
    let timeFormatted = '';

    if (isProcess) {
      processCount++;
      const ctStr = String(nodeData.ct || '0s');
      duration = parseTimeToSeconds(ctStr, 's');
      totalVaSeconds += duration;
      timeFormatted = ctStr;
    } else {
      inventoryCount++;
      const timeStr = String(nodeData.time || '0d');
      duration = parseTimeToSeconds(timeStr, 'd');
      totalNvaSeconds += duration;
      timeFormatted = timeStr;
    }

    return {
      id: node.id,
      label,
      isProcess,
      duration,
      timeFormatted,
    };
  });

  const totalLeadTimeSeconds = totalVaSeconds + totalNvaSeconds;
  
  // PCE = VA / LT * 100
  const pce = totalLeadTimeSeconds > 0 
    ? (totalVaSeconds / totalLeadTimeSeconds) * 100 
    : 0;

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-[180px] w-full select-none overflow-hidden shrink-0">
      {/* Top Header Metrics bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-blue-500" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Línea de Tiempo Automática
          </span>
        </div>
        
        {/* Real-time Math Summary */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-350">
            <span>Lead Time:</span>
            <span className="text-slate-900 dark:text-slate-100 font-extrabold">{formatSeconds(totalLeadTimeSeconds)}</span>
          </div>
          <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <span>Process Time (VA):</span>
            <span className="font-extrabold">{formatSeconds(totalVaSeconds)}</span>
          </div>
          <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
            <span>Wait Time (NVA):</span>
            <span className="font-extrabold">{formatSeconds(totalNvaSeconds)}</span>
          </div>
          <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-[11px]">
            <span>Eficiencia (PCE):</span>
            <span className="font-black">{pce.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Main Timeline Staircase Sawtooth */}
      <div className="flex-1 flex overflow-x-auto p-4 relative items-center justify-start min-w-0">
        {timelineSteps.length === 0 ? (
          <div className="w-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs gap-1.5">
            <AlertTriangle size={15} />
            <span>Coloca procesos o inventarios en el lienzo para ver el cálculo del flujo de valor.</span>
          </div>
        ) : (
          <div className="flex items-stretch min-w-full">
            {timelineSteps.map((step, idx) => (
              <div 
                key={step.id} 
                className="flex flex-col justify-between min-w-[130px] flex-1 border-r last:border-r-0 border-slate-100 dark:border-slate-800/40 relative px-2"
              >
                {/* Process / Inventory Label */}
                <div className="text-center pb-2">
                  <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                    {step.label}
                  </div>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase select-none">
                    {step.isProcess ? 'Proceso' : 'Inventario'}
                  </div>
                </div>

                {/* Draw VSM Sawtooth Stair-Step */}
                <div className="h-10 relative flex items-center justify-center">
                  <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                    {step.isProcess ? (
                      <>
                        <line x1="0" y1="35" x2="100" y2="35" className="stroke-emerald-500 stroke-[3]" />
                        {idx > 0 && !timelineSteps[idx - 1].isProcess && (
                          <line x1="0" y1="5" x2="0" y2="35" className="stroke-slate-300 dark:stroke-slate-700 stroke-[1.5]" />
                        )}
                      </>
                    ) : (
                      <>
                        <line x1="0" y1="5" x2="100" y2="5" className="stroke-amber-500 stroke-[3]" />
                        {idx > 0 && timelineSteps[idx - 1].isProcess && (
                          <line x1="0" y1="5" x2="0" y2="35" className="stroke-slate-300 dark:stroke-slate-700 stroke-[1.5]" />
                        )}
                      </>
                    )}
                  </svg>
                  
                  {/* Step Value Floating Text */}
                  <div className={`absolute left-1/2 -translate-x-1/2 font-mono text-[10px] font-extrabold ${
                    step.isProcess 
                      ? 'bottom-0 text-emerald-600 dark:text-emerald-400' 
                      : 'top-0 text-amber-600 dark:text-amber-500'
                  }`}>
                    {String(step.timeFormatted)}
                  </div>
                </div>

                <div className="h-2" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
