// Mapa base (CARTO Voyager sobre datos de OpenStreetMap) y punto de partida: Heredia centro.
import type { Point } from '../../lib/types';

export const HEREDIA: Point = { lat: 9.9985, lng: -84.1172 };

export const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
