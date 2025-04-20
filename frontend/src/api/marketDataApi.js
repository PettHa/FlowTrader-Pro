// frontend/src/api/marketDataApi.js
import apiClient from './apiClient';

export const getMarketData = async (exchange, symbol, timeframe, startDate, endDate) => {
  const response = await apiClient.get('/market-data', {
    params: { exchange, symbol, timeframe, startDate, endDate }
  });
  return response.data;
};

export const getAvailableSymbols = async (exchange) => {
  const response = await apiClient.get(`/market-data/symbols/${exchange}`);
  return response.data;
};

export const getAvailableTimeframes = async (exchange) => {
  const response = await apiClient.get(`/market-data/timeframes/${exchange}`);
  return response.data;
};