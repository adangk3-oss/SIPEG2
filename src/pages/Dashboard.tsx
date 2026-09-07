import React, { useMemo, useState } from "react";
import { applyScan, computeDailyRows, METHOD_LABEL, MODE_LABEL, STATUS_META, useNow, useStore } from "../lib/data";
import type { DB, ScanMethod, ScanMode, ScanResult, Teacher } from "../lib/types";
import { fmtDateID, fmtDur, fmtHM, greeting, isWorkday, pad2, todayISO, workMinutes } from "../lib/time";
import { IcAlert, IcBarcode, IcCheck, IcClockIn, IcDoorOut, IcFace, IcHome, IcIdCard, IcInfo, IcPrinter, IcReturn, IcScan, IcUsers } from "../components/icons";
import { Avatar, Badge, EmptyState, useToast } from "../components/ui";
import { CardPrintModal } from "./BarcodeCard";

const MODES: { id: ScanMode; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "masuk", label: "Jam Masuk", desc: "Catat kehadiran pagi", icon: <IcClockIn className="w-5.5 h-5.5" /> },
  { id: "izin_keluar", label: "Izin Keluar", desc: "Keluar saat jam kerja", icon: <IcDoorOut className="w-5.5 h-5.5" /> },
  { id: "masuk_kembali", label: "Masuk Kembali", desc: "Kembali dari izin", icon: <IcReturn className="w-5.5 h-5.5" /> },
  { id: "pulang", label: "Jam Pulang", desc: "Akhiri hari kerja", icon: <IcHome className="w-5.5 h-5.5" /> },
];

interface ResultState extends ScanResult { key: number; teacher?: Teacher; method?: ScanMethod; }

export default function Dashboard() {
  const { db, update, currentUser } = useStore();
  const toast = useToast();
  const now = useNow();
  const today = todayISO();

  const [mode, setMode] = useState<ScanMode>("masuk");
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<ResultState | null>(null);
  const [printTeachers, setPrintTeachers] = useState<Teacher[] | null>(null);

  const s = db.settings;
  const workday = isWorkday(today, s);

  const rows = useMemo(() => computeDailyRows(db, today), [db, today]);
  const attended = rows.filter((r) => r.rec?.timeIn);
  const stats = {
    hadir: rows.filter((r) => r.rec?.timeIn && r.rec.status === "hadir").length,
    terlambat: rows.filter((r) => r.rec?.timeIn && r.rec.status === "terlambat").length,
    izin: rows.filter((r) => r.rec?.izinKeluar).length,
    belum: rows.filter((r) => !r.rec?.timeIn).length,
  };

  const processTeacher = (t: Teacher, method: ScanMethod) => {
    if (!currentUser) return;
    const probe = JSON.parse(JSON.stringify(db)) as DB;
    const res = applyScan(probe, t.id, mode, method, currentUser.name);
    if (res.ok) update((d) => { applyScan(d, t.id, mode, method, currentUser.name); });
    setResult({ key: Date.now(), ...res, teacher: t, method });
    toast.push(
      res.ok ? { type: "success", title: MODE_LABEL[mode], sub: res.message }
        : { type: "error", title: "Presensi ditolak", sub: res.message },
    );
  };

  const processCode = (code: string) => {
    const t = db.teachers.find((x) => x.cardId.toLowerCase() === code.trim().toLowerCase());
    if (!t) {
      setResult({ key: Date.now(), ok: false, message: `Kode "${code}" tidak terdaftar sebagai kartu pegawai.` });
      toast.push({ type: "error", title: "Kartu tidak dikenal", sub: `Kode "${code}" tidak ditemukan di data guru.` });
      return;
    }
    processTeacher(t, "barcode");
  };

  const sortedRows = [...rows].sort((a, b) => {
    if (a.rec?.timeIn && b.rec?.timeIn) return b.rec.timeIn.localeCompare(a.rec.timeIn);
    if (a.rec?.timeIn) return -1;
    if (b.rec?.timeIn) return 1;
    return a.teacher.name.localeCompare(b.teacher.name);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 anim-fade-up">
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.22em] text-pine-600 uppercase">{greeting()},</p>
          <h2 className="font-display font-bold text-2xl md:text-3xl mt-1">{currentUser?.name}</h2>
        </div>
        <div className="text-left md:text-right">
          <p className="font-display font-bold text-4xl md:text-5xl tabular-nums tracking-tight text-pine-900 leading-none">
            {pad2(now.getHours())}:{pad2(now.getMinutes())}
            <span className="text-amber-500 text-2xl md:text-3xl">:{pad2(now.getSeconds())}</span>
          </p>
          <p className="text-sm text-ink/55 mt-1.5">{fmtDateID(today)}</p>
        </div>
      </div>

      {!workday && (
        <div className="anim-fade-up flex items-center gap-2.5 rounded-lg bg-amber-400/15 border border-amber-500/30 text-amber-800 text-sm font-semibold px-4 py-3">
          <IcInfo className="w-5 h-5 shrink-0" />
          Hari ini bukan hari kerja menurut pengaturan — presensi tetap dapat dicatat.
        </div>
      )}

      <section className="panel overflow-hidden anim-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink/8 bg-pine-950 text-white">
          <div className="flex items-center gap-2.5">
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 anim-blink" />
            </span>
            <h3 className="font-display font-bold tracking-wide">MESIN PRESENSI</h3>
          </div>
          <Badge tone="amber" className="bg-amber-400/15 border-amber-300/30 text-amber-300">Mode: {MODE_LABEL[mode]}</Badge>
        </div>

        <div className="grid lg:grid-cols-[1.15fr_1fr]">
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-ink/8">
            <p className="label">Langkah 1 · Pilih Mode Presensi</p>
            <div className="grid grid-cols-2 gap-2.5">
              {MODES.map((m) => {
                const active = mode === m.id;
                return (
                  <button key={m.id} onClick={() => setMode(m.id)}
                    className={`relative text-left rounded-xl border p-3.5 transition-all duration-150 group ${active ? "bg-pine-800 border-pine-800 text-white shadow-md shadow-pine-900/25 -translate-y-0.5" : "bg-paper border-ink/10 hover:border-pine-500/50 hover:bg-pine-50"}`}>
                    <span className={`inline-flex w-9 h-9 rounded-lg items-center justify-center mb-2 transition-colors ${active ? "bg-amber-400 text-pine-950" : "bg-pine-700/10 text-pine-700 group-hover:bg-pine-700/15"}`}>
                      {m.icon}
                    </span>
                    <p className="font-bold text-sm leading-tight">{m.label}</p>
                    <p className={`text-[11px] mt-0.5 ${active ? "text-pine-200" : "text-ink/45"}`}>{m.desc}</p>
                    {active && (
                      <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-amber-400 text-pine-950 flex items-center justify-center anim-pop">
                        <IcCheck className="w-3 h-3" sw={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="label mt-4">Input Manual Kode Kartu</p>
            <form className="flex gap-2" onSubmit={(e) => {
              e.preventDefault();
              if (manual.trim()) { processCode(manual); setManual(""); }
            }}>
              <input className="input font-mono uppercase" placeholder="cth: SPG-0003" value={manual} onChange={(e) => setManual(e.target.value)} />
              <button type="submit" className="btn btn-outline btn-md" disabled={!manual.trim()}>Proses</button>
            </form>
          </div>

          <div className="p-5 flex flex-col">
            <p className="label">Langkah 2 · Scan Identitas Pegawai</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => {
                const code = prompt("Masukkan kode barcode pegawai:");
                if (code) processCode(code);
              }} className="btn btn-dark btn-lg h-20 flex-col gap-1.5 rounded-xl anim-ring">
                <IcBarcode className="w-7 h-7" />
                <span className="text-sm">Scan Barcode</span>
              </button>
              <button onClick={() => {
                const code = prompt("Masukkan kode wajah pegawai (NIP):");
                if (code) {
                  const t = db.teachers.find((x) => x.nip === code.trim() || x.cardId.toLowerCase() === code.trim().toLowerCase());
                  if (t) processTeacher(t, "wajah");
                  else {
                    setResult({ key: Date.now(), ok: false, message: `Wajah dengan kode "${code}" tidak terdaftar.` });
                    toast.push({ type: "error", title: "Wajah tidak dikenali", sub: `Kode "${code}" tidak ditemukan.` });
                  }
                }
              }} className="btn btn-gold btn-lg h-20 flex-col gap-1.5 rounded-xl">
                <IcFace className="w-7 h-7" />
                <span className="text-sm">Scan Wajah</span>
              </button>
            </div>

            <div className="mt-4 flex-1">
              {result ? (
                <div key={result.key} className={`anim-pop rounded-xl border p-4 flex items-center gap-3.5 h-full min-h-[92px] ${result.ok ? "bg-emerald-600/8 border-emerald-600/25" : "bg-red-600/8 border-red-600/25"}`}>
                  {result.ok && result.teacher ? (
                    <>
                      <Avatar name={result.teacher.name} color={result.teacher.color} size="w-12 h-12 text-base" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm truncate">{result.teacher.name}</p>
                        <p className="text-xs text-ink/60 mt-0.5">
                          {result.mode ? MODE_LABEL[result.mode] : ""} · <span className="font-mono font-bold">{result.time?.slice(0, 5)}</span> · {result.method ? METHOD_LABEL[result.method] : ""}
                        </p>
                        <Badge tone={result.mode === "masuk" ? "green" : "blue"} className="mt-1.5">Berhasil</Badge>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="w-10 h-10 rounded-full bg-red-600/12 text-red-600 flex items-center justify-center shrink-0">
                        <IcAlert className="w-5 h-5" />
                      </span>
                      <p className="text-sm font-semibold text-red-700 leading-snug">{result.message}</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-ink/15 h-full min-h-[92px] flex flex-col items-center justify-center text-center px-4 py-5">
                  <IcScan className="w-6 h-6 text-ink/30" />
                  <p className="text-xs text-ink/40 mt-2 font-semibold">Belum ada scan — pilih mode lalu scan barcode atau wajah pegawai.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="panel grid grid-cols-2 sm:grid-cols-4 divide-x divide-ink/8 anim-fade-up" style={{ animationDelay: "120ms" }}>
        {[
          { label: "Hadir Tepat Waktu", v: stats.hadir, cls: "text-emerald-600" },
          { label: "Terlambat", v: stats.terlambat, cls: "text-amber-600" },
          { label: "Izin Keluar", v: stats.izin, cls: "text-sky-600" },
          { label: "Belum Presensi", v: stats.belum, cls: "text-ink/50" },
        ].map((x) => (
          <div key={x.label} className="px-5 py-4">
            <p className={`font-display font-bold text-3xl tabular-nums ${x.cls}`}>{x.v}</p>
            <p className="text-[11px] font-bold text-ink/50 uppercase tracking-wide mt-0.5">{x.label}</p>
          </div>
        ))}
      </section>

      <div className="grid lg:grid-cols-[1.55fr_1fr] gap-5 items-start">
        <section className="panel anim-fade-up" style={{ animationDelay: "160ms" }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink/8">
            <h3 className="font-display font-bold">Presensi Hari Ini</h3>
            <Badge tone="pine">{attended.length}/{rows.length} pegawai</Badge>
          </div>
          {rows.length === 0 ? (
            <EmptyState icon={<IcUsers className="w-7 h-7" />} title="Belum ada data guru" sub="Tambahkan guru melalui menu Data Guru." />
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full min-w-[560px]">
                <thead className="sticky top-0 bg-paper/95 backdrop-blur">
                  <tr>
                    <th className="th">Pegawai</th>
                    <th className="th">Masuk</th>
                    <th className="th">Izin Keluar</th>
                    <th className="th">Pulang</th>
                    <th className="th">Durasi</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map(({ teacher: t, rec }) => (
                    <tr key={t.id} className="hover:bg-pine-50/60 transition-colors">
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={t.name} color={t.color} size="w-8 h-8 text-[10px]" />
                          <div className="min-w-0">
                            <p className="font-bold text-[13px] leading-tight truncate max-w-[180px]">{t.name}</p>
                            <p className="text-[10px] text-ink/40 font-mono">{t.cardId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td font-mono text-[13px] font-semibold">{fmtHM(rec?.timeIn)}</td>
                      <td className="td font-mono text-[12px] text-ink/60">
                        {rec?.izinKeluar ? `${fmtHM(rec.izinKeluar)}–${fmtHM(rec.masukKembali)}` : "—"}
                      </td>
                      <td className="td font-mono text-[13px] font-semibold">{fmtHM(rec?.timeOut)}</td>
                      <td className="td text-[12px] font-bold text-pine-700">
                        {rec?.timeIn ? fmtDur(workMinutes(rec, s)) : "—"}
                      </td>
                      <td className="td">
                        {rec?.timeIn ? <Badge tone={STATUS_META[rec.status].tone}>{STATUS_META[rec.status].label}</Badge> : <Badge tone="slate">Belum</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel anim-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink/8">
            <h3 className="font-display font-bold flex items-center gap-2">
              <IcIdCard className="w-4.5 h-4.5 text-pine-600" /> Kartu Pegawai
            </h3>
            <button className="btn btn-outline btn-sm" onClick={() => setPrintTeachers(db.teachers.filter((t) => t.active))} disabled={!db.teachers.some((t) => t.active)}>
              <IcPrinter className="w-3.5 h-3.5" /> Cetak Semua
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-ink/[0.06]">
            {db.teachers.filter((t) => t.active).sort((a, b) => a.name.localeCompare(b.name)).map((t) => {
              const rec = db.records.find((r) => r.teacherId === t.id && r.date === today);
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-pine-50/60 transition-colors group">
                  <Avatar name={t.name} color={t.color} size="w-9 h-9 text-[11px]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[13px] leading-tight truncate">{t.name}</p>
                    <p className="text-[10px] text-ink/40">{t.jabatan}</p>
                  </div>
                  {rec?.timeIn ? <Badge tone={STATUS_META[rec.status].tone}>{STATUS_META[rec.status].label}</Badge> : <Badge tone="slate">Belum</Badge>}
                  <button title={`Cetak kartu ${t.name}`} onClick={() => setPrintTeachers([t])}
                    className="w-8 h-8 rounded-md flex items-center justify-center text-ink/35 opacity-60 group-hover:opacity-100 hover:bg-pine-700 hover:text-white transition-all">
                    <IcPrinter className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {printTeachers && <CardPrintModal teachers={printTeachers} settings={s} onClose={() => setPrintTeachers(null)} />}
    </div>
  );
}
