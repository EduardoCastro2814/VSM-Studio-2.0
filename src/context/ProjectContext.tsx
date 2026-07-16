import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  type Node, 
  type Edge, 
  type OnNodesChange, 
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  addEdge
} from '@xyflow/react';
import { db, supabase, isSupabaseConfigured, type VsmProject, type VsmProjectVersion } from '../lib/supabase';

// Force Public and Anonymous access (No Auth required)
export const PUBLIC_ACCESS = true;

type Theme = 'light' | 'dark';

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

interface ProjectContextProps {
  projects: VsmProject[];
  activeProject: VsmProject | null;
  isLoading: boolean;
  isSaving: boolean;
  nodes: Node[];
  edges: Edge[];
  selectedElement: Node | Edge | null;
  theme: Theme;
  versions: VsmProjectVersion[];
  
  // Save status states (Requirements #2, #3, #8)
  saveStatus: 'unsaved' | 'saving' | 'saved';
  lastSavedTime: Date | null;
  lastSaveError: string | null;
  
  // Auth state (Always null/empty in public mode)
  user: any | null;
  signOut: () => Promise<void>;
  isSupabaseConfigured: boolean;
  isAuthOpen: boolean;
  setIsAuthOpen: (val: boolean) => void;
  
  // Projects Actions
  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createNewProject: (name: string, author?: string) => Promise<VsmProject>;
  saveCurrentProject: () => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  
  // Versions
  loadVersions: (projectId: string) => Promise<void>;
  saveNewVersion: (versionName: string, actionName?: string) => Promise<void>;
  restoreVersion: (version: VsmProjectVersion) => Promise<void>;
  
  // React Flow Actions
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  setSelectedElement: (element: Node | Edge | null) => void;
  updateNodeData: (nodeId: string, data: any) => void;
  updateEdgeData: (edgeId: string, data: any) => void;
  
  // History Actions
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  recordHistoryState: (nodesState?: Node[], edgesState?: Edge[]) => void;
  
  // Settings / Theme
  toggleTheme: () => void;
  debugConnections: boolean;
  setDebugConnections: React.Dispatch<React.SetStateAction<boolean>>;
}

const ProjectContext = createContext<ProjectContextProps | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<VsmProject[]>([]);
  const [activeProject, setActiveProject] = useState<VsmProject | null>(null);
  const [nodes, setNodesState] = useState<Node[]>([]);
  const [edges, setEdgesState] = useState<Edge[]>([]);
  const [versions, setVersions] = useState<VsmProjectVersion[]>([]);
  const [selectedElement, setSelectedElement] = useState<Node | Edge | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [debugConnections, setDebugConnections] = useState(false);

  // Save states (Requirements #2, #3, #8)
  const [saveStatus, setSaveStatus] = useState<'unsaved' | 'saving' | 'saved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(new Date());
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);

  // In public mode, user session is always null and login modal is disabled
  const [user] = useState<any>(null);
  const [isAuthOpen] = useState(false);

  // History State
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);

  // Sync theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.setProperty('--bg-color', '#0f172a');
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--bg-color', '#f8fafc');
    }
  }, [theme]);

  // Loading safety timeout
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        console.warn('⚠️ VSM Studio: Se alcanzó el tiempo de espera máximo de carga (10s). Desactivando cargador.');
        setIsLoading(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // App initialization
  useEffect(() => {
    console.log('🏁 VSM Studio: Iniciando flujo en Modo Público (Acceso Libre)...');
    console.log('🔍 VSM Studio: Verificando configuración de Supabase... Configurado:', isSupabaseConfigured);
    setIsLoading(false);
  }, []);

  // Helper functions for local fallback
  const getLocalProjects = (): VsmProject[] => {
    const data = localStorage.getItem('vsm_projects');
    return data ? JSON.parse(data) : [];
  };

  // Load all projects from storage (LocalStorage is primary for anonymous, Supabase is fallback)
  const loadProjects = useCallback(async () => {
    console.log('📂 VSM Studio: Iniciando carga de proyectos locales...');
    setIsLoading(true);
    try {
      const data = await db.getProjects();
      console.log(`📂 VSM Studio: Proyectos locales cargados con éxito (${data.length} encontrados).`);
      setProjects(data);

      // Check query parameters to load shared diagrams (Requirement #9)
      const params = new URLSearchParams(window.location.search);
      const sharedFile = params.get('file');
      const sharedId = params.get('id');

      if (sharedFile && isSupabaseConfigured && supabase) {
        console.log(`🗺️ VSM Studio: Cargando diagrama compartido desde Storage: ${sharedFile}`);
        try {
          const { data: fileData, error: fileErr } = await supabase.storage
            .from('vsm-files')
            .download(sharedFile);
          if (fileErr) throw fileErr;
          
          const fileText = await fileData.text();
          const projectData = JSON.parse(fileText);
          
          const newProj: VsmProject = {
            id: projectData.id || crypto.randomUUID(),
            name: projectData.name || 'VSM Compartido',
            author: projectData.author || 'Lean Expert',
            nodes: projectData.nodes || [],
            edges: projectData.edges || [],
            viewport: projectData.viewport || { x: 0, y: 0, zoom: 1 },
            created_at: projectData.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setProjects(prev => [newProj, ...prev.filter(p => p.id !== newProj.id)]);
          setActiveProject(newProj);
          setNodesState(newProj.nodes);
          setEdgesState(newProj.edges);
          setHistory([{ nodes: newProj.nodes, edges: newProj.edges }]);
          setHistoryIndex(0);
          setSaveStatus('saved');
          setLastSavedTime(new Date());
          setLastSaveError(null);
          console.log('🗺️ VSM Studio: Diagrama compartido cargado exitosamente.');
          setIsLoading(false);
          return;
        } catch (fetchErr: any) {
          console.error('❌ VSM Studio: Error al cargar el archivo de compartidos:', fetchErr.message || fetchErr);
          alert(`Error al cargar el archivo compartido: ${fetchErr.message || fetchErr}`);
        }
      }

      if (sharedId) {
        console.log(`🗺️ VSM Studio: Detectado ID compartido en URL: ${sharedId}. Cargando...`);
        await loadProject(sharedId);
        return;
      }
      
      // Load last active project, or create one if empty
      if (data.length > 0) {
        console.log(`🗺️ VSM Studio: Cargando el proyecto activo por defecto: ${data[0].name}`);
        await loadProject(data[0].id);
      } else {
        console.log('🗺️ VSM Studio: No se encontraron proyectos. Creando proyecto local por defecto...');
        const defaultProj = await createNewProject('Mi Primer VSM', 'Lean Expert');
        await loadProject(defaultProj.id);
      }
    } catch (e: any) {
      console.error('❌ VSM Studio: Error al cargar proyectos:', e.message || e);
      setProjects([]);
      setActiveProject(null);
    } finally {
      setIsLoading(false);
      console.log('✨ VSM Studio: Fin de inicialización de proyectos. Interfaz lista.');
    }
  }, []);

  // Trigger projects fetch on load
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Sign out is a no-op in public mode
  const signOut = async () => {};

  // Load a single project into the workspace
  const loadProject = async (id: string) => {
    setIsLoading(true);
    try {
      console.log(`📂 VSM Studio: Solicitando carga de proyecto ID: ${id}`);
      const project = await db.getProject(id);
      if (project) {
        console.log(`🗺️ VSM Studio: Carga de mapa asociada a proyecto '${project.name}' completada.`);
        setActiveProject(project);
        setNodesState(project.nodes || []);
        setEdgesState(project.edges || []);
        
        // Reset History
        setHistory([{ nodes: project.nodes || [], edges: project.edges || [] }]);
        setHistoryIndex(0);
        setSelectedElement(null);
        isInitialLoadRef.current = true;
        
        // Reset Save Status (Requirement #4)
        setSaveStatus('saved');
        setLastSavedTime(project.updated_at ? new Date(project.updated_at) : new Date());
        setLastSaveError(null);
        
        await loadVersions(project.id);
      } else {
        throw new Error('Proyecto no encontrado.');
      }
    } catch (e: any) {
      console.error(`❌ VSM Studio: Error al cargar el proyecto ${id}:`, e.message || e);
      // Fallback to local storage if DB query fails or is blocked
      const localP = getLocalProjects().find(p => p.id === id);
      if (localP) {
        setActiveProject(localP);
        setNodesState(localP.nodes || []);
        setEdgesState(localP.edges || []);
        setHistory([{ nodes: localP.nodes || [], edges: localP.edges || [] }]);
        setHistoryIndex(0);
        setSaveStatus('saved');
        setLastSavedTime(localP.updated_at ? new Date(localP.updated_at) : new Date());
        setLastSaveError(null);
      } else {
        alert(`Error al cargar el proyecto: ${e.message || e}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Create new project
  const createNewProject = async (name: string, author = 'Anonymous'): Promise<VsmProject> => {
    const proj = await db.createProject(name, author);
    setProjects(prev => [proj, ...prev]);
    return proj;
  };

  // Save project (Requirements #1, #2, #3, #8)
  const saveCurrentProject = async () => {
    if (!activeProject) return;
    setIsSaving(true);
    setSaveStatus('saving');
    setLastSaveError(null);
    try {
      const updated: VsmProject = {
        ...activeProject,
        nodes,
        edges,
      };
      const saved = await db.saveProject(updated);
      setActiveProject(saved);
      setProjects(prev => prev.map(p => p.id === saved.id ? saved : p));
      setSaveStatus('saved');
      setLastSavedTime(new Date());
      setLastSaveError(null);
    } catch (e: any) {
      console.error('Failed to save project:', e);
      setSaveStatus('unsaved');
      setLastSaveError(e.message || String(e));
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  // Delete project
  const deleteProject = async (id: string) => {
    await db.deleteProject(id);
    const updatedProjects = projects.filter(p => p.id !== id);
    setProjects(updatedProjects);
    
    if (activeProject?.id === id) {
      if (updatedProjects.length > 0) {
        await loadProject(updatedProjects[0].id);
      } else {
        const defaultProj = await createNewProject('Mi Primer VSM', 'Lean Expert');
        await loadProject(defaultProj.id);
      }
    }
  };

  // Duplicate project
  const duplicateProject = async (id: string) => {
    const target = projects.find(p => p.id === id);
    if (!target) return;
    
    const dupName = `${target.name} (Copia)`;
    const newProj = await db.createProject(dupName, target.author);
    
    const updatedProj = await db.saveProject({
      ...newProj,
      nodes: JSON.parse(JSON.stringify(target.nodes)),
      edges: JSON.parse(JSON.stringify(target.edges)),
      viewport: { ...target.viewport },
    });

    await db.createVersion(
      updatedProj.id,
      `Duplicado de: ${target.name}`,
      target.nodes,
      target.edges,
      'Duplicado'
    );
    
    setProjects(prev => [updatedProj, ...prev.filter(p => p.id !== newProj.id)]);
    await loadProject(updatedProj.id);
  };

  // Rename project
  const renameProject = async (id: string, name: string) => {
    const proj = projects.find(p => p.id === id);
    if (!proj) return;
    
    const updated = await db.saveProject({ ...proj, name });
    setProjects(prev => prev.map(p => p.id === id ? updated : p));
    if (activeProject?.id === id) {
      setActiveProject(updated);
    }
  };

  // Version management
  const loadVersions = async (projectId: string) => {
    const data = await db.getVersions(projectId);
    setVersions(data);
  };

  const saveNewVersion = async (versionName: string, actionName = 'Guardado manual') => {
    if (!activeProject) return;
    const v = await db.createVersion(activeProject.id, versionName, nodes, edges, actionName);
    setVersions(prev => [v, ...prev]);
  };

  const restoreVersion = async (version: VsmProjectVersion) => {
    if (!activeProject) return;
    
    setNodesState(version.nodes || []);
    setEdgesState(version.edges || []);
    recordHistoryState(version.nodes, version.edges);
    setSelectedElement(null);
    setSaveStatus('unsaved');

    await db.saveProject({
      ...activeProject,
      nodes: version.nodes || [],
      edges: version.edges || [],
    });

    await saveNewVersion(`Restauración: ${version.name}`, 'Restauración');
  };

  // Autosave trigger on changes (Requirements #1, #3)
  useEffect(() => {
    if (!activeProject) return;
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveCurrentProject().catch(() => {});
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [nodes, edges]);

  // History Recording
  const recordHistoryState = useCallback((nodesState?: Node[], edgesState?: Edge[]) => {
    const nextNodes = nodesState || nodes;
    const nextEdges = edgesState || edges;
    
    const nextHistory = history.slice(0, historyIndex + 1);
    
    const lastState = nextHistory[nextHistory.length - 1];
    if (
      !lastState ||
      JSON.stringify(lastState.nodes) !== JSON.stringify(nextNodes) ||
      JSON.stringify(lastState.edges) !== JSON.stringify(nextEdges)
    ) {
      const updatedHistory = [...nextHistory, { nodes: nextNodes, edges: nextEdges }].slice(-30);
      setHistory(updatedHistory);
      setHistoryIndex(updatedHistory.length - 1);
    }
  }, [nodes, edges, history, historyIndex]);

  const setNodes = useCallback((newNodes: React.SetStateAction<Node[]>) => {
    setSaveStatus('unsaved');
    setNodesState(prev => {
      const computed = typeof newNodes === 'function' ? newNodes(prev) : newNodes;
      setTimeout(() => recordHistoryState(computed, undefined), 0);
      return computed;
    });
  }, [recordHistoryState]);

  const setEdges = useCallback((newEdges: React.SetStateAction<Edge[]>) => {
    setSaveStatus('unsaved');
    setEdgesState(prev => {
      const computed = typeof newEdges === 'function' ? newEdges(prev) : newEdges;
      setTimeout(() => recordHistoryState(undefined, computed), 0);
      return computed;
    });
  }, [recordHistoryState]);

  const onNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
    const hasMeaningfulChange = changes.some(c => c.type !== 'select');
    if (hasMeaningfulChange) {
      setSaveStatus('unsaved');
    }
    setNodesState(prev => {
      const next = applyNodeChanges(changes, prev);
      
      const selectedChange = changes.find(c => c.type === 'select');
      if (selectedChange && 'id' in selectedChange) {
        if (selectedChange.selected) {
          const matched = next.find(n => n.id === selectedChange.id);
          if (matched) setSelectedElement(matched);
        } else {
          setSelectedElement(prevSel => prevSel && 'id' in prevSel && prevSel.id === selectedChange.id ? null : prevSel);
        }
      }
      return next;
    });
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes: EdgeChange[]) => {
    const hasMeaningfulChange = changes.some(c => c.type !== 'select');
    if (hasMeaningfulChange) {
      setSaveStatus('unsaved');
    }
    setEdgesState(prev => {
      const next = applyEdgeChanges(changes, prev);
      
      const selectedChange = changes.find(c => c.type === 'select');
      if (selectedChange && 'id' in selectedChange) {
        if (selectedChange.selected) {
          const matched = next.find(e => e.id === selectedChange.id);
          if (matched) setSelectedElement(matched);
        } else {
          setSelectedElement(prevSel => prevSel && 'id' in prevSel && prevSel.id === selectedChange.id ? null : prevSel);
        }
      }
      return next;
    });
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setSaveStatus('unsaved');
    setEdgesState(prev => {
      const newEdge = { 
        ...connection, 
        id: `e-${crypto.randomUUID()}`,
        type: 'physical',
        data: {
          type: 'physical',
          label: ''
        }
      };
      const next = addEdge(newEdge as Edge, prev);
      setTimeout(() => recordHistoryState(undefined, next), 0);
      return next;
    });
  }, [recordHistoryState]);

  const updateNodeData = useCallback((nodeId: string, data: any) => {
    setSaveStatus('unsaved');
    setNodesState(prev => {
      const next = prev.map(n => {
        if (n.id === nodeId) {
          const updatedNode = {
            ...n,
            data: {
              ...n.data,
              ...data
            }
          };
          if (selectedElement && selectedElement.id === nodeId) {
            setSelectedElement(updatedNode);
          }
          return updatedNode;
        }
        return n;
      });
      setTimeout(() => recordHistoryState(next, undefined), 0);
      return next;
    });
  }, [selectedElement, recordHistoryState]);

  const updateEdgeData = useCallback((edgeId: string, data: any) => {
    setSaveStatus('unsaved');
    setEdgesState(prev => {
      const next = prev.map(e => {
        if (e.id === edgeId) {
          const updatedEdge = {
            ...e,
            data: {
              ...(e.data as object || {}),
              ...data
            },
            type: data.type || e.type
          };
          if (selectedElement && selectedElement.id === edgeId) {
            setSelectedElement(updatedEdge);
          }
          return updatedEdge;
        }
        return e;
      });
      setTimeout(() => recordHistoryState(undefined, next), 0);
      return next;
    });
  }, [selectedElement, recordHistoryState]);

  const undo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const { nodes: prevNodes, edges: prevEdges } = history[nextIndex];
      setNodesState(prevNodes);
      setEdgesState(prevEdges);
      setHistoryIndex(nextIndex);
      setSelectedElement(null);
      setSaveStatus('unsaved');
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const { nodes: nextNodes, edges: nextEdges } = history[nextIndex];
      setNodesState(nextNodes);
      setEdgesState(nextEdges);
      setHistoryIndex(nextIndex);
      setSelectedElement(null);
      setSaveStatus('unsaved');
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      activeProject,
      isLoading,
      isSaving,
      nodes,
      edges,
      selectedElement,
      theme,
      versions,
      
      // Save Status Properties (Requirements #2, #3, #8)
      saveStatus,
      lastSavedTime,
      lastSaveError,
      
      // Auth state
      user,
      signOut,
      isSupabaseConfigured,
      isAuthOpen,
      setIsAuthOpen: () => {}, // Disable auth triggers in public mode
      
      loadProjects,
      loadProject,
      createNewProject,
      saveCurrentProject,
      deleteProject,
      duplicateProject,
      renameProject,
      
      loadVersions,
      saveNewVersion,
      restoreVersion,
      
      setNodes,
      setEdges,
      onNodesChange,
      onEdgesChange,
      onConnect,
      setSelectedElement,
      updateNodeData,
      updateEdgeData,
      
      undo,
      redo,
      canUndo,
      canRedo,
      recordHistoryState,
      
      toggleTheme,
      debugConnections,
      setDebugConnections
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
