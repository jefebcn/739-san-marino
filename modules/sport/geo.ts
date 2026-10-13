/** Distanza in km tra due punti (formula dell'emisenoverso). */
export function distanzaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function testoDistanza(km: number) {
  return km < 1 ? `${Math.round(km * 1000 / 10) * 10} m` : `${km.toLocaleString("it-IT", { maximumFractionDigits: 1 })} km`;
}

/** I confini (larghi) del territorio: le partite si possono segnare solo a San Marino. */
export function aSanMarino(p: { lat: number; lng: number }) {
  return p.lat >= 43.85 && p.lat <= 44.05 && p.lng >= 12.35 && p.lng <= 12.6;
}
