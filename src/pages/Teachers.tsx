import React, { useState } from "react";
import { AVATAR_COLORS, genCardId, pushLog, uid, useStore } from "../lib/data";
import type { Teacher } from "../lib/types";
import { IcCheck, IcFace, IcIdCard, IcPencil, IcPrinter, IcRefresh, IcSearch, IcTrash, IcUserPlus, IcUsers, IcX } from "../components/icons";
import { Avatar, Badge, Confirm, EmptyState, Field, Modal, useToast } from "../components/ui";
import { CardPrintModal } from "./BarcodeCard";
import { FaceEnrollModal } from "../components/ScannerModals";

export default function Teachers() {
  const { db, update, currentUser } = useStore();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<Teacher | null>(null);
  const [del, setDel] = useState<Teacher | null>(null);
  const [printTeachers, setPrintTeachers] = useState<Teacher[] | null>(null);
  const [form, setForm] = useState({ name: "", nip: "", jabatan: "" });
  const [enrollTeacher, setEnrollTeacher] = useState<Teacher | null>(null);

  const filtered = db.teachers.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.nip.includes(search) ||
    t.cardId.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEdit(null);
    setForm({ name: "", nip: "", jabatan: "" });
    setShow(true);
  };

  const openEdit = (t: Teacher) => {
    setEdit(t);
    setForm({ name: t.name, nip: t.nip, jabatan: t.jabatan });
    setShow(true);
  };

  const addTeacher = (): Teacher | null => {
    if (!form.name.trim()) {
      toast.push({ type: "error", title: "Nama wajib diisi" });
      return null;
    }
    
    const newT: Teacher = {
      id: uid(), 
      name: form.name.trim(), 
      nip: form.nip.trim(), 
      jabatan: form.jabatan.trim(),
      cardId: genCardId(db), 
      faceId: null, 
      color: AVATAR_COLORS[db.teachers.length % AVATAR_COLORS.length], 
      active: true,
    };
    
    update((d) => {
      d.teachers.push(newT);
      pushLog(d, currentUser?.name || "Admin", "edit", "Tambah Guru", newT.name);
    });
    
    toast.push({ type: "success", title: "Guru ditambahkan", sub: `${newT.name} · ${newT.cardId}` });
    setShow(false);
    
    return newT;
  };

  const save = (withFaceScan = false) => {
    if (!form.name.trim()) {
      toast.push({ type: "error", title: "Nama wajib diisi" });
      return;
    }
    if (edit) {
      update((d) => {
        const t = d.teachers.find((x) => x.id === edit.id);
        if (t) {
          t.name = form.name.trim();
          t.nip = form.nip.trim();
          t.jabatan = form.jabatan.trim();
          pushLog(d, currentUser?.name || "Admin", "edit", "Edit Guru", t.name);
        }
      });
      toast.push({ type: "success", title: "Data guru diperbarui", sub: form.name });
      setShow(false);
    } else {
      const newTeacher = addTeacher();
      if (withFaceScan && newTeacher) {
        // Langsung buka modal scan wajah setelah guru ditambahkan
        setTimeout(() => setEnrollTeacher(newTeacher), 300);
      }
    }
  };

  const remove = (t: Teacher) => {
    update((d) => {
      d.teachers = d.teachers.filter((x) => x.id !== t.id);
      pushLog(d, currentUser?.name || "Admin", "edit", "Hapus Guru", t.name);
    });
    toast.push({ type: "info", title: "Guru dihapus", sub: t.name });
  };

  const toggleActive = (t: Teacher) => {
    update((d) => {
      const x = d.teachers.find((y) => y.id === t.id);
      if (x) x.active = !x.active;
    });
    toast.push({ type: "info", title: t.active ? "Guru dinonaktifkan" : "Guru diaktifkan", sub: t.name });
  };

  return (
    <div className="space-y-4">
      <div className="panel p-4 flex flex-wrap items-center gap-3 anim-fade-up">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <IcSearch className="w-4.5 h-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
          <input className="input pl-10" placeholder="Cari nama, NIP, atau kode kartu…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-md ml-auto" onClick={openAdd}>
          <IcUserPlus className="w-4.5 h-4.5" /> Tambah Guru
        </button>
        <button className="btn btn-outline btn-md" onClick={() => setPrintTeachers(db.teachers.filter((t) => t.active))} disabled={!db.teachers.some((t) => t.active)}>
          <IcPrinter className="w-4.5 h-4.5" /> Cetak Kartu
        </button>
      </div>

      <div className="panel overflow-hidden anim-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="px-5 py-3.5 border-b border-ink/8 flex items-center justify-between">
          <h3 className="font-display font-bold flex items-center gap-2">
            <IcUsers className="w-4.5 h-4.5 text-pine-600" /> Data Guru ({filtered.length})
          </h3>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<IcUsers className="w-7 h-7" />} title="Tidak ada guru" sub={search ? "Coba kata kunci lain." : "Tambahkan guru baru."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-paper/80">
                <tr>
                  <th className="th">Pegawai</th>
                  <th className="th">NIP</th>
                  <th className="th">Jabatan</th>
                  <th className="th">Kode Kartu</th>
                  <th className="th">Status</th>
                  <th className="th text-right pr-5">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-pine-50/60 transition-colors">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={t.name} color={t.color} size="w-9 h-9 text-[11px]" />
                        <p className="font-bold text-[13px] leading-tight">{t.name}</p>
                      </div>
                    </td>
                    <td className="td font-mono text-[12px]">{t.nip || "—"}</td>
                    <td className="td text-[12px]">{t.jabatan}</td>
                    <td className="td font-mono text-[12px] font-bold text-pine-700">{t.cardId}</td>
                    <td className="td">
                      <Badge tone={t.active ? "green" : "slate"}>{t.active ? "Aktif" : "Nonaktif"}</Badge>
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1.5 pr-2">
                        <button title={t.faceId ? "Perbarui wajah" : "Daftarkan wajah"} onClick={() => setEnrollTeacher(t)}
                          className={`btn btn-ghost btn-sm px-2 ${t.faceId ? "hover:!text-emerald-600" : "hover:!text-amber-600"}`}>
                          <IcFace className="w-4 h-4" />
                        </button>
                        <button title={t.active ? "Nonaktifkan" : "Aktifkan"} onClick={() => toggleActive(t)}
                          className="btn btn-ghost btn-sm px-2 hover:!text-pine-700">
                          <IcRefresh className="w-4 h-4" />
                        </button>
                        <button title="Edit" onClick={() => openEdit(t)} className="btn btn-ghost btn-sm px-2 hover:!text-pine-700">
                          <IcPencil className="w-4 h-4" />
                        </button>
                        <button title="Cetak kartu" onClick={() => setPrintTeachers([t])} className="btn btn-ghost btn-sm px-2 hover:!text-pine-700">
                          <IcIdCard className="w-4 h-4" />
                        </button>
                        <button title="Hapus" onClick={() => setDel(t)} className="btn btn-ghost btn-sm px-2 hover:!text-red-600">
                          <IcTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {show && (
        <Modal title={edit ? "Edit Guru" : "Tambah Guru Baru"} onClose={() => setShow(false)}
          footer={
            edit ? (
              <>
                <button className="btn btn-outline btn-md" onClick={() => setShow(false)}>Batal</button>
                <button className="btn btn-primary btn-md" onClick={() => save()}>
                  <IcCheck className="w-4.5 h-4.5" /> Simpan
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-outline btn-md" onClick={() => setShow(false)}>Batal</button>
                <button className="btn btn-primary btn-md" onClick={() => save(false)}>
                  <IcCheck className="w-4.5 h-4.5" /> Tambahkan
                </button>
                <button className="btn btn-gold btn-md" onClick={() => save(true)}>
                  <IcFace className="w-4.5 h-4.5" /> Simpan & Scan Wajah
                </button>
              </>
            )
          }
        >
          <div className="space-y-4">
            <Field label="Nama Lengkap & Gelar">
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </Field>
            <Field label="NIP">
              <input className="input font-mono" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} />
            </Field>
            <Field label="Jabatan">
              <input className="input" value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} />
            </Field>
            {!edit && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <p className="font-bold mb-1">💡 Tips:</p>
                <p>Klik <b>"Tambahkan"</b> untuk menyimpan data saja, atau <b>"Simpan & Scan Wajah"</b> untuk langsung mendaftarkan wajah guru setelah data disimpan.</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {del && (
        <Confirm title="Hapus Guru" message={<>Guru <b>{del.name}</b> akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</>}
          onYes={() => remove(del)} onClose={() => setDel(null)} />
      )}

      {printTeachers && <CardPrintModal teachers={printTeachers} settings={db.settings} onClose={() => setPrintTeachers(null)} />}

      {enrollTeacher && (
        <FaceEnrollModal
          teacher={enrollTeacher}
          onClose={() => setEnrollTeacher(null)}
          onEnrolled={(dataUrl) => {
            update((d) => {
              const t = d.teachers.find((x) => x.id === enrollTeacher.id);
              if (t) {
                t.faceId = dataUrl;
                pushLog(d, currentUser?.name || "Admin", "edit", "Daftar Wajah", t.name);
              }
            });
            toast.push({ type: "success", title: "Wajah terdaftar", sub: enrollTeacher.name });
            setEnrollTeacher(null);
          }}
        />
      )}
    </div>
  );
}
