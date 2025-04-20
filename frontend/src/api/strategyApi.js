// frontend/src/api/strategyApi.js
import apiClient from './apiClient';

export const getStrategies = async () => {
  const response = await apiClient.get('/strategies');
  return response.data;
};

export const getStrategy = async (id) => {
  const response = await apiClient.get(`/strategies/${id}`);
  return response.data;
};

export const createStrategy = async (strategyData) => {
  const response = await apiClient.post('/strategies', strategyData);
  return response.data;
};

export const updateStrategy = async (id, strategyData) => {
  const response = await apiClient.put(`/strategies/${id}`, strategyData);
  return response.data;
};

export const deleteStrategy = async (id) => {
  const response = await apiClient.delete(`/strategies/${id}`);
  return response.data;
};