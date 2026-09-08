import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import type { Settings, Teacher } from "../lib/types";
import { Avatar, Logo, Modal } from "../components/ui";
import { IcPrinter } from "../components/icons";

function CardBarcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    try {
      JsBarcode(ref.current as unknown as Element, value, {
        format: "CODE128", width: 1.4, height: 30, displayValue: false, margin: 0, background: "transparent", lineColor: "#16352a",
      });
    } catch { /* kode terlalu panjang dsb. */ }
  }, [value]);
  return <svg ref={ref} className="w-full h-9" />;
}

export function IdCard({ teacher, settings }: { teacher: Teacher; settings: Settings }) {
  return (
    <div className="idcard w-[85.6mm] h-[54mm] bg-white rounded-xl overflow-hidden border border-ink/15 shadow-md flex flex-col relative shrink-0">
      <span className="absolute -right-6 -top-8 w-24 h-24 rounded-full bg-pine-700/8 pointer-events-none" />
      <span className="absolute -right-2 -top-10 w-24 h-24 rounded-full border-[3px] border-amber-400/25 pointer-events-none" />

      <div className="bg-pine-900 text-white px-3 py-1.5 flex items-center gap-2 relative">
        <Logo className="w-8 h-8 ring-1 ring-amber-400/60" />
        <div className="min-w-0 flex-1">
          <p className="text-[8px] font-bold tracking-wide text-pine-200 leading-tight uppercase">{settings.school.name}</p>
          <p className="font-display font-bold text-[11px] leading-tight text-amber-300 tracking-wider">KARTU PEGAWAI · SIPEG</p>
        </div>
        <span className="w-1.5 self-stretch bg-amber-400 rounded-full" />
      </div>

      <div className="flex-1 px-3 py-2 flex items-center gap-2.5 min-h-0">
        <Avatar name={teacher.name} color={teacher.color} size="w-14 h-14 text-lg" />
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-[13px] leading-tight truncate">{teacher.name}</p>
          <p className="text-[9px] text-ink/60 font-mono mt-0.5">NIP. {teacher.nip || "—"}</p>
          <p className="text-[10px] font-bold text-pine-700 truncate">{teacher.jabatan}</p>
          <p className="text-[9px] text-ink/45 mt-0.5">NPSN {settings.school.npsn} · {settings.school.phone}</p>
        </div>
      </div>

      <div className="px-4 pb-2 pt-0.5">
        <CardBarcode value={teacher.cardId} />
        <p className="text-center font-mono text-[10px] font-bold tracking-[0.3em] text-pine-900 -mt-0.5">{teacher.cardId}</p>
      </div>
    </div>
  );
}

export function CardPrintModal({ teachers, settings, onClose }: { teachers: Teacher[]; settings: Settings; onClose: () => void }) {
  return (
    <Modal
      title={teachers.length > 1 ? `Cetak ${teachers.length} Kartu Pegawai` : "Cetak Kartu Pegawai"}
      subtitle="Ukuran CR80 (85,6 × 54 mm) · siap dipotong mengikuti garis kartu"
      onClose={onClose} width="max-w-3xl"
      footer={
        <>
          <button className="btn btn-outline btn-md" onClick={onClose}>Tutup</button>
          <button className="btn btn-primary btn-md" onClick={() => window.print()}>
            <IcPrinter className="w-4.5 h-4.5" /> Cetak Sekarang
          </button>
        </>
      }
    >
      <div className="print-area grid grid-cols-1 sm:grid-cols-2 gap-4 justify-items-center py-1">
        {teachers.map((t) => <IdCard key={t.id} teacher={t} settings={settings} />)}
      </div>
      <p className="no-print text-[11px] text-ink/45 mt-4 text-center">
        Gunakan kertas tebal (230–260 gsm) untuk hasil terbaik. Tombol cetak membuka dialog printer browser.
      </p>
    </Modal>
  );
}
