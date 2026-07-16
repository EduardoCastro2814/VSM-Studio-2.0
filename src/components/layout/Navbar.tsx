import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { getNodesBounds } from '@xyflow/react';
import { 
  Download, 
  RotateCcw, 
  RotateCw, 
  Settings, 
  Moon, 
  Sun, 
  FileDown,
  ChevronDown,
  GitBranch,
  BarChart2,
  Folder,
  User,
  Check,
  Copy,
  AlertTriangle,
  Info,
  CloudLightning,
  Database
} from 'lucide-react';
import { exportToPng, exportToJpg, exportToJson, exportToPdf } from '../../utils/exportUtils';
import { parseTimeToSeconds } from './TimelinePanel';
import { db } from '../../lib/supabase';

interface NavbarProps {
  onToggleDashboard: () => void;
  isDashboardOpen: boolean;
  onReturnToManager: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleDashboard, isDashboardOpen, onReturnToManager }) => {
  const {
    activeProject,
    isSaving,
    renameProject,
    undo,
    redo,
    canUndo,
    canRedo,
    theme,
    toggleTheme,
    versions,
    saveNewVersion,
    restoreVersion,
    nodes,
    setNodes,
    edges,
    isSupabaseConfigured,
    loadVersions,
    saveStatus,
    lastSavedTime,
    lastSaveError,
    saveCurrentProject
  } = useProject();

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [saveDiagnosticOpen, setSaveDiagnosticOpen] = useState(false);
  const [relativeSavedText, setRelativeSavedText] = useState('hace instantes');
  const [isTestingSave, setIsTestingSave] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleManualSave = async () => {
    await saveCurrentProject();
  };

  const handleTestSave = async () => {
    setIsTestingSave(true);
    setTestResult(null);
    try {
      if (!activeProject) {
        throw new Error("No hay un proyecto activo para probar.");
      }
      
      console.log('🧪 [TEST GUARDADO] Iniciando guardado de prueba...');
      const testId = '00000000-0000-0000-0000-000000000000';
      const testProj = {
        id: testId,
        name: 'PROYECTO DE PRUEBA VSM',
        author: 'Diagnostic Test',
        nodes: [{ id: 'test-node', type: 'process', position: { x: 10, y: 10 }, data: { label: 'Test' } }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await db.saveProject(testProj);
      await db.deleteProject(testId);
      
      setTestResult({
        success: true,
        message: '✅ Guardado exitoso (Inserción, escritura y eliminación de prueba completadas en Supabase)'
      });
    } catch (e: any) {
      console.error('❌ [TEST GUARDADO] Falló el guardado de prueba:', e);
      setTestResult({
        success: false,
        message: `❌ Error de guardado: ${e.message || String(e)}`
      });
    } finally {
      setIsTestingSave(false);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      if (!lastSavedTime) {
        setRelativeSavedText('Nunca');
        return;
      }
      const diffMs = new Date().getTime() - lastSavedTime.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 10) {
        setRelativeSavedText('hace instantes');
      } else if (diffSec < 60) {
        setRelativeSavedText(`hace ${diffSec}s`);
      } else {
        const diffMin = Math.floor(diffSec / 60);
        setRelativeSavedText(`hace ${diffMin} min`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 5000);
    return () => clearInterval(interval);
  }, [lastSavedTime]);

  // Rename states
  const [editedName, setEditedName] = useState('');

  // Version Name input
  const [newVersionName, setNewVersionName] = useState('');

  // Project author settings
  const [authorName, setAuthorName] = useState('Lean Expert');

  const exportRef = useRef<HTMLDivElement>(null);
  const versionRef = useRef<HTMLDivElement>(null);

  // Selected elements calculation for layout alignments
  const selectedNodes = nodes.filter(n => n.selected);
  const selectedNodesCount = selectedNodes.length;

  useEffect(() => {
    if (activeProject) {
      setEditedName(activeProject.name);
      setAuthorName(activeProject.author);
    }
  }, [activeProject]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
      if (versionRef.current && !versionRef.current.contains(event.target as Node)) {
        setVersionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRenameSubmit = () => {
    if (activeProject && editedName.trim() && editedName.trim() !== activeProject.name) {
      renameProject(activeProject.id, editedName.trim());
    }
  };

  const handleSaveVersionSubmit = () => {
    if (newVersionName.trim()) {
      saveNewVersion(newVersionName.trim(), 'Guardado manual');
      setNewVersionName('');
    }
  };

  const handleSaveAuthor = () => {
    if (activeProject) {
      renameProject(activeProject.id, activeProject.name);
      activeProject.author = authorName;
    }
    setSettingsOpen(false);
  };

  const handleAlign = (alignment: 'left' | 'center' | 'top' | 'bottom') => {
    if (selectedNodesCount < 2) return;
    
    setNodes(prev => {
      let aligned = [...prev];
      if (alignment === 'left') {
        const minX = Math.min(...selectedNodes.map(n => n.position.x));
        aligned = prev.map(n => n.selected ? { ...n, position: { ...n.position, x: minX } } : n);
      } else if (alignment === 'center') {
        const avgX = selectedNodes.reduce((sum, n) => sum + n.position.x, 0) / selectedNodesCount;
        aligned = prev.map(n => n.selected ? { ...n, position: { ...n.position, x: avgX } } : n);
      } else if (alignment === 'top') {
        const minY = Math.min(...selectedNodes.map(n => n.position.y));
        aligned = prev.map(n => n.selected ? { ...n, position: { ...n.position, y: minY } } : n);
      } else if (alignment === 'bottom') {
        const maxY = Math.max(...selectedNodes.map(n => n.position.y));
        aligned = prev.map(n => n.selected ? { ...n, position: { ...n.position, y: maxY } } : n);
      }
      return aligned;
    });
  };

  const handleDistribute = (axis: 'horizontal' | 'vertical') => {
    if (selectedNodesCount < 3) return;

    setNodes(prev => {
      const selected = prev.filter(n => n.selected);
      if (axis === 'horizontal') {
        const sorted = [...selected].sort((a, b) => a.position.x - b.position.x);
        const minX = sorted[0].position.x;
        const maxX = sorted[sorted.length - 1].position.x;
        const step = (maxX - minX) / (sorted.length - 1);
        
        return prev.map(n => {
          if (n.selected) {
            const idx = sorted.findIndex(s => s.id === n.id);
            return { ...n, position: { ...n.position, x: minX + idx * step } };
          }
          return n;
        });
      } else {
        const sorted = [...selected].sort((a, b) => a.position.y - b.position.y);
        const minY = sorted[0].position.y;
        const maxY = sorted[sorted.length - 1].position.y;
        const step = (maxY - minY) / (sorted.length - 1);
        
        return prev.map(n => {
          if (n.selected) {
            const idx = sorted.findIndex(s => s.id === n.id);
            return { ...n, position: { ...n.position, y: minY + idx * step } };
          }
          return n;
        });
      }
    });
  };

  const handleDuplicateSelection = () => {
    if (selectedNodesCount === 0) return;

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
  };

  // Compile metrics calculations for PDF export
  const triggerPdfExport = async (saveMode: 'download' | 'supabase' = 'download') => {
    if (!activeProject) return;

    let totalVa = 0;
    let totalNva = 0;
    let processesCount = 0;
    let inventoriesCount = 0;
    let kaizensCount = 0;

    nodes.forEach(node => {
      const nodeData = node.data as any;
      if (node.type === 'process') {
        processesCount++;
        totalVa += parseTimeToSeconds(nodeData.ct || '0s', 's');
      } else if (node.type === 'inventory') {
        inventoriesCount++;
        totalNva += parseTimeToSeconds(nodeData.time || '0d', 'd');
      } else if (node.type === 'kaizen') {
        kaizensCount++;
      }
    });

    const totalLeadTime = totalVa + totalNva;
    const pce = totalLeadTime > 0 ? (totalVa / totalLeadTime) * 100 : 0;
    const efficiency = totalLeadTime > 0 ? totalVa / totalLeadTime : 0;

    if (saveMode === 'supabase') {
      alert("Generando y subiendo PDF a Supabase Storage... Por favor espere.");
    }

    const url = await exportToPdf(
      {
        id: activeProject.id,
        name: activeProject.name,
        author: activeProject.author,
        nodes,
        edges
      },
      {
        totalVa,
        totalNva,
        totalLeadTime,
        pce,
        efficiency,
        processesCount,
        inventoriesCount,
        kaizensCount
      },
      nodes,
      2, // high quality PDF
      saveMode
    );

    if (saveMode === 'supabase') {
      if (url) {
        alert(`Reporte PDF guardado exitosamente en la nube: ${url}`);
        await loadVersions(activeProject.id); // reload versions to show the file save log
      } else {
        alert("Error al subir el reporte PDF a Supabase.");
      }
    }
  };

  const handleCloudExport = async (format: 'png' | 'jpeg' | 'json') => {
    if (!activeProject) return;

    alert(`Generando y subiendo archivo ${format.toUpperCase()} a Supabase Storage... Por favor espere.`);
    
    let url: string | null = null;
    if (format === 'png') {
      url = await exportToPng(activeProject.name, nodes, 'high', activeProject.id, 'supabase');
    } else if (format === 'jpeg') {
      url = await exportToJpg(activeProject.name, nodes, 'high', activeProject.id, 'supabase');
    } else if (format === 'json') {
      url = await exportToJson({
        id: activeProject.id,
        name: activeProject.name,
        author: activeProject.author,
        nodes,
        edges,
        viewport: activeProject.viewport
      }, 'supabase');
    }

    if (url) {
      alert(`Archivo ${format.toUpperCase()} guardado en la nube: ${url}`);
      await loadVersions(activeProject.id);
    } else {
      alert(`Error al subir el archivo ${format.toUpperCase()} a Supabase.`);
    }
  };

  // DIAGNOSTIC METADATA REPORT
  const getDiagnosticInfo = () => {
    const viewportExists = document.querySelector('.react-flow__viewport') !== null;
    let bounds = { x: 0, y: 0, width: 0, height: 0 };
    if (nodes.length > 0) {
      bounds = getNodesBounds(nodes);
    }

    // Connections count details
    const physicalCount = edges.filter(e => {
      const type = e.data?.type || e.type;
      return type === 'physical' || type === 'push' || type === 'pull';
    }).length;

    const manualInfoCount = edges.filter(e => {
      const type = e.data?.type || e.type;
      return type === 'info_manual';
    }).length;

    const electronicInfoCount = edges.filter(e => {
      const type = e.data?.type || e.type;
      return type === 'info_electronic';
    }).length;

    const customCount = edges.filter(e => {
      const type = e.data?.type || e.type;
      return type === 'custom';
    }).length;

    const issues: string[] = [];
    if (nodes.length === 0) {
      issues.push("⚠️ El canvas está vacío (0 nodos). La exportación generará una imagen en blanco.");
    }
    if (!viewportExists) {
      issues.push("❌ Error: No se encontró la clase viewport de React Flow. Canvas no montado.");
    }
    if (bounds.width > 6000 || bounds.height > 6000) {
      issues.push("⚠️ Advertencia: El mapa VSM es extremadamente grande. Puede provocar retardos de memoria.");
    }

    // Check orphan connections
    edges.forEach(e => {
      if (!e.source || !e.target) {
        issues.push(`❌ Conexión huérfana detectada: ID ${e.id} no tiene origen o destino.`);
      }
    });

    // CORS Image check
    const imgs = document.querySelectorAll('.react-flow img');
    let corsCount = 0;
    imgs.forEach((img: any) => {
      if (img.src && img.src.startsWith('http') && !img.src.includes(window.location.host)) {
        corsCount++;
      }
    });
    if (corsCount > 0) {
      issues.push(`⚠️ CORS: Hay ${corsCount} imagen(es) externas que podrían no renderizarse sin CORS habilitado.`);
    }

    return {
      nodesCount: nodes.length,
      edgesCount: edges.length,
      physicalCount,
      manualInfoCount,
      electronicInfoCount,
      customCount,
      bounds,
      viewportExists,
      issues
    };
  };

  const handleRunConsoleLog = () => {
    const info = getDiagnosticInfo();
    console.group("=== VSM STUDIO DIAGNÓSTICO DE EXPORTACIÓN ===");
    console.log("Proyecto Activo:", activeProject?.name);
    console.log("Total Nodos:", info.nodesCount);
    console.log("Total Líneas:", info.edgesCount);
    console.log("Dimensiones de Límites:", info.bounds);
    console.log("Viewport de React Flow en DOM:", info.viewportExists ? "MONTADO" : "FALTANTE");
    console.log("Advertencias Encontradas:", info.issues);
    console.log("Nodos Detallados:", nodes);
    console.log("Líneas Detalladas:", edges);
    console.groupEnd();
    alert("Resultados detallados registrados en la consola web de desarrollo (F12).");
  };

  const diagnostic = getDiagnosticInfo();

  return (
    <nav className="h-14 border-b border-slate-250 dark:border-slate-805 bg-white dark:bg-slate-900 px-4 flex items-center justify-between select-none z-10 shrink-0">
      {/* 1. Left Side: Back button, Inline Name Editor & Autosave */}
      <div className="flex items-center gap-3">
        {/* Mis VSM Dashboard Button */}
        <button
          onClick={onReturnToManager}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
          title="Regresar a mis mapas VSM"
        >
          <Folder size={14} className="text-blue-500" />
          <span>Mis VSM</span>
        </button>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Inline Name Editor Input */}
        <input
          type="text"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
          className="px-2 py-1 text-xs rounded border border-transparent hover:border-slate-250 dark:hover:border-slate-800 focus:border-blue-500 bg-transparent text-slate-850 dark:text-slate-100 font-extrabold w-[130px] sm:w-[220px] outline-none transition-all truncate"
          title="Editar nombre del VSM"
          placeholder="Nombre del VSM..."
        />

        {/* Autosave Status Indicator */}
        <div className="flex items-center gap-1.5 ml-1">
          <div className={`w-2 h-2 rounded-full ${isSaving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">
            {isSaving ? 'Guardando...' : 'Autoguardado'}
          </span>
        </div>
      </div>

      {/* 2. Middle: Undo / Redo & Layout Actions */}
      <div className="flex items-center gap-3">
        {/* Undo / Redo controls */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 p-0.5 rounded-lg">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition-all ${
              canUndo 
                ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer' 
                : 'text-slate-350 dark:text-slate-700 cursor-not-allowed opacity-50'
            }`}
            title="Deshacer (Ctrl+Z)"
          >
            <RotateCcw size={13} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition-all ${
              canRedo 
                ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer' 
                : 'text-slate-350 dark:text-slate-700 cursor-not-allowed opacity-50'
            }`}
            title="Rehacer (Ctrl+Y)"
          >
            <RotateCw size={13} />
          </button>
        </div>

        {/* Layout actions panel (visible when nodes are selected) */}
        {selectedNodesCount > 0 && (
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 p-0.5 rounded-lg animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={handleDuplicateSelection}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
              title="Duplicar Selección"
            >
              <Copy size={13} />
            </button>

            {selectedNodesCount >= 2 && (
              <>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />
                <button
                  onClick={() => handleAlign('left')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-750 dark:text-slate-300 text-[10px] font-black cursor-pointer"
                  title="Alinear Izquierda"
                >
                  ◀ L
                </button>
                <button
                  onClick={() => handleAlign('center')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-750 dark:text-slate-300 text-[10px] font-black cursor-pointer"
                  title="Alinear Centro"
                >
                  | C
                </button>
                <button
                  onClick={() => handleAlign('top')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-750 dark:text-slate-300 text-[10px] font-black cursor-pointer"
                  title="Alinear Arriba"
                >
                  ▲ T
                </button>
                <button
                  onClick={() => handleAlign('bottom')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-750 dark:text-slate-300 text-[10px] font-black cursor-pointer"
                  title="Alinear Abajo"
                >
                  ▼ B
                </button>
              </>
            )}

            {selectedNodesCount >= 3 && (
              <>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />
                <button
                  onClick={() => handleDistribute('horizontal')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-755 dark:text-slate-300 text-[10px] font-black cursor-pointer"
                  title="Distribuir Horizontalmente"
                >
                  ↔ H
                </button>
                <button
                  onClick={() => handleDistribute('vertical')}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-755 dark:text-slate-300 text-[10px] font-black cursor-pointer"
                  title="Distribuir Verticalmente"
                >
                  ↕ V
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 3. Right Side: Settings, Export, Versions, Theme, Auth User */}
      <div className="flex items-center gap-2.5">
        {/* Manual Save Button & Status Widget (Requirements #2, #3) */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 select-none font-sans shrink-0">
          <span className="flex h-2 w-2 relative shrink-0 ml-0.5">
            {saveStatus === 'saving' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              saveStatus === 'saved' ? 'bg-emerald-500' :
              saveStatus === 'saving' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
          </span>
          
          <div className="flex flex-col text-left shrink-0 max-w-[80px] leading-tight select-none">
            <span className="text-[8.5px] font-black uppercase text-slate-500 dark:text-slate-400 leading-none">
              {saveStatus === 'saved' ? 'Guardado' :
               saveStatus === 'saving' ? 'Guardando...' : 'Sin Guardar'}
            </span>
            {lastSavedTime && (
              <span className="text-[7.5px] text-slate-400 leading-none mt-0.5 whitespace-nowrap">
                {relativeSavedText}
              </span>
            )}
          </div>

          <div className="w-px h-4.5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

          <button
            onClick={handleManualSave}
            disabled={saveStatus === 'saving'}
            className="flex items-center justify-center p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded text-[11px] leading-none transition-all active:scale-95 disabled:opacity-50 cursor-pointer font-bold select-none h-5 px-1.5"
            title="Guardar en base de datos"
          >
            💾 Guardar
          </button>
        </div>
        {/* Toggle Metrics Dashboard Overlay */}
        <button
          onClick={onToggleDashboard}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
            isDashboardOpen
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart2 size={14} />
          <span className="hidden md:inline">Métricas</span>
        </button>

        {/* Temporary Diagnostic Button */}
        <button
          onClick={() => setDiagnosticOpen(true)}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-955/20 border border-amber-250 dark:border-amber-900 text-amber-700 dark:text-amber-400 hover:bg-amber-100/50 cursor-pointer"
          title="Diagnosticar exportación de canvas"
        >
          <AlertTriangle size={13} className="text-amber-500" />
          <span className="hidden lg:inline text-[11px]">Diagnosticar</span>
        </button>

        {/* Versions Control */}
        <div className="relative" ref={versionRef}>
          <button
            onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Historial de Versiones"
          >
            <GitBranch size={14} className="text-purple-500" />
            <span className="hidden lg:inline">Historial</span>
            <ChevronDown size={11} />
          </button>

          {versionDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 mb-2">
                Guardar versión actual
              </div>
              <div className="flex gap-1.5 mb-3">
                <input
                  type="text"
                  placeholder="v1.0 - Inicial"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveVersionSubmit()}
                />
                <button
                  onClick={handleSaveVersionSubmit}
                  className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold cursor-pointer"
                >
                  Guardar
                </button>
              </div>

              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 mb-1">
                Historial (Snapshots)
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                {versions.length === 0 ? (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 p-2 text-center">
                    No hay versiones guardadas.
                  </div>
                ) : (
                  versions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        restoreVersion(v);
                        setVersionDropdownOpen(false);
                      }}
                      className="w-full text-left p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] block text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-850 last:border-0 cursor-pointer"
                    >
                      <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between gap-1.5">
                        <span className="truncate max-w-[140px]">{v.name}</span>
                        <span className="bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 px-1 py-0.5 rounded text-[8px] uppercase tracking-wide shrink-0">
                          {v.action_name || 'Guardado'}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono mt-1 flex justify-between">
                        <span>{new Date(v.created_at).toLocaleString()}</span>
                        <span className="truncate max-w-[80px]" title={v.created_by_email}>
                          {v.created_by_email?.split('@')[0] || 'Local'}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Export Actions Dropdown */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>Exportar</span>
            <ChevronDown size={11} />
          </button>

          {exportDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              
              {/* Group 1: Local Downloads */}
              <div className="px-3 py-1 text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                Descargar Local (Dispositivo)
              </div>
              <button
                onClick={() => {
                  triggerPdfExport('download');
                  setExportDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FileDown size={13} className="text-red-500 shrink-0" />
                <span className="font-semibold">Reporte PDF</span>
              </button>
              
              <button
                onClick={() => {
                  if (activeProject) exportToPng(activeProject.name, nodes, 'high', activeProject.id, 'download');
                  setExportDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Download size={13} className="text-emerald-500 shrink-0" />
                <span>Imagen PNG (Alta Calidad)</span>
              </button>

              <button
                onClick={() => {
                  if (activeProject) exportToJpg(activeProject.name, nodes, 'high', activeProject.id, 'download');
                  setExportDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Download size={13} className="text-amber-500 shrink-0" />
                <span>Imagen JPG (Alta Calidad)</span>
              </button>

              <button
                onClick={() => {
                  if (activeProject) {
                    exportToJson({
                      id: activeProject.id,
                      name: activeProject.name,
                      author: activeProject.author,
                      nodes,
                      edges,
                      viewport: activeProject.viewport
                    }, 'download');
                  }
                  setExportDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FileDown size={13} className="text-blue-500 shrink-0" />
                <span>JSON Editable</span>
              </button>

              {/* Group 2: Cloud Saves (Only if Supabase is active) */}
              {isSupabaseConfigured && (
                <>
                  <div className="border-t border-slate-100 dark:border-slate-850 my-1.5" />
                  <div className="px-3 py-1 text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                    <CloudLightning size={10} className="text-blue-500" />
                    <span>Guardar en Supabase (Nube)</span>
                  </div>

                  <button
                    onClick={() => {
                      triggerPdfExport('supabase');
                      setExportDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-305 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer font-medium"
                  >
                    <CloudLightning size={13} className="text-red-500 shrink-0" />
                    <span>Guardar PDF en storage</span>
                  </button>

                  <button
                    onClick={() => {
                      handleCloudExport('png');
                      setExportDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-305 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer font-medium"
                  >
                    <CloudLightning size={13} className="text-emerald-500 shrink-0" />
                    <span>Guardar PNG en storage</span>
                  </button>

                  <button
                    onClick={() => {
                      handleCloudExport('json');
                      setExportDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-305 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer font-medium"
                  >
                    <CloudLightning size={13} className="text-blue-500 shrink-0" />
                    <span>Guardar JSON en storage</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Save diagnostic button */}
        <button
          onClick={() => setSaveDiagnosticOpen(true)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 transition-colors cursor-pointer"
          title="Diagnóstico de Guardado"
        >
          <Database size={15} className="text-blue-500" />
        </button>

        {/* Settings button */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 transition-colors cursor-pointer"
          title="Configuración del Proyecto"
        >
          <Settings size={15} />
        </button>

        {/* Light / Dark Mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>


      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-96 rounded-xl shadow-2xl p-5 select-none text-slate-850 dark:text-slate-200">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Settings size={16} className="text-blue-500" />
              <span>CONFIGURACIÓN</span>
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase">
                  Autor del Proyecto
                </label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Tu nombre o cargo"
                    disabled={isSupabaseConfigured} // Auth user email is used as author in Supabase mode
                  />
                </div>
                {isSupabaseConfigured && (
                  <p className="text-[9px] text-slate-400 mt-1">
                    Nota: En modo Supabase, tu correo se utiliza como firma de autor del proyecto.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase">
                  Metadatos / Ubicación
                </label>
                <div className="text-[10px] text-slate-400 font-mono bg-slate-50/40 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800/40">
                  <div className="truncate">ID: {activeProject?.id}</div>
                  <div className="mt-1">Creado: {activeProject ? new Date(activeProject.created_at).toLocaleString() : ''}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAuthor}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
              >
                <Check size={13} />
                <span>Aplicar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIAGNÓSTICO DE GUARDADO MODAL (Requirement #8) */}
      {saveDiagnosticOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-[420px] rounded-xl shadow-2xl p-5 select-none text-slate-850 dark:text-slate-200 font-sans">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5 flex items-center gap-1.5">
              <Database size={16} className="text-blue-500" />
              <span>Diagnóstico de Guardado</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-x-2 gap-y-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                <div>ID del Proyecto:</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 truncate" title={activeProject?.id || 'Sin ID'}>
                  {activeProject?.id || 'N/A'}
                </div>
                
                <div>Último Guardado:</div>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {lastSavedTime ? lastSavedTime.toLocaleString('es-ES') : 'Nunca'}
                </div>
                
                <div>Nodos Guardados:</div>
                <div className="font-bold text-blue-600 dark:text-blue-400">
                  {nodes.length}
                </div>
                
                <div>Conexiones Guardadas:</div>
                <div className="font-bold text-purple-600 dark:text-purple-400">
                  {edges.length}
                </div>

                <div className="col-span-2 border-t border-slate-200 dark:border-slate-800/80 my-1 pt-1 text-[10px] text-slate-400 font-sans font-bold">
                  CONECTIVIDAD SUPABASE
                </div>

                <div>Resultado Escritura:</div>
                <div className={`font-bold ${lastSaveError ? 'text-red-500' : 'text-emerald-500'}`}>
                  {lastSaveError ? 'Fallo' : 'Exitoso'}
                </div>
              </div>

              {lastSaveError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-lg text-[10px] font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                  <strong>Detalle del error:</strong><br />
                  {lastSaveError}
                </div>
              )}

              {!lastSaveError && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 rounded-lg text-[10px] flex items-center gap-1.5">
                  <Check size={14} className="shrink-0" />
                  <span>Los datos están sincronizados correctamente en la nube.</span>
                </div>
              )}

              {/* Test Guardado Section */}
              <div className="border-t border-slate-200 dark:border-slate-800/80 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Prueba de Conexión
                  </span>
                  <button
                    onClick={handleTestSave}
                    disabled={isTestingSave}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {isTestingSave ? 'Probando...' : '🧪 Test Guardado'}
                  </button>
                </div>
                
                {testResult && (
                  <div className={`mt-2 p-2 rounded text-[10px] leading-relaxed font-mono ${
                    testResult.success 
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-450'
                  }`}>
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setSaveDiagnosticOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIAGNOSTIC MODAL */}
      {diagnosticOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-[420px] rounded-xl shadow-2xl p-5 select-none text-slate-850 dark:text-slate-200">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5 flex items-center gap-1.5">
              <AlertTriangle size={16} className="text-amber-500" />
              <span>Diagnóstico de Exportación</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                <div>Nodos Detectados:</div>
                <div className="font-bold text-blue-600 dark:text-blue-400">{diagnostic.nodesCount}</div>
                <div>DOM Viewport:</div>
                <div className={diagnostic.viewportExists ? "font-bold text-emerald-500" : "font-bold text-red-500"}>
                  {diagnostic.viewportExists ? "Montado" : "Error"}
                </div>
                <div>Límites Canvas:</div>
                <div className="font-bold text-slate-855 dark:text-slate-250">
                  {diagnostic.nodesCount > 0 
                    ? `${diagnostic.bounds.width.toFixed(0)}x${diagnostic.bounds.height.toFixed(0)} px`
                    : "Vacío"
                  }
                </div>
                
                <div className="col-span-2 border-t border-slate-200 dark:border-slate-800/80 my-1 pt-1 text-[10px] text-slate-400 font-sans font-bold">
                  CONEXIONES DETECTADAS (Total: {diagnostic.edgesCount})
                </div>
                <div>Líneas Físicas:</div>
                <div className="font-bold text-slate-700 dark:text-slate-300">{diagnostic.physicalCount}</div>
                <div>Info Manual (Azul):</div>
                <div className="font-bold text-blue-600 dark:text-blue-400">{diagnostic.manualInfoCount}</div>
                <div>Info Sistema (Morada):</div>
                <div className="font-bold text-purple-600 dark:text-purple-400">{diagnostic.electronicInfoCount}</div>
                <div>Personalizadas:</div>
                <div className="font-bold text-slate-500">{diagnostic.customCount}</div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                  Alertas y Observaciones
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {diagnostic.issues.length === 0 ? (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded border border-emerald-150 dark:border-emerald-900 flex items-center gap-1.5 font-medium">
                      <Info size={13} />
                      <span>El sistema está listo. No se detectaron fallos en la estructura.</span>
                    </div>
                  ) : (
                    diagnostic.issues.map((issue, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] leading-tight text-slate-700 dark:text-slate-350">
                        {issue}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={handleRunConsoleLog}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Ejecutar Log Consola (F12)
              </button>
              <button
                onClick={() => setDiagnosticOpen(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-655 dark:text-slate-400 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
