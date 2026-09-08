import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { Teacher } from "../lib/types";
import { IcCamera, IcCheck, IcX, IcAlert, IcRefresh, IcBarcode } from "./icons";
import { Modal, useToast } from "./ui";
import { captureFrame, matchFace } from "../lib/face";

/* ================================================================
   BARCODE SCANNER — menggunakan @zxing/browser
   ================================================================ */
export function BarcodeScanModal({
  onClose, onResult,
}: {
  onClose: () => void;
  onResult: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (manualMode) return;
    
    let cancelled = false;
    const startScanner = async () => {
      try {
        // Cek apakah browser mendukung kamera
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Browser tidak mendukung akses kamera");
        }

        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        // Dapatkan daftar perangkat video
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        
        if (devices.length === 0) {
          throw new Error("Tidak ada kamera terdeteksi");
        }

        // Gunakan kamera pertama
        const deviceId = devices[0].deviceId;

        // Mulai decoding dari video
        const controls = await codeReader.decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result, error) => {
            if (cancelled) return;
            
            if (result) {
              const text = result.getText();
              if (text) {
                setScanning(false);
                // Stop scanner
                controls.stop();
                // Panggil callback dengan kode yang discan
                onResult(text.toUpperCase());
              }
            }
          }
        );

        controlsRef.current = controls;
        setError(null);
      } catch (e: any) {
        if (!cancelled) {
          console.error("Scanner error:", e);
          setError(e?.message || "Gagal mengakses kamera. Gunakan input manual di bawah.");
          setManualMode(true);
        }
      }
    };
    
    startScanner();
    
    return () => {
      cancelled = true;
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, [manualMode, onResult]);

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
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [status, setStatus] = useState("Mengaktifkan kamera...");
  const [recognized, setRecognized] = useState<Teacher | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const toast = useToast();
  const onResultRef = useRef(onResult);
  
  // Update ref setiap kali onResult berubah
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const enrolled = teachers.filter((t) => t.faceId && t.active);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        if (enrolled.length === 0) {
          setError("Belum ada pegawai yang mendaftarkan wajah. Daftarkan terlebih dahulu di menu Data Guru.");
          return;
        }

        // Cek apakah browser mendukung kamera
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Browser tidak mendukung akses kamera");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus("Mengenali wajah... arahkan wajah ke kamera");

        // Ambil frame setiap 1.5 detik dan cocokkan
        intervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || cancelled) return;
          
          try {
            const frame = await captureFrame(videoRef.current);
            const match = await matchFace(frame, teachers);
            
            if (match && !cancelled) {
              setScanning(false);
              setRecognized(match.teacher);
              
              // Stop kamera
              stream.getTracks().forEach((t) => t.stop());
              if (intervalRef.current) clearInterval(intervalRef.current);
              
              // Tampilkan notifikasi
              toast.push({ 
                type: "success", 
                title: "Wajah dikenali", 
                sub: `${match.teacher.name} (${Math.round(match.score)}%)` 
              });
              
              // Panggil callback setelah 1 detik menggunakan ref
              setTimeout(() => {
                onResultRef.current(match.teacher, match.score);
              }, 1000);
            }
          } catch (err) {
            console.error("Face recognition error:", err);
          }
        }, 1500);
      } catch (e: any) {
        if (!cancelled) {
          console.error("Camera error:", e);
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
  }, [teachers, enrolled.length, toast]);

  return (
    <Modal
      title="Scan Wajah Pegawai"
      subtitle="Arahkan wajah ke kamera untuk presensi"
      onClose={onClose}
      width="max-w-lg"
    >
      <div className="space-y-4">
        <div className="relative aspect-[4/3] bg-pine-950 rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          
          {scanning && !error && !recognized && (
            <>
              <div className="absolute inset-12 border-2 border-amber-400/60 rounded-full pointer-events-none" />
              <div className="absolute inset-14 border border-amber-400/30 rounded-full pointer-events-none anim-ring" />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-pine-950/80 text-white text-xs font-bold px-3 py-1.5 rounded-full anim-blink">
                {status}
              </div>
            </>
          )}

          {recognized && (
            <div className="absolute inset-0 bg-emerald-600/90 flex flex-col items-center justify-center text-white p-6">
              <IcCheck className="w-16 h-16 mb-4" />
              <p className="font-bold text-xl mb-2">Wajah Dikenali!</p>
              <p className="text-lg">{recognized.name}</p>
              <p className="text-sm mt-2 opacity-80">Presensi akan otomatis tercatat...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pine-950/90 text-white p-6 text-center">
              <IcAlert className="w-10 h-10 text-red-400 mb-3" />
              <p className="font-bold text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-ink/60">
            <span className="font-bold text-pine-700">{enrolled.length}</span> pegawai telah mendaftarkan wajah
          </p>
          <p className="text-xs text-ink/45 mt-1">
            Pencocokan otomatis setiap 1,5 detik
          </p>
        </div>
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
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Browser tidak mendukung akses kamera");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Gagal mengakses kamera.");
        }
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
        {teacher.faceId && !captured && (
          <div className="flex items-center gap-3 rounded-lg bg-pine-700/8 border border-pine-700/20 p-3">
            <img src={teacher.faceId} alt="Wajah terdaftar" className="w-12 h-12 rounded-full object-cover" />
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
