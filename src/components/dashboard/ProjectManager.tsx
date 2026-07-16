import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { 
  Folder, 
  Plus, 
  Search, 
  ArrowUpDown, 
  Calendar, 
  User, 
  Layers, 
  Trash2, 
  Copy, 
  Edit3, 
  Play,
  Check,
  X,
  FileDown
} from 'lucide-react';
import { exportToJson } from '../../utils/exportUtils';

interface ProjectManagerProps {
  onOpenProject: () => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ onOpenProject }) => {
  const {
    projects,
    createNewProject,
    loadProject,
    deleteProject,
    duplicateProject,
    renameProject
  } = useProject();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name'>('recent');
  
  // Rename modal states
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  // Author modal/settings
  const [creatorName, setCreatorName] = useState('Lean Expert');

  const handleCreate = async () => {
    const projName = `VSM ${search.trim() || 'Nuevo Mapa'}`;
    const newProj = await createNewProject(projName, creatorName);
    await loadProject(newProj.id);
    onOpenProject();
  };

  const handleOpen = async (id: string) => {
    await loadProject(id);
    onOpenProject();
  };

  const handleStartRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setNewName(currentName);
  };

  const handleSaveRename = async () => {
    if (renamingId && newName.trim()) {
      await renameProject(renamingId, newName.trim());
      setRenamingId(null);
    }
  };

  // Filter & Sort projects
  const filteredProjects = projects
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto p-6 sm:p-8 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Folder className="text-blue-600 dark:text-blue-500 fill-blue-600/10" size={26} />
            <span>Mis VSM</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Crea, administra y optimiza tus mapas de flujo de valor Lean Manufacturing.</p>
        </div>
        
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>Nuevo VSM</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Sort and Settings */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <ArrowUpDown size={14} className="text-slate-400" />
            <span>Filtrar por:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="recent">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="name">Nombre (A-Z)</option>
          </select>

          <input
            type="text"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            placeholder="Autor"
            title="Nombre del autor por defecto"
            className="w-28 px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 outline-none text-center"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 rounded-2xl text-center text-slate-400 dark:text-slate-500 min-h-[300px]">
          <Folder size={40} className="mb-2 stroke-1 text-slate-350 dark:text-slate-700" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No se encontraron mapas VSM</p>
          <p className="text-xs mt-0.5 max-w-[280px]">
            {search ? 'Modifica tu búsqueda o filtros.' : 'Comienza agregando un nuevo mapa haciendo clic en el botón superior.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProjects.map((p) => {
            const nodesCount = Array.isArray(p.nodes) ? p.nodes.length : 0;
            const edgesCount = Array.isArray(p.edges) ? p.edges.length : 0;
            const elementsCount = nodesCount + edgesCount;

            return (
              <div 
                key={p.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl hover:shadow-md hover:border-slate-300 dark:hover:border-slate-750 transition-all flex flex-col group relative overflow-hidden"
              >
                <div className="p-4 flex-1 flex flex-col justify-between">
                  {/* Title or inline edit */}
                  <div className="mb-3">
                    {renamingId === p.id ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border border-blue-500 rounded bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                        />
                        <button 
                          onClick={handleSaveRename}
                          className="p-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded hover:bg-emerald-100"
                        >
                          <Check size={12} />
                        </button>
                        <button 
                          onClick={() => setRenamingId(null)}
                          className="p-1 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded hover:bg-red-100"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <h3 className="font-bold text-xs text-slate-800 dark:text-slate-250 truncate group-hover:text-blue-600 dark:group-hover:text-blue-450 transition-colors">
                        {p.name}
                      </h3>
                    )}
                  </div>

                  {/* Metadata fields */}
                  <div className="space-y-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-slate-400" />
                      <span className="truncate">Autor: {p.author || 'Anonymous'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-400" />
                      <span>Modificado: {formatDate(p.updated_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers size={12} className="text-slate-400" />
                      <span>Elementos: <strong className="text-slate-700 dark:text-slate-300">{elementsCount}</strong> ({nodesCount} N, {edgesCount} E)</span>
                    </div>
                  </div>
                </div>

                {/* Card Action bar */}
                <div className="bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 px-3 py-2 flex items-center justify-between gap-1 select-none">
                  {/* Left: Open action */}
                  <button
                    onClick={() => handleOpen(p.id)}
                    className="flex items-center gap-1 text-[11px] font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline"
                  >
                    <Play size={12} className="fill-current" />
                    <span>Abrir</span>
                  </button>

                  {/* Right: Duplicate, Rename, Export, Delete buttons */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleStartRename(p.id, p.name)}
                      className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-150 dark:hover:bg-slate-800 rounded transition-colors"
                      title="Renombrar"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => duplicateProject(p.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-150 dark:hover:bg-slate-800 rounded transition-colors"
                      title="Duplicar"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => exportToJson(p)}
                      className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-150 dark:hover:bg-slate-800 rounded transition-colors"
                      title="Exportar JSON"
                    >
                      <FileDown size={12} />
                    </button>
                    <button
                      onClick={() => deleteProject(p.id)}
                      className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
