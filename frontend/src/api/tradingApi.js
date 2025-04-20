// frontend/src/api/tradingApi.js
import apiClient from './apiClient';

export const getActiveTrades = async () => {
  const response = await apiClient.get('/trading/positions');
  return response.data;
};

export const getOpenOrders = async () => {
  const response = await apiClient.get('/trading/orders');
  return response.data;
};

export const cancelOrder = async (orderId, exchangeId) => {
  const response = await apiClient.delete(`/trading/orders/${orderId}`, { data: { exchangeId } });
  return response.data;
};

export const closePosition = async (symbol, exchangeId) => {
  const response = await apiClient.post('/trading/positions/close', { symbol, exchangeId });
  return response.data;
};

export const getTradeHistory = async (params) => {
  const response = await apiClient.get('/trading/history', { params });
  return response.data;
};

export const startStrategy = async (strategyId) => {
  const response = await apiClient.post(`/trading/start/${strategyId}`);
  return response.data;
};

export const stopStrategy = async (strategyId) => {
  const response = await apiClient.post(`/trading/stop/${strategyId}`);
  return response.data;
};



