// frontend/src/api/exchangeApi.js
import apiClient from './apiClient';

export const getExchanges = async () => {
  const response = await apiClient.get('/exchanges');
  return response.data;
};

export const getExchange = async (id) => {
  const response = await apiClient.get(`/exchanges/${id}`);
  return response.data;
};

export const createExchange = async (exchangeData) => {
  const response = await apiClient.post('/exchanges', exchangeData);
  return response.data;
};

export const updateExchange = async (id, exchangeData) => {
  const response = await apiClient.put(`/exchanges/${id}`, exchangeData);
  return response.data;
};

export const deleteExchange = async (id) => {
  const response = await apiClient.delete(`/exchanges/${id}`);
  return response.data;
};

export const testExchangeConnection = async (exchangeData) => {
  const response = await apiClient.post('/exchanges/test', exchangeData);
  return response.data;
};

