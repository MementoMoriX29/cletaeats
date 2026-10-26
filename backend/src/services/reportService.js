const clientRepo     = require('../repositories/clientRepository');
const restaurantRepo = require('../repositories/restaurantRepository');
const deliveryRepo   = require('../repositories/deliveryPersonRepository');
const orderRepo      = require('../repositories/orderRepository');

const getActiveClients      = () => clientRepo.getActive();
const getSuspendedClients   = () => clientRepo.getSuspended();
const getClientsMostOrders  = () => clientRepo.getMostOrders();

const listRestaurants          = () => restaurantRepo.getAll();
const getRestaurantMostOrders  = () => restaurantRepo.getMostOrders();
const getRestaurantLeastOrders = () => restaurantRepo.getLeastOrders();
const getSalesByRestaurant     = () => restaurantRepo.getSalesByRestaurant();
const getTotalSales            = () => restaurantRepo.getTotalSales();

const getDeliveryPersonsNoWarnings = () => deliveryRepo.getNoWarnings();
const getDeliveryPersonsComplaints = () => deliveryRepo.getWithComplaints();

const getOrdersByClient = () => orderRepo.getOrdersByClient();
const getPeakHours      = () => orderRepo.getPeakHours();

module.exports = {
  getActiveClients, getSuspendedClients, getClientsMostOrders,
  listRestaurants, getRestaurantMostOrders, getRestaurantLeastOrders,
  getSalesByRestaurant, getTotalSales,
  getDeliveryPersonsNoWarnings, getDeliveryPersonsComplaints,
  getOrdersByClient, getPeakHours,
};
