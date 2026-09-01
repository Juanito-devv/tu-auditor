import React from "react";

export default function TopBar() {
  return (
    <header className="w-full top-0 sticky z-40 bg-surface border-b-[1.5px] border-surface-variant shadow-[0px_2px_4px_rgba(0,0,0,0.15)]">
      <div className="flex justify-between items-center h-[64px] px-container-padding w-full">
        <button
          className="text-primary hover:bg-surface-container-high active:scale-95 transition-transform duration-100 p-2 rounded-full flex items-center justify-center"
          aria-label="AuditApp"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            fact_check
          </span>
        </button>
        <h1 className="font-headline-md text-headline-md text-primary uppercase tracking-tight">
          AuditApp
        </h1>
        <button
          className="text-primary hover:bg-surface-container-high active:scale-95 transition-transform duration-100 p-2 rounded-full flex items-center justify-center"
          aria-label="Perfil"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            account_circle
          </span>
        </button>
      </div>
    </header>
  );
}
