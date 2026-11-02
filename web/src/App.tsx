// Rutas de la aplicación. Un solo login: cada rol entra a su propia sección.
//   Clientes y visitantes: /, /restaurante/:id, /checkout, /pedidos, /cuenta
//   Repartidores: /repartidor (la solicitud se envía desde /repartidores)
//   Restaurantes: /negocio
//   Soporte: /admin (no tiene enlace público)
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { LocationProvider } from './context/LocationContext';
import { CartProvider } from './context/CartContext';
import { ConsumerLayout } from './components/layout/ConsumerLayout';
import { RequireRole } from './components/RequireRole';
import { PageSpinner } from './components/ui/Spinner';
import Home from './pages/public/Home';

// Cada sección se descarga cuando se visita (el panel de soporte no viaja en la app del cliente)
const Store = lazy(() => import('./pages/public/Store'));
const Login = lazy(() => import('./pages/public/Login'));
const Register = lazy(() => import('./pages/public/Register'));
const CourierApply = lazy(() => import('./pages/public/CourierApply'));
const NotFound = lazy(() => import('./pages/public/NotFound'));

const Checkout = lazy(() => import('./pages/client/Checkout'));
const Orders = lazy(() => import('./pages/client/Orders'));
const OrderDetail = lazy(() => import('./pages/client/OrderDetail'));
const Account = lazy(() => import('./pages/client/Account'));

const CourierLayout = lazy(() => import('./components/layout/CourierLayout').then((m) => ({ default: m.CourierLayout })));
const CourierHome = lazy(() => import('./pages/courier/CourierHome'));
const CourierEarnings = lazy(() => import('./pages/courier/CourierEarnings'));
const CourierAccount = lazy(() => import('./pages/courier/CourierAccount'));

const MerchantLayout = lazy(() => import('./pages/merchant/MerchantLayout').then((m) => ({ default: m.MerchantLayout })));
const MerchantOrders = lazy(() => import('./pages/merchant/MerchantOrders'));
const MerchantMenu = lazy(() => import('./pages/merchant/MerchantMenu'));
const MerchantSettings = lazy(() => import('./pages/merchant/MerchantSettings'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminCouriers = lazy(() => import('./pages/admin/AdminCouriers'));
const AdminRestaurants = lazy(() => import('./pages/admin/AdminRestaurants'));
const AdminClients = lazy(() => import('./pages/admin/AdminClients'));
const AdminIncidents = lazy(() => import('./pages/admin/AdminIncidents'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      // Un 4xx (sin permiso, no existe) no se arregla reintentando
      retry: (failures, error) =>
        !(axios.isAxiosError(error) && error.response && error.response.status < 500) && failures < 2,
    },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route element={<ConsumerLayout />}>
          <Route index element={<Home />} />
          <Route path="restaurante/:id" element={<Store />} />
          <Route path="checkout" element={<RequireRole roles={['client']}><Checkout /></RequireRole>} />
          <Route path="pedidos" element={<RequireRole roles={['client']}><Orders /></RequireRole>} />
          <Route path="pedidos/:id" element={<RequireRole roles={['client']}><OrderDetail /></RequireRole>} />
          <Route path="cuenta" element={<RequireRole roles={['client']}><Account /></RequireRole>} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="ingresar" element={<Login />} />
        <Route path="registro" element={<Register />} />
        <Route path="repartidores" element={<CourierApply />} />

        <Route path="repartidor" element={<RequireRole roles={['courier']}><CourierLayout /></RequireRole>}>
          <Route index element={<CourierHome />} />
          <Route path="ganancias" element={<CourierEarnings />} />
          <Route path="cuenta" element={<CourierAccount />} />
        </Route>

        <Route path="negocio" element={<RequireRole roles={['restaurant']}><MerchantLayout /></RequireRole>}>
          <Route index element={<MerchantOrders />} />
          <Route path="menu" element={<MerchantMenu />} />
          <Route path="ajustes" element={<MerchantSettings />} />
        </Route>

        <Route path="admin" element={<RequireRole roles={['admin']}><AdminLayout /></RequireRole>}>
          <Route index element={<AdminOverview />} />
          <Route path="pedidos" element={<AdminOrders />} />
          <Route path="repartidores" element={<AdminCouriers />} />
          <Route path="restaurantes" element={<AdminRestaurants />} />
          <Route path="clientes" element={<AdminClients />} />
          <Route path="reportes" element={<AdminIncidents />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <LocationProvider>
            <CartProvider>
              <BrowserRouter>
                <ScrollToTop />
                <AppRoutes />
              </BrowserRouter>
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 3500,
                  style: { background: '#17201B', color: '#fff', borderRadius: '12px', fontSize: '14px', fontWeight: 600, maxWidth: '420px' },
                  success: { iconTheme: { primary: '#12855F', secondary: '#fff' } },
                  error: { iconTheme: { primary: '#C42B2B', secondary: '#fff' } },
                }}
              />
            </CartProvider>
          </LocationProvider>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
