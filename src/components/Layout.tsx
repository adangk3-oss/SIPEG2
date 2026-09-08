import React from "react";
import { NAV_BY_ROLE, roleLabel, roleTone, useStore, useNow } from "../lib/data";
import { fmtDateID, pad2 } from "../lib/time";
import type { PageId } from "../lib/types";
import { IcCalendar, IcCalendarMonth, IcHeadset, IcLogout, IcPulse, IcScan, IcSettings, IcShield, IcUsers } from "./icons";
import { Avatar, Badge, Logo } from "./ui";

const PAGE_META: Record<PageId, { title: string; desc: string }> = {
  dashboard: { title: "Mesin Presensi", desc: "Portal scan barcode & wajah guru" },
  teachers: { title: "Data Guru", desc: "Kelola pegawai, kartu barcode & wajah" },
  "recap-daily": { title: "Rekap Harian", desc: "Kehadiran per tanggal" },
  "recap-monthly": { title: "Rekap Bulanan", desc: "Akumulasi kehadiran per bulan" },
  operator: { title: "Panel Operator", desc: "Operasional presensi harian" },
  admin: { title: "Admin Pengguna", desc: "Manajemen akun & hak akses" },
  settings: { title: "Pengaturan", desc: "Konfigurasi aplikasi" },
  aktivitas: { title: "Aktivitas", desc: "Jejak kegiatan aplikasi" },
};

const NAV_ICON: Record<PageId, (p: { className?: string }) => React.ReactElement> = {
  dashboard: IcScan, teachers: IcUsers, "recap-daily": IcCalendar, "recap-monthly": IcCalendarMonth,
  operator: IcHeadset, admin: IcShield, settings: IcSettings, aktivitas: IcPulse,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { db, currentUser, page, nav, logout } = useStore();
  const now = useNow();
  if (!currentUser) return null;

  const items = NAV_BY_ROLE[currentUser.role];
  const meta = PAGE_META[page];
  const s = db.settings;

  return (
    <div className="min-h-screen">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-pine-950 text-pine-100 z-40 overflow-hidden">
        <div className="absolute inset-0 grid-weave pointer-events-none" />
        <div className="relative flex items-center gap-3 px-5 h-[74px] border-b border-white/10">
          <Logo className="w-11 h-11 ring-2 ring-amber-400/50" />
          <div className="min-w-0">
            <p className="font-display font-bold text-lg text-white leading-none tracking-wide">{s.school.shortName}</p>
            <p className="text-[11px] text-pine-300 mt-1 truncate">{s.school.name}</p>
          </div>
        </div>
        <nav className="relative flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {items.map((it) => {
            const Icon = NAV_ICON[it.id];
            const active = page === it.id;
            return (
              <button key={it.id} onClick={() => nav(it.id)}
                className={`w-full flex items-center gap-3 px-3 h-10.5 rounded-lg text-sm font-semibold transition-all group ${active ? "bg-amber-400 text-pine-950 shadow-md shadow-black/25" : "text-pine-200/85 hover:bg-white/8 hover:text-white"}`}>
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{it.label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-pine-950/70" />}
              </button>
            );
          })}
        </nav>
        <div className="relative border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/6">
            <Avatar name={currentUser.name} color="#245742" size="w-9 h-9 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-pine-300">{roleLabel[currentUser.role]} · @{currentUser.username}</p>
            </div>
            <button onClick={logout} title="Keluar" className="w-8 h-8 rounded-md flex items-center justify-center text-pine-300 hover:text-white hover:bg-red-500/25 transition-colors">
              <IcLogout className="w-4.5 h-4.5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-pine-400/70 mt-2.5">
            SIPEG v4.2 · <span className="text-amber-400/80 font-semibold">@ Dunk-3</span>
          </p>
        </div>
      </aside>

      <header className="md:hidden fixed top-0 inset-x-0 z-40 bg-pine-950 text-white flex items-center gap-3 px-4 h-14">
        <Logo className="w-9 h-9 ring-2 ring-amber-400/50" />
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold leading-none">{s.school.shortName}</p>
          <p className="text-[10px] text-pine-300 truncate">{s.school.name}</p>
        </div>
        <Badge tone={roleTone[currentUser.role]} className="bg-white/10 border-white/15 text-white">{roleLabel[currentUser.role]}</Badge>
        <button onClick={logout} className="w-9 h-9 rounded-lg flex items-center justify-center text-pine-200 hover:bg-white/10" title="Keluar">
          <IcLogout className="w-5 h-5" />
        </button>
      </header>

      <main className="md:pl-64 pt-14 md:pt-0 pb-24 md:pb-10">
        <div className="hidden md:flex sticky top-0 z-30 items-center justify-between gap-4 px-8 h-[74px] bg-paper/85 backdrop-blur border-b border-ink/8">
          <div>
            <h1 className="font-display font-bold text-xl leading-tight">{meta.title}</h1>
            <p className="text-xs text-ink/50">{meta.desc}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-display font-bold text-lg leading-none tabular-nums">{pad2(now.getHours())}:{pad2(now.getMinutes())}</p>
              <p className="text-[11px] text-ink/50 mt-0.5">{fmtDateID(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`)}</p>
            </div>
            <Avatar name={currentUser.name} color="#245742" size="w-10 h-10 text-sm" />
          </div>
        </div>
        <div className="px-4 md:px-8 py-5 md:py-6 max-w-[1200px] mx-auto">{children}</div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-ink/10 flex overflow-x-auto no-scrollbar">
        {items.map((it) => {
          const Icon = NAV_ICON[it.id];
          const active = page === it.id;
          return (
            <button key={it.id} onClick={() => nav(it.id)}
              className={`flex-1 min-w-[72px] flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition-colors ${active ? "text-pine-700" : "text-ink/45"}`}>
              <span className={`w-9 h-6 rounded-full flex items-center justify-center transition-colors ${active ? "bg-pine-700/12" : ""}`}>
                <Icon className="w-5 h-5" />
              </span>
              {it.label.split(" ")[0]}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
