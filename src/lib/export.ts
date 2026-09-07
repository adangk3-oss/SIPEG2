import type { Settings } from "./types";
import { LOGO_URL } from "./data";

export const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
};

const csvCell = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const body = [headers, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
  downloadBlob(filename, new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" }));
}

const xlsCell = (v: string | number) =>
  `<td style="border:1px solid #999;padding:5px 8px;font-size:12px">${String(v ?? "")}</td>`;

export function exportXLS(filename: string, docTitle: string, headers: string[], rows: (string | number)[][]) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8" /></head>
<body>
<h3 style="font-family:Arial">${docTitle}</h3>
<table style="border-collapse:collapse;font-family:Arial">
<thead><tr>${headers.map((h) => `<th style="border:1px solid #999;background:#245742;color:#fff;padding:6px 10px;font-size:12px">${h}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map(xlsCell).join("")}</tr>`).join("")}</tbody>
</table></body></html>`;
  downloadBlob(filename, new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8" }));
}

interface Signer { name: string; nip: string; title: string }

export const kopHTML = (s: Settings): string => `
<div style="display:flex;align-items:center;gap:14px;border-bottom:3px double #245742;padding-bottom:10px;margin-bottom:16px">
  <img src="${s.logos.print || s.logos.app || LOGO_URL}" style="width:64px;height:64px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'" />
  <div>
    <div style="font-size:13px;font-weight:600;letter-spacing:1px;color:#444">PEMERINTAH KOTA BANDUNG — DINAS PENDIDIKAN</div>
    <div style="font-size:21px;font-weight:800;color:#16352a">${s.school.name.toUpperCase()}</div>
    <div style="font-size:11px;color:#555">${s.school.address} · Telp. ${s.school.phone} · NPSN ${s.school.npsn}</div>
  </div>
</div>`;

export const signatureHTML = (left: Signer, right: Signer): string => `
<table style="width:100%;margin-top:36px;font-size:12.5px"><tr>
  <td style="width:50%;text-align:center;vertical-align:top">
    <div>${left.title},</div>
    <div style="height:70px"></div>
    <div style="font-weight:700;text-decoration:underline">${left.name || "_______________________"}</div>
    <div>NIP. ${left.nip || "—"}</div>
  </td>
  <td style="width:50%;text-align:center;vertical-align:top">
    <div>${right.title},</div>
    <div style="height:70px"></div>
    <div style="font-weight:700;text-decoration:underline">${right.name || "_______________________"}</div>
    <div>NIP. ${right.nip || "—"}</div>
  </td>
</tr></table>`;

export function printReport(opts: {
  settings: Settings;
  title: string;
  subtitle: string;
  columns: string[];
  rows: (string | number)[][];
  rightSigner: Signer;
  note?: string;
  landscape?: boolean;
}): boolean {
  const { settings: s, title, subtitle, columns, rows, rightSigner, note, landscape } = opts;
  const w = window.open("", "_blank", "width=1000,height=720");
  if (!w) return false;
  const principal = { ...s.signers.principal, title: `Kepala Sekolah` };
  w.document.write(`<!doctype html><html><head><title>${title}</title>
<style>
  @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 13mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color:#222; }
  h2 { margin:2px 0; font-size:17px; text-align:center; color:#16352a; text-transform:uppercase; letter-spacing:.5px; }
  .sub { text-align:center; font-size:12px; color:#555; margin-bottom:14px; }
  table.data { width:100%; border-collapse:collapse; font-size:12px; }
  table.data th { background:#245742; color:#fff; border:1px solid #245742; padding:6px 8px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.4px; }
  table.data td { border:1px solid #9db3a8; padding:5px 8px; vertical-align:top; }
  table.data tr:nth-child(even) td { background:#f2f7f3; }
  .note { font-size:11px; color:#666; margin-top:12px; }
</style></head><body>
${kopHTML(s)}
<h2>${title}</h2>
<div class="sub">${subtitle}</div>
<table class="data">
<thead><tr>${columns.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
</table>
${note ? `<div class="note">${note}</div>` : ""}
${signatureHTML(principal, rightSigner)}
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
  return true;
}
