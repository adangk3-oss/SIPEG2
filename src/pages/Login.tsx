import React, { useState } from "react";
import { useStore, useNow } from "../lib/data";
import { fmtDateID, pad2 } from "../lib/time";
import { IcEye, IcEyeOff, IcLock, IcAlert } from "../components/icons";
import { Logo, useToast } from "../components/ui";

export default function Login() {
  const { db, login } = useStore();
  const toast = useToast();
  const now = useNow();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const s = db.settings.school;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErr(null);
    setLoading(true);
    setTimeout(() => {
      const res = login(username, password);
      if (!res.ok) {
        setErr(res.message || "Gagal masuk.");
        setShakeKey((k) => k + 1);
        setLoading(false);
      } else {
        toast.push({ type: "success", title: "Berhasil masuk", sub: "Selamat bertugas di SIPEG." });
      }
    }, 550);
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col w-[46%] bg-pine-950 text-pine-100 relative overflow-hidden">
        <div className="absolute inset-0 grid-weave" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-pine-700/25 blur-3xl" />
        <div className="absolute bottom-0 -left-24 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative flex-1 flex flex-col justify-center px-12 py-10">
          <div className="flex items-center gap-4 anim-fade-up">
            <Logo className="w-20 h-20 ring-4 ring-amber-400/40" />
            <div>
              <p className="font-display font-bold text-5xl text-white tracking-tight leading-none">SIPEG</p>
              <p className="text-amber-300 font-bold text-sm tracking-[0.2em] uppercase mt-1.5">Sistem Presensi Guru</p>
            </div>
          </div>

          <h1 className="font-display font-bold text-3xl text-white mt-9 leading-snug anim-fade-up" style={{ animationDelay: "80ms" }}>
            {s.name}
          </h1>
          <p className="text-pine-300/80 text-sm mt-2 anim-fade-up" style={{ animationDelay: "140ms" }}>
            {s.address}
          </p>

          <div className="mt-10 grid grid-cols-3 gap-3 anim-fade-up" style={{ animationDelay: "200ms" }}>
            {[
              { k: "NPSN", v: s.npsn },
              { k: "Telepon", v: s.phone },
              { k: "Aplikasi", v: s.shortName },
            ].map((x) => (
              <div key={x.k} className="rounded-lg bg-white/6 border border-white/10 px-3.5 py-2.5">
                <p className="text-[10px] font-extrabold tracking-widest text-pine-300/70 uppercase">{x.k}</p>
                <p className="font-display font-bold text-white text-sm mt-0.5 truncate">{x.v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative px-12 py-5 border-t border-white/10 text-[11px] text-pine-300/70">
          © {new Date().getFullYear()} {s.name} · <span className="text-amber-400/80 font-semibold">@ Dunk-3</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="lg:hidden flex items-center gap-3 px-5 h-16 border-b border-ink/10 bg-white">
          <Logo className="w-10 h-10 ring-2 ring-amber-400/40" />
          <div>
            <p className="font-display font-bold text-lg leading-none">{s.shortName}</p>
            <p className="text-[10px] text-ink/50 truncate max-w-[220px]">{s.name}</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 py-8">
          <div className="w-full max-w-md anim-fade-up">
            <div className="lg:hidden mb-6 text-center">
              <p className="font-display font-bold text-3xl text-pine-900">{s.name}</p>
              <p className="text-sm text-ink/50 mt-1">Sistem Presensi Guru</p>
            </div>

            <div className="panel p-7">
              <h2 className="font-display font-bold text-2xl text-pine-900">Masuk ke Akun</h2>
              <p className="text-sm text-ink/50 mt-1">Gunakan akun yang diberikan administrator.</p>

              <form onSubmit={submit} className="mt-6 space-y-4" key={shakeKey}>
                <div>
                  <label className="label">Username</label>
                  <input className="input" placeholder="cth: admin" value={username}
                    onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
                </div>
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input className="input pr-11" type={show ? "text" : "password"} placeholder="••••••••"
                      value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                    <button type="button" onClick={() => setShow((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center text-ink/40 hover:text-ink hover:bg-ink/5">
                      {show ? <IcEyeOff className="w-4.5 h-4.5" /> : <IcEye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {err && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-600/10 border border-red-600/25 px-3.5 py-2.5 text-sm text-red-700 font-semibold anim-shake">
                    <IcAlert className="w-4.5 h-4.5 shrink-0" /> {err}
                  </div>
                )}

                <button type="submit" disabled={loading || !username || !password}
                  className="btn btn-primary btn-lg w-full disabled:opacity-50 disabled:cursor-not-allowed">
                  <IcLock className="w-4.5 h-4.5" />
                  {loading ? "Memverifikasi…" : "Masuk"}
                </button>
              </form>
            </div>

            <p className="text-center text-[11px] text-ink/40 mt-5">
              © {new Date().getFullYear()} {s.name} · <span className="text-pine-700 font-semibold">@ Dunk-3</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
