-- Row Level Security (RLS) Policies for VSM Studio Database

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vsm_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vsm_map_versions ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 1. PROFILES Table Policies
-- =====================================================================
CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- =====================================================================
-- 2. PROJECTS Table Policies (Strict owner isolation)
-- =====================================================================
CREATE POLICY "Users can view their own projects" 
    ON public.projects FOR SELECT 
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own projects" 
    ON public.projects FOR INSERT 
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own projects" 
    ON public.projects FOR UPDATE 
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own projects" 
    ON public.projects FOR DELETE 
    USING (auth.uid() = owner_id);

-- =====================================================================
-- 3. VSM_MAPS Table Policies (Checked via projects relationship)
-- =====================================================================
CREATE POLICY "Users can view maps of their projects" 
    ON public.vsm_maps FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = vsm_maps.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert maps in their projects" 
    ON public.vsm_maps FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = vsm_maps.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update maps in their projects" 
    ON public.vsm_maps FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = vsm_maps.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete maps in their projects" 
    ON public.vsm_maps FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = vsm_maps.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- =====================================================================
-- 4. ASSETS Table Policies (Checked via maps -> projects relationship)
-- =====================================================================
CREATE POLICY "Users can view assets of their maps" 
    ON public.assets FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.vsm_maps
            JOIN public.projects ON projects.id = vsm_maps.project_id
            WHERE vsm_maps.id = assets.map_id 
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert assets in their maps" 
    ON public.assets FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vsm_maps
            JOIN public.projects ON projects.id = vsm_maps.project_id
            WHERE vsm_maps.id = assets.map_id 
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update assets in their maps" 
    ON public.assets FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.vsm_maps
            JOIN public.projects ON projects.id = vsm_maps.project_id
            WHERE vsm_maps.id = assets.map_id 
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete assets in their maps" 
    ON public.assets FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.vsm_maps
            JOIN public.projects ON projects.id = vsm_maps.project_id
            WHERE vsm_maps.id = assets.map_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- =====================================================================
-- 5. VSM_MAP_VERSIONS Table Policies
-- =====================================================================
CREATE POLICY "Users can view versions of their maps" 
    ON public.vsm_map_versions FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.vsm_maps
            JOIN public.projects ON projects.id = vsm_maps.project_id
            WHERE vsm_maps.id = vsm_map_versions.map_id 
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert versions for their maps" 
    ON public.vsm_map_versions FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vsm_maps
            JOIN public.projects ON projects.id = vsm_maps.project_id
            WHERE vsm_maps.id = vsm_map_versions.map_id 
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete versions of their maps" 
    ON public.vsm_map_versions FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.vsm_maps
            JOIN public.projects ON projects.id = vsm_maps.project_id
            WHERE vsm_maps.id = vsm_map_versions.map_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- =====================================================================
-- Storage Buckets Configuration Policies (vsm-files & vsm-exports)
-- =====================================================================
-- Note: These policies apply to storage.objects.
-- They require that users can only read/write files under path structure "<map_id>/filename"
-- where the map belongs to the user.

-- Policy for Select (Download)
CREATE POLICY "Allow public read from buckets"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('vsm-files', 'vsm-exports'));

-- Policy for Insert (Upload)
CREATE POLICY "Allow authenticated user upload to their own map directory"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id IN ('vsm-files', 'vsm-exports')
        AND auth.role() = 'authenticated'
        -- Extract the map_id (first directory of path) and check ownership
        AND EXISTS (
            SELECT 1 FROM public.vsm_maps
            JOIN public.projects ON projects.id = vsm_maps.project_id
            WHERE vsm_maps.id::text = (storage.foldername(name))[1]
            AND projects.owner_id = auth.uid()
        )
    );

-- Policy for Delete
CREATE POLICY "Allow authenticated user delete their own map files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id IN ('vsm-files', 'vsm-exports')
        AND auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.vsm_maps
            JOIN public.projects ON projects.id = vsm_maps.project_id
            WHERE vsm_maps.id::text = (storage.foldername(name))[1]
            AND projects.owner_id = auth.uid()
        )
    );
