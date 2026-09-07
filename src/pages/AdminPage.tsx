import React, { useState } from "react";
import { pushLog, roleLabel, uid, useStore } from "../lib/data";
import type { Role, User } from "../lib/types";
import { IcPencil, IcPlus, IcShield, IcTrash, IcUsers } from "../components/icons";
import { Avatar, Badge, Confirm, EmptyState, Field, Modal, useToast } from "../components/ui";

export default function AdminPage() {
  const { db, update, currentUser } = useStore();
  const toast = useToast();
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<User | null>(null);
  const [del, setDel] = useState<User | null>(null);
  const [form, setForm] = useState({ username: "", password: "", name: "", role: "user" as Role });

  const openAdd = () => { setEdit(null); setForm({ username: "", password: "", name: "", role: "user" }); setShow(true); };
  const openEdit = (u: User) => { setEdit(u); setForm({ username: u.username, password: u.password, name: u.name, role: u.role }); setShow(true); };

  const save = () => {
    if (!form.username.trim() || !form.password || !form.name.trim()) {
      toast.push({ type: "error", title: "Lengkapi semua field" });
      return;
    }
    if (edit) {
      update((d) => {
        const u = d.users.find((x) => x.id === edit.id);
        if (u) { Object.assign(u, form); pushLog(d, currentUser?.name || "Admin", "edit", "Edit Pengguna", u.name); }
      });
      toast.push({ type: "success", title: "Pengguna diperbarui", sub: form.name });
    } else {
      if (db.users.some((u) => u.username.toLowerCase() === form.username.toLowerCase())) {
        toast.push({ type: "error", title: "Username sudah dipakai" });
        return;
      }
      const newUser: User = { id: uid(), ...form, active: true, createdAt: new Date().toISOString() };
      update((d) => { d.users.push(newUser); pushLog(d, currentUser?.name || "Admin", "edit", "Tambah Pengguna", newUser.name); });
      toast.push({ type: "success", title: "Pengguna ditambahkan", sub: `${newUser.name} · @${newUser.username}` });
    }
    setShow(false);
  };

  const remove = (u: User) => {
    if (u.id === currentUser?.id) { toast.push({ type: "error", title: "Tidak dapat menghapus akun sendiri" }); return; }
    update((d) => { d.users = d.users.filter((x) => x.id !== u.id); pushLog(d, currentUser?.name || "Admin", "edit", "Hapus Pengguna", u.name); });
    toast.push({ type: "info", title: "Pengguna dihapus", sub: u.name });
  };

  const toggleActive = (u: User) => {
    if (u.id === currentUser?.id) { toast.push({ type: "error", title: "Tidak dapat menonaktifkan akun sendiri" }); return; }
    update((d) => { const x = d.users.find((y) => y.id === u.id); if (x) x.active = !x.active; });
    toast.push({ type: "info", title: u.active ? "Akun dinonaktifkan" : "Akun diaktifkan", sub: u.name });
  };

  return (
    <div className="space-y-4">
      <div className="panel p-4 flex flex-wrap items-center gap-3 anim-fade-up">
        <div className="flex items-center gap-2">
          <IcShield className="w-5 h-5 text-pine-600" />
          <h3 className="font-display font-bold">Manajemen Pengguna</h3>
        </div>
        <button className="btn btn-primary btn-md ml-auto" onClick={openAdd}>
          <IcPlus className="w-4.5 h-4.5" /> Tambah Pengguna
        </button>
      </div>

      <div className="panel overflow-hidden anim-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="px-5 py-3.5 border-b border-ink/8">
          <h3 className="font-display font-bold flex items-center gap-2"><IcUsers className="w-4.5 h-4.5 text-pine-600" /> Daftar Pengguna ({db.users.length})</h3>
        </div>
        {db.users.length === 0 ? (
          <EmptyState icon={<IcUsers className="w-7 h-7" />} title="Belum ada pengguna" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-paper/80">
                <tr>
                  <th className="th">Pengguna</th>
                  <th className="th">Username</th>
                  <th className="th">Peran</th>
                  <th className="th">Status</th>
                  <th className="th text-right pr-5">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {db.users.map((u) => (
                  <tr key={u.id} className="hover:bg-pine-50/60 transition-colors">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} color="#245742" size="w-9 h-9 text-[11px]" />
                        <p className="font-bold text-[13px]">{u.name}</p>
                      </div>
                    </td>
                    <td className="td font-mono text-[12px]">@{u.username}</td>
                    <td className="td"><Badge tone={u.role === "admin" ? "pine" : u.role === "operator" ? "amber" : "slate"}>{roleLabel[u.role]}</Badge></td>
                    <td className="td"><Badge tone={u.active ? "green" : "slate"}>{u.active ? "Aktif" : "Nonaktif"}</Badge></td>
                    <td className="td">
                      <div className="flex justify-end gap-1.5 pr-2">
                        <button title={u.active ? "Nonaktifkan" : "Aktifkan"} onClick={() => toggleActive(u)} className="btn btn-ghost btn-sm px-2 hover:!text-pine-700">
                          <IcShield className="w-4 h-4" />
                        </button>
                        <button title="Edit" onClick={() => openEdit(u)} className="btn btn-ghost btn-sm px-2 hover:!text-pine-700"><IcPencil className="w-4 h-4" /></button>
                        <button title="Hapus" onClick={() => setDel(u)} className="btn btn-ghost btn-sm px-2 hover:!text-red-600"><IcTrash className="w-4 h-4" /></button>
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
        <Modal title={edit ? "Edit Pengguna" : "Tambah Pengguna Baru"} onClose={() => setShow(false)}
          footer={
            <>
              <button className="btn btn-outline btn-md" onClick={() => setShow(false)}>Batal</button>
              <button className="btn btn-primary btn-md" onClick={save}>Simpan</button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Nama Lengkap"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
            <Field label="Username"><input className="input font-mono" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
            <Field label="Password"><input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            <Field label="Peran">
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="admin">Admin — Akses penuh</option>
                <option value="operator">Operator — Presensi & rekap</option>
                <option value="user">User — Hanya presensi & aktivitas</option>
              </select>
            </Field>
          </div>
        </Modal>
      )}

      {del && (
        <Confirm title="Hapus Pengguna" message={<>Pengguna <b>{del.name}</b> akan dihapus permanen.</>}
          onYes={() => remove(del)} onClose={() => setDel(null)} />
      )}
    </div>
  );
}
