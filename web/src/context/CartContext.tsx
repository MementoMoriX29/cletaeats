// Carrito: siempre de un solo restaurante, como en cualquier app de delivery. Se guarda en este navegador.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readJson, writeJson } from '../lib/storage';

export interface CartLine {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  restaurant: { id: number; name: string } | null;
  lines: CartLine[];
}

interface CartValue extends CartState {
  count: number;
  subtotal: number;
  // false si el producto es de otro restaurante (hay que confirmar antes de vaciar el carrito)
  add: (restaurant: { id: number; name: string }, product: { id: number; name: string; price: number }, quantity?: number) => boolean;
  startNew: (restaurant: { id: number; name: string }, lines: CartLine[]) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productIds: number[]) => void;
  clear: () => void;
}

const STORAGE_KEY = 'cleta.cart';
const EMPTY: CartState = { restaurant: null, lines: [] };
const MAX_QUANTITY = 20;

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(() => readJson(STORAGE_KEY, EMPTY));

  useEffect(() => writeJson(STORAGE_KEY, cart.lines.length ? cart : null), [cart]);

  const value = useMemo<CartValue>(() => ({
    ...cart,
    count: cart.lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: cart.lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    add(restaurant, product, quantity = 1) {
      if (cart.restaurant && cart.restaurant.id !== restaurant.id && cart.lines.length) return false;
      setCart((current) => {
        const existing = current.lines.find((line) => line.product_id === product.id);
        const lines = existing
          ? current.lines.map((line) => line.product_id === product.id
            ? { ...line, price: product.price, quantity: Math.min(MAX_QUANTITY, line.quantity + quantity) }
            : line)
          : [...current.lines, { product_id: product.id, name: product.name, price: product.price, quantity }];
        return { restaurant, lines };
      });
      return true;
    },
    startNew(restaurant, lines) {
      setCart({ restaurant, lines });
    },
    setQuantity(productId, quantity) {
      setCart((current) => {
        const lines = quantity <= 0
          ? current.lines.filter((line) => line.product_id !== productId)
          : current.lines.map((line) => (line.product_id === productId
            ? { ...line, quantity: Math.min(MAX_QUANTITY, quantity) }
            : line));
        return lines.length ? { ...current, lines } : EMPTY;
      });
    },
    remove(productIds) {
      setCart((current) => {
        const lines = current.lines.filter((line) => !productIds.includes(line.product_id));
        return lines.length ? { ...current, lines } : EMPTY;
      });
    },
    clear() {
      setCart(EMPTY);
    },
  }), [cart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart fuera de CartProvider');
  return value;
};
