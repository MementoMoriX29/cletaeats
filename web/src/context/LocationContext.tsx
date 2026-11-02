// Dónde se entrega: una dirección guardada del cliente o un punto marcado en el mapa (sin cuenta).
// Con esto la lista de restaurantes muestra costo de envío y tiempo estimado.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { readJson, writeJson } from '../lib/storage';
import type { Address } from '../lib/types';
import { useAuth } from './AuthContext';

export interface DeliveryLocation {
  label: string;
  line: string;
  details: string | null;
  lat: number;
  lng: number;
  addressId?: number;
}

interface LocationValue {
  location: DeliveryLocation | null;
  setLocation: (location: DeliveryLocation | null) => void;
  addresses: Address[];
  addressesLoading: boolean;
}

const STORAGE_KEY = 'cleta.location';
const LocationContext = createContext<LocationValue | null>(null);

export const fromAddress = (address: Address): DeliveryLocation => ({
  label: address.label,
  line: address.line,
  details: address.details,
  lat: address.lat,
  lng: address.lng,
  addressId: address.id,
});

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isClient = user?.role === 'client';
  const [location, setLocationState] = useState<DeliveryLocation | null>(() => readJson(STORAGE_KEY, null));

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => get<Address[]>('/me/addresses'),
    enabled: isClient,
  });

  const setLocation = (next: DeliveryLocation | null) => {
    writeJson(STORAGE_KEY, next);
    setLocationState(next);
  };

  // Con sesión de cliente: si la ubicación elegida no es una de sus direcciones, usar la primera guardada
  useEffect(() => {
    if (!isClient || isLoading) return;
    const current = location?.addressId ? addresses.find((a) => a.id === location.addressId) : null;
    if (current) return;
    if (addresses.length) setLocation(fromAddress(addresses[0]));
    else if (location?.addressId) setLocation(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, isLoading, addresses]);

  const value = useMemo(
    () => ({ location, setLocation, addresses: isClient ? addresses : [], addressesLoading: isClient && isLoading }),
    [location, addresses, isClient, isLoading],
  );
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export const useDeliveryLocation = () => {
  const value = useContext(LocationContext);
  if (!value) throw new Error('useDeliveryLocation fuera de LocationProvider');
  return value;
};
