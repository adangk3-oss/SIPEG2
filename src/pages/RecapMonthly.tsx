import React, { useMemo, useState } from "react";
import { computeMonthly, STATUS_META, useStore } from "../lib/data";
import { fmtDur, fmtMonthID, monthKeyOf, monthShift, todayISO } from "../lib/time";
import { exportCSV, exportXLS, printReport } from "../lib/export";
import { IcChevronL, IcChevronR, IcFileCsv, IcFilePdf, IcFileXls, IcUsers } from "../components/icons";
import { Avatar, Badge, EmptyState, useToast } from "../components/ui";

export default function RecapMonthly() {
  const { db, currentUser } = useStore();
  const toast = useToast();
  const [monthKey, setMonthKey] = useState(monthKeyOf(todayISO()));
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  const s = db.settings;
  const { rows, workdays } = useMemo(() => computeMonthly(db, monthKey), [db, monthKey]);
  const totalHadir = rows.reduce((a, r) => a + r.hadir + r.terlambat, 0);
  const totalAlpha = rows.reduce((a, r) => a + r.alpha, 0);

  const doCSV = () => {
    exportCSV(`rekap-bulanan-${monthKey}.csv`, ["No", "Nama", "NIP", "Hadir", "Terlambat", "Izin", "Alpha", "Total Menit", "Persentase"],
      rows.map((r, i) => [i + 1, r.teacher.name, r.teacher.nip || "-", r.hadir, r.terlambat, r.izin, r.alpha, fmtDur(r.totalMin), `${r.rate}%`]));
    toast.push({ type: "success", title: "CSV diunduh", sub: `rekap-bulanan-${monthKey}.csv` });
  };

  const doXLS = () => {
    exportXLS(`rekap-bulanan-${monthKey}.xls`, `Rekap Bulanan — ${fmtMonthID(monthKey)}`,
      ["No", "Nama", "NIP", "Hadir", "Terlambat", "Izin", "Alpha", "Durasi", "%"],
      rows.map((r, i) => [i + 1, r.teacher.name, r.teacher.nip || "-", r.hadir, r.terlambat, r.izin, r.alpha, fmtDur(r.totalMin), `${r.rate}%`]));
    toast.push({ type: "success", title: "Excel diunduh" });
  };

  const doPDF = () => {
    const teacher = db.teachers.find((t) => t.id === selectedTeacherId);
    const filteredRows = teacher ? rows.filter((r) => r.teacher.id === teacher.id) : rows;
    const rightSigner = teacher ? { name: teacher.name, nip: teacher.nip, title: teacher.jabatan } : { ...s.signers.staff };
    const ok = printReport({
      settings: s, title: "Rekap Presensi Bulanan", subtitle: fmtMonthID(monthKey),
      columns: ["No", "Nama", "Hadir", "Terlambat", "Izin", "Alpha", "Durasi", "%"],
      rows: filteredRows.map((r, i) => [i + 1, `${r.teacher.name}<br/><span style="font-size:10px;color:#666">NIP. ${r.teacher.nip || "-"}</span>`, r.hadir, r.terlambat, r.izin, r.alpha, fmtDur(r.totalMin), `${r.rate}%`]),
      rightSigner,
      note: `${workdays.length} hari kerja · Dicetak ${fmtMonthID(monthKey)} oleh ${currentUser?.name}`,
    });
    if (ok) toast.push({ type: "success", title: "PDF disiapkan" });
    else toast.push({ type: "error", title: "Popup diblokir" });
  };

  return (
    <div className="space-y-4">
      <div className="panel p-4 flex flex-wrap items-center gap-3 anim-fade-up">
        <div className="flex items-center gap-1.5">
          <button className="btn btn-outline btn-md px-2.5" onClick={() => setMonthKey(monthShift(monthKey, -1))}><IcChevronL className="w-4.5 h-4.5" /></button>
          <input type="month" className="input w-[160px] font-semibold" value={monthKey} onChange={(e) => e.target.value && setMonthKey(e.target.value)} />
          <button className="btn btn-outline btn-md px-2.5" onClick={() => setMonthKey(monthShift(monthKey, 1))}><IcChevronR className="w-4.5 h-4.5" /></button>
        </div>
        <Badge tone="pine">{workdays.length} hari kerja</Badge>
        <select className="input w-[200px]" value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}>
          <option value="">Semua Guru</option>
          {db.teachers.filter((t) => t.active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <button className="btn btn-outline btn-md" onClick={doPDF}><IcFilePdf className="w-4.5 h-4.5 text-red-600" /> PDF</button>
          <button className="btn btn-outline btn-md" onClick={doCSV}><IcFileCsv className="w-4.5 h-4.5 text-pine-600" /> CSV</button>
          <button className="btn btn-outline btn-md" onClick={doXLS}><IcFileXls className="w-4.5 h-4.5 text-emerald-600" /> Excel</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 anim-fade-up" style={{ animationDelay: "50ms" }}>
        {[
          { l: "Total Hadir", v: totalHadir, c: "border-emerald-600/25 text-emerald-700 bg-emerald-600/6" },
          { l: "Total Alpha", v: totalAlpha, c: "border-red-600/25 text-red-700 bg-red-600/6" },
          { l: "Jumlah Guru", v: rows.length, c: "border-pine-700/25 text-pine-700 bg-pine-700/6" },
          { l: "Rata-rata %", v: rows.length ? `${Math.round(rows.reduce((a, r) => a + r.rate, 0) / rows.length)}%` : "0%", c: "border-amber-500/30 text-amber-700 bg-amber-500/8" },
        ].map((x) => (
          <div key={x.l} className={`rounded-xl border px-4 py-3 ${x.c}`}>
            <p className="font-display font-bold text-2xl tabular-nums">{x.v}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">{x.l}</p>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden anim-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="px-5 py-3.5 border-b border-ink/8 flex items-center justify-between">
          <h3 className="font-display font-bold">{fmtMonthID(monthKey)}</h3>
          <Badge tone="pine">{rows.length} pegawai</Badge>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<IcUsers className="w-7 h-7" />} title="Belum ada data guru" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-paper/80">
                <tr>
                  <th className="th">Pegawai</th>
                  <th className="th">Hadir</th>
                  <th className="th">Terlambat</th>
                  <th className="th">Izin</th>
                  <th className="th">Alpha</th>
                  <th className="th">Durasi</th>
                  <th className="th">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.teacher.id} className="hover:bg-pine-50/60 transition-colors">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.teacher.name} color={r.teacher.color} size="w-8 h-8 text-[10px]" />
                        <div>
                          <p className="font-bold text-[13px] leading-tight">{r.teacher.name}</p>
                          <p className="text-[10px] text-ink/40">{r.teacher.jabatan}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td font-mono text-[13px] font-semibold text-emerald-600">{r.hadir}</td>
                    <td className="td font-mono text-[13px] font-semibold text-amber-600">{r.terlambat}</td>
                    <td className="td font-mono text-[13px] font-semibold text-sky-600">{r.izin}</td>
                    <td className="td font-mono text-[13px] font-semibold text-red-600">{r.alpha}</td>
                    <td className="td text-[12px] font-bold text-pine-700">{fmtDur(r.totalMin)}</td>
                    <td className="td">
                      <Badge tone={r.rate >= 90 ? "green" : r.rate >= 75 ? "amber" : "red"}>{r.rate}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
