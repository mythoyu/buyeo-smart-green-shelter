import React from 'react';

// 공통 라우팅 설정 및 유틸리티 (React Router v7)

export interface RouteConfig {
  path: string;
  name: string;
  component?: React.ComponentType;
  children?: RouteConfig[];
  meta?: {
    title?: string;
    requiresAuth?: boolean;
    roles?: string[];
  };
}

// 공통 라우트 경로 상수
export const ROUTES = {
  // SmartCity Platform 라우트
  SMART_CITY: {
    HOME: '/',
    DASHBOARD: '/dashboard',
    SETTINGS: '/settings',
    REPORTS: '/reports',
    TEST_SPACING: '/test-spacing',
  },

  // 스마트 그린 쉼터 라우트 (미사용)
  BUS_HUB: {
    HOME: '/',
    SCHEDULE: '/schedule',
    ROUTES: '/routes',
    STATIONS: '/stations',
    ADMIN: '/admin',
  },

  // 하드웨어 제어 라우트
  HARDWARE: {
    CONTROL: '/hardware-control',
  },

  // 공통 라우트
  COMMON: {
    LOGIN: '/login',
    LOGOUT: '/logout',
    PROFILE: '/profile',
    NOT_FOUND: '/404',
  },
} as const;

// 라우트 가드 유틸리티
export const routeGuard = {
  // 인증 필요 여부 확인
  requireAuth: (route: RouteConfig): boolean => {
    return route.meta?.requiresAuth ?? false;
  },

  // 권한 확인
  hasRole: (route: RouteConfig, userRoles: string[]): boolean => {
    if (!route.meta?.roles) return true;
    return route.meta.roles.some(role => userRoles.indexOf(role) !== -1);
  },

  // 페이지 제목 설정
  setPageTitle: (title?: string): void => {
    if (title) {
      document.title = `${title} - SmartCity Platform`;
    }
  },
};

// 라우트 헬퍼 함수
export const routeHelpers = {
  // 현재 경로가 활성 상태인지 확인
  isActive: (currentPath: string, targetPath: string): boolean => {
    return currentPath === targetPath || currentPath.startsWith(targetPath + '/');
  },

  // 경로 파라미터 추출
  extractParams: (path: string, pattern: string): Record<string, string> => {
    const params: Record<string, string> = {};
    const pathParts = path.split('/');
    const patternParts = pattern.split('/');

    patternParts.forEach((part, index) => {
      if (part.startsWith(':')) {
        const paramName = part.slice(1);
        params[paramName] = pathParts[index] || '';
      }
    });

    return params;
  },

  // React Router v7의 새로운 기능들을 활용한 유틸리티
  // 라우트 객체 생성 (createBrowserRouter용)
  createRouteObject: (config: RouteConfig): any => {
    return {
      path: config.path,
      element: config.component ? React.createElement(config.component) : undefined,
      children: config.children?.map(child => routeHelpers.createRouteObject(child)),
      meta: config.meta,
    };
  },

  // 중첩 라우트 생성
  createNestedRoutes: (parentPath: string, routes: RouteConfig[]): RouteConfig[] => {
    return routes.map(route => ({
      ...route,
      path: `${parentPath}${route.path}`,
    }));
  },
};
