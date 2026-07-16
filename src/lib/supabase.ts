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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Query projects, joining vsm_maps and profiles owner
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, description, created_at, updated_at, owner_id, vsm_maps(id, name, canvas_data_json), profiles(email)')
          .order('updated_at', { ascending: false });

        if (!error && data) {
          return data.map((item: any) => {
            const map = item.vsm_maps?.[0];
            return {
              id: item.id,
              name: item.name,
              author: item.profiles?.email || 'Lean Expert',
              nodes: map?.canvas_data_json?.nodes || [],
              edges: map?.canvas_data_json?.edges || [],
              viewport: map?.canvas_data_json?.viewport || { x: 0, y: 0, zoom: 1 },
              created_at: item.created_at,
              updated_at: item.updated_at
            };
          });
        }
        console.error('❌ Supabase: Error SQL o RLS al obtener proyectos:', error.message || error);
      }
    }
    return getLocalProjects().sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  async getProject(id: string): Promise<VsmProject | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, created_at, updated_at, owner_id, vsm_maps(id, name, canvas_data_json), profiles(email)')
        .eq('id', id)
        .single();

      if (!error && data) {
        const map = data.vsm_maps?.[0];
        return {
          id: data.id,
          name: data.name,
          author: (data.profiles as any)?.email || 'Lean Expert',
          nodes: map?.canvas_data_json?.nodes || [],
          edges: map?.canvas_data_json?.edges || [],
          viewport: map?.canvas_data_json?.viewport || { x: 0, y: 0, zoom: 1 },
          created_at: data.created_at,
          updated_at: data.updated_at
        };
      }
      console.error('❌ Supabase: Error SQL o RLS al obtener el proyecto:', error.message || error);
    }
    return getLocalProjects().find(p => p.id === id) || null;
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
      const { data: { user } } = await supabase.auth.getUser();
      const insertObj: any = {
        id: newProjectId,
        name: name
      };
      if (user) {
        insertObj.owner_id = user.id;
      }

      // 1. Create project
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .insert([insertObj])
        .select()
        .single();

        if (!projError && projData) {
          // 2. Create default VSM Map
          const { error: mapError } = await supabase
            .from('vsm_maps')
            .insert([{
              id: newMapId,
              project_id: newProjectId,
              name: 'Mapa Principal',
              canvas_data_json: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
            }]);

          if (!mapError) {
            // Log creation version
            await this.createVersion(newProjectId, 'Creación Inicial', [], [], 'Creación');
            
            return {
              ...newProject,
              author: user?.email || author,
              created_at: projData.created_at,
              updated_at: projData.updated_at
            };
          }
          console.error('❌ Supabase: Error SQL o RLS al crear el mapa:', mapError?.message || mapError || 'Error desconocido');
        } else {
          console.error('❌ Supabase: Error SQL o RLS al crear el proyecto:', projError?.message || projError || 'Error desconocido');
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

    if (isSupabaseConfigured && supabase) {
      // 1. Update project details
      const { error: projError } = await supabase
        .from('projects')
        .update({
          name: updatedProject.name,
          updated_at: updatedProject.updated_at
        })
        .eq('id', updatedProject.id);

      if (!projError) {
        // 2. Update map canvas data
        const { error: mapError } = await supabase
          .from('vsm_maps')
          .update({
            canvas_data_json: {
              nodes: updatedProject.nodes,
              edges: updatedProject.edges,
              viewport: updatedProject.viewport
            },
            updated_at: updatedProject.updated_at
          })
          .eq('project_id', updatedProject.id);

        if (!mapError) {
          return updatedProject;
        }
        console.error('❌ Supabase: Error SQL o RLS al actualizar el mapa:', mapError.message || mapError);
      } else {
        console.error('❌ Supabase: Error SQL o RLS al actualizar el proyecto:', projError.message || projError);
      }
    }

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

    // Also clear versions
    const versions = getLocalVersions();
    const filteredVersions = versions.filter(v => v.project_id !== id);
    saveLocalVersions(filteredVersions);

    return true;
  },

  async createVersion(projectId: string, name: string, nodes: any[], edges: any[], actionName = 'Guardado manual'): Promise<VsmProjectVersion> {
    const versionId = crypto.randomUUID();
    const nowStr = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Find the associated map ID
      const { data: mapData } = await supabase
        .from('vsm_maps')
        .select('id')
        .eq('project_id', projectId)
        .single();

      if (mapData) {
        const { data, error } = await supabase
          .from('vsm_map_versions')
          .insert([{
            id: versionId,
            map_id: mapData.id,
            name,
            canvas_data_json: { nodes, edges },
            created_by: user?.id || null,
            action_name: actionName
          }])
          .select()
          .single();

        if (!error && data) {
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
        console.error('❌ Supabase: Error SQL o RLS al guardar la versión:', error?.message || error || 'Error desconocido');
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
    if (isSupabaseConfigured && supabase) {
      const { data: mapData } = await supabase
        .from('vsm_maps')
        .select('id')
        .eq('project_id', projectId)
        .single();

      if (mapData) {
        const { data, error } = await supabase
          .from('vsm_map_versions')
          .select('*, profiles(email)')
          .eq('map_id', mapData.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map((v: any) => ({
            id: v.id,
            project_id: projectId,
            name: v.name,
            nodes: (v.canvas_data_json as any)?.nodes || [],
            edges: (v.canvas_data_json as any)?.edges || [],
            created_at: v.created_at,
            action_name: v.action_name,
            created_by_email: v.profiles?.email || 'Sistema'
          }));
        }
        console.error('❌ Supabase: Error SQL o RLS al obtener versiones:', error.message || error);
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
