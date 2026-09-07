import React, { useRef, useState } from "react";
import { DEFAULT_SETTINGS, pushLog, seedDB, useStore } from "../lib/data";
import { fmtDur, fmtMonthID, monthKeyOf, stdWorkMin, todayISO } from "../lib/time";
import type { DB } from "../lib/types";
import { downloadBlob } from "../lib/export";
import { IcAlert, IcCalendarMonth, IcCheck, IcClock, IcDownload, IcInfo, IcPencil, IcRefresh, IcSchool, IcTrash, IcUpload, IcUsers } from "../components/icons";
import { Badge, Confirm, Field, Logo, Seg, useToast } from "../components/ui";

const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const DAY_FULL = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

type Tab = "jam" | "hari" | "ttd" | "sekolah" | "data";

/* ---------- Calendar View Component ---------- */
function CalendarView({
  month,
  workDays,
  onToggleDay,
  isOverride,
}: {
  month: string;
  workDays: number[];
  onToggleDay: (dayOfWeek: number) => void;
  isOverride: boolean;
}) {
  const [year, monthNum] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNum - 1, 1);
  const lastDay = new Date(year, monthNum, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthNum - 1;

  const days: Array<{ date: number; dayOfWeek: number } | null> = [];
  for (let i = 0; i < startDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthNum - 1, d);
    days.push({ date: d, dayOfWeek: date.getDay() });
  }

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_SHORT.map((day, idx) => (
          <div key={idx} className="text-center text-xs font-bold text-ink/50 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (!day) {
            return <div key={idx} className="aspect-square" />;
          }

          const isWork = workDays.includes(day.dayOfWeek);
          const isToday = isCurrentMonth && day.date === today.getDate();
          const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;

          return (
            <button
              key={idx}
              onClick={() => onToggleDay(day.dayOfWeek)}
              className={`
                aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5
                transition-all hover:scale-105 font-bold text-sm
                ${isWork
                  ? isToday
                    ? "bg-amber-400/30 border-2 border-amber-500 text-amber-700"
                    : "bg-pine-700 text-white shadow-sm"
                  : isToday
                    ? "bg-amber-400/20 border-2 border-amber-500 text-ink/40"
                    : isWeekend
                      ? "bg-red-500/10 text-red-600/60"
                      : "bg-ink/10 text-ink/40"
                }
              `}
              title={`${DAY_FULL[day.dayOfWeek]}, ${day.date} ${month} — ${isWork ? "Hari Kerja" : "Hari Libur"}`}
            >
              <span className="text-xs opacity-70">{DAY_SHORT[day.dayOfWeek]}</span>
              <span className="text-base">{day.date}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LogoUpload({ label, desc, value, onSet }: { label: string; desc: string; value: string | null; onSet: (v: string | null) => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pop, setPop] = useState(0);
  const [err, setErr] = useState(false);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    setErr(false);
    if (!["image/jpeg", "image/png"].includes(f.type)) { setErr(true); toast.push({ type: "error", title: "Format ditolak", sub: "Hanya berkas JPG atau PNG yang didukung." }); return; }
    if (f.size > 1.5 * 1024 * 1024) { setErr(true); toast.push({ type: "error", title: "Berkas terlalu besar", sub: "Maksimal 1,5 MB." }); return; }
    const r = new FileReader();
    r.onload = () => { onSet(String(r.result)); setPop((k) => k + 1); toast.push({ type: "success", title: `${label} diperbarui`, sub: `${f.name}` }); };
    r.readAsDataURL(f);
  };

  return (
    <div className={`rounded-xl border bg-paper/70 p-4 flex flex-col transition-colors ${err ? "border-red-500/50 anim-shake" : "border-ink/10"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-sm">{label}</p>
        <Badge tone={value ? "pine" : "slate"}>{value ? "Logo Kustom" : "Logo Bawaan"}</Badge>
      </div>
      <div className="mt-3 h-32 rounded-xl border-2 border-dashed border-ink/15 bg-white flex items-center justify-center overflow-hidden relative">
        <div key={pop} className="anim-pop w-24 h-24 rounded-full overflow-hidden ring-2 ring-pine-600/25 shadow-sm flex items-center justify-center bg-white">
          {value ? <img src={value} alt={label} className="w-full h-full object-cover" onError={() => setErr(true)} /> : <Logo className="w-24 h-24" />}
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>Unggah JPG / PNG</button>
        {value && <button className="btn btn-outline btn-sm" onClick={() => { onSet(null); toast.push({ type: "info", title: `${label} dikembalikan` }); }}>Pakai Bawaan</button>}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      <p className="text-[11px] text-ink/45 mt-2.5 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function Settings() {
  const { db, update, currentUser } = useStore();
  const toast = useToast();
  const s = db.settings;
  const [tab, setTab] = useState<Tab>("jam");
  const [ovrMonth, setOvrMonth] = useState(monthKeyOf(todayISO()));
  const [ovrDays, setOvrDays] = useState<number[]>(s.workDays?.overrides?.[monthKeyOf(todayISO())] ?? s.workDays?.defaultDays ?? [1, 2, 3, 4, 5]);
  const [confirm, setConfirm] = useState<"reset" | "reseed" | "clear" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setSettings = (fn: (st: typeof s) => void) => { update((d) => { fn(d.settings); }); };

  const toggleDefaultDay = (day: number) => {
    setSettings((st) => {
      const has = st.workDays.defaultDays.includes(day);
      st.workDays.defaultDays = has ? st.workDays.defaultDays.filter((x) => x !== day) : [...st.workDays.defaultDays, day].sort();
    });
  };

  const saveOverride = () => { setSettings((st) => { if (!st.workDays.overrides) st.workDays.overrides = {}; st.workDays.overrides[ovrMonth] = [...ovrDays].sort(); }); toast.push({ type: "success", title: "Hari kerja khusus disimpan", sub: fmtMonthID(ovrMonth) }); };
  const removeOverride = (k: string) => { setSettings((st) => { if (st.workDays.overrides) delete st.workDays.overrides[k]; }); toast.push({ type: "info", title: "Aturan khusus dihapus", sub: `${fmtMonthID(k)} kembali ke bawaan` }); };

  const exportBackup = () => { downloadBlob(`sipeg-backup-${todayISO()}.json`, new Blob([JSON.stringify(db, null, 2)], { type: "application/json" })); toast.push({ type: "success", title: "Backup diunduh" }); };

  const importBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as DB;
        if (!parsed.users || !parsed.teachers || !parsed.settings) throw new Error("tidak valid");
        update((d) => { Object.assign(d, parsed); pushLog(d, currentUser?.name || "Admin", "system", "Pulihkan Backup", `Data dipulihkan dari ${file.name}`); });
        toast.push({ type: "success", title: "Backup dipulihkan", sub: file.name });
      } catch { toast.push({ type: "error", title: "Berkas tidak valid" }); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="anim-fade-up overflow-x-auto">
        <Seg<Tab> value={tab} onChange={setTab}
          options={[
            { id: "jam", label: "Jam Masuk & Pulang" },
            { id: "hari", label: "Hari Kerja" },
            { id: "ttd", label: "Penandatangan Rekap" },
            { id: "sekolah", label: "Identitas Sekolah" },
            { id: "data", label: "Data Aplikasi" },
          ]} />
      </div>

      {tab === "jam" && (
        <div className="panel p-6 max-w-2xl anim-fade-up">
          <h3 className="font-display font-bold text-lg flex items-center gap-2"><IcClock className="w-5 h-5 text-pine-600" /> Jam Masuk & Pulang</h3>
          <p className="text-sm text-ink/55 mt-1">Jam masuk menjadi batas keterlambatan; jam pulang menjadi acuan durasi kerja standar.</p>
          <div className="grid sm:grid-cols-2 gap-5 mt-6">
            <Field label="Batas Jam Masuk"><input type="time" className="input h-12 font-display font-bold text-lg" value={s.workHours.start} onChange={(e) => e.target.value && setSettings((st) => { st.workHours.start = e.target.value; })} /></Field>
            <Field label="Jam Pulang"><input type="time" className="input h-12 font-display font-bold text-lg" value={s.workHours.end} onChange={(e) => e.target.value && setSettings((st) => { st.workHours.end = e.target.value; })} /></Field>
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-pine-700/8 border border-pine-700/20 px-4 py-3.5">
            <IcInfo className="w-5 h-5 text-pine-700 shrink-0" />
            <p className="text-sm text-pine-900">Durasi kerja standar <b className="font-display">{fmtDur(stdWorkMin(s))}</b> per hari ({s.workHours.start} – {s.workHours.end}). Lewat dari {s.workHours.start} dihitung <Badge tone="amber">Terlambat</Badge>.</p>
          </div>
        </div>
      )}

      {tab === "hari" && (
        <div className="space-y-4 anim-fade-up">
          {/* Mode selector */}
          <div className="panel p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-display font-bold text-lg flex items-center gap-2">
                  <IcCalendarMonth className="w-5 h-5 text-pine-600" /> Pengaturan Hari Kerja
                </h3>
                <p className="text-sm text-ink/55 mt-0.5">Klik tanggal untuk menandai hari kerja/libur</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOvrMonth("")}
                  className={`btn btn-sm ${ovrMonth === "" ? "btn-primary" : "btn-outline"}`}
                >
                  Default (Semua Bulan)
                </button>
                <button
                  onClick={() => setOvrMonth(monthKeyOf(todayISO()))}
                  className={`btn btn-sm ${ovrMonth !== "" ? "btn-primary" : "btn-outline"}`}
                >
                  Per Bulan
                </button>
              </div>
            </div>

            {ovrMonth !== "" && (
              <div className="mt-4 flex items-center gap-3">
                <label className="label mb-0">Pilih Bulan:</label>
                <input
                  type="month"
                  className="input w-[180px]"
                  value={ovrMonth}
                  onChange={(e) => {
                    const newMonth = e.target.value;
                    setOvrMonth(newMonth);
                    const override = s.workDays?.overrides?.[newMonth];
                    setOvrDays(override ?? s.workDays?.defaultDays ?? [1, 2, 3, 4, 5]);
                  }}
                />
                {s.workDays?.overrides?.[ovrMonth] && (
                  <button className="btn btn-danger btn-sm" onClick={() => { removeOverride(ovrMonth); setOvrMonth(""); }}>
                    Hapus Aturan Bulan Ini
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Calendar */}
          <div className="panel p-5">
            <CalendarView
              month={ovrMonth || monthKeyOf(todayISO())}
              workDays={ovrDays}
              onToggleDay={(day) => {
                setOvrDays((prev) =>
                  prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
                );
              }}
              isOverride={ovrMonth !== ""}
            />

            <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-ink/60">
                <span className="font-bold text-pine-700">{ovrDays.length}</span> hari kerja
                {ovrMonth === "" ? " per minggu (default)" : ` di ${fmtMonthID(ovrMonth)}`}
              </div>
              {ovrMonth !== "" && (
                <button className="btn btn-primary btn-md" onClick={saveOverride}>
                  <IcCheck className="w-4 h-4" /> Simpan Aturan Bulan Ini
                </button>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="panel p-4">
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pine-700 flex items-center justify-center text-white font-bold text-xs">15</div>
                <span className="text-ink/60">Hari Kerja</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-ink/10 flex items-center justify-center text-ink/40 font-bold text-xs">15</div>
                <span className="text-ink/60">Hari Libur</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400/30 border-2 border-amber-500 flex items-center justify-center text-amber-700 font-bold text-xs">15</div>
                <span className="text-ink/60">Hari Ini</span>
              </div>
            </div>
          </div>

          {/* Override list */}
          {Object.keys(s.workDays?.overrides ?? {}).length > 0 && (
            <div className="panel p-5">
              <h4 className="font-display font-bold text-base mb-3 flex items-center gap-2">
                <IcPencil className="w-4 h-4 text-pine-600" /> Aturan Khusus per Bulan
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(s.workDays?.overrides ?? {}).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-2 rounded-lg bg-amber-400/12 border border-amber-500/30 text-amber-800 text-xs font-bold px-2.5 py-1.5">
                    {fmtMonthID(k)} · {v.map((d) => DAY_SHORT[d]).join(" ")}
                    <button onClick={() => removeOverride(k)} className="hover:text-red-600" title="Hapus aturan"><IcTrash className="w-3.5 h-3.5" /></button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "ttd" && (
        <div className="anim-fade-up space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-pine-700/8 border border-pine-700/20 px-4 py-3.5 max-w-3xl">
            <IcInfo className="w-5 h-5 text-pine-700 shrink-0 mt-0.5" />
            <p className="text-sm text-pine-900">Blok <b>Kepala Sekolah</b> tercetak di sisi <b>kiri</b> dan blok <b>guru/petugas</b> di sisi <b>kanan</b> laporan PDF. Untuk rekap per nama guru, sisi kanan otomatis memakai nama guru bersangkutan.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl">
            {(["principal", "staff"] as const).map((side) => {
              const isLeft = side === "principal";
              const v = s.signers[side];
              return (
                <div key={side} className="panel p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold">{isLeft ? "Kepala Sekolah" : "Guru / Petugas"}</h3>
                    <Badge tone={isLeft ? "pine" : "amber"}>{isLeft ? "Sisi Kiri" : "Sisi Kanan"}</Badge>
                  </div>
                  <div className="space-y-4 mt-5">
                    <Field label="Nama Lengkap & Gelar"><input className="input" value={v.name} placeholder="kosong = garis tanda tangan" onChange={(e) => setSettings((st) => { st.signers[side].name = e.target.value; })} /></Field>
                    <Field label="NIP"><input className="input font-mono" value={v.nip} onChange={(e) => setSettings((st) => { st.signers[side].nip = e.target.value; })} /></Field>
                    <Field label="Jabatan"><input className="input" value={v.title} onChange={(e) => setSettings((st) => { st.signers[side].title = e.target.value; })} /></Field>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "sekolah" && (
        <>
          <div className="panel p-6 max-w-2xl anim-fade-up">
            <h3 className="font-display font-bold text-lg flex items-center gap-2"><IcSchool className="w-5 h-5 text-pine-600" /> Identitas Sekolah</h3>
            <p className="text-sm text-ink/55 mt-1">Tampil di portal masuk, sidebar, kartu pegawai, dan kop laporan PDF.</p>
            <div className="grid sm:grid-cols-2 gap-5 mt-6">
              <Field label="Nama Sekolah"><input className="input" value={s.school.name} onChange={(e) => setSettings((st) => { st.school.name = e.target.value; })} /></Field>
              <Field label="Singkatan Aplikasi"><input className="input" value={s.school.shortName} onChange={(e) => setSettings((st) => { st.school.shortName = e.target.value.toUpperCase(); })} /></Field>
              <Field label="NPSN"><input className="input font-mono" value={s.school.npsn} onChange={(e) => setSettings((st) => { st.school.npsn = e.target.value; })} /></Field>
              <Field label="Telepon"><input className="input" value={s.school.phone} onChange={(e) => setSettings((st) => { st.school.phone = e.target.value; })} /></Field>
              <div className="sm:col-span-2">
                <Field label="Alamat"><textarea className="input h-auto py-2.5 min-h-[70px] resize-y" value={s.school.address} onChange={(e) => setSettings((st) => { st.school.address = e.target.value; })} /></Field>
              </div>
            </div>
            <p className="text-xs text-ink/45 mt-4 flex items-center gap-1.5"><IcCheck className="w-4 h-4 text-emerald-600" /> Tersimpan otomatis.</p>
          </div>

          <div className="panel p-6 max-w-2xl anim-fade-up" style={{ animationDelay: "80ms" }}>
            <h3 className="font-display font-bold text-lg flex items-center gap-2"><IcSchool className="w-5 h-5 text-pine-600" /> Logo Aplikasi & Logo Cetak</h3>
            <p className="text-sm text-ink/55 mt-1">Unggah logo untuk tampilan aplikasi dan laporan cetak (JPG/PNG, maks. 1,5 MB).</p>
            <div className="grid sm:grid-cols-2 gap-4 mt-5">
              <LogoUpload label="Logo Aplikasi" desc="Tampil di portal masuk, sidebar, header, dan kartu pegawai." value={s.logos.app} onSet={(v) => setSettings((st) => { st.logos.app = v; })} />
              <LogoUpload label="Logo Cetak Rekap" desc="Tampil di kop laporan PDF rekap harian, bulanan, dan per nama guru." value={s.logos.print} onSet={(v) => setSettings((st) => { st.logos.print = v; })} />
            </div>
          </div>
        </>
      )}

      {tab === "data" && (
        <div className="grid md:grid-cols-2 gap-4 anim-fade-up">
          <div className="panel p-6">
            <h3 className="font-display font-bold text-lg flex items-center gap-2"><IcDownload className="w-5 h-5 text-pine-600" /> Cadangkan & Pulihkan</h3>
            <p className="text-sm text-ink/55 mt-1">Seluruh data tersimpan lokal di perangkat ini (localStorage). Unduh backup JSON untuk menyimpannya di PC atau memindahkannya ke komputer lain.</p>
            <div className="flex flex-wrap gap-2 mt-5">
              <button className="btn btn-primary btn-md" onClick={exportBackup}><IcDownload className="w-4.5 h-4.5" /> Unduh Backup JSON</button>
              <button className="btn btn-outline btn-md" onClick={() => fileRef.current?.click()}><IcUpload className="w-4.5 h-4.5" /> Pulihkan dari Berkas</button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = ""; }} />
            </div>
          </div>
          <div className="panel p-6">
            <h3 className="font-display font-bold text-lg flex items-center gap-2"><IcAlert className="w-5 h-5 text-red-600" /> Zona Berbahaya</h3>
            <div className="space-y-2.5 mt-5">
              <button className="btn btn-outline btn-md w-full justify-start" onClick={() => setConfirm("reset")}><IcRefresh className="w-4.5 h-4.5" /> Kembalikan pengaturan bawaan</button>
              <button className="btn btn-outline btn-md w-full justify-start" onClick={() => setConfirm("reseed")}><IcUsers className="w-4.5 h-4.5" /> Muat ulang data contoh</button>
              <button className="btn btn-danger btn-md w-full justify-start" onClick={() => setConfirm("clear")}><IcTrash className="w-4.5 h-4.5" /> Hapus semua data presensi</button>
            </div>
          </div>
        </div>
      )}

      {confirm === "reset" && <Confirm title="Reset Pengaturan" confirmLabel="Reset" message="Seluruh pengaturan kembali ke bawaan. Data guru & presensi tidak terpengaruh." onYes={() => { update((d) => { d.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); }); toast.push({ type: "info", title: "Pengaturan direset" }); }} onClose={() => setConfirm(null)} />}
      {confirm === "reseed" && <Confirm title="Muat Ulang Data Contoh" confirmLabel="Muat Ulang" message="Seluruh data akan diganti dengan data contoh awal. Unduh backup terlebih dahulu jika perlu." onYes={() => { update((d) => { Object.assign(d, seedDB()); }); toast.push({ type: "success", title: "Data contoh dimuat ulang" }); }} onClose={() => setConfirm(null)} />}
      {confirm === "clear" && <Confirm title="Hapus Semua Presensi" confirmLabel="Hapus Semua" message={`${db.records.length} catatan presensi akan dihapus permanen. Data guru dan pengaturan tetap aman.`} onYes={() => { update((d) => { d.records = []; pushLog(d, currentUser?.name || "Admin", "system", "Hapus Presensi", "Seluruh catatan presensi dikosongkan"); }); toast.push({ type: "info", title: "Data presensi dikosongkan" }); }} onClose={() => setConfirm(null)} />}
    </div>
  );
}
