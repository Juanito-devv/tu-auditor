import React, { useEffect, useState } from "react";

const STORAGE = "auditapp:install:descartado";

export default function PwaInstall() {
  const [instalable, setInstalable] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [instalado, setInstalado] = useState(false);
  const [descartado, setDescartado] = useState(
    () => localStorage.getItem(STORAGE) === "1"
  );
  const deferred = React.useRef(null);

  useEffect(() => {
    // Detectar si ya está instalada (modo standalone)
    const esStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (esStandalone) {
      setInstalado(true);
      return;
    }

    const onPrompt = (e) => {
      e.preventDefault();
      deferred.current = e;
      setInstalable(true);
    };
    const onInstalled = () => {
      setInstalado(true);
      setInstalable(false);
      setAbierto(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function instalar() {
    if (!deferred.current) return;
    deferred.current.prompt();
    const { outcome } = await deferred.current.userChoice;
    deferred.current = null;
    if (outcome === "accepted") {
      setInstalado(true);
      setInstalable(false);
    }
    setAbierto(false);
  }

  if (instalado || !instalable || descartado) return null;

  return (
    <>
      {/* Botón flotante de instalación */}
      <button
        onClick={() => setAbierto(true)}
        className="fixed bottom-24 right-4 z-[60] flex items-center gap-2 bg-[#1366D9] text-white text-sm font-semibold h-11 pl-3 pr-4 rounded-full shadow-lg shadow-[#1366D9]/30 active:scale-95 transition-transform hover:bg-[#0f56b6]"
        aria-label="Instalar la app"
      >
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          download
        </span>
        Instalar app
      </button>

      {/* Modal de instalación */}
      {abierto && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => setAbierto(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <span className="relative w-14 h-14 mb-3" aria-hidden>
                <span className="absolute bottom-0 left-0 w-14 h-14 rounded-[10px] bg-[#009ED8]" />
                <span className="absolute top-0 right-0 w-[38px] h-[38px] bg-[#0ACF83] rounded-md" />
                <span className="absolute top-[10px] right-[5px] w-[22px] h-[22px] bg-white rounded-sm" />
              </span>
              <h3 className="font-bold text-[#1B2430] text-lg leading-tight">
                Instala AuditApp
              </h3>
              <p className="text-[#667085] text-sm mt-2 leading-relaxed">
                Añade AuditApp a tu pantalla de inicio para abrirla como una
                app, más rápido y sin buscarla cada vez.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <button
                onClick={instalar}
                className="flex-1 bg-[#1366D9] text-white font-semibold h-12 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-[#0f56b6]"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                Instalar
              </button>
              <button
                onClick={() => {
                  setDescartado(true);
                  localStorage.setItem(STORAGE, "1");
                  setAbierto(false);
                }}
                className="flex-1 bg-[#F0F1F3] text-[#667085] font-semibold h-12 rounded-xl active:scale-95 transition-transform hover:bg-[#E6E8EC]"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
