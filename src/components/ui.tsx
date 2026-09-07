import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AVATAR_COLORS, LOGO_URL, initialsOf, useStore } from "../lib/data";
import { IcAlert, IcCheck, IcInfo, IcX } from "./icons";

export function Logo({ className = "w-10 h-10" }: { className?: string }) {
  const { db } = useStore();
  const logoSrc = db.settings.logos.app || LOGO_URL;
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className={`${className} rounded-full bg-pine-800 text-amber-300 font-display font-bold flex items-center justify-center border-2 border-amber-400/60 shrink-0`}>
        61
      </div>
    );
  }
  return (
    <img src={logoSrc} alt="Logo" className={`${className} rounded-full object-cover bg-white shrink-0`} onError={() => setErr(true)} />
  );
}

export function Avatar({ name, color, size = "w-9 h-9 text-xs" }: { name: string; color?: string; size?: string }) {
  return (
    <div className={`${size} rounded-full flex items-center justify-center font-display font-bold text-white shrink-0 shadow-sm`} style={{ backgroundColor: color || AVATAR_COLORS[0] }}>
      {initialsOf(name)}
    </div>
  );
}

const TONES: Record<string, string> = {
  green: "bg-emerald-600/10 text-emerald-700 border-emerald-600/25",
  amber: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  red: "bg-red-600/10 text-red-700 border-red-600/25",
  blue: "bg-sky-600/10 text-sky-700 border-sky-600/25",
  slate: "bg-ink/6 text-ink/60 border-ink/12",
  pine: "bg-pine-700/10 text-pine-700 border-pine-700/25",
};

export function Badge({ tone = "slate", children, className = "" }: { tone?: keyof typeof TONES; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Modal({ title, subtitle, onClose, children, footer, width = "max-w-lg" }: {
  title: React.ReactNode; subtitle?: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; width?: string;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-pine-950/65 backdrop-blur-[3px] flex items-end sm:items-center justify-center p-0 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`panel w-full ${width} rounded-b-none sm:rounded-b-xl anim-pop max-h-[92vh] flex flex-col overflow-hidden`}>
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-ink/8 shrink-0">
          <div>
            <h3 className="font-display font-bold text-lg leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-ink/50 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm w-8 px-0 no-print" aria-label="Tutup">
            <IcX className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto grow">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 border-t border-ink/8 bg-paper/70 flex flex-wrap justify-end gap-2 shrink-0 no-print">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Confirm({ title, message, confirmLabel = "Hapus", onYes, onClose }: {
  title: string; message: React.ReactNode; confirmLabel?: string; onYes: () => void; onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} width="max-w-md"
      footer={
        <>
          <button className="btn btn-outline btn-md" onClick={onClose}>Batal</button>
          <button className="btn btn-danger btn-md" onClick={() => { onYes(); onClose(); }}>{confirmLabel}</button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-red-600/10 text-red-600 flex items-center justify-center shrink-0">
          <IcAlert className="w-5 h-5" />
        </div>
        <p className="text-sm text-ink/75 leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}

interface ToastItem { id: number; type: "success" | "error" | "info"; title: string; sub?: string; }
const ToastCtx = createContext<{ push: (t: Omit<ToastItem, "id">) => void } | null>(null);

export function useToast() {
  const v = useContext(ToastCtx);
  if (!v) throw new Error("useToast di luar provider");
  return v;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(1);

  const push = (t: Omit<ToastItem, "id">) => {
    const id = idRef.current++;
    setItems((p) => [...p.slice(-3), { ...t, id }]);
    setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), 4200);
  };

  const META = {
    success: { icon: <IcCheck className="w-4 h-4" />, cls: "bg-emerald-600 text-white" },
    error: { icon: <IcAlert className="w-4 h-4" />, cls: "bg-red-600 text-white" },
    info: { icon: <IcInfo className="w-4 h-4" />, cls: "bg-pine-800 text-white" },
  };

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 z-[90] flex flex-col gap-2 w-[min(92vw,360px)] no-print">
        {items.map((t) => (
          <div key={t.id} className="anim-toast panel flex items-start gap-3 p-3 shadow-lg">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${META[t.type].cls}`}>
              {META[t.type].icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">{t.title}</p>
              {t.sub && <p className="text-xs text-ink/55 mt-0.5">{t.sub}</p>}
            </div>
            <button className="ml-auto text-ink/40 hover:text-ink" onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))}>
              <IcX className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-ink/45 mt-1">{hint}</p>}
    </div>
  );
}

export function Seg<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex bg-ink/6 rounded-lg p-1 gap-0.5 max-w-full overflow-x-auto">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`px-3 h-8 rounded-md text-xs font-bold whitespace-nowrap transition-all ${value === o.id ? "bg-white shadow text-pine-800" : "text-ink/55 hover:text-ink"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-pine-700/8 text-pine-600 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="font-display font-bold text-ink/75">{title}</p>
      {sub && <p className="text-sm text-ink/45 mt-1 max-w-xs">{sub}</p>}
    </div>
  );
}
