import { useState } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { Navbar } from './components/layout/Navbar';
import { SidebarLeft } from './components/layout/SidebarLeft';
import { VsmCanvas } from './components/canvas/VsmCanvas';
import { SidebarRight } from './components/layout/SidebarRight';
import { TimelinePanel } from './components/layout/TimelinePanel';
import { MetricsDashboard } from './components/dashboard/MetricsDashboard';
import { ProjectManager } from './components/dashboard/ProjectManager';
import { AuthView } from './components/dashboard/AuthView';
import './App.css';

function AppContent() {
  const [viewMode, setViewMode] = useState<'manager' | 'editor'>('manager');
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const { isSupabaseConfigured, isLoading, isAuthOpen, setIsAuthOpen } = useProject();

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
    <div className="flex flex-col h-screen w-screen bg-slate-50 dark:bg-slate-955 overflow-hidden text-slate-800 dark:text-slate-200">
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

      {/* Dismissible Login Modal Overlay (Requirement #6) */}
      {isAuthOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="relative max-w-md w-full mx-4">
            <button 
              onClick={() => setIsAuthOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white z-50 bg-slate-900/60 p-1.5 rounded-full border border-slate-800 hover:border-slate-600 transition-all cursor-pointer text-xs font-bold w-7 h-7 flex items-center justify-center"
              title="Cerrar"
            >
              ✕
            </button>
            <AuthView />
          </div>
        </div>
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
