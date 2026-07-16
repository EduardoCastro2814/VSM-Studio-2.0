-- 1. Alter projects table to drop the NOT NULL constraint on owner_id
ALTER TABLE public.projects ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.projects ALTER COLUMN owner_id SET DEFAULT NULL;

-- 2. Drop existing strict auth-only policies
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

DROP POLICY IF EXISTS "Users can view maps of their projects" ON public.vsm_maps;
DROP POLICY IF EXISTS "Users can insert maps in their projects" ON public.vsm_maps;
DROP POLICY IF EXISTS "Users can update maps in their projects" ON public.vsm_maps;
DROP POLICY IF EXISTS "Users can delete maps in their projects" ON public.vsm_maps;

DROP POLICY IF EXISTS "Users can view assets of their maps" ON public.assets;
DROP POLICY IF EXISTS "Users can insert assets in their maps" ON public.assets;
DROP POLICY IF EXISTS "Users can update assets in their maps" ON public.assets;
DROP POLICY IF EXISTS "Users can delete assets in their maps" ON public.assets;

DROP POLICY IF EXISTS "Users can view versions of their maps" ON public.vsm_map_versions;
DROP POLICY IF EXISTS "Users can insert versions for their maps" ON public.vsm_map_versions;
DROP POLICY IF EXISTS "Users can delete versions of their maps" ON public.vsm_map_versions;

DROP POLICY IF EXISTS "Allow authenticated user upload to their own map directory" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated user delete their own map files" ON storage.objects;

-- 3. Create public/anonymous accessible policies
-- For PROJECTS table
CREATE POLICY "Public select projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Public insert projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update projects" ON public.projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete projects" ON public.projects FOR DELETE USING (true);

-- For VSM_MAPS table
CREATE POLICY "Public select maps" ON public.vsm_maps FOR SELECT USING (true);
CREATE POLICY "Public insert maps" ON public.vsm_maps FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update maps" ON public.vsm_maps FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete maps" ON public.vsm_maps FOR DELETE USING (true);

-- For ASSETS table
CREATE POLICY "Public select assets" ON public.assets FOR SELECT USING (true);
CREATE POLICY "Public insert assets" ON public.assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update assets" ON public.assets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete assets" ON public.assets FOR DELETE USING (true);

-- For VSM_MAP_VERSIONS table
CREATE POLICY "Public select versions" ON public.vsm_map_versions FOR SELECT USING (true);
CREATE POLICY "Public insert versions" ON public.vsm_map_versions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete versions" ON public.vsm_map_versions FOR DELETE USING (true);

-- For STORAGE objects (vsm-files & vsm-exports)
CREATE POLICY "Allow public upload to storage buckets"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id IN ('vsm-files', 'vsm-exports'));

CREATE POLICY "Allow public delete from storage buckets"
    ON storage.objects FOR DELETE
    USING (bucket_id IN ('vsm-files', 'vsm-exports'));
