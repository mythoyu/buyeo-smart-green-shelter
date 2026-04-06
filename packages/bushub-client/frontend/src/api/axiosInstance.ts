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
