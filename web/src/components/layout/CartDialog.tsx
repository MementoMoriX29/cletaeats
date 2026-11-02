import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { money } from '../../lib/format';
import { Modal } from '../ui/Modal';
import { Button, IconButton } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

export function QuantityStepper({ quantity, onChange, name }: { quantity: number; onChange: (q: number) => void; name: string }) {
  return (
    <div className="inline-flex items-center rounded-full bg-canvas">
      <IconButton label={quantity === 1 ? `Quitar ${name}` : `Uno menos de ${name}`} className="h-8 w-8" onClick={() => onChange(quantity - 1)}>
        {quantity === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </IconButton>
      <span className="money w-6 text-center text-sm font-semibold" aria-live="polite">{quantity}</span>
      <IconButton label={`Uno más de ${name}`} className="h-8 w-8" onClick={() => onChange(quantity + 1)} disabled={quantity >= 20}>
        <Plus className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

export function CartLines() {
  const cart = useCart();
  return (
    <ul className="divide-y divide-line">
      {cart.lines.map((line) => (
        <li key={line.product_id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug">{line.name}</p>
            <p className="money text-sm text-ink-2">{money(line.price * line.quantity)}</p>
          </div>
          <QuantityStepper quantity={line.quantity} name={line.name} onChange={(q) => cart.setQuantity(line.product_id, q)} />
        </li>
      ))}
    </ul>
  );
}

export function CartDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cart = useCart();
  const navigate = useNavigate();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={cart.restaurant ? cart.restaurant.name : 'Tu pedido'}
      footer={cart.count > 0 && (
        <Button block size="lg" onClick={() => { onClose(); navigate('/checkout'); }}>
          Ir a pagar <span className="money">{money(cart.subtotal)}</span>
        </Button>
      )}
    >
      {cart.count === 0 ? (
        <EmptyState icon={<ShoppingBag className="h-6 w-6" />} title="Tu carrito está vacío">
          Agregá productos de un restaurante para empezar.
        </EmptyState>
      ) : (
        <CartLines />
      )}
    </Modal>
  );
}
