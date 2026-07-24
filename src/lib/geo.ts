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
  maxWaitMs = 6000
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

  // 1. Coba percakapan cepat dengan getCurrentPosition (MaxAge 10 detik, Timeout 5 detik)
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const acc = Math.round(position.coords.accuracy);
      if (onProgress) onProgress(acc);

      // Jika akurasi sudah cukup baik (<= 45m), langsung return instan
      if (acc <= 45) {
        handleSuccess(position);
        return;
      }
      
      startWatch(position);
    },
    (err) => {
      // Jika getCurrentPosition gagal/timeout di iPhone, langsung coba watchPosition & fallback
      startWatch(null);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 5000
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
        // Fallback panggil sekali lagi tanpa HighAccuracy jika iOS memblokir GPS murni
        navigator.geolocation.getCurrentPosition(
          (pos) => handleSuccess(pos),
          () => onError({ message: 'Gagal mendapatkan data GPS. Di iPhone, pastikan Pengaturan > Privasi > Layanan Lokasi > Situs Web Safari diizinkan & Lokasi Tepat (Precise Location) aktif.' }),
          { enableHighAccuracy: false, timeout: 3000 }
        );
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

          if (position.coords.accuracy <= 25) {
            clearTimeout(timer);
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            handleSuccess(position);
          }
        },
        (err) => {
          if (!bestPosition) {
            clearTimeout(timer);
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            // Fallback tanpa high accuracy
            navigator.geolocation.getCurrentPosition(
              (pos) => handleSuccess(pos),
              () => onError({ message: err.message || 'Gagal mengambil sinyal GPS dari perangkat Anda.' }),
              { enableHighAccuracy: false, timeout: 3000 }
            );
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
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
