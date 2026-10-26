// Equivalente a: Scaffold en Jetpack Compose
import { Outlet } from 'react-router-dom';
import { NavDrawer } from '../NavDrawer/NavDrawer';

export const AppLayout = () => (
  <div className="flex min-h-screen bg-background text-white">
    <NavDrawer />
    <main className="flex-1 p-4 md:p-6 md:ml-0 overflow-y-auto">
      <Outlet />
    </main>
  </div>
);
