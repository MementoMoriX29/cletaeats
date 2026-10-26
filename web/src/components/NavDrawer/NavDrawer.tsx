// Equivalente a: NavigationDrawer en Compose / ModalNavigationDrawer
// Pattern: Observer — escucha AuthContext para adaptar items según rol

import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, ShoppingCart, Clock, User, Truck, LayoutDashboard,
  Users, UtensilsCrossed, BarChart2, Menu, X, LogOut, Bike, AlertCircle, Star,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const clientLinks = [
  { to: '/client/home', icon: Home, label: 'Inicio' },
  { to: '/client/cart', icon: ShoppingCart, label: 'Carrito' },
  { to: '/client/history', icon: Clock, label: 'Historial' },
  { to: '/client/profile', icon: User, label: 'Perfil' },
];

const deliveryLinks = [
  { to: '/delivery/dashboard',   icon: Bike,        label: 'Dashboard' },
  { to: '/delivery/history',     icon: Clock,       label: 'Historial' },
  { to: '/delivery/ratings',     icon: Star,        label: 'Calificaciones' },
  { to: '/delivery/complaints',  icon: AlertCircle, label: 'Quejas' },
  { to: '/delivery/profile',     icon: User,        label: 'Perfil' },
];

const adminLinks = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/clients', icon: Users, label: 'Clientes' },
  { to: '/admin/restaurants', icon: UtensilsCrossed, label: 'Restaurantes' },
  { to: '/admin/delivery-persons', icon: Truck, label: 'Repartidores' },
  { to: '/admin/reports', icon: BarChart2, label: 'Reportes' },
];

export const NavDrawer = () => {
  const { user, logout, isRole } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = isRole('cliente') ? clientLinks : isRole('repartidor') ? deliveryLinks : adminLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavContent = () => (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <span className="text-primary font-bold text-xl">CletaEats</span>
        <p className="text-muted-foreground text-xs mt-1">{user?.nombre}</p>
        <p className="text-muted-foreground text-xs capitalize">{user?.role}</p>
      </div>

      {/* Links */}
      <ul className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-secondary hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
              {label === 'Carrito' && itemCount > 0 && (
                <span className="ml-auto bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-destructive w-full transition-colors"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop — sidebar fijo */}
      <aside className="hidden md:flex w-60 bg-background border-r border-border flex-col h-screen sticky top-0">
        <NavContent />
      </aside>

      {/* Mobile — hamburger */}
      <div className="md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="fixed top-4 left-4 z-50 bg-surface p-2 rounded-lg text-white"
        >
          <Menu size={22} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setOpen(false)} />
            <aside className="fixed left-0 top-0 h-full w-64 bg-background z-50 border-r border-border">
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground"
              >
                <X size={20} />
              </button>
              <NavContent />
            </aside>
          </>
        )}
      </div>
    </>
  );
};
