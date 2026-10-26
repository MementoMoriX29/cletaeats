// Equivalente a: NavHost + NavGraph en Jetpack Compose
// Protección de rutas por rol (equivalente a AuthGuard en Android)

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AppLayout } from './components/Layout/AppLayout';
import type { UserRole } from './types';

// Auth
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';

// Client
import { ClientHome } from './pages/client/Home';
import { RestaurantDetail } from './pages/client/Restaurant';
import { Cart } from './pages/client/Cart';
import { OrderTracking } from './pages/client/OrderTracking';
import { ClientHistory } from './pages/client/History';
import { Profile } from './pages/client/Profile';

// Delivery
import { DeliveryDashboard } from './pages/delivery/Dashboard';
import { DeliveryHistory } from './pages/delivery/History';
import { DeliveryComplaints } from './pages/delivery/Complaints';
import { DeliveryRatings } from './pages/delivery/Ratings';
import { DeliveryProfile } from './pages/delivery/Profile';

// Admin
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminClients } from './pages/admin/Clients';
import { AdminRestaurants } from './pages/admin/Restaurants';
import { AdminDeliveryPersons } from './pages/admin/DeliveryPersons';
import { AdminReports } from './pages/admin/Reports';
import { RatingScreen } from './pages/client/Rating';

// Guard por rol
const RoleGuard = ({ roles }: { roles: UserRole[] }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><span className="text-primary">Cargando...</span></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const PublicOnly = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) {
    const dest = user.role === 'cliente' ? '/client/home' : user.role === 'repartidor' ? '/delivery/dashboard' : '/admin/dashboard';
    return <Navigate to={dest} replace />;
  }
  return <Outlet />;
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1E1E1E', color: '#FFFFFF', border: '1px solid #374151' },
            }}
          />
          <Routes>
            {/* Públicas */}
            <Route element={<PublicOnly />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Cliente */}
            <Route element={<RoleGuard roles={['cliente']} />}>
              <Route element={<AppLayout />}>
                <Route path="/client/home" element={<ClientHome />} />
                <Route path="/client/restaurant/:id" element={<RestaurantDetail />} />
                <Route path="/client/cart" element={<Cart />} />
                <Route path="/client/order/:id" element={<OrderTracking />} />
                <Route path="/client/order/:id/rate" element={<RatingScreen />} />
                <Route path="/client/history" element={<ClientHistory />} />
                <Route path="/client/profile" element={<Profile />} />
              </Route>
            </Route>

            {/* Repartidor */}
            <Route element={<RoleGuard roles={['repartidor']} />}>
              <Route element={<AppLayout />}>
                <Route path="/delivery/dashboard"  element={<DeliveryDashboard />} />
                <Route path="/delivery/history"    element={<DeliveryHistory />} />
                <Route path="/delivery/ratings"    element={<DeliveryRatings />} />
                <Route path="/delivery/complaints" element={<DeliveryComplaints />} />
                <Route path="/delivery/profile"    element={<DeliveryProfile />} />
              </Route>
            </Route>

            {/* Admin */}
            <Route element={<RoleGuard roles={['admin']} />}>
              <Route element={<AppLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/clients" element={<AdminClients />} />
                <Route path="/admin/restaurants" element={<AdminRestaurants />} />
                <Route path="/admin/delivery-persons" element={<AdminDeliveryPersons />} />
                <Route path="/admin/reports" element={<AdminReports />} />
              </Route>
            </Route>

            {/* Raíz → Login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
