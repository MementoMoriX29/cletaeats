// Equivalente a: RestaurantDetailScreen.kt (Jetpack Compose)
// HTTP: Axios (equivalente a Retrofit)

import { useEffect, useState, useCallback, type FC } from 'react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

const ComboImage: FC<{ url?: string; alt: string }> = ({ url, alt }) => {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div className="w-full h-40 bg-card flex items-center justify-center">
        <span className="text-4xl">🍽️</span>
      </div>
    );
  }
  return (
    <img src={url} alt={alt} className="w-full h-40 object-cover" onError={() => setFailed(true)} />
  );
};
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { getRestaurant, getCombos } from '../../api/restaurants';
import type { Restaurant, Combo } from '../../types';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';

export const RestaurantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, itemCount, restauranteId, clear } = useCart();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCombo, setPendingCombo] = useState<Combo | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [rRes, cRes] = await Promise.all([
          getRestaurant(Number(id)),
          getCombos(Number(id)),
        ]);
        setRestaurant(rRes.data);
        setCombos(cRes.data.filter((c) => c.disponible));
      } catch {
        toast.error('Sin conexión al servidor');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleAdd = useCallback((combo: Combo) => {
    if (restauranteId && restauranteId !== Number(id)) {
      setPendingCombo(combo);
      return;
    }
    addItem(combo, Number(id));
    toast.success(`${combo.nombre} agregado al carrito`);
  }, [restauranteId, id, addItem]);

  const handleConfirmClear = useCallback(() => {
    if (!pendingCombo) return;
    clear();
    addItem(pendingCombo, Number(id));
    toast.success(`${pendingCombo.nombre} agregado al carrito`);
    setPendingCombo(null);
  }, [pendingCombo, clear, addItem, id]);

  return (
    <>
    <ConfirmModal
      open={pendingCombo !== null}
      variant="warning"
      title="¿Cambiar restaurante?"
      message={
        <>
          Tu carrito tiene combos de otro restaurante.{' '}
          <span className="text-white font-medium">Si continuás, se vaciará el carrito actual.</span>
        </>
      }
      confirmLabel="Vaciar y continuar"
      cancelLabel="Mantener carrito"
      onConfirm={handleConfirmClear}
      onCancel={() => setPendingCombo(null)}
    />
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-xl font-bold flex-1">
          {restaurant?.nombre ?? 'Restaurante'}
        </h1>
        <Button variant="secondary" size="sm" onClick={() => navigate('/client/cart')} className="relative">
          <ShoppingCart size={18} />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Button>
      </div>

      {restaurant && (
        <div className="bg-surface rounded-xl p-4">
          <p className="text-muted-foreground text-sm">{restaurant.descripcion}</p>
          <p className="text-muted-foreground text-xs mt-1">{restaurant.direccion} · {restaurant.telefono}</p>
        </div>
      )}

      <h2 className="text-white font-semibold">Combos disponibles</h2>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {combos.map((combo) => (
            <div key={combo.id} className="bg-surface rounded-xl overflow-hidden flex flex-col">
              <ComboImage url={combo.imagen_url} alt={combo.nombre} />

              <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                  <p className="text-white font-semibold">{combo.nombre}</p>
                  <p className="text-muted-foreground text-sm mt-1">{combo.descripcion}</p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-primary font-bold">
                    ₡{combo.precio.toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleAdd(combo)}
                    className="bg-primary hover:bg-orange-600 text-white rounded-lg p-2 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
};
