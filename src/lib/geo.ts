/**
 * Helper Geolocation dengan Multi-Sampling
 * Menggunakan watchPosition untuk memantau sinyal GPS selama beberapa detik
 * dan memilih titik kordinat dengan tingkat akurasi tertinggi (accuracy meter terkecil).
 */

export interface AccurateLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number; // Dalam meter
}

export function getAccurateLocation(
  onSuccess: (result: AccurateLocationResult) => void,
  onError: (error: { message: string }) => void,
  onProgress?: (currentAccuracy: number) => void,
  maxWaitMs = 7000
) {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    onError({ message: 'Browser Anda tidak mendukung deteksi lokasi (GPS).' });
    return;
  }

  let bestPosition: GeolocationPosition | null = null;
  let watchId: number | null = null;

  const timer = setTimeout(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    if (bestPosition) {
      onSuccess({
        latitude: bestPosition.coords.latitude,
        longitude: bestPosition.coords.longitude,
        accuracy: Math.round(bestPosition.coords.accuracy),
      });
    } else {
      onError({ message: 'Waktu pengambilan GPS habis. Pastikan izin lokasi diberikan dan GPS aktif.' });
    }
  }, maxWaitMs);

  try {
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = Math.round(position.coords.accuracy);
        if (onProgress) {
          onProgress(accuracy);
        }

        // Catat posisi jika ini pertama kali atau memiliki akurasi lebih presisi (angka meter lebih kecil)
        if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
        }

        // Jika sudah mencapai akurasi sangat presisi (<= 8 meter), hentikan watch lebih cepat
        if (position.coords.accuracy <= 8) {
          clearTimeout(timer);
          if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
          }
          onSuccess({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
          });
        }
      },
      (err) => {
        // Jika belum dapat sampel apa pun, kirim error
        if (!bestPosition) {
          clearTimeout(timer);
          if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
          }
          onError({ message: err.message || 'Gagal mengambil data GPS dari perangkat.' });
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: maxWaitMs,
      }
    );
  } catch (err: any) {
    clearTimeout(timer);
    onError({ message: err.message || 'Gagal memicu GPS browser.' });
  }
}
