export type LatLng = [number, number];

/** Haversine — distancia en km entre dos coordenadas */
export function haversineKm([lat1, lon1]: LatLng, [lat2, lon2]: LatLng): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Nominatim reverse geocoding — devuelve dirección legible o null */
export async function reverseGeocode([lat, lon]: LatLng): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`,
      { headers: { 'Accept-Language': 'es' } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (json.display_name as string) ?? null;
  } catch {
    return null;
  }
}

/** Geolocalización del dispositivo como promesa */
export function getCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no geolocation')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.latitude, p.coords.longitude]),
      reject,
      { timeout: 8000 },
    );
  });
}
