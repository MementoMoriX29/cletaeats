// Encabezado de la app para clientes y visitantes: ubicación de entrega, búsqueda, carrito y cuenta.
import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, LogOut, MapPin, Receipt, Search, ShoppingBag, UserRound } from 'lucide-react';
import { homeFor, useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useDeliveryLocation } from '../../context/LocationContext';
import { Logo } from '../brand/Logo';
import { Avatar } from '../ui/Avatar';
import { ButtonLink } from '../ui/Button';
import { PageSpinner } from '../ui/Spinner';
import { AddressDialog } from '../address/AddressDialog';
import { CartDialog } from './CartDialog';

function LocationButton() {
  const { location } = useDeliveryLocation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-3 py-2 text-left hover:bg-canvas">
        <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
        <span className="min-w-0 truncate text-sm">
          {location ? <><span className="font-semibold">{location.label}</span><span className="ml-1.5 hidden text-ink-2 md:inline">{location.line}</span></>
            : <span className="font-semibold">Elegí dónde entregar</span>}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-2" />
      </button>
      <AddressDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function SearchBox() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');
  useEffect(() => setValue(params.get('q') ?? ''), [params]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    navigate(value.trim() ? `/?q=${encodeURIComponent(value.trim())}` : '/');
  };
  return (
    <form role="search" onSubmit={submit} className="relative w-full">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar restaurantes o platos"
        aria-label="Buscar restaurantes o platos"
        className="h-10 w-full rounded-full bg-canvas pl-10 pr-4 text-[15px] placeholder:text-ink-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/30"
      />
    </form>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  if (!user) return null;

  const item = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-canvas';
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu"
        className="flex items-center gap-1 rounded-full p-1 hover:bg-canvas">
        <Avatar name={user.name} className="h-8 w-8 text-xs" />
        <span className="sr-only">Menú de {user.name}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-50 w-60 animate-slide-up rounded-xl bg-white p-1.5 shadow-float ring-1 ring-line">
          <p className="truncate px-3 pb-2 pt-1.5 text-sm"><span className="block font-semibold">{user.name}</span><span className="text-ink-3">{user.email}</span></p>
          {user.role === 'client' ? (
            <>
              <Link role="menuitem" to="/pedidos" className={item}><Receipt className="h-4 w-4" /> Mis pedidos</Link>
              <Link role="menuitem" to="/cuenta" className={item}><UserRound className="h-4 w-4" /> Mi cuenta</Link>
            </>
          ) : (
            <Link role="menuitem" to={homeFor(user.role)} className={item}><UserRound className="h-4 w-4" /> Ir a mi panel</Link>
          )}
          <button role="menuitem" type="button" onClick={logout} className={`${item} text-danger-600`}>
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export function ConsumerLayout() {
  const { user } = useAuth();
  const cart = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const isClient = !user || user.role === 'client';

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4">
          <Link to="/" aria-label="CletaEats, inicio" className="shrink-0"><Logo compact={isClient} /></Link>
          {isClient && <div className="min-w-0 flex-1 md:flex-none md:basis-72"><LocationButton /></div>}
          <div className="hidden flex-1 md:block"><SearchBox /></div>
          <nav className="ml-auto flex items-center gap-1">
            {isClient && (
              <button type="button" onClick={() => setCartOpen(true)}
                className="relative inline-flex h-10 items-center gap-1.5 rounded-full px-3 font-semibold hover:bg-canvas"
                aria-label={`Carrito, ${cart.count} productos`}>
                <ShoppingBag className="h-5 w-5" />
                {cart.count > 0 && <span className="money rounded-full bg-brand-600 px-1.5 text-xs text-white">{cart.count}</span>}
              </button>
            )}
            {user ? <UserMenu /> : (
              <>
                <ButtonLink to="/ingresar" variant="ghost" size="sm" className="h-10">Ingresar</ButtonLink>
                <ButtonLink to="/registro" variant="dark" size="sm" className="hidden h-10 sm:inline-flex">Crear cuenta</ButtonLink>
              </>
            )}
          </nav>
        </div>
        <div className="px-4 pb-3 md:hidden"><SearchBox /></div>
      </header>

      <main className="flex-1">
        <Suspense fallback={<PageSpinner />}><Outlet /></Suspense>
      </main>

      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-2 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <NavLink to="/repartidores" className="hover:text-ink">Repartí con nosotros</NavLink>
            {user?.role === 'client' && <NavLink to="/pedidos" className="hover:text-ink">Mis pedidos</NavLink>}
            <span>Heredia, Costa Rica</span>
          </nav>
        </div>
      </footer>

      <CartDialog open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
