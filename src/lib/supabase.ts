import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase if keys are provided
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Diagnostic console logs
console.group('=== VSM STUDIO DIAGNÓSTICO SUPABASE ===');
console.log('VITE_SUPABASE_URL disponible:', Boolean(supabaseUrl), supabaseUrl ? `(URL: ${supabaseUrl.substring(0, 15)}...)` : '(Faltante)');
console.log('VITE_SUPABASE_ANON_KEY disponible:', Boolean(supabaseAnonKey), supabaseAnonKey ? '(Definida)' : '(Faltante)');
console.log('Supabase configurado para backend:', isSupabaseConfigured);
console.groupEnd();

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export let isVersionsHistoryDisabled = false;

// Async connection validation log
if (isSupabaseConfigured && supabase) {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('❌ Supabase: Error de conexión a la base de datos o API:', error.message);
    } else {
      console.log('✅ Supabase: Conexión establecida exitosamente. Sesión de usuario activa:', Boolean(data.session));
    }
  });
}

export interface VsmProject {
  id: string;
  name: string;
  author: string;
  nodes: any[];
  edges: any[];
  viewport: { x: number; y: number; zoom: number };
  created_at: string;
  updated_at: string;
}

export interface VsmProjectVersion {
  id: string;
  project_id: string;
  name: string;
  nodes: any[];
  edges: any[];
  created_at: string;
  action_name?: string;
  created_by_email?: string;
}

// LocalStorage helpers as fallback
const LOCAL_STORAGE_KEY = 'vsm_studio_projects';
const LOCAL_STORAGE_VERSIONS_KEY = 'vsm_studio_project_versions';

const getLocalProjects = (): VsmProject[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveLocalProjects = (projects: VsmProject[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
};

const getLocalVersions = (): VsmProjectVersion[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_VERSIONS_KEY);
  return data ? JSON.parse(data) : [];
};

const saveLocalVersions = (versions: VsmProjectVersion[]) => {
  localStorage.setItem(LOCAL_STORAGE_VERSIONS_KEY, JSON.stringify(versions));
};

// Database CRUD & Storage Interface
export const db = {
  async getProjects(): Promise<VsmProject[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log(`Consulta ejecutada:\nSELECT id, name, description, created_at, updated_at, owner_id FROM projects ORDER BY updated_at DESC`);
          const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select('id, name, description, created_at, updated_at, owner_id')
            .order('updated_at', { ascending: false });

          if (projectsError) {
            console.log(`Resultado:\nERROR: ${projectsError.message}`);
            throw new Error(`Error al obtener proyectos: ${projectsError.message}`);
          }
          console.log(`Resultado:\nOK`);
          console.log(`Proyectos encontrados:\n${JSON.stringify(projectsData)}`);

          let mapsData: any[] = [];
          if (projectsData && projectsData.length > 0) {
            const projectIds = projectsData.map(p => p.id);
            console.log(`Consulta ejecutada:\nSELECT id, project_id, name, canvas_data_json FROM vsm_maps WHERE project_id IN (${projectIds.map(id => `'${id}'`).join(', ')})`);
            const { data: maps, error: mapsError } = await supabase
              .from('vsm_maps')
              .select('id, project_id, name, canvas_data_json')
              .in('project_id', projectIds);

            if (mapsError) {
              console.log(`Resultado:\nERROR: ${mapsError.message}`);
              throw new Error(`Error al obtener mapas de proyectos: ${mapsError.message}`);
            }
            console.log(`Resultado:\nOK`);
            console.log(`Mapas encontrados:\n${JSON.stringify(maps)}`);
            mapsData = maps || [];
          }

          let profilesData: any[] = [];
          if (projectsData && projectsData.length > 0) {
            const ownerIds = projectsData.map(p => p.owner_id).filter(Boolean);
            if (ownerIds.length > 0) {
              console.log(`Consulta ejecutada:\nSELECT id, email FROM profiles WHERE id IN (${ownerIds.map(id => `'${id}'`).join(', ')})`);
              const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, email')
                .in('id', ownerIds);

              if (profilesError) {
                console.log(`Resultado:\nERROR profiles: ${profilesError.message}`);
              } else {
                console.log(`Resultado:\nOK profiles`);
                profilesData = profiles || [];
              }
            }
          }

          return projectsData.map((item: any) => {
            const map = mapsData.find(m => m.project_id === item.id);
            const profile = profilesData.find(p => p.id === item.owner_id);
            return {
              id: item.id,
              name: item.name,
              author: profile?.email || 'Lean Expert',
              nodes: map?.canvas_data_json?.nodes || [],
              edges: map?.canvas_data_json?.edges || [],
              viewport: map?.canvas_data_json?.viewport || { x: 0, y: 0, zoom: 1 },
              created_at: item.created_at,
              updated_at: item.updated_at
            };
          });
        }
      } catch (err: any) {
        console.error('❌ Supabase: Excepción al obtener proyectos:', err.message || err);
        throw err;
      }
    }
    return getLocalProjects().sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  async getProject(id: string): Promise<VsmProject | null> {
    const localProjects = getLocalProjects();
    const localP = localProjects.find(p => p.id === id);

    if (isSupabaseConfigured && supabase) {
      try {
        console.log(`Proyecto solicitado:\nID: ${id}`);
        console.log(`Consulta ejecutada:\nSELECT id, name, description, created_at, updated_at, owner_id FROM projects WHERE id = '${id}'`);
        
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name, description, created_at, updated_at, owner_id')
          .eq('id', id)
          .maybeSingle();

        if (projectError) {
          console.log(`Resultado:\nERROR: ${projectError.message}`);
          throw new Error(`Error en consulta de proyectos: ${projectError.message}`);
        }
        
        console.log(`Resultado:\nOK`);
        console.log(`Proyecto encontrado:\n${JSON.stringify(projectData)}`);

        if (!projectData) {
          if (localP) {
            console.log(`💾 [DIAGNÓSTICO CARGA] Proyecto no encontrado en Supabase, usando copia local.`);
            return localP;
          }
          throw new Error(`Proyecto no encontrado.`);
        }

        console.log(`Consulta ejecutada:\nSELECT id, name, canvas_data_json FROM vsm_maps WHERE project_id = '${id}'`);
        const { data: mapData, error: mapError } = await supabase
          .from('vsm_maps')
          .select('id, name, canvas_data_json')
          .eq('project_id', id)
          .maybeSingle();

        if (mapError) {
          console.log(`Resultado:\nERROR: ${mapError.message}`);
          throw new Error(`Error en consulta de mapas: ${mapError.message}`);
        }

        console.log(`Resultado:\nOK`);
        console.log(`Mapa encontrado:\n${JSON.stringify(mapData)}`);

        let authorEmail = 'Lean Expert';
        if (projectData.owner_id) {
          console.log(`Consulta ejecutada:\nSELECT email FROM profiles WHERE id = '${projectData.owner_id}'`);
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', projectData.owner_id)
            .maybeSingle();

          if (profileError) {
            console.log(`Resultado:\nERROR profiles: ${profileError.message}`);
          } else {
            console.log(`Resultado:\nOK profiles`);
            if (profileData?.email) {
              authorEmail = profileData.email;
            }
          }
        }

        let latestVersionData: any = null;
        if (!isVersionsHistoryDisabled) {
          try {
            if (mapData) {
              console.log(`Consulta ejecutada:\nSELECT * FROM vsm_map_versions WHERE map_id = '${mapData.id}' ORDER BY created_at DESC LIMIT 1`);
              const { data: versionData, error: versionError } = await supabase
                .from('vsm_map_versions')
                .select('*')
                .eq('map_id', mapData.id)
                .order('created_at', { ascending: false })
                .limit(1);

              if (versionError) {
                console.log(`Resultado:\nERROR vsm_map_versions: ${versionError.message}`);
                if (versionError.code === '42P01' || versionError.message?.includes('vsm_map_versions') || versionError.message?.includes('relation') || versionError.message?.includes('Could not find the table')) {
                  console.warn('⚠️ La tabla vsm_map_versions no existe o relación no encontrada. Desactivando historial de versiones.');
                  isVersionsHistoryDisabled = true;
                }
              } else {
                console.log(`Resultado:\nOK`);
                if (versionData && versionData.length > 0) {
                  latestVersionData = versionData[0];
                }
              }
            }
          } catch {
            // Suppress exception
          }
        }
        console.log(`Versión encontrada:\n${JSON.stringify(latestVersionData)}`);

        const supabaseProject: VsmProject = {
          id: projectData.id,
          name: projectData.name,
          author: authorEmail,
          nodes: mapData?.canvas_data_json?.nodes || [],
          edges: mapData?.canvas_data_json?.edges || [],
          viewport: mapData?.canvas_data_json?.viewport || { x: 0, y: 0, zoom: 1 },
          created_at: projectData.created_at,
          updated_at: projectData.updated_at
        };

        if (localP) {
          const localTime = new Date(localP.updated_at).getTime();
          const supabaseTime = new Date(supabaseProject.updated_at).getTime();
          const localHasMoreData = (localP.nodes?.length || 0) > (supabaseProject.nodes?.length || 0);

          if (localTime > supabaseTime || (localHasMoreData && supabaseProject.nodes?.length === 0)) {
            console.log('🔄 [DIAGNÓSTICO CARGA] La copia local es más reciente o contiene más datos. Usando copia local y programando sincronización.');
            this.saveProject(localP).catch(err => {
              console.error('❌ [DIAGNÓSTICO CARGA] Falló la sincronización automática:', err.message || err);
            });
            return localP;
          }
        }

        // Update local copy
        const index = localProjects.findIndex(p => p.id === id);
        if (index !== -1) {
          localProjects[index] = supabaseProject;
        } else {
          localProjects.push(supabaseProject);
        }
        saveLocalProjects(localProjects);
        return supabaseProject;
      } catch (err: any) {
        console.error('❌ [DIAGNÓSTICO CARGA] Excepción durante la carga de Supabase:', err.message || err);
        throw err;
      }
    }

    console.log(`💾 [DIAGNÓSTICO CARGA] Usando copia local para proyecto ID: ${id}`);
    if (!localP) {
      throw new Error(`Proyecto no encontrado.`);
    }
    return localP;
  },

  async createProject(name: string, author = 'Anonymous'): Promise<VsmProject> {
    const newProjectId = crypto.randomUUID();
    const newMapId = crypto.randomUUID();
    const nowStr = new Date().toISOString();

    const newProject: VsmProject = {
      id: newProjectId,
      name,
      author,
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      created_at: nowStr,
      updated_at: nowStr,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const insertObj: any = {
          id: newProjectId,
          name: name
        };
        if (user) {
          insertObj.owner_id = user.id;
        }

        console.log(`Consulta ejecutada:\nINSERT INTO projects (id, name, owner_id) VALUES ('${newProjectId}', '${name}', '${user?.id || 'NULL'}')`);
        // 1. Create project
        const { data: projData, error: projError } = await supabase
          .from('projects')
          .insert([insertObj])
          .select()
          .maybeSingle();

        if (projError) {
          console.log(`Resultado:\nERROR: ${projError.message}`);
          throw new Error(`Error al crear el proyecto: ${projError.message}`);
        }
        console.log(`Resultado:\nOK`);
        console.log(`Proyecto creado:\n${JSON.stringify(projData)}`);

        // 2. Create default VSM Map
        const mapInsert = {
          id: newMapId,
          project_id: newProjectId,
          name: 'Mapa Principal',
          canvas_data_json: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
        };
        console.log(`Consulta ejecutada:\nINSERT INTO vsm_maps (id, project_id, name, canvas_data_json) VALUES ('${newMapId}', '${newProjectId}', 'Mapa Principal', '{"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}')`);
        const { error: mapError } = await supabase
          .from('vsm_maps')
          .insert([mapInsert]);

        if (mapError) {
          console.log(`Resultado:\nERROR: ${mapError.message}`);
          throw new Error(`Error al crear el mapa del proyecto: ${mapError.message}`);
        }
        console.log(`Resultado:\nOK`);
        console.log(`Mapa creado:\n${JSON.stringify(mapInsert)}`);

        // Log creation version
        await this.createVersion(newProjectId, 'Creación Inicial', [], [], 'Creación');
        
        const returnProj: VsmProject = {
          ...newProject,
          author: user?.email || author,
          created_at: projData.created_at,
          updated_at: projData.updated_at
        };

        const projects = getLocalProjects();
        projects.push(returnProj);
        saveLocalProjects(projects);

        return returnProj;
      } catch (err: any) {
        console.error('❌ Supabase: Excepción al crear el proyecto:', err.message || err);
        throw err;
      }
    }

    const projects = getLocalProjects();
    projects.push(newProject);
    saveLocalProjects(projects);
    return newProject;
  },

  async saveProject(project: VsmProject): Promise<VsmProject> {
    const updatedProject = {
      ...project,
      updated_at: new Date().toISOString(),
    };

    console.log('💾 [DIAGNÓSTICO GUARDADO] Ejecutando guardado para proyecto ID:', updatedProject.id);
    console.log('📦 [DIAGNÓSTICO GUARDADO] Datos a persistir:', {
      name: updatedProject.name,
      nodesCount: updatedProject.nodes?.length || 0,
      edgesCount: updatedProject.edges?.length || 0,
      viewport: updatedProject.viewport
    });

    if (isSupabaseConfigured && supabase) {
      try {
        console.log(`Consulta ejecutada:\nSELECT id FROM projects WHERE id = '${updatedProject.id}'`);
        const { data: existingProject, error: checkProjErr } = await supabase
          .from('projects')
          .select('id')
          .eq('id', updatedProject.id)
          .maybeSingle();

        if (checkProjErr) {
          console.log(`Resultado:\nERROR: ${checkProjErr.message}`);
          throw new Error(`Error al buscar proyecto: ${checkProjErr.message}`);
        }
        console.log(`Resultado:\nOK`);
        console.log(`Proyecto encontrado:\n${JSON.stringify(existingProject)}`);

        let projResult;
        if (existingProject) {
          console.log(`Consulta ejecutada:\nUPDATE projects SET name = '${updatedProject.name}', updated_at = '${updatedProject.updated_at}' WHERE id = '${updatedProject.id}'`);
          projResult = await supabase
            .from('projects')
            .update({
              name: updatedProject.name,
              updated_at: updatedProject.updated_at
            })
            .eq('id', updatedProject.id)
            .select();
          if (projResult.error) {
            console.log(`Resultado:\nERROR: ${projResult.error.message}`);
          } else {
            console.log(`Resultado:\nOK`);
          }
        } else {
          const insertObj = {
            id: updatedProject.id,
            name: updatedProject.name,
            created_at: updatedProject.created_at || updatedProject.updated_at,
            updated_at: updatedProject.updated_at
          };
          console.log(`Consulta ejecutada:\nINSERT INTO projects (id, name, created_at, updated_at) VALUES ...`);
          projResult = await supabase
            .from('projects')
            .insert([insertObj])
            .select();
          if (projResult.error) {
            console.log(`Resultado:\nERROR: ${projResult.error.message}`);
          } else {
            console.log(`Resultado:\nOK`);
          }
        }

        if (projResult.error) {
          throw new Error(`Error en proyectos: ${projResult.error.message}`);
        }

        console.log(`Consulta ejecutada:\nSELECT id FROM vsm_maps WHERE project_id = '${updatedProject.id}'`);
        const { data: existingMap, error: checkMapErr } = await supabase
          .from('vsm_maps')
          .select('id')
          .eq('project_id', updatedProject.id)
          .maybeSingle();

        if (checkMapErr) {
          console.log(`Resultado:\nERROR: ${checkMapErr.message}`);
          throw new Error(`Error al buscar mapa: ${checkMapErr.message}`);
        }
        console.log(`Resultado:\nOK`);
        console.log(`Mapa encontrado:\n${JSON.stringify(existingMap)}`);

        let mapResult;
        const canvasData = {
          nodes: updatedProject.nodes || [],
          edges: updatedProject.edges || [],
          viewport: updatedProject.viewport || { x: 0, y: 0, zoom: 1 }
        };

        if (existingMap) {
          console.log(`Consulta ejecutada:\nUPDATE vsm_maps SET canvas_data_json = ..., updated_at = ... WHERE id = '${existingMap.id}'`);
          mapResult = await supabase
            .from('vsm_maps')
            .update({
              canvas_data_json: canvasData,
              updated_at: updatedProject.updated_at
            })
            .eq('id', existingMap.id)
            .select();
          if (mapResult.error) {
            console.log(`Resultado:\nERROR: ${mapResult.error.message}`);
          } else {
            console.log(`Resultado:\nOK`);
          }
        } else {
          const insertMapObj = {
            id: crypto.randomUUID(),
            project_id: updatedProject.id,
            name: 'Mapa Principal',
            canvas_data_json: canvasData,
            created_at: updatedProject.updated_at,
            updated_at: updatedProject.updated_at
          };
          console.log(`Consulta ejecutada:\nINSERT INTO vsm_maps (id, project_id, name, canvas_data_json) VALUES ...`);
          mapResult = await supabase
            .from('vsm_maps')
            .insert([insertMapObj])
            .select();
          if (mapResult.error) {
            console.log(`Resultado:\nERROR: ${mapResult.error.message}`);
          } else {
            console.log(`Resultado:\nOK`);
          }
        }

        if (mapResult.error) {
          throw new Error(`Error en vsm_maps: ${mapResult.error.message}`);
        }

        console.log('✅ [DIAGNÓSTICO GUARDADO] Sincronización con Supabase exitosa.');
        
        const projects = getLocalProjects();
        const index = projects.findIndex(p => p.id === updatedProject.id);
        if (index !== -1) {
          projects[index] = updatedProject;
        } else {
          projects.push(updatedProject);
        }
        saveLocalProjects(projects);

        return updatedProject;

      } catch (err: any) {
        console.error('❌ [DIAGNÓSTICO GUARDADO] Error de guardado en Supabase:', err.message || err);
        throw err;
      }
    }

    console.log('💾 [DIAGNÓSTICO GUARDADO] Guardando únicamente en LocalStorage (Supabase desactivado).');
    const projects = getLocalProjects();
    const index = projects.findIndex(p => p.id === updatedProject.id);
    if (index !== -1) {
      projects[index] = updatedProject;
    } else {
      projects.push(updatedProject);
    }
    saveLocalProjects(projects);
    return updatedProject;
  },

  async deleteProject(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      if (!error) return true;
      console.error('❌ Supabase: Error SQL o RLS al eliminar el proyecto:', error.message || error);
    }

    const projects = getLocalProjects();
    const filtered = projects.filter(p => p.id !== id);
    saveLocalProjects(filtered);

    const versions = getLocalVersions();
    const filteredVersions = versions.filter(v => v.project_id !== id);
    saveLocalVersions(filteredVersions);

    return true;
  },

  async createVersion(projectId: string, name: string, nodes: any[], edges: any[], actionName = 'Guardado manual'): Promise<VsmProjectVersion> {
    const versionId = crypto.randomUUID();
    const nowStr = new Date().toISOString();

    if (isSupabaseConfigured && supabase && !isVersionsHistoryDisabled) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        console.log(`Consulta ejecutada:\nSELECT id FROM vsm_maps WHERE project_id = '${projectId}'`);
        const { data: mapData, error: mapError } = await supabase
          .from('vsm_maps')
          .select('id')
          .eq('project_id', projectId)
          .maybeSingle();

        if (mapError) {
          console.log(`Resultado:\nERROR: ${mapError.message}`);
        } else {
          console.log(`Resultado:\nOK`);
          console.log(`Mapa encontrado:\n${JSON.stringify(mapData)}`);
        }

        if (mapData) {
          const insertObj = {
            id: versionId,
            map_id: mapData.id,
            name,
            canvas_data_json: { nodes, edges },
            created_by: user?.id || null,
            action_name: actionName
          };
          console.log(`Consulta ejecutada:\nINSERT INTO vsm_map_versions (id, map_id, name, canvas_data_json, created_by, action_name) VALUES ...`);
          const { data, error } = await supabase
            .from('vsm_map_versions')
            .insert([insertObj])
            .select()
            .maybeSingle();

          if (error) {
            console.log(`Resultado:\nERROR: ${error.message}`);
            if (error.code === '42P01' || error.message?.includes('vsm_map_versions') || error.message?.includes('relation') || error.message?.includes('Could not find the table')) {
              console.warn('⚠️ La tabla vsm_map_versions no existe o relación no encontrada. Desactivando historial de versiones.');
              isVersionsHistoryDisabled = true;
            }
          } else {
            console.log(`Resultado:\nOK`);
            console.log(`Versión encontrada:\n${JSON.stringify(data)}`);
            if (data) {
              return {
                id: data.id,
                project_id: projectId,
                name: data.name,
                nodes: (data.canvas_data_json as any)?.nodes || [],
                edges: (data.canvas_data_json as any)?.edges || [],
                created_at: data.created_at,
                action_name: data.action_name,
                created_by_email: user?.email || 'Sistema'
              };
            }
          }
        }
      } catch (err: any) {
        console.error('❌ Supabase: Excepción al crear versión:', err.message || err);
      }
    }

    const newVersion: VsmProjectVersion = {
      id: versionId,
      project_id: projectId,
      name,
      nodes,
      edges,
      created_at: nowStr,
      action_name: actionName,
      created_by_email: 'Local User'
    };

    const versions = getLocalVersions();
    versions.push(newVersion);
    saveLocalVersions(versions);
    return newVersion;
  },

  async getVersions(projectId: string): Promise<VsmProjectVersion[]> {
    if (isSupabaseConfigured && supabase && !isVersionsHistoryDisabled) {
      try {
        console.log(`Consulta ejecutada:\nSELECT id FROM vsm_maps WHERE project_id = '${projectId}'`);
        const { data: mapData, error: mapError } = await supabase
          .from('vsm_maps')
          .select('id')
          .eq('project_id', projectId)
          .maybeSingle();

        if (mapError) {
          console.log(`Resultado:\nERROR: ${mapError.message}`);
        } else {
          console.log(`Resultado:\nOK`);
          console.log(`Mapa encontrado:\n${JSON.stringify(mapData)}`);
        }

        if (mapData) {
          console.log(`Consulta ejecutada:\nSELECT * FROM vsm_map_versions WHERE map_id = '${mapData.id}' ORDER BY created_at DESC`);
          const { data, error } = await supabase
            .from('vsm_map_versions')
            .select('*')
            .eq('map_id', mapData.id)
            .order('created_at', { ascending: false });

          if (error) {
            console.log(`Resultado:\nERROR: ${error.message}`);
            if (error.code === '42P01' || error.message?.includes('vsm_map_versions') || error.message?.includes('relation') || error.message?.includes('Could not find the table')) {
              console.warn('⚠️ La tabla vsm_map_versions no existe o relación no encontrada. Desactivando historial de versiones.');
              isVersionsHistoryDisabled = true;
            }
          } else {
            console.log(`Resultado:\nOK`);
            console.log(`Versión encontrada:\n${JSON.stringify(data?.[0] || null)}`);
            if (data) {
              let profilesData: any[] = [];
              const userIds = data.map((v: any) => v.created_by).filter(Boolean);
              if (userIds.length > 0) {
                console.log(`Consulta ejecutada:\nSELECT id, email FROM profiles WHERE id IN (${userIds.map(id => `'${id}'`).join(', ')})`);
                const { data: profs, error: profsError } = await supabase
                  .from('profiles')
                  .select('id, email')
                  .in('id', userIds);
                if (profsError) {
                  console.log(`Resultado:\nERROR profiles: ${profsError.message}`);
                } else {
                  console.log(`Resultado:\nOK profiles`);
                  profilesData = profs || [];
                }
              }

              return data.map((v: any) => {
                const prof = profilesData.find(p => p.id === v.created_by);
                return {
                  id: v.id,
                  project_id: projectId,
                  name: v.name,
                  nodes: (v.canvas_data_json as any)?.nodes || [],
                  edges: (v.canvas_data_json as any)?.edges || [],
                  created_at: v.created_at,
                  action_name: v.action_name,
                  created_by_email: prof?.email || 'Sistema'
                };
              });
            }
          }
        }
      } catch (err: any) {
        console.error('❌ Supabase: Excepción al obtener versiones:', err.message || err);
      }
    }

    return getLocalVersions()
      .filter(v => v.project_id === projectId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // Save PDF / PNG / JPG / JSON files in Supabase Storage Buckets
  async uploadAsset(projectId: string, file: Blob | File, filename: string, fileType: string): Promise<string | null> {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase no configurado: guardado local activo. No se pudo subir el archivo.');
      return null;
    }

    try {
      await supabase.auth.getUser();

      // Find the associated map ID
      const { data: mapData, error: mapError } = await supabase
        .from('vsm_maps')
        .select('id')
        .eq('project_id', projectId)
        .single();

      if (mapError || !mapData) {
        throw new Error('No se encontró el mapa asociado al proyecto.');
      }

      const mapId = mapData.id;
      // Select appropriate bucket: vsm-files for JSON, vsm-exports for PNG/JPG/PDF
      const bucketName = fileType === 'application/json' ? 'vsm-files' : 'vsm-exports';
      const cleanFilename = `${Date.now()}_${filename.replace(/\s+/g, '_')}`;
      const filePath = `${mapId}/${cleanFilename}`;

      // Upload file to bucket
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      // Register the asset reference in the assets database table
      const { error: dbError } = await supabase
        .from('assets')
        .insert([{
          map_id: mapId,
          file_url: publicUrl,
          file_type: fileType
        }]);

      if (dbError) {
        console.error('Error guardando registro del asset en DB:', dbError);
      }

      // Also log the upload as an action version in history
      await this.createVersion(
        projectId, 
        `Exportación: ${filename}`, 
        [], // Empty diagram for asset snapshot, or can log state
        [], 
        `Exportación ${filename.split('.').pop()?.toUpperCase()}`
      );

      return publicUrl;
    } catch (err: any) {
      console.error('Error subiendo archivo a Supabase Storage:', err);
      alert(`Error al guardar archivo en la nube: ${err.message || err}`);
      return null;
    }
  }
};
