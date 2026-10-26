// Equivalente a: ReportRepository.kt
import api from './axios';

export const getActiveClients = () => api.get('/reports/clients/active');
export const getSuspendedClients = () => api.get('/reports/clients/suspended');
export const getMostOrdersClients = () => api.get('/reports/clients/most-orders');

export const getRestaurantsReport = () => api.get('/reports/restaurants');
export const getMostOrdersRestaurant = () => api.get('/reports/restaurants/most-orders');
export const getLeastOrdersRestaurant = () => api.get('/reports/restaurants/least-orders');
export const getSalesByRestaurant = () => api.get('/reports/restaurants/sales-by-restaurant');
export const getTotalSales = () => api.get('/reports/restaurants/total-sales');

export const getDeliveryNoWarnings = () => api.get('/reports/delivery-persons/no-warnings');
export const getDeliveryComplaints = () => api.get('/reports/delivery-persons/complaints');

export const getOrdersByClient = () => api.get('/reports/orders/by-client');
export const getPeakHours = () => api.get('/reports/orders/peak-hours');
