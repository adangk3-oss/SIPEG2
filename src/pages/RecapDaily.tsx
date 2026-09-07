import React, { useMemo, useState } from "react";
import { computeDailyRows, pushLog, STATUS_META, uid, useStore } from "../lib/data";
import type { AttendanceRecord, AttStatus, Teacher } from "../lib/types";
import { addDaysISO, fmtDateID, fmtDur, fmtHM, isLate, isWorkday, nowISO, todayISO, workMinutes } from "../lib/time";
import { exportCSV, exportXLS, printReport } from "../lib/export";
import { IcCalendar, IcChevronL, IcChevronR, IcFileCsv, IcFilePdf, IcFileXls, IcPencil, IcPlus, IcTrash, IcUsers } from "../components/icons";
import { Avatar, Badge, Confirm, EmptyState, Field, Modal, useToast } from "../components/ui";

interface EditForm { timeIn: string; timeOut: string; izinKeluar: string; masukKembali: string; status: AttStatus; note: string; }
const toHMS = (v: string): string | null => (v ? (v.length === 5 ? `${v}:00` : v) : null);
const toInput = (v: string | null): string => (v ? v.slice(0, 8) : "");

export default function RecapDaily() {
  const { db, update, currentUser } = useStore();
  const toast = useToast();
  const [date, setDate] = useState(todayISO());
  const [editing, setEditing] = useState<{ teacher: Teacher; rec: AttendanceRecord | null } | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [del, setDel] = useState<{ teacher: Teacher; rec: AttendanceRecord } | null>(null);

  const s = db.settings;
  const workday = isWorkday(date, s);
  const isPastOrToday = date <= todayISO();
  const rows = useMemo(() => computeDailyRows(db, date), [db, date]);

  const counts = {
    hadir: rows.filter((r) => r.rec?.timeIn && r.rec.status === "hadir").length,
    terlambat: rows.filter((r) => r.rec?.timeIn && r.rec.status === "terlambat").length,
    izin: rows.filter((r) => r.rec?.status === "izin").length,
    alpha: rows.filter((r) => !r.rec?.timeIn && r.rec?.status !== "izin" && workday && isPastOrToday).length,
  };

  const exportRows = () => rows.map((r, i) => {
    const status = r.rec ? (r.rec.timeIn ? STATUS_META[r.rec.status].label : STATUS_META[r.rec.status].label) : workday && isPastOrToday ? "Alpha" : "—";
    return [i + 1, r.teacher.name, r.teacher.nip || "-", r.teacher.jabatan, fmtHM(r.rec?.timeIn), fmtHM(r.rec?.izinKeluar), fmtHM(r.rec?.masukKembali), fmtHM(r.rec?.timeOut), r.rec?.timeIn ? fmtDur(workMinutes(r.rec, s)) : "-", status, r.rec?.note || "-"];
  });
  const HEADERS = ["No", "Nama", "NIP", "Jabatan", "Jam Masuk", "Izin Keluar", "Masuk Kembali", "Jam Pulang", "Durasi", "Status", "Keterangan"];

  const doCSV = () => { exportCSV(`rekap-harian-${date}.csv`, HEADERS, exportRows()); toast.push({ type: "success", title: "CSV diunduh", sub: `rekap-harian-${date}.csv` }); };
  const doXLS = () => { exportXLS(`rekap-harian-${date}.xls`, `Rekap Presensi Harian — ${fmtDateID(date)}`, HEADERS, exportRows()); toast.push({ type: "success", title: "Excel diunduh", sub: `rekap-harian-${date}.xls` }); };
  const doPDF = () => {
    const ok = printReport({
      settings: s, title: "Rekap Presensi Harian Guru", subtitle: fmtDateID(date),
      columns: ["No", "Nama / NIP", "Jabatan", "Masuk", "Izin", "Pulang", "Durasi", "Status"],
      rows: rows.map((r, i) => [i + 1, `${r.teacher.name}<br/><span style="font-size:10px;color:#666">NIP. ${r.teacher.nip || "-"}</span>`, r.teacher.jabatan, fmtHM(r.rec?.timeIn), r.rec?.izinKeluar ? `${fmtHM(r.rec.izinKeluar)}–${fmtHM(r.rec.masukKembali)}` : "-", fmtHM(r.rec?.timeOut), r.rec?.timeIn ? fmtDur(workMinutes(r.rec, s)) : "-", r.rec ? STATUS_META[r.rec.status].label : workday && isPastOrToday ? "Alpha" : "Libur"]),
      rightSigner: { ...s.signers.staff },
      note: `Jam kerja: ${s.workHours.start} – ${s.workHours.end} · Dicetak ${fmtDateID(todayISO())} oleh ${currentUser?.name}`,
    });
    if (ok) toast.push({ type: "success", title: "PDF disiapkan", sub: "Gunakan 'Save as PDF' pada dialog cetak." });
    else toast.push({ type: "error", title: "Popup diblokir", sub: "Izinkan popup untuk mencetak PDF." });
  };

  const openEdit = (teacher: Teacher, rec: AttendanceRecord | null) => {
    setEditing({ teacher, rec });
    setForm({ timeIn: toInput(rec?.timeIn ?? null), timeOut: toInput(rec?.timeOut ?? null), izinKeluar: toInput(rec?.izinKeluar ?? null), masukKembali: toInput(rec?.masukKembali ?? null), status: rec?.status ?? "hadir", note: rec?.note ?? "" });
  };

  const saveEdit = () => {
    if (!editing || !form) return;
    update((d) => {
      let rec = d.records.find((r) => r.teacherId === editing.teacher.id && r.date === date);
      if (!rec) {
        rec = { id: uid(), teacherId: editing.teacher.id, date, timeIn: null, timeOut: null, izinKeluar: null, masukKembali: null, method: "manual", status: "alpha", note: "", updatedAt: nowISO() };
        d.records.push(rec);
      }
      rec.timeIn = toHMS(form.timeIn);
      rec.timeOut = toHMS(form.timeOut);
      rec.izinKeluar = toHMS(form.izinKeluar);
      rec.masukKembali = toHMS(form.masukKembali);
      rec.note = form.note.trim();
      rec.status = form.status === "izin" || form.status === "alpha" ? form.status : rec.timeIn ? isLate(rec.timeIn, d.settings.workHours.start) ? "terlambat" : "hadir" : "alpha";
      rec.updatedAt = nowISO();
      pushLog(d, currentUser?.name || "Admin", "edit", "Edit Rekap Harian", `${editing.teacher.name} · ${date}`);
    });
    toast.push({ type: "success", title: "Rekap disimpan", sub: `${editing.teacher.name} · ${fmtDateID(date)}` });
    setEditing(null); setForm(null);
  };

  const removeRec = (rec: AttendanceRecord) => {
    update((d) => {
      d.records = d.records.filter((r) => r.id !== rec.id);
      pushLog(d, currentUser?.name || "Admin", "edit", "Hapus Presensi", `${del?.teacher.name} · ${date}`);
    });
    toast.push({ type: "info", title: "Presensi dihapus", sub: del?.teacher.name });
  };

  return (
    <div className="space-y-4">
      <div className="panel p-4 flex flex-wrap items-center gap-3 anim-fade-up">
        <div className="flex items-center gap-1.5">
          <button className="btn btn-outline btn-md px-2.5" onClick={() => setDate(addDaysISO(date, -1))} title="Hari sebelumnya"><IcChevronL className="w-4.5 h-4.5" /></button>
          <div className="relative">
            <IcCalendar className="w-4.5 h-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-pine-600 pointer-events-none" />
            <input type="date" className="input pl-9.5 w-[168px] font-semibold" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
          <button className="btn btn-outline btn-md px-2.5" onClick={() => setDate(addDaysISO(date, 1))} disabled={date >= todayISO()} title="Hari berikutnya"><IcChevronR className="w-4.5 h-4.5" /></button>
          {date !== todayISO() && <button className="btn btn-ghost btn-md" onClick={() => setDate(todayISO())}>Hari Ini</button>}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={workday ? "green" : "amber"}>{workday ? "Hari Kerja" : "Bukan Hari Kerja"}</Badge>
          <Badge tone="pine">{counts.hadir + counts.terlambat}/{rows.length} hadir</Badge>
        </div>
        <div className="ml-auto flex gap-2">
          <button className="btn btn-outline btn-md" onClick={doPDF}><IcFilePdf className="w-4.5 h-4.5 text-red-600" /> PDF</button>
          <button className="btn btn-outline btn-md" onClick={doCSV}><IcFileCsv className="w-4.5 h-4.5 text-pine-600" /> CSV</button>
          <button className="btn btn-outline btn-md" onClick={doXLS}><IcFileXls className="w-4.5 h-4.5 text-emerald-600" /> Excel</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 anim-fade-up" style={{ animationDelay: "50ms" }}>
        {[
          { l: "Hadir", v: counts.hadir, c: "border-emerald-600/25 text-emerald-700 bg-emerald-600/6" },
          { l: "Terlambat", v: counts.terlambat, c: "border-amber-500/30 text-amber-700 bg-amber-500/8" },
          { l: "Izin", v: counts.izin, c: "border-sky-600/25 text-sky-700 bg-sky-600/6" },
          { l: "Alpha", v: counts.alpha, c: "border-red-600/25 text-red-700 bg-red-600/6" },
        ].map((x) => (
          <div key={x.l} className={`rounded-xl border px-4 py-3 ${x.c}`}>
            <p className="font-display font-bold text-2xl tabular-nums">{x.v}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">{x.l}</p>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden anim-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="px-5 py-3.5 border-b border-ink/8 flex items-center justify-between">
          <h3 className="font-display font-bold">{fmtDateID(date)}</h3>
          <p className="text-xs text-ink/45 font-semibold">Jam kerja {s.workHours.start}–{s.workHours.end}</p>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<IcUsers className="w-7 h-7" />} title="Belum ada data guru" sub="Tambahkan guru terlebih dahulu." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-paper/80">
                <tr>
                  <th className="th">Pegawai</th>
                  <th className="th">Masuk</th>
                  <th className="th">Izin Keluar</th>
                  <th className="th">Masuk Kembali</th>
                  <th className="th">Pulang</th>
                  <th className="th">Durasi</th>
                  <th className="th">Status</th>
                  <th className="th">Ket.</th>
                  <th className="th text-right pr-5">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ teacher: t, rec }) => {
                  const alpha = !rec && workday && isPastOrToday;
                  return (
                    <tr key={t.id} className="hover:bg-pine-50/60 transition-colors">
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={t.name} color={t.color} size="w-8.5 h-8.5 text-[10px]" />
                          <div>
                            <p className="font-bold text-[13px] leading-tight">{t.name}</p>
                            <p className="text-[10px] text-ink/40">{t.jabatan}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td font-mono text-[13px] font-semibold">{fmtHM(rec?.timeIn)}</td>
                      <td className="td font-mono text-[12px] text-ink/60">{fmtHM(rec?.izinKeluar)}</td>
                      <td className="td font-mono text-[12px] text-ink/60">{fmtHM(rec?.masukKembali)}</td>
                      <td className="td font-mono text-[13px] font-semibold">{fmtHM(rec?.timeOut)}</td>
                      <td className="td text-[12px] font-bold text-pine-700">{rec?.timeIn ? fmtDur(workMinutes(rec, s)) : "—"}</td>
                      <td className="td">
                        {rec ? <Badge tone={STATUS_META[rec.status].tone}>{STATUS_META[rec.status].label}</Badge> : alpha ? <Badge tone="red">Alpha</Badge> : <Badge tone="slate">{workday ? "Belum" : "Libur"}</Badge>}
                      </td>
                      <td className="td text-[12px] text-ink/55 max-w-[140px] truncate">{rec?.note || "—"}</td>
                      <td className="td">
                        <div className="flex justify-end gap-1.5 pr-2">
                          <button title={rec ? "Edit presensi" : "Catat manual"} onClick={() => openEdit(t, rec)} className="btn btn-ghost btn-sm px-2 hover:!text-pine-700">
                            {rec ? <IcPencil className="w-4 h-4" /> : <IcPlus className="w-4 h-4" />}
                          </button>
                          {rec && (
                            <button title="Hapus presensi" onClick={() => setDel({ teacher: t, rec })} className="btn btn-ghost btn-sm px-2 hover:!text-red-600">
                              <IcTrash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && form && (
        <Modal title={editing.rec ? "Edit Presensi" : "Catat Presensi Manual"} subtitle={`${editing.teacher.name} · ${fmtDateID(date)}`}
          onClose={() => { setEditing(null); setForm(null); }}
          footer={
            <>
              <button className="btn btn-outline btn-md" onClick={() => { setEditing(null); setForm(null); }}>Batal</button>
              <button className="btn btn-primary btn-md" onClick={saveEdit}>Simpan</button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Jam Masuk"><input type="time" step={1} className="input font-mono" value={form.timeIn} onChange={(e) => setForm({ ...form, timeIn: e.target.value })} /></Field>
            <Field label="Jam Pulang"><input type="time" step={1} className="input font-mono" value={form.timeOut} onChange={(e) => setForm({ ...form, timeOut: e.target.value })} /></Field>
            <Field label="Izin Keluar"><input type="time" step={1} className="input font-mono" value={form.izinKeluar} onChange={(e) => setForm({ ...form, izinKeluar: e.target.value })} /></Field>
            <Field label="Masuk Kembali"><input type="time" step={1} className="input font-mono" value={form.masukKembali} onChange={(e) => setForm({ ...form, masukKembali: e.target.value })} /></Field>
            <Field label="Status" hint="Hadir/terlambat dihitung otomatis dari jam masuk & batas keterlambatan.">
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AttStatus })}>
                <option value="hadir">Hadir</option>
                <option value="terlambat">Terlambat</option>
                <option value="izin">Izin</option>
                <option value="alpha">Alpha</option>
              </select>
            </Field>
            <Field label="Keterangan"><input className="input" value={form.note} placeholder="cth: dinas luar" onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          </div>
        </Modal>
      )}

      {del && (
        <Confirm title="Hapus Presensi" message={<>Presensi <b>{del.teacher.name}</b> tanggal {fmtDateID(date)} akan dihapus. Tindakan ini tercatat di log aktivitas.</>}
          onYes={() => removeRec(del.rec)} onClose={() => setDel(null)} />
      )}
    </div>
  );
}
