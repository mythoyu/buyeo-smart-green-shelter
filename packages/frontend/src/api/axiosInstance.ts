import axios, { InternalAxiosRequestConfig } from 'axios';

import { VITE_DEV_SERVER_PORTS, devBackendApiUrl } from '@/constants/devPorts';

// 환경에 따른 API base URL 설정
const getApiBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  if (apiUrl) {
    return apiUrl;
  }

  const { hostname } = window.location;
  const { port } = window.location;

  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    if (port && (VITE_DEV_SERVER_PORTS.has(port) || port === '8081')) {
      return devBackendApiUrl(hostname);
    }
  }

  return devBackendApiUrl(hostname);
};

// 로그인용 인스턴스 (인증 불필요)
export const authApi = axios.create({
  baseURL: getApiBaseUrl() + '/internal',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 150000, // 2.5분 타임아웃
});

// 내부 API용 인스턴스 (인증 필요) - 내부 시스템용
export const internalApi = axios.create({
  baseURL: getApiBaseUrl() + '/internal',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 150000, // 2.5분 타임아웃
});

// 외부 클라이언트용 인스턴스 (인증 필요) - 외부 클라이언트용
export const externalApi = axios.create({
  baseURL: getApiBaseUrl() + '/external',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 150000, // 2.5분 타임아웃
});

// 요청 인터셉터: sessionStorage의 accessToken(apiKey)을 Authorization 헤더에 자동 첨부
const attachApiKey = (config: InternalAxiosRequestConfig) => {
  const apiKey = sessionStorage.getItem('accessToken');
  if (apiKey && config.headers) {
    config.headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return config;
};

internalApi.interceptors.request.use(attachApiKey);
externalApi.interceptors.request.use(attachApiKey);
