-- Row Level Security (RLS) Policies for VSM Studio Database (Public Mode)

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
-- 2. PROJECTS Table Policies (Public / Anonymous read & write)
-- =====================================================================
CREATE POLICY "Public select projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Public insert projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update projects" ON public.projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete projects" ON public.projects FOR DELETE USING (true);

-- =====================================================================
-- 3. VSM_MAPS Table Policies (Public / Anonymous read & write)
-- =====================================================================
CREATE POLICY "Public select maps" ON public.vsm_maps FOR SELECT USING (true);
CREATE POLICY "Public insert maps" ON public.vsm_maps FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update maps" ON public.vsm_maps FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete maps" ON public.vsm_maps FOR DELETE USING (true);

-- =====================================================================
-- 4. ASSETS Table Policies (Public / Anonymous read & write)
-- =====================================================================
CREATE POLICY "Public select assets" ON public.assets FOR SELECT USING (true);
CREATE POLICY "Public insert assets" ON public.assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update assets" ON public.assets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete assets" ON public.assets FOR DELETE USING (true);

-- =====================================================================
-- 5. VSM_MAP_VERSIONS Table Policies
-- =====================================================================
CREATE POLICY "Public select versions" ON public.vsm_map_versions FOR SELECT USING (true);
CREATE POLICY "Public insert versions" ON public.vsm_map_versions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete versions" ON public.vsm_map_versions FOR DELETE USING (true);

-- =====================================================================
-- Storage Buckets Configuration Policies (vsm-files & vsm-exports)
-- =====================================================================
CREATE POLICY "Allow public read from buckets"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('vsm-files', 'vsm-exports'));

CREATE POLICY "Allow public upload to storage buckets"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id IN ('vsm-files', 'vsm-exports'));

CREATE POLICY "Allow public delete from storage buckets"
    ON storage.objects FOR DELETE
    USING (bucket_id IN ('vsm-files', 'vsm-exports'));
