import React, { useMemo, useState } from "react";
import { applyScan, computeDailyRows, MODE_LABEL, STATUS_META, useStore } from "../lib/data";
import type { DB, ScanMode } from "../lib/types";
import { fmtHM, fmtLogTime, isWorkday, todayISO, workMinutes, fmtDur } from "../lib/time";
import { exportCSV } from "../lib/export";
import { IcClockIn, IcDoorOut, IcFileCsv, IcHome, IcInfo, IcPulse, IcReturn, IcUsers } from "../components/icons";
import { Avatar, Badge, EmptyState, useToast } from "../components/ui";

const MODES: { id: ScanMode; label: string; icon: React.ReactNode }[] = [
  { id: "masuk", label: "Jam Masuk", icon: <IcClockIn className="w-4.5 h-4.5" /> },
  { id: "izin_keluar", label: "Izin Keluar", icon: <IcDoorOut className="w-4.5 h-4.5" /> },
  { id: "masuk_kembali", label: "Masuk Kembali", icon: <IcReturn className="w-4.5 h-4.5" /> },
  { id: "pulang", label: "Jam Pulang", icon: <IcHome className="w-4.5 h-4.5" /> },
];

export default function OperatorPage() {
  const { db, update, currentUser } = useStore();
  const toast = useToast();
  const today = todayISO();
  const [teacherId, setTeacherId] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string; key: number } | null>(null);

  const s = db.settings;
  const workday = isWorkday(today, s);
  const rows = useMemo(() => computeDailyRows(db, today), [db, today]);
  const attended = rows.filter((r) => r.rec?.timeIn);
  const activeTeachers = db.teachers.filter((t) => t.active).sort((a, b) => a.name.localeCompare(b.name));
  const recentScans = db.logs.filter((l) => l.type === "scan").slice(0, 8);

  const mark = (mode: ScanMode) => {
    if (!teacherId || !currentUser) {
      setFeedback({ ok: false, msg: "Pilih pegawai terlebih dahulu.", key: Date.now() });
      return;
    }
    const probe = JSON.parse(JSON.stringify(db)) as DB;
    const res = applyScan(probe, teacherId, mode, "manual", currentUser.name);
    if (res.ok) update((d) => { applyScan(d, teacherId, mode, "manual", currentUser.name); });
    setFeedback({ ok: res.ok, msg: res.message, key: Date.now() });
    toast.push(res.ok ? { type: "success", title: MODE_LABEL[mode], sub: res.message } : { type: "error", title: "Ditolak", sub: res.message });
  };

  const exportToday = () => {
    exportCSV(`presensi-hari-ini-${today}.csv`, ["No", "Nama", "NIP", "Jam Masuk", "Izin Keluar", "Masuk Kembali", "Jam Pulang", "Durasi", "Status"],
      rows.map((r, i) => [i + 1, r.teacher.name, r.teacher.nip || "-", fmtHM(r.rec?.timeIn), fmtHM(r.rec?.izinKeluar), fmtHM(r.rec?.masukKembali), fmtHM(r.rec?.timeOut), r.rec?.timeIn ? fmtDur(workMinutes(r.rec, s)) : "-", r.rec ? STATUS_META[r.rec.status].label : "Belum"]));
    toast.push({ type: "success", title: "CSV diunduh", sub: `Presensi ${today}` });
  };

  return (
    <div className="space-y-4">
      <div className="panel p-5 anim-fade-up">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-display font-bold text-lg">Penandaan Manual</h3>
          <Badge tone={workday ? "green" : "amber"}>{workday ? "Hari Kerja" : "Bukan Hari Kerja"}</Badge>
        </div>
        <p className="text-sm text-ink/55 mt-1">Tandai presensi pegawai yang kendalanya tidak bisa scan — tercatat sebagai metode <b>Manual</b>.</p>
        <div className="grid md:grid-cols-[1fr_auto] gap-3 mt-4 items-start">
          <select className="input h-12" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">— Pilih pegawai —</option>
            {activeTeachers.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.cardId}</option>)}
          </select>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => mark(m.id)} className="btn btn-dark btn-md">{m.icon} {m.label}</button>
            ))}
          </div>
        </div>
        {feedback && (
          <p key={feedback.key} className={`anim-pop mt-3.5 text-sm font-bold rounded-lg px-3.5 py-2.5 border ${feedback.ok ? "bg-emerald-600/8 border-emerald-600/25 text-emerald-700" : "bg-red-600/8 border-red-600/25 text-red-700"}`}>
            {feedback.msg}
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
        <div className="panel overflow-hidden anim-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink/8">
            <h3 className="font-display font-bold flex items-center gap-2"><IcUsers className="w-4.5 h-4.5 text-pine-600" /> Kehadiran Hari Ini</h3>
            <div className="flex items-center gap-2">
              <Badge tone="pine">{attended.length}/{rows.length}</Badge>
              <button className="btn btn-outline btn-sm" onClick={exportToday}><IcFileCsv className="w-3.5 h-3.5 text-pine-600" /> CSV</button>
            </div>
          </div>
          {attended.length === 0 ? (
            <EmptyState icon={<IcUsers className="w-6 h-6" />} title="Belum ada yang presensi" sub="Data akan muncul setelah scan pertama hari ini." />
          ) : (
            <div className="divide-y divide-ink/[0.06] max-h-[430px] overflow-y-auto">
              {[...attended].sort((a, b) => (b.rec?.timeIn || "").localeCompare(a.rec?.timeIn || "")).map(({ teacher: t, rec }) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-pine-50/60 transition-colors">
                  <Avatar name={t.name} color={t.color} size="w-9 h-9 text-[11px]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[13px] leading-tight truncate">{t.name}</p>
                    <p className="text-[11px] text-ink/45">Masuk {fmtHM(rec?.timeIn)} {rec?.timeOut ? `· Pulang ${fmtHM(rec.timeOut)}` : ""}</p>
                  </div>
                  {rec && <Badge tone={STATUS_META[rec.status].tone}>{STATUS_META[rec.status].label}</Badge>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel overflow-hidden anim-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="px-5 py-3.5 border-b border-ink/8 flex items-center gap-2">
            <IcPulse className="w-4.5 h-4.5 text-pine-600" />
            <h3 className="font-display font-bold">Scan Terbaru</h3>
          </div>
          {recentScans.length === 0 ? (
            <EmptyState icon={<IcPulse className="w-6 h-6" />} title="Belum ada aktivitas" />
          ) : (
            <div className="divide-y divide-ink/[0.06] max-h-[430px] overflow-y-auto">
              {recentScans.map((l) => (
                <div key={l.id} className="px-4 py-2.5 flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-pine-700/10 text-pine-700 flex items-center justify-center shrink-0 mt-0.5"><IcPulse className="w-3.5 h-3.5" /></span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold leading-tight">{l.action}</p>
                    <p className="text-[11px] text-ink/50">{l.detail}</p>
                    <p className="text-[10px] text-ink/35 mt-0.5">{l.actor} · {fmtLogTime(l.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl bg-sky-600/8 border border-sky-600/20 px-4 py-3 text-sm text-sky-800 anim-fade-up" style={{ animationDelay: "160ms" }}>
        <IcInfo className="w-4.5 h-4.5 shrink-0 mt-0.5" />
        Butuh mengubah jam masuk/pulang atau hari kerja? Gunakan menu <b>Pengaturan</b> — perubahan langsung berlaku pada perhitungan keterlambatan dan rekap.
      </div>
    </div>
  );
}
