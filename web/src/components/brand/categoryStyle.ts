// Colores e ícono de la portada según la categoría del restaurante.
import {
  Coffee, CookingPot, Croissant, Drumstick, Fish, Flame, Pizza, Salad, Sandwich, Soup, Utensils, type LucideIcon,
} from 'lucide-react';

export interface CoverStyle {
  bg: string;
  fg: string;
  Icon: LucideIcon;
}

const BY_CATEGORY: Record<string, CoverStyle> = {
  'Comida típica': { bg: '#F2C14E', fg: '#704B00', Icon: CookingPot },
  Pizza: { bg: '#E8684A', fg: '#76230E', Icon: Pizza },
  Sushi: { bg: '#3D7DB3', fg: '#14395A', Icon: Fish },
  Hamburguesas: { bg: '#F08B2C', fg: '#663100', Icon: Sandwich },
  'Café y repostería': { bg: '#A0714B', fg: '#3B2311', Icon: Coffee },
  Pollo: { bg: '#D9503F', fg: '#5E170E', Icon: Drumstick },
  Saludable: { bg: '#62AB6B', fg: '#1C4A23', Icon: Salad },
  Mexicana: { bg: '#C4467C', fg: '#561433', Icon: Flame },
  Panadería: { bg: '#DCA65E', fg: '#644214', Icon: Croissant },
  Sopas: { bg: '#E0874F', fg: '#5F2D0D', Icon: Soup },
};

// Categorías con portada propia (se sugieren al dar de alta un restaurante)
export const KNOWN_CATEGORIES = Object.keys(BY_CATEGORY);

const FALLBACK: Omit<CoverStyle, 'Icon'>[] = [
  { bg: '#7A9E7E', fg: '#26402A' },
  { bg: '#D98E73', fg: '#5C2A18' },
  { bg: '#8E8CD8', fg: '#2E2C6B' },
  { bg: '#E3B04B', fg: '#5E4410' },
];

export const coverStyle = (category: string): CoverStyle => {
  const known = BY_CATEGORY[category];
  if (known) return known;
  const hash = [...category].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return { ...FALLBACK[hash % FALLBACK.length], Icon: Utensils };
};
