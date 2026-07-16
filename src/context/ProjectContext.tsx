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
  
  // Auth state
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

  // Auth & login modal state
  const [user, setUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // History State
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);

  // Sync class on documentElement for Tailwind theme
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

  // Loading safety timeout: maximum 10 seconds to prevent infinite lockups
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        console.warn('⚠️ VSM Studio: Se alcanzó el tiempo de espera máximo de carga (10s). Desactivando cargador.');
        setIsLoading(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Close login modal automatically on successful session loading
  useEffect(() => {
    if (user) {
      setIsAuthOpen(false);
    }
  }, [user]);

  // Monitor Supabase session states
  useEffect(() => {
    console.log('🏁 VSM Studio: Iniciando flujo de carga de la aplicación...');
    console.log('🔍 VSM Studio: Verificando configuración de Supabase... Configurado:', isSupabaseConfigured);

    if (isSupabaseConfigured && supabase) {
      // Fetch initial session
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.error('❌ VSM Studio: Fallo al verificar sesión inicial:', error.message);
        }
        const activeUser = session?.user ?? null;
        console.log('👤 VSM Studio: Carga de usuario/sesión inicial completada - Usuario:', activeUser ? activeUser.email : 'No autenticado');
        setUser(activeUser);
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const activeUser = session?.user ?? null;
        console.log('👤 VSM Studio: Cambio de estado Auth detectado - Usuario:', activeUser ? activeUser.email : 'Sesión cerrada');
        setUser(activeUser);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      console.log('👤 VSM Studio: Supabase no configurado. Utilizando modo local.');
      setIsLoading(false);
    }
  }, []);

  // Load all projects on initial mount / user state change
  const loadProjects = useCallback(async () => {
    console.log('📂 VSM Studio: Iniciando carga de proyectos desde el backend...');
    setIsLoading(true);
    try {
      const data = await db.getProjects();
      console.log(`📂 VSM Studio: Proyectos cargados con éxito (${data.length} encontrados).`);
      setProjects(data);
      
      // Load last active project, or create one if empty
      if (data.length > 0) {
        console.log(`🗺️ VSM Studio: Cargando el proyecto activo por defecto: ${data[0].name}`);
        await loadProject(data[0].id);
      } else {
        console.log('🗺️ VSM Studio: No se encontraron proyectos. Intentando crear proyecto por defecto...');
        try {
          const defaultProj = await createNewProject('Mi Primer VSM', user?.email || 'Lean Expert');
          console.log('🗺️ VSM Studio: Proyecto por defecto creado con éxito:', defaultProj.name);
          await loadProject(defaultProj.id);
        } catch (createErr: any) {
          console.error('❌ VSM Studio: Error SQL o RLS al crear proyecto por defecto en Supabase:', createErr);
          
          // FALLBACK: Create in-memory local temporary project to avoid blocking the app
          console.log('⚠️ VSM Studio: Activando fallback de proyecto temporal en memoria.');
          const tempProj = {
            id: 'temp-project-id',
            name: 'Proyecto Temporal (Sin conexión)',
            author: user?.email || 'Lean Expert',
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setProjects([tempProj]);
          setActiveProject(tempProj);
          setNodesState([]);
          setEdgesState([]);
        }
      }
    } catch (e: any) {
      console.error('❌ VSM Studio: Error crítico al cargar proyectos:', e.message || e);
      alert(`Error al inicializar proyectos: ${e.message || e}`);
      setProjects([]);
      setActiveProject(null);
    } finally {
      setIsLoading(false);
      console.log('✨ VSM Studio: Fin de inicialización de proyectos. Interfaz lista.');
    }
  }, [user]);

  // Trigger projects fetch when user logs in, or fallback for local mode
  useEffect(() => {
    if (!isSupabaseConfigured || user) {
      loadProjects();
    } else {
      console.log('👤 VSM Studio: Cargando proyectos en modo local.');
      setProjects([]);
      setActiveProject(null);
      setNodesState([]);
      setEdgesState([]);
      setVersions([]);
      // Settle the loading state for unauthenticated Supabase mode (Requirement #6)
      setIsLoading(false);
    }
  }, [user, loadProjects]);

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
      setUser(null);
    }
  };

  // Load a single project into the workspace
  const loadProject = async (id: string) => {
    setIsLoading(true);
    try {
      console.log(`📂 VSM Studio: Solicitando carga de proyecto específico ID: ${id}`);
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
        
        await loadVersions(project.id);
      } else {
        throw new Error('Proyecto no encontrado.');
      }
    } catch (e: any) {
      console.error(`❌ VSM Studio: Error al cargar el proyecto ${id}:`, e.message || e);
      alert(`Error al cargar el proyecto: ${e.message || e}`);
      setNodesState([]);
      setEdgesState([]);
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

  // Save project
  const saveCurrentProject = async () => {
    if (!activeProject) return;
    setIsSaving(true);
    try {
      const updated: VsmProject = {
        ...activeProject,
        nodes,
        edges,
      };
      const saved = await db.saveProject(updated);
      setActiveProject(saved);
      setProjects(prev => prev.map(p => p.id === saved.id ? saved : p));
    } catch (e) {
      console.error('Failed to save project:', e);
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
        const defaultProj = await createNewProject('Mi Primer VSM', user?.email || 'Lean Expert');
        await loadProject(defaultProj.id);
      }
    }
  };

  // Duplicate project
  const duplicateProject = async (id: string) => {
    const target = projects.find(p => p.id === id);
    if (!target) return;
    
    const dupName = `${target.name} (Copia)`;
    const newProj = await db.createProject(dupName, user?.email || target.author);
    
    const updatedProj = await db.saveProject({
      ...newProj,
      nodes: JSON.parse(JSON.stringify(target.nodes)),
      edges: JSON.parse(JSON.stringify(target.edges)),
      viewport: { ...target.viewport },
    });

    // Create a duplication version in history
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

    await db.saveProject({
      ...activeProject,
      nodes: version.nodes || [],
      edges: version.edges || [],
    });

    await saveNewVersion(`Restauración: ${version.name}`, 'Restauración');
  };

  // Autosave trigger on canvas changes
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
      saveCurrentProject();
    }, 1500); // 1.5s debounce

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
    setNodesState(prev => {
      const computed = typeof newNodes === 'function' ? newNodes(prev) : newNodes;
      setTimeout(() => recordHistoryState(computed, undefined), 0);
      return computed;
    });
  }, [recordHistoryState]);

  const setEdges = useCallback((newEdges: React.SetStateAction<Edge[]>) => {
    setEdgesState(prev => {
      const computed = typeof newEdges === 'function' ? newEdges(prev) : newEdges;
      setTimeout(() => recordHistoryState(undefined, computed), 0);
      return computed;
    });
  }, [recordHistoryState]);

  const onNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
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
      
      // Auth state
      user,
      signOut,
      isSupabaseConfigured,
      isAuthOpen,
      setIsAuthOpen,
      
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
