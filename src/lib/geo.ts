/**
 * Helper Geolocation Cepat & Presisi (Optimized for Android Chrome & iOS Safari)
 * Menggunakan pendekatan hybrid: 
 * 1. Coba High Accuracy (GPS murni).
 * 2. Jika timeout / gagal di HP Android (terutama dalam ruangan), fallback otomatis ke Low Accuracy (WiFi / Cell Tower).
 */

export interface AccurateLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number; // Dalam meter
}

export interface AccurateLocationError {
  message: string;
  code?: number;
  type?: 'permission' | 'disabled' | 'timeout' | 'other';
}

export function getAccurateLocation(
  onSuccess: (result: AccurateLocationResult) => void,
  onError: (error: AccurateLocationError) => void,
  onProgress?: (currentAccuracy: number) => void,
  maxWaitMs = 7000
) {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    onError({ message: 'Browser Anda tidak mendukung fitur lokasi GPS.', type: 'other' });
    return;
  }

  // Cek apakah koneksi HTTPS
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    onError({
      message: 'Fitur lokasi GPS membutuhkan koneksi HTTPS aman. Pastikan alamat website menggunakan https://',
      type: 'other'
    });
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

  const tryLowAccuracyFallback = (originalErr?: GeolocationPositionError) => {
    if (resolved) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => handleSuccess(pos),
      (fallbackErr) => {
        if (resolved) return;
        resolved = true;
        onError({
          message: 'Pencarian lokasi GPS di HP Anda waktu habis (Timeout). Pastikan lokasi/GPS HP aktif dan buka di tempat terbuka.',
          code: fallbackErr.code || originalErr?.code,
          type: 'timeout'
        });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  };

  const handleCustomError = (err: GeolocationPositionError) => {
    if (resolved) return;

    // Code 1: PERMISSION_DENIED
    if (err.code === err.PERMISSION_DENIED) {
      resolved = true;
      onError({
        message: 'Izin lokasi diblokir di browser HP Anda. Silakan izinkan akses lokasi pada setelan browser Chrome/Safari.',
        code: err.code,
        type: 'permission'
      });
      return;
    }

    // Code 2: POSITION_UNAVAILABLE
    if (err.code === err.POSITION_UNAVAILABLE) {
      resolved = true;
      onError({
        message: 'Layanan Lokasi / GPS di HP Android Anda tidak aktif. Mohon aktifkan "Lokasi/GPS" di menu atas HP Anda.',
        code: err.code,
        type: 'disabled'
      });
      return;
    }

    // Code 3: TIMEOUT atau error lainnya -> Coba fallback lokasi jaringan
    tryLowAccuracyFallback(err);
  };

  // 1. Percobaan Cepat (High Accuracy = true)
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const acc = Math.round(position.coords.accuracy);
      if (onProgress) onProgress(acc);

      if (acc <= 50) {
        handleSuccess(position);
        return;
      }
      startWatch(position);
    },
    (err) => {
      handleCustomError(err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 4000
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
        tryLowAccuracyFallback();
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

          if (position.coords.accuracy <= 30) {
            clearTimeout(timer);
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            handleSuccess(position);
          }
        },
        (err) => {
          if (!bestPosition) {
            clearTimeout(timer);
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            handleCustomError(err);
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: maxWaitMs
        }
      );
    } catch (e: any) {
      clearTimeout(timer);
      if (bestPosition) {
        handleSuccess(bestPosition);
      } else {
        tryLowAccuracyFallback();
      }
    }
  }
}
