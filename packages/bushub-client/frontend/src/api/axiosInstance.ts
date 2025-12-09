import axios, { InternalAxiosRequestConfig } from 'axios';

// 환경에 따른 API base URL 설정
const getApiBaseUrl = () => {
  // 환경변수에서 API URL 가져오기
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  if (apiUrl) {
    return apiUrl;
  }

  // 환경변수가 없는 경우 동적으로 설정
  const { hostname } = window.location;
  const { port } = window.location;

  console.log('🔍 API URL 설정:', { hostname, port, location: window.location.href });

  // 외부 접속인 경우 (localhost가 아닌 경우)
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    // 프론트엔드 포트가 4173이면 백엔드는 3000
    if (port === '4173') {
      const apiUrl = `http://${hostname}:3000/api/v1`;
      console.log('🌐 외부 접속 API URL:', apiUrl);
      return apiUrl;
    }
    // 프론트엔드 포트가 8081이면 백엔드는 3000 (nginx 프록시)
    if (port === '8081') {
      const apiUrl = `http://${hostname}:3000/api/v1`;
      console.log('🌐 외부 접속 API URL (Nginx):', apiUrl);
      return apiUrl;
    }
  }

  // 기본값 (동적 설정)
  const defaultUrl = `http://${hostname}:3000/api/v1`;
  console.log('🏠 기본 API URL:', defaultUrl);
  return defaultUrl;
};

// Network Control API용 base URL 설정
const getNetworkControlApiBaseUrl = () => {
  // 환경변수에서 Network Control API URL 가져오기
  const networkApiUrl = import.meta.env.VITE_NETWORK_CONTROL_API_URL;

  if (networkApiUrl) {
    return networkApiUrl;
  }

  // 환경변수가 없는 경우 동적으로 설정
  const { hostname } = window.location;
  const { port } = window.location;

  console.log('🔍 Network Control API URL 설정:', { hostname, port });

  // nginx를 통한 프록시 사용 (권장)
  if (port === '80' || port === '') {
    // nginx를 통해 /network/* 요청을 Network Control API로 프록시
    const networkUrl = `http://${hostname}/network`;
    console.log('🌐 Network Control API URL (Nginx 프록시):', networkUrl);
    return networkUrl;
  }

  // 직접 호출 (개발용)
  const directUrl = `http://${hostname}:3001/api`;
  console.log('🏠 Network Control API URL (직접 호출):', directUrl);
  return directUrl;
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

// Network Control API용 인스턴스 (인증 필요) - 네트워크 제어용
export const networkControlApi = axios.create({
  baseURL: getNetworkControlApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
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
networkControlApi.interceptors.request.use(attachApiKey);
