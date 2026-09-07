import type { AttendanceRecord, Settings } from "./types";

export const pad2 = (n: number) => String(n).padStart(2, "0");

export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export const nowHMS = (): string => {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

export const nowISO = () => new Date().toISOString();

export const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const addDaysISO = (iso: string, n: number): string => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return toISODate(dt);
};

export const monthKeyOf = (iso: string) => iso.slice(0, 7);

export const DOW_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const MON_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const fmtDateID = (iso: string): string => {
  const dt = parseISO(iso);
  return `${DOW_ID[dt.getDay()]}, ${dt.getDate()} ${MON_ID[dt.getMonth()]} ${dt.getFullYear()}`;
};

export const fmtMonthID = (key: string): string => {
  const [y, m] = key.split("-").map(Number);
  return `${MON_ID[m - 1]} ${y}`;
};

export const monthShift = (key: string, n: number): string => {
  const [y, m] = key.split("-").map(Number);
  const dt = new Date(y, m - 1 + n, 1);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}`;
};

export const hmToMin = (hm: string): number => {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + (m || 0);
};

export const hmsToMin = (hms: string): number => {
  const [h, m, s] = hms.split(":").map(Number);
  return h * 60 + (m || 0) + (s || 0) / 60;
};

export const isLate = (timeIn: string, startHM: string): boolean =>
  hmsToMin(timeIn) > hmToMin(startHM);

export const fmtHM = (hms: string | null | undefined): string =>
  hms ? hms.slice(0, 5) : "—";

export const fmtDur = (min: number): string => {
  const m = Math.max(0, Math.round(min));
  return `${Math.floor(m / 60)}j ${pad2(m % 60)}m`;
};

export const isWorkday = (iso: string, s: Settings): boolean => {
  const ovr = s.workDays?.overrides?.[monthKeyOf(iso)];
  const days = ovr ?? s.workDays?.defaultDays ?? [1, 2, 3, 4, 5];
  return days.includes(parseISO(iso).getDay());
};

export const workdaysOfMonth = (key: string, s: Settings): string[] => {
  const parts = key.split("-").map(Number);
  const y = parts[0] || new Date().getFullYear();
  const m = parts[1] || 1;
  const total = new Date(y, m, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= total; d++) {
    const iso = `${y}-${pad2(m)}-${pad2(d)}`;
    if (isWorkday(iso, s)) out.push(iso);
  }
  return out;
};

export const stdWorkMin = (s: Settings): number =>
  Math.max(0, hmToMin(s.workHours.end) - hmToMin(s.workHours.start));

export const workMinutes = (rec: AttendanceRecord, s: Settings): number => {
  if (!rec.timeIn) return 0;
  const end = rec.timeOut
    ? hmsToMin(rec.timeOut)
    : rec.date === todayISO()
      ? hmsToMin(nowHMS())
      : hmToMin(s.workHours.end);
  let min = end - hmsToMin(rec.timeIn);
  if (rec.izinKeluar && rec.masukKembali) {
    min -= hmsToMin(rec.masukKembali) - hmsToMin(rec.izinKeluar);
  }
  return Math.max(0, min);
};

export const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 11) return "Selamat Pagi";
  if (h < 15) return "Selamat Siang";
  if (h < 18) return "Selamat Sore";
  return "Selamat Malam";
};

export const fmtLogTime = (iso: string): string => {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())} · ${d.getDate()} ${MON_ID[d.getMonth()].slice(0, 3)}`;
};
