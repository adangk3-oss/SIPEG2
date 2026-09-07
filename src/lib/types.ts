export type Role = "admin" | "operator" | "user";

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Teacher {
  id: string;
  name: string;
  nip: string;
  jabatan: string;
  cardId: string;
  faceId: string | null;
  color: string;
  active: boolean;
}

export type ScanMode = "masuk" | "izin_keluar" | "masuk_kembali" | "pulang";
export type ScanMethod = "kartu" | "barcode" | "wajah" | "manual";
export type AttStatus = "hadir" | "terlambat" | "izin" | "alpha";

export interface AttendanceRecord {
  id: string;
  teacherId: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  izinKeluar: string | null;
  masukKembali: string | null;
  method: ScanMethod;
  status: AttStatus;
  note: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  time: string;
  actor: string;
  type: "scan" | "auth" | "edit" | "system";
  action: string;
  detail: string;
}

export interface Settings {
  school: {
    name: string;
    shortName: string;
    npsn: string;
    phone: string;
    address: string;
  };
  workHours: { start: string; end: string };
  workDays: {
    defaultDays: number[];
    overrides: Record<string, number[]>;
  };
  signers: {
    principal: { name: string; nip: string; title: string };
    staff: { name: string; nip: string; title: string };
  };
  logos: { app: string | null; print: string | null };
}

export interface DB {
  users: User[];
  teachers: Teacher[];
  records: AttendanceRecord[];
  logs: ActivityLog[];
  settings: Settings;
}

export type PageId =
  | "dashboard"
  | "teachers"
  | "recap-daily"
  | "recap-monthly"
  | "operator"
  | "admin"
  | "settings"
  | "aktivitas";

export interface ScanResult {
  ok: boolean;
  message: string;
  teacherId?: string;
  mode?: ScanMode;
  time?: string;
}
