/**
 * Helper Geolocation Cepat & Presisi
 * Menggunakan pendekatan hybrid: coba getCurrentPosition cepat terlebih dahulu (2 detik).
 * Jika belum cukup akurat, tingkatkan dengan watchPosition berdurasi pendek (maks 3.5 detik).
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
  maxWaitMs = 3500
) {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    onError({ message: 'Browser Anda tidak mendukung deteksi lokasi (GPS).' });
    return;
  }

  let resolved = false;

  const handleSuccess = (pos: GeolocationPosition) => {
    if (resolved) return;
    resolved = true;
    onSuccess({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: Math.round(pos.coords.accuracy),
    });
  };

  // 1. Coba percakapan cepat dengan getCurrentPosition (MaxAge 5 detik)
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const acc = Math.round(position.coords.accuracy);
      if (onProgress) onProgress(acc);

      // Jika akurasi bawaan sudah sangat bagus (<= 35m), langsung return instan tanpa menunggu!
      if (acc <= 35) {
        handleSuccess(position);
        return;
      }
      
      // Jika akurasi masih di atas 35m, jalankan watchPosition sebentar untuk perbaikan
      startWatch(position);
    },
    (err) => {
      // Jika getCurrentPosition gagal, langsung coba watchPosition
      startWatch(null);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 2000
    }
  );

  function startWatch(initialBest: GeolocationPosition | null) {
    if (resolved) return;
    let bestPosition: GeolocationPosition | null = initialBest;
    let watchId: number | null = null;

    const timer = setTimeout(() => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (bestPosition) {
        handleSuccess(bestPosition);
      } else {
        onError({ message: 'Gagal mendapatkan data GPS dari perangkat dalam batas waktu.' });
      }
    }, maxWaitMs);

    try {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (resolved) {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            return;
          }

          const acc = Math.round(position.coords.accuracy);
          if (onProgress) onProgress(acc);

          if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
            bestPosition = position;
          }

          if (position.coords.accuracy <= 15) {
            clearTimeout(timer);
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            handleSuccess(position);
          }
        },
        (err) => {
          if (!bestPosition) {
            clearTimeout(timer);
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            onError({ message: err.message || 'Gagal mengambil sinyal GPS.' });
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: maxWaitMs
        }
      );
    } catch (e: any) {
      clearTimeout(timer);
      if (bestPosition) {
        handleSuccess(bestPosition);
      } else {
        onError({ message: e.message || 'Gagal menyalakan sensor GPS.' });
      }
    }
  }
}
