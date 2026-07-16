import { useState } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { Navbar } from './components/layout/Navbar';
import { SidebarLeft } from './components/layout/SidebarLeft';
import { VsmCanvas } from './components/canvas/VsmCanvas';
import { SidebarRight } from './components/layout/SidebarRight';
import { TimelinePanel } from './components/layout/TimelinePanel';
import { MetricsDashboard } from './components/dashboard/MetricsDashboard';
import { ProjectManager } from './components/dashboard/ProjectManager';
import './App.css';

function AppContent() {
  const [viewMode, setViewMode] = useState<'manager' | 'editor'>('manager');
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const { isSupabaseConfigured, isLoading } = useProject();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs font-bold tracking-wider text-slate-400">CARGANDO VSM STUDIO...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 dark:bg-slate-950 overflow-hidden text-slate-800 dark:text-slate-200">
      {/* Demo banner when Supabase configuration is missing */}
      {!isSupabaseConfigured && (
        <div className="bg-amber-600 text-white text-[11px] font-bold px-4 py-1.5 text-center flex items-center justify-center gap-2 select-none z-50 shrink-0 shadow-md">
          <span>⚠️ Modo de Demostración Local (LocalStorage) Activo. Conéctate a Supabase configurando VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en un archivo .env</span>
        </div>
      )}
      
      {viewMode === 'editor' ? (
        <>
          <Navbar 
            onToggleDashboard={() => setIsDashboardOpen(!isDashboardOpen)} 
            isDashboardOpen={isDashboardOpen} 
            onReturnToManager={() => setViewMode('manager')}
          />
          
          {/* Main Content Area */}
          <div className="flex-1 flex min-h-0 relative">
            <SidebarLeft />
            
            {/* Workspace Central Canvas & Bottom Timeline */}
            <main className="flex-1 h-full relative flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900">
              <div className="flex-1 min-h-0 relative">
                <VsmCanvas />
              </div>
              <TimelinePanel />
            </main>
            
            <SidebarRight />
          </div>

          {/* Analytics Dashboard Overlay */}
          {isDashboardOpen && (
            <MetricsDashboard onClose={() => setIsDashboardOpen(false)} />
          )}
        </>
      ) : (
        <ProjectManager onOpenProject={() => setViewMode('editor')} />
      )}
    </div>
  );
}

function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}

export default App;
