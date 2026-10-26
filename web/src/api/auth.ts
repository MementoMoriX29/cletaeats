// Equivalente a: AuthRepository.kt
import api from './axios';
import type { LoginRequest, RegisterClientRequest, RegisterDeliveryRequest } from '../types';

export const login = (data: LoginRequest) =>
  api.post('/auth/login', data);

export const registerClient = (data: RegisterClientRequest) =>
  api.post('/auth/register-client', data);

export const registerDelivery = (data: RegisterDeliveryRequest) =>
  api.post('/auth/register-delivery-person', data);
