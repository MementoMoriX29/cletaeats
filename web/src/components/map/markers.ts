// Marcadores del mapa dibujados en SVG (sin imágenes externas).
import L from 'leaflet';

const pin = (body: string, fill: string, size = 36) => L.divIcon({
  className: 'map-pin',
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
  html: `<svg width="${size}" height="${size}" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="16" fill="${fill}" stroke="#fff" stroke-width="3"/>
    <g transform="translate(6 6)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g>
  </svg>`,
});

export const restaurantIcon = pin('<path d="M4 9.5 5.6 5h12.8L20 9.5M4 9.5V19h16V9.5M4 9.5h16M10 19v-5h4v5"/>', '#0E6B4E');

export const homeIcon = pin('<path d="M4 11.5 12 5l8 6.5V19h-5v-5H9v5H4z"/>', '#17201B');

export const courierIcon = L.divIcon({
  className: 'map-pin',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  html: `<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
    <circle cx="22" cy="22" r="20" fill="#F4B400" stroke="#fff" stroke-width="3"/>
    <g fill="none" stroke="#17201B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="14" cy="25" r="5"/><circle cx="30" cy="25" r="5"/>
      <path d="M14 25 18.5 17h8L30 25M18.5 17l3.5 8h-8M24 13h3l-.5 4"/>
    </g>
  </svg>`,
});

export const pickerIcon = L.divIcon({
  className: 'map-pin',
  iconSize: [36, 46],
  iconAnchor: [18, 44],
  html: `<svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 44s15-15.2 15-26A15 15 0 0 0 3 18c0 10.8 15 26 15 26Z" fill="#0E6B4E" stroke="#fff" stroke-width="3"/>
    <circle cx="18" cy="18" r="5.5" fill="#F4B400"/>
  </svg>`,
});
