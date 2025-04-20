// frontend/src/api/backtestApi.js
import apiClient from './apiClient';

export const runBacktest = async (strategyId, backtestParams) => {
  const response = await apiClient.post(`/backtest/run/${strategyId}`, backtestParams);
  return response.data;
};

export const getBacktestResults = async (strategyId) => {
  const response = await apiClient.get(`/backtest/results/${strategyId}`);
  return response.data;
};

export const getBacktestResult = async (resultId) => {
  const response = await apiClient.get(`/backtest/result/${resultId}`);
  return response.data;
};

