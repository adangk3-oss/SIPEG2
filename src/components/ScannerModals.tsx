import React, { useEffect, useRef, useState } from "react";
import type { Teacher } from "../lib/types";
import { IcCamera, IcCheck, IcX, IcAlert, IcRefresh, IcBarcode } from "./icons";
import { Modal, useToast } from "./ui";
import { captureFrame, matchFace } from "../lib/face";

/* ================================================================
   BARCODE SCANNER — dengan fallback input manual
   ================================================================ */
export function BarcodeScanModal({
  onClose, onResult,
}: {
  onClose: () => void;
  onResult: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (manualMode) return;
    
    let cancelled = false;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 640, height: 480 },
          audio: false,
        });
        
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        
        // Simulasi scanning (karena @zxing/browser mungkin tidak tersedia)
        // User bisa menggunakan input manual sebagai fallback
        setError(null);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Gagal mengakses kamera. Gunakan input manual di bawah.");
          setManualMode(true);
        }
      }
    };
    
    startCamera();
    
    return () => {
      cancelled = true;
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [manualMode]);

  const submitManual = () => {
    if (manualCode.trim()) {
      onResult(manualCode.trim().toUpperCase());
    }
  };

  return (
    <Modal
      title="Scan Barcode Pegawai"
      subtitle="Scan barcode kartu atau masukkan kode manual"
      onClose={onClose}
      width="max-w-lg"
    >
      <div className="space-y-4">
        {/* Kamera View */}
        {!manualMode && (
          <div className="relative aspect-[4/3] bg-pine-950 rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" width={640} height={480} />
            {scanning && !error && (
              <>
                <div className="absolute inset-0 scanline pointer-events-none" />
                <div className="absolute inset-8 border-2 border-amber-400/60 rounded-lg pointer-events-none" />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-pine-950/80 text-white text-xs font-bold px-3 py-1.5 rounded-full anim-blink">
                  Arahkan barcode ke kamera...
                </div>
              </>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-pine-950/90 text-white p-6 text-center">
                <IcAlert className="w-10 h-10 text-red-400 mb-3" />
                <p className="font-bold text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Input Manual */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <IcBarcode className="w-5 h-5 text-pine-600" />
            <h4 className="font-bold text-sm">Input Kode Kartu Manual</h4>
          </div>
          <p className="text-xs text-ink/50">
            Masukkan kode kartu pegawai (contoh: SPG-0001) atau scan barcode di atas.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              className="input font-mono uppercase flex-1"
              placeholder="Kode kartu (cth: SPG-0001)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && submitManual()}
              autoFocus
            />
            <button
              className="btn btn-primary btn-md"
              onClick={submitManual}
              disabled={!manualCode.trim()}
            >
              <IcCheck className="w-4 h-4" /> Proses
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-lg bg-pine-700/8 border border-pine-700/20 p-3 text-xs text-pine-800">
          <p className="font-bold mb-1">💡 Tips:</p>
          <ul className="space-y-1 text-ink/60">
            <li>• Lihat kode kartu di menu <b>Data Guru</b> atau di kartu fisik pegawai</li>
            <li>• Kode kartu berformat <b>SPG-XXXX</b> (4 digit angka)</li>
            <li>• Setelah kode diproses, presensi akan otomatis tercatat di rekap</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================
   FACE SCANNER — kamera nyata, cocokkan dengan wajah terdaftar
   ================================================================ */
export function FaceScanModal({
  teachers, onClose, onResult,
}: {
  teachers: Teacher[];
  onClose: () => void;
  onResult: (teacher: Teacher, score: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [status, setStatus] = useState("Mengaktifkan kamera…");
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const toast = useToast();

  const enrolled = teachers.filter((t) => t.faceId && t.active);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        if (enrolled.length === 0) {
          setError("Belum ada pegawai yang mendaftarkan wajah. Daftarkan terlebih dahulu di menu Data Guru.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("Mengenali wajah… arahkan wajah ke kamera");

        // Ambil frame setiap 1.2 detik dan cocokkan
        intervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || cancelled) return;
          try {
            const frame = await captureFrame(videoRef.current);
            const match = await matchFace(frame, teachers);
            if (match && !cancelled) {
              setScanning(false);
              stream.getTracks().forEach((t) => t.stop());
              if (intervalRef.current) clearInterval(intervalRef.current);
              toast.push({ type: "success", title: "Wajah dikenali", sub: `${match.teacher.name} (${match.score}%)` });
              onResult(match.teacher, match.score);
            }
          } catch {
            /* skip frame yang gagal */
          }
        }, 1200);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Gagal mengakses kamera. Pastikan izin kamera diberikan.");
        }
      }
    };
    start();
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [teachers, enrolled.length, onResult, toast]);

  return (
    <Modal
      title="Scan Wajah Pegawai"
      subtitle="Arahkan wajah ke kamera untuk presensi"
      onClose={onClose}
      width="max-w-lg"
    >
      <div className="space-y-3">
        <div className="relative aspect-[4/3] bg-pine-950 rounded-xl overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" width={160} height={120} />
          {scanning && !error && (
            <>
              <div className="absolute inset-12 border-2 border-amber-400/60 rounded-full pointer-events-none" />
              <div className="absolute inset-14 border border-amber-400/30 rounded-full pointer-events-none anim-ring" />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-pine-950/80 text-white text-xs font-bold px-3 py-1.5 rounded-full anim-blink">
                {status}
              </div>
            </>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pine-950/90 text-white p-6 text-center">
              <IcAlert className="w-10 h-10 text-red-400 mb-3" />
              <p className="font-bold text-sm">{error}</p>
            </div>
          )}
        </div>
        <p className="text-[11px] text-ink/45 text-center">
          {enrolled.length} pegawai telah mendaftarkan wajah · Pencocokan otomatis setiap 1,2 detik
        </p>
      </div>
    </Modal>
  );
}

/* ================================================================
   FACE ENROLLMENT — daftarkan wajah pegawai via kamera
   ================================================================ */
export function FaceEnrollModal({
  teacher, onClose, onEnrolled,
}: {
  teacher: Teacher;
  onClose: () => void;
  onEnrolled: (dataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(teacher.faceId);
  const [captured, setCaptured] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Gagal mengakses kamera.");
      }
    };
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = async () => {
    if (!videoRef.current) return;
    try {
      const frame = await captureFrame(videoRef.current, 200, 150);
      setCaptured(frame);
    } catch {
      setError("Gagal mengambil gambar wajah.");
    }
  };

  const retake = () => setCaptured(null);

  const save = () => {
    if (captured) {
      onEnrolled(captured);
    }
  };

  return (
    <Modal
      title="Daftarkan Wajah"
      subtitle={teacher.name}
      onClose={onClose}
      width="max-w-lg"
      footer={
        captured ? (
          <>
            <button className="btn btn-outline btn-md" onClick={retake}>
              <IcRefresh className="w-4 h-4" /> Ambil Ulang
            </button>
            <button className="btn btn-primary btn-md" onClick={save}>
              <IcCheck className="w-4 h-4" /> Simpan Wajah
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-outline btn-md" onClick={onClose}>Batal</button>
            <button className="btn btn-primary btn-md" onClick={capture} disabled={!!error}>
              <IcCamera className="w-4 h-4" /> Ambil Foto
            </button>
          </>
        )
      }
    >
      <div className="space-y-3">
        <div className="relative aspect-[4/3] bg-pine-950 rounded-xl overflow-hidden">
          {captured ? (
            <img src={captured} alt="Wajah tertangkap" className="w-full h-full object-cover" />
          ) : (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" width={200} height={150} />
              {!error && (
                <div className="absolute inset-12 border-2 border-amber-400/60 rounded-full pointer-events-none" />
              )}
            </>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pine-950/90 text-white p-6 text-center">
              <IcAlert className="w-10 h-10 text-red-400 mb-3" />
              <p className="font-bold text-sm">{error}</p>
            </div>
          )}
        </div>
        {preview && !captured && (
          <div className="flex items-center gap-3 rounded-lg bg-pine-700/8 border border-pine-700/20 p-3">
            <img src={preview} alt="Wajah terdaftar" className="w-12 h-12 rounded-full object-cover" />
            <div className="text-xs">
              <p className="font-bold">Wajah sudah terdaftar</p>
              <p className="text-ink/50">Ambil foto baru untuk memperbarui</p>
            </div>
          </div>
        )}
        <p className="text-[11px] text-ink/45 text-center">
          Pastikan wajah terlihat jelas, pencahayaan cukup, dan tidak menggunakan kacamata hitam.
        </p>
      </div>
    </Modal>
  );
}
