import React, { useState } from "react";
import { useStore } from "../lib/data";
import type { ActivityLog } from "../lib/types";
import { fmtLogTime } from "../lib/time";
import { IcFilter, IcPencil, IcPulse, IcScan, IcShield, IcUsers } from "../components/icons";
import { EmptyState, Seg } from "../components/ui";

type Filter = "all" | ActivityLog["type"];

const META: Record<ActivityLog["type"], { label: string; icon: React.ReactNode; cls: string }> = {
  scan: { label: "Scan", icon: <IcScan className="w-4 h-4" />, cls: "bg-pine-700/10 text-pine-700" },
  auth: { label: "Login", icon: <IcShield className="w-4 h-4" />, cls: "bg-amber-400/15 text-amber-600" },
  edit: { label: "Edit", icon: <IcPencil className="w-4 h-4" />, cls: "bg-sky-600/10 text-sky-700" },
  system: { label: "Sistem", icon: <IcUsers className="w-4 h-4" />, cls: "bg-ink/6 text-ink/55" },
};

export default function AktivitasPage() {
  const { db } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const logs = db.logs.filter((l) => filter === "all" || l.type === filter);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-center gap-3 anim-fade-up">
        <span className="text-ink/40"><IcFilter className="w-4.5 h-4.5" /></span>
        <Seg<Filter> value={filter} onChange={setFilter}
          options={[
            { id: "all", label: `Semua (${db.logs.length})` },
            { id: "scan", label: "Scan" },
            { id: "auth", label: "Login" },
            { id: "edit", label: "Edit" },
            { id: "system", label: "Sistem" },
          ]} />
      </div>

      <div className="panel overflow-hidden anim-fade-up" style={{ animationDelay: "60ms" }}>
        {logs.length === 0 ? (
          <EmptyState icon={<IcPulse className="w-7 h-7" />} title="Belum ada aktivitas" sub="Aktivitas presensi, login, dan pengeditan akan tercatat di sini." />
        ) : (
          <div className="divide-y divide-ink/[0.06] max-h-[62vh] overflow-y-auto">
            {logs.map((l, i) => {
              const m = META[l.type];
              return (
                <div key={l.id} className="flex items-start gap-3.5 px-5 py-3 hover:bg-pine-50/60 transition-colors anim-fade-up" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${m.cls}`}>{m.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="font-bold text-sm">{l.action}</p>
                      <p className="text-[11px] text-ink/40">{m.label}</p>
                    </div>
                    <p className="text-[13px] text-ink/60 mt-0.5">{l.detail}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold text-ink/55">{fmtLogTime(l.time)}</p>
                    <p className="text-[10px] text-ink/35 mt-0.5">oleh {l.actor}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
