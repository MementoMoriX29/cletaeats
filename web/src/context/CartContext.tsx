// Equivalente a: CartViewModel.kt
// Pattern: Context API + useReducer (equivalente a ViewModel + StateFlow)

import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { CartItem, Combo } from '../types';

interface CartState {
  items: CartItem[];
  restauranteId: number | null;
}

type CartAction =
  | { type: 'ADD'; combo: Combo; restauranteId: number }
  | { type: 'REMOVE'; comboId: number }
  | { type: 'INCREMENT'; comboId: number }
  | { type: 'DECREMENT'; comboId: number }
  | { type: 'CLEAR' };

const reducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD': {
      // No mezclar restaurantes
      if (state.restauranteId && state.restauranteId !== action.restauranteId) {
        return { items: [{ combo: action.combo, cantidad: 1 }], restauranteId: action.restauranteId };
      }
      const existing = state.items.find((i) => i.combo.id === action.combo.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.combo.id === action.combo.id ? { ...i, cantidad: i.cantidad + 1 } : i
          ),
        };
      }
      return {
        restauranteId: action.restauranteId,
        items: [...state.items, { combo: action.combo, cantidad: 1 }],
      };
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter((i) => i.combo.id !== action.comboId) };
    case 'INCREMENT':
      return {
        ...state,
        items: state.items.map((i) =>
          i.combo.id === action.comboId ? { ...i, cantidad: i.cantidad + 1 } : i
        ),
      };
    case 'DECREMENT':
      return {
        ...state,
        items: state.items
          .map((i) =>
            i.combo.id === action.comboId ? { ...i, cantidad: i.cantidad - 1 } : i
          )
          .filter((i) => i.cantidad > 0),
      };
    case 'CLEAR':
      return { items: [], restauranteId: null };
    default:
      return state;
  }
};

interface CartContextValue {
  items: CartItem[];
  restauranteId: number | null;
  total: number;
  itemCount: number;
  addItem: (combo: Combo, restauranteId: number) => void;
  removeItem: (comboId: number) => void;
  increment: (comboId: number) => void;
  decrement: (comboId: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, { items: [], restauranteId: null });

  const total = state.items.reduce((sum, i) => sum + i.combo.precio * i.cantidad, 0);
  const itemCount = state.items.reduce((sum, i) => sum + i.cantidad, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        restauranteId: state.restauranteId,
        total,
        itemCount,
        addItem: (combo, restauranteId) => dispatch({ type: 'ADD', combo, restauranteId }),
        removeItem: (comboId) => dispatch({ type: 'REMOVE', comboId }),
        increment: (comboId) => dispatch({ type: 'INCREMENT', comboId }),
        decrement: (comboId) => dispatch({ type: 'DECREMENT', comboId }),
        clear: () => dispatch({ type: 'CLEAR' }),
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
};
