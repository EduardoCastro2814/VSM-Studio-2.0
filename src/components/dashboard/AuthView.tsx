import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Folder, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export const AuthView: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden.');
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ 
          text: 'Registro exitoso. Revisa tu correo electrónico para confirmar tu cuenta.', 
          type: 'success' 
        });
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + window.location.pathname,
        });
        if (error) throw error;
        setMessage({ 
          text: 'Se ha enviado un enlace de restauración a tu correo.', 
          type: 'success' 
        });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Ocurrió un error inesperado.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setMessage({ text: err.message || 'Error al iniciar con Google.', type: 'error' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-slate-100 p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      {/* Auth Card Container */}
      <div className="w-full max-w-md bg-slate-950/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* VSM Studio Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3">
            <Folder className="text-white fill-white/10" size={24} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white font-sans">VSM STUDIO</h1>
          <p className="text-xs text-slate-400 mt-1.5 text-center px-4">
            Plataforma Profesional de Value Stream Mapping
          </p>
        </div>

        {/* Message Alert Banner */}
        {message && (
          <div className={`p-4 rounded-xl text-xs font-semibold mb-6 flex items-start gap-2.5 border ${
            message.type === 'error' 
              ? 'bg-red-500/10 border-red-500/20 text-red-400' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            {message.type === 'error' ? <AlertCircle size={16} className="shrink-0" /> : <CheckCircle size={16} className="shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email input field */}
          <div className="space-y-1">
            <label className="text-[10px] font-black tracking-wider uppercase text-slate-400">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="email"
                placeholder="ejemplo@vsmstudio.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 focus:border-blue-500 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Password inputs (only for signin & signup) */}
          {mode !== 'forgot' && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black tracking-wider uppercase text-slate-400">Contraseña</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:underline outline-none cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-blue-500 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Confirm Password (only for signup) */}
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black tracking-wider uppercase text-slate-400">Confirmar Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-blue-500 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'signin' ? 'Iniciar Sesión' : mode === 'signup' ? 'Registrarse' : 'Restablecer Contraseña'}
                </span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Separator */}
        {mode === 'signin' && (
          <>
            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[10px] uppercase font-bold text-slate-500 px-3">o continúa con</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Google OAuth Login Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full border border-slate-800 hover:bg-slate-900/40 text-slate-200 rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <GoogleIcon />
              <span>Google Login</span>
            </button>
          </>
        )}

        {/* Toggle Mode footer */}
        <div className="mt-8 pt-4 border-t border-slate-850 text-center text-xs text-slate-400">
          {mode === 'signin' ? (
            <p>
              ¿No tienes una cuenta?{' '}
              <button 
                onClick={() => { setMode('signup'); setMessage(null); }}
                className="text-blue-400 hover:text-blue-300 font-bold outline-none cursor-pointer"
              >
                Regístrate aquí
              </button>
            </p>
          ) : mode === 'signup' ? (
            <p>
              ¿Ya tienes una cuenta?{' '}
              <button 
                onClick={() => { setMode('signin'); setMessage(null); }}
                className="text-blue-400 hover:text-blue-300 font-bold outline-none cursor-pointer"
              >
                Inicia sesión aquí
              </button>
            </p>
          ) : (
            <p>
              ¿Recordaste tu contraseña?{' '}
              <button 
                onClick={() => { setMode('signin'); setMessage(null); }}
                className="text-blue-400 hover:text-blue-300 font-bold outline-none cursor-pointer"
              >
                Inicia sesión
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
