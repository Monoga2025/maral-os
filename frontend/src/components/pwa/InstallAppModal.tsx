import { useState } from 'react';
import { Smartphone, Download, Check, Share, PlusSquare, ArrowRight, X, Shield, Sparkles, Laptop, Monitor } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { toast } from 'sonner';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const { hasNativePrompt, isInstalled, isIOS, isAndroid, promptInstall } = usePWAInstall();
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      const success = await promptInstall();
      if (success) {
        toast.success('¡MARAL OS instalada con éxito en tu dispositivo! 🎉');
        onClose();
      }
    } catch {
      toast.error('No se pudo completar la instalación automática.');
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 text-white shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 shadow-lg shadow-blue-500/25 p-3">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-blue-300 border border-blue-500/30">
                <Sparkles className="h-3 w-3" /> App Oficial MARAL
              </span>
              {isInstalled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                  <Check className="h-3 w-3" /> Instalada
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white mt-1">Descargar MARAL OS como App</h2>
            <p className="text-xs text-slate-400">Instala la aplicación en tu celular, tablet o computador para acceso directo a Tareas y Operaciones.</p>
          </div>
        </div>

        {/* Key Features Bento */}
        <div className="grid grid-cols-3 gap-2.5 mb-6 text-center">
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-3">
            <div className="text-blue-400 text-lg mb-1">⚡</div>
            <p className="text-xs font-semibold text-white">Acceso 1-Clic</p>
            <p className="text-[10px] text-slate-400">Sin abrir navegador</p>
          </div>
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-3">
            <div className="text-emerald-400 text-lg mb-1">📋</div>
            <p className="text-xs font-semibold text-white">Tareas al Día</p>
            <p className="text-[10px] text-slate-400">Control por usuario</p>
          </div>
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-3">
            <div className="text-amber-400 text-lg mb-1">📱</div>
            <p className="text-xs font-semibold text-white">Pantalla Completa</p>
            <p className="text-[10px] text-slate-400">100% experiencia App</p>
          </div>
        </div>

        {/* Installation Actions according to Platform */}
        {hasNativePrompt ? (
          <div className="space-y-4">
            <button
              onClick={handleInstallClick}
              disabled={installing}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              <Download className="h-5 w-5 animate-bounce" />
              {installing ? 'Instalando aplicación...' : 'Instalar App en este Dispositivo (1 Clic)'}
            </button>
            <p className="text-center text-[11px] text-slate-400">
              Se creará el icono de <strong>MARAL OS</strong> en tu pantalla de inicio o escritorio.
            </p>
          </div>
        ) : isIOS ? (
          /* iOS Safari Guide */
          <div className="rounded-2xl bg-slate-800/80 border border-slate-700/80 p-4 space-y-3">
            <p className="text-xs font-bold text-blue-300 uppercase tracking-wide flex items-center gap-1.5">
              <Smartphone className="h-4 w-4" /> Cómo instalar en iPhone o iPad (Safari)
            </p>
            <ol className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">1</span>
                <span>Toca el botón <strong>Compartir</strong> <Share className="inline h-3.5 w-3.5 text-blue-400 mx-0.5" /> en la barra inferior de Safari.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">2</span>
                <span>Desliza hacia abajo y pulsa <strong className="text-white">"Agregar a inicio"</strong> <PlusSquare className="inline h-3.5 w-3.5 text-emerald-400 mx-0.5" />.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">3</span>
                <span>Toca <strong>"Agregar"</strong> arriba a la derecha. ¡Listo!</span>
              </li>
            </ol>
          </div>
        ) : (
          /* Desktop / Android Fallback Guide */
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-800/80 border border-slate-700/80 p-4 space-y-2 text-xs text-slate-300">
              <p className="font-bold text-white flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-400" /> Instalación en Chrome, Edge o Celular:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li>En tu navegador (Chrome / Edge), haz clic en el icono de <strong>Instalar</strong> en la barra de direcciones (arriba a la derecha ⊕).</li>
                <li>O abre el menú del navegador (los 3 puntos ⋮) y selecciona <strong>"Instalar MARAL OS"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</li>
              </ul>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500 transition-colors"
            >
              Entendido
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-emerald-500" /> Conexión Segura SSL</span>
          <span>MARAL Antenas v2.0</span>
        </div>
      </div>
    </div>
  );
}
