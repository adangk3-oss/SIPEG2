import type { Teacher } from "./types";

/**
 * Ambil frame dari video element dan konversi ke grayscale untuk perbandingan.
 */
export async function captureFrame(
  video: HTMLVideoElement,
  width = 160,
  height = 120,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

/**
 * Bandingkan dua gambar wajah menggunakan perbedaan pixel rata-rata.
 * Return similarity score 0-100.
 */
export async function compareFaces(img1: string, img2: string): Promise<number> {
  return new Promise((resolve) => {
    const canvas1 = document.createElement("canvas");
    const canvas2 = document.createElement("canvas");
    const ctx1 = canvas1.getContext("2d", { willReadFrequently: true })!;
    const ctx2 = canvas2.getContext("2d", { willReadFrequently: true })!;

    const size = 80;
    canvas1.width = size;
    canvas1.height = size;
    canvas2.width = size;
    canvas2.height = size;

    const i1 = new Image();
    const i2 = new Image();
    let loaded = 0;

    const check = () => {
      loaded++;
      if (loaded < 2) return;

      ctx1.drawImage(i1, 0, 0, size, size);
      ctx2.drawImage(i2, 0, 0, size, size);

      const data1 = ctx1.getImageData(0, 0, size, size).data;
      const data2 = ctx2.getImageData(0, 0, size, size).data;

      let totalDiff = 0;
      for (let i = 0; i < data1.length; i += 4) {
        const r = Math.abs(data1[i] - data2[i]);
        const g = Math.abs(data1[i + 1] - data2[i + 1]);
        const b = Math.abs(data1[i + 2] - data2[i + 2]);
        totalDiff += (r + g + b) / 3;
      }

      const avgDiff = totalDiff / (size * size);
      // Konversi ke similarity: 0 diff = 100%, 255 diff = 0%
      const similarity = Math.max(0, 100 - (avgDiff / 255) * 100);
      resolve(similarity);
    };

    i1.onload = check;
    i2.onload = check;
    i1.src = img1;
    i2.src = img2;
  });
}

/**
 * Cari guru yang wajahnya paling cocok dengan sample.
 * Return guru dengan score tertinggi jika >= threshold, atau null.
 */
export async function matchFace(
  sample: string,
  teachers: Teacher[],
  threshold = 75,
): Promise<{ teacher: Teacher; score: number } | null> {
  let bestMatch: { teacher: Teacher; score: number } | null = null;

  for (const teacher of teachers) {
    if (!teacher.faceId || !teacher.active) continue;
    try {
      const score = await compareFaces(sample, teacher.faceId);
      if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { teacher, score };
      }
    } catch {
      // Skip jika gagal compare
    }
  }

  return bestMatch;
}
