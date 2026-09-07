import React, { createContext, useContext, useEffect, useState } from "react";
import type {
  ActivityLog, AttendanceRecord, DB, PageId, Role, ScanMethod, ScanMode,
  ScanResult, Settings, Teacher, User,
} from "./types";
import {
  addDaysISO, hmToMin, hmsToMin, isLate, monthKeyOf, nowHMS, nowISO, pad2, todayISO, workdaysOfMonth,
} from "./time";

const LS_DB = "sipeg_db_v4";
const LS_SESSION = "sipeg_session_v4";

export const uid = (): string =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const LOGO_URL = "https://image.qwenlm.ai/generated-images/fa80b156-0ead-4b2e-b045-8d862462f649/_result.png";

export const AVATAR_COLORS = [
  "#2c6b51", "#b45309", "#0e7490", "#7c2d12", "#4d7c0f",
  "#a21caf", "#1d4ed8", "#be123c", "#0f766e", "#92400e",
];

export const initialsOf = (name: string): string => {
  const words = name.replace(/(dr|drs|dra|h|hj|ir|s\.?pd\.?i?|m\.?pd|s\.?kom|s\.?ag)\.?,?/gi, " ")
    .split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return ((words[0][0] || "") + (words[1]?.[0] || "")).toUpperCase();
};

export const MODE_LABEL: Record<ScanMode, string> = {
  masuk: "Jam Masuk",
  izin_keluar: "Izin Keluar",
  masuk_kembali: "Masuk Kembali",
  pulang: "Jam Pulang",
};

export const METHOD_LABEL: Record<ScanMethod, string> = {
  kartu: "Kartu RFID",
  barcode: "Barcode",
  wajah: "Wajah",
  manual: "Manual",
};

export const STATUS_META: Record<
  AttendanceRecord["status"],
  { label: string; tone: "green" | "amber" | "blue" | "red" | "slate" }
> = {
  hadir: { label: "Hadir", tone: "green" },
  terlambat: { label: "Terlambat", tone: "amber" },
  izin: { label: "Izin", tone: "blue" },
  alpha: { label: "Alpha", tone: "red" },
};

export const roleLabel: Record<Role, string> = {
  admin: "Admin",
  operator: "Operator",
  user: "User",
};

export const roleTone: Record<Role, "pine" | "amber" | "slate"> = {
  admin: "pine",
  operator: "amber",
  user: "slate",
};

export const DEFAULT_SETTINGS: Settings = {
  school: {
    name: "SMP Negeri 61 Bandung",
    shortName: "SIPEG",
    npsn: "69993612",
    phone: "(022) 720-1561",
    address: "Jl. Padasuka No. 132, Kec. Cibeunying Kidul, Kota Bandung, Jawa Barat 40125",
  },
  workHours: { start: "07:00", end: "14:30" },
  workDays: { defaultDays: [1, 2, 3, 4, 5], overrides: {} },
  signers: {
    principal: { name: "Drs. H. Asep Saepudin, M.Pd.", nip: "196708121992031004", title: "Kepala Sekolah" },
    staff: { name: "Rina Marlina, S.Pd.", nip: "198504172009022001", title: "Petugas Tata Usaha" },
  },
  logos: { app: null, print: null },
};

const rnd = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const hm = (h: number, m: number) => `${pad2(h)}:${pad2(m)}:${pad2(rnd(0, 59))}`;

export function seedDB(): DB {
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as Settings;

  const users: User[] = [
    { id: "u-admin", username: "admin", password: "admin123", name: "Administrator", role: "admin", active: true, createdAt: nowISO() },
    { id: "u-oper", username: "operator", password: "operator123", name: "Operator Sekolah", role: "operator", active: true, createdAt: nowISO() },
    { id: "u-user1", username: "user1", password: "user123", name: "User 1", role: "user", active: true, createdAt: nowISO() },
  ];

  const T = (name: string, nip: string, jabatan: string, n: number, active = true): Teacher => ({
    id: `t-${n}`, name, nip, jabatan,
    cardId: `SPG-${String(n).padStart(4, "0")}`,
    faceId: null, color: AVATAR_COLORS[(n - 1) % AVATAR_COLORS.length], active,
  });

  const teachers: Teacher[] = [
    T("Dra. Hj. Euis Komariah", "197103051995122001", "Guru Bahasa Indonesia", 1),
    T("Asep Sunandar, S.Pd.", "197804122003121002", "Guru Matematika", 2),
    T("Rina Marlina, S.Pd.", "198504172009022001", "Guru Bahasa Inggris", 3),
    T("Dedi Kurniawan, S.Pd.I.", "198209102008011007", "Guru Pendidikan Agama Islam", 4),
    T("Lilis Suryani, S.Pd.", "198711232011012003", "Guru IPA", 5),
    T("Budi Hartono, S.Pd.", "197906152005011009", "Guru IPS", 6),
    T("Nia Kurniasih, S.Pd.", "199002142015032004", "Guru PJOK", 7),
    T("Agus Permana, S.Kom.", "199108302019031005", "Guru Informatika", 8),
    T("Dewi Anggraeni, S.Pd.", "199305192020122006", "Guru Seni Budaya", 9),
    T("Yusuf Maulana, S.Pd.", "199407212022211008", "Guru Bahasa Sunda", 10),
    T("Cucu Sumiati, S.Pd.", "196912101994032007", "Guru Prakarya", 11, false),
  ];

  const records: AttendanceRecord[] = [];
  const today = todayISO();
  const monthKey = monthKeyOf(today);
  const days = workdaysOfMonth(monthKey, settings).filter((d) => d <= today);

  days.forEach((date, di) => {
    const isToday = date === today;
    teachers.forEach((t, ti) => {
      if (!t.active) return;
      if (isToday && ti % 3 === 2) return;
      if (!isToday && (ti + di) % 17 === 5) return;
      const late = (ti * 7 + di * 13) % 10 === 3;
      const izin = !isToday && (ti + di) % 11 === 4;
      const rec: AttendanceRecord = {
        id: uid(),
        teacherId: t.id,
        date,
        timeIn: late ? hm(7, rnd(6, 32)) : hm(6, rnd(35, 59)),
        timeOut: isToday ? null : hm(14, rnd(30, 55)),
        izinKeluar: izin ? hm(9, rnd(0, 40)) : null,
        masukKembali: izin ? hm(10, rnd(10, 50)) : null,
        method: (["kartu", "barcode", "wajah"] as ScanMethod[])[(ti + di) % 3],
        status: late ? "terlambat" : "hadir",
        note: "",
        updatedAt: nowISO(),
      };
      records.push(rec);
    });
  });

  const logs: ActivityLog[] = [
    { id: uid(), time: nowISO(), actor: "Sistem", type: "system", action: "Inisialisasi", detail: "Data contoh SIPEG dimuat" },
  ];

  return { users, teachers, records, logs, settings };
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(LS_DB);
    if (raw) {
      const db = JSON.parse(raw) as DB;
      if (db && Array.isArray(db.users) && Array.isArray(db.teachers) && db.settings) {
        if (!db.settings.logos) db.settings.logos = { app: null, print: null };
        return { ...db, settings: { ...DEFAULT_SETTINGS, ...db.settings } };
      }
    }
  } catch {
    /* rusak -> seed ulang */
  }
  return seedDB();
}

export function pushLog(d: DB, actor: string, type: ActivityLog["type"], action: string, detail: string) {
  d.logs.unshift({ id: uid(), time: nowISO(), actor, type, action, detail });
  if (d.logs.length > 300) d.logs.length = 300;
}

export function applyScan(
  d: DB, teacherId: string, mode: ScanMode, method: ScanMethod, actor: string,
): ScanResult {
  const t = d.teachers.find((x) => x.id === teacherId);
  if (!t) return { ok: false, message: "Pegawai tidak ditemukan." };
  if (!t.active) return { ok: false, message: `${t.name} berstatus nonaktif.` };

  const date = todayISO();
  const time = nowHMS();
  let rec = d.records.find((r) => r.teacherId === teacherId && r.date === date);
  if (!rec) {
    rec = {
      id: uid(), teacherId, date, timeIn: null, timeOut: null,
      izinKeluar: null, masukKembali: null, method, status: "hadir",
      note: "", updatedAt: nowISO(),
    };
    d.records.push(rec);
  }

  const fail = (message: string): ScanResult => ({ ok: false, message });

  switch (mode) {
    case "masuk":
      if (rec.timeIn) return fail(`${t.name} sudah presensi masuk pukul ${rec.timeIn.slice(0, 5)}.`);
      rec.timeIn = time;
      rec.method = method;
      rec.status = isLate(time, d.settings.workHours.start) ? "terlambat" : "hadir";
      break;
    case "izin_keluar":
      if (!rec.timeIn) return fail(`${t.name} belum presensi masuk hari ini.`);
      if (rec.izinKeluar) return fail(`${t.name} sudah mencatat izin keluar pukul ${rec.izinKeluar.slice(0, 5)}.`);
      rec.izinKeluar = time;
      break;
    case "masuk_kembali":
      if (!rec.izinKeluar) return fail(`${t.name} belum memiliki izin keluar.`);
      if (rec.masukKembali) return fail(`${t.name} sudah masuk kembali pukul ${rec.masukKembali.slice(0, 5)}.`);
      rec.masukKembali = time;
      break;
    case "pulang":
      if (!rec.timeIn) return fail(`${t.name} belum presensi masuk hari ini.`);
      if (rec.timeOut) return fail(`${t.name} sudah presensi pulang pukul ${rec.timeOut.slice(0, 5)}.`);
      rec.timeOut = time;
      break;
  }

  rec.updatedAt = nowISO();
  pushLog(d, actor, "scan", MODE_LABEL[mode], `${t.name} · ${time.slice(0, 5)} · ${METHOD_LABEL[method]}`);
  return { ok: true, message: `${MODE_LABEL[mode]} berhasil — ${t.name} pukul ${time.slice(0, 5)}.`, teacherId, mode, time };
}

export interface DailyRow {
  teacher: Teacher;
  rec: AttendanceRecord | null;
}

export const computeDailyRows = (db: DB, date: string): DailyRow[] =>
  db.teachers
    .filter((t) => t.active)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((teacher) => ({
      teacher,
      rec: db.records.find((r) => r.teacherId === teacher.id && r.date === date) ?? null,
    }));

export interface MonthlyRow {
  teacher: Teacher;
  hadir: number;
  terlambat: number;
  izin: number;
  alpha: number;
  totalMin: number;
  rate: number;
}

export const computeMonthly = (db: DB, key: string): { rows: MonthlyRow[]; workdays: string[] } => {
  const workdays = workdaysOfMonth(key, db.settings);
  const today = todayISO();
  const pastWorkdays = workdays.filter((d) => d <= today).length;

  const rows: MonthlyRow[] = db.teachers
    .filter((t) => t.active)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((teacher) => {
      const recs = db.records.filter((r) => r.teacherId === teacher.id && monthKeyOf(r.date) === key);
      const hadir = recs.filter((r) => r.timeIn && r.status === "hadir").length;
      const terlambat = recs.filter((r) => r.timeIn && r.status === "terlambat").length;
      const izin = recs.filter((r) => r.status === "izin").length;
      const attended = recs.filter((r) => r.timeIn || r.status === "izin").length;
      const alpha = Math.max(0, pastWorkdays - attended);
      const totalMin = recs.reduce((acc, r) => acc + (r.timeIn ? (hmsToMin(r.timeOut || `${db.settings.workHours.end}:00`) - hmsToMin(r.timeIn)) : 0), 0);
      const rate = pastWorkdays === 0 ? 100 : Math.round((attended / pastWorkdays) * 100);
      return { teacher, hadir, terlambat, izin, alpha, totalMin, rate };
    });

  return { rows, workdays };
};

interface StoreValue {
  db: DB;
  update: (fn: (d: DB) => void) => void;
  currentUser: User | null;
  login: (username: string, password: string) => { ok: boolean; message?: string };
  logout: () => void;
  page: PageId;
  nav: (p: PageId) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export const NAV_BY_ROLE: Record<Role, { id: PageId; label: string }[]> = {
  admin: [
    { id: "dashboard", label: "Mesin Presensi" },
    { id: "teachers", label: "Data Guru" },
    { id: "recap-daily", label: "Rekap Harian" },
    { id: "recap-monthly", label: "Rekap Bulanan" },
    { id: "admin", label: "Admin Pengguna" },
    { id: "settings", label: "Pengaturan" },
    { id: "aktivitas", label: "Aktivitas" },
  ],
  operator: [
    { id: "dashboard", label: "Mesin Presensi" },
    { id: "teachers", label: "Data Guru" },
    { id: "recap-daily", label: "Rekap Harian" },
    { id: "recap-monthly", label: "Rekap Bulanan" },
    { id: "operator", label: "Panel Operator" },
    { id: "settings", label: "Pengaturan" },
    { id: "aktivitas", label: "Aktivitas" },
  ],
  user: [
    { id: "dashboard", label: "Mesin Presensi" },
    { id: "aktivitas", label: "Aktivitas" },
  ],
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(loadDB);
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem(LS_SESSION));
  const [page, setPage] = useState<PageId>("dashboard");

  useEffect(() => {
    localStorage.setItem(LS_DB, JSON.stringify(db));
  }, [db]);

  const currentUser = db.users.find((u) => u.id === sessionId && u.active) ?? null;

  const update = (fn: (d: DB) => void) => {
    setDb((prev) => {
      const draft = JSON.parse(JSON.stringify(prev)) as DB;
      fn(draft);
      return draft;
    });
  };

  const login = (username: string, password: string) => {
    const u = db.users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
    if (!u || u.password !== password) return { ok: false, message: "Username atau password salah." };
    if (!u.active) return { ok: false, message: "Akun ini dinonaktifkan. Hubungi admin." };
    localStorage.setItem(LS_SESSION, u.id);
    setSessionId(u.id);
    setPage("dashboard");
    update((d) => pushLog(d, u.name, "auth", "Login", `${u.name} masuk sebagai ${roleLabel[u.role]}`));
    return { ok: true };
  };

  const logout = () => {
    if (currentUser) update((d) => pushLog(d, currentUser.name, "auth", "Logout", `${currentUser.name} keluar dari aplikasi`));
    localStorage.removeItem(LS_SESSION);
    setSessionId(null);
    setPage("dashboard");
  };

  const nav = (p: PageId) => {
    const allowed = currentUser ? NAV_BY_ROLE[currentUser.role].map((n) => n.id) : [];
    setPage(allowed.includes(p) ? p : "dashboard");
  };

  return (
    <StoreContext.Provider value={{ db, update, currentUser, login, logout, page, nav }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error("useStore harus dipakai di dalam StoreProvider");
  return v;
}

export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export const genCardId = (db: DB): string => {
  let n = db.teachers.length + 1;
  let id = `SPG-${String(n).padStart(4, "0")}`;
  while (db.teachers.some((t) => t.cardId === id)) {
    n += 1;
    id = `SPG-${String(n).padStart(4, "0")}`;
  }
  return id;
};

export { hmToMin, hmsToMin, addDaysISO };
