// Equivalente a: HomeScreen.kt (Jetpack Compose)
// Pattern: Context API (equivalente a ViewModel + StateFlow)
// HTTP: Axios (equivalente a Retrofit)

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getRestaurants } from '../../api/restaurants';
import type { Restaurant } from '../../types';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';

export const ClientHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filtered, setFiltered] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getRestaurants();
        const active = data.filter((r) => r.activo);
        setRestaurants(active);
        setFiltered(active);
      } catch {
        toast.error('Sin conexión al servidor');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const q = query.toLowerCase();
    setFiltered(restaurants.filter((r) => r.nombre.toLowerCase().includes(q) || r.categoria.toLowerCase().includes(q)));
  }, [query, restaurants]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-white text-2xl font-bold">¡Hola, {user?.nombre}!</h1>
        <p className="text-muted-foreground text-sm">¿Qué te antoja hoy?</p>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-muted-foreground focus:outline-none focus:border-primary"
          placeholder="Buscar restaurante o categoría..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Sin restaurantes" description="No hay restaurantes disponibles ahora." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/client/restaurant/${r.id}`)}
              className="bg-surface rounded-xl overflow-hidden text-left hover:ring-2 hover:ring-primary transition-all"
            >
              <div className="h-32 bg-secondary flex items-center justify-center">
                {r.imagen_url ? (
                  <img src={r.imagen_url} alt={r.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">🍽️</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-white font-semibold">{r.nombre}</h3>
                <p className="text-muted-foreground text-xs mt-1">{r.categoria}</p>
                <p className="text-muted-foreground text-xs truncate">{r.direccion}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
