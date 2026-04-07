// 권한 관리 시스템
export const PERMISSIONS = {
  DASHBOARD: 'dashboard:read',
  DEVICE_MANAGEMENT: 'device:manage',
  LOG_ANALYSIS: 'log:read',
  SYSTEM_SETTINGS: 'system:settings',
  SYSTEM_MONITORING: 'system:monitor',
  USER_MANAGEMENT: 'user:manage',
  USER_STATISTICS: 'user:statistics',
} as const;

// 역할별 권한 매핑
export const ROLE_PERMISSIONS = {
  superuser: Object.values(PERMISSIONS), // 모든 권한
  engineer: Object.values(PERMISSIONS), // 모든 권한
  user: [PERMISSIONS.DASHBOARD, PERMISSIONS.DEVICE_MANAGEMENT, PERMISSIONS.LOG_ANALYSIS, PERMISSIONS.SYSTEM_MONITORING], // 대시보드, 현장설정, 로그분석, 시스템모니터링, 사용자관리 (시스템설정 제외)
  'ex-user': [PERMISSIONS.DASHBOARD], // 대시보드만
} as const;

// 권한 체크 함수
export const hasPermission = (userRole: string, permission: string): boolean => {
  const rolePermissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
  return rolePermissions.includes(permission as any);
};

// 페이지별 권한 매핑
export const PAGE_PERMISSIONS = {
  '/dashboard': PERMISSIONS.DASHBOARD,
  '/device-registration': PERMISSIONS.DEVICE_MANAGEMENT,
  '/log-analysis': PERMISSIONS.LOG_ANALYSIS,
  '/system-settings': PERMISSIONS.SYSTEM_SETTINGS,
  '/system-monitoring': PERMISSIONS.SYSTEM_MONITORING,
  '/users': PERMISSIONS.USER_MANAGEMENT,
  '/user-statistics': PERMISSIONS.USER_STATISTICS,
} as const;

// 페이지 접근 권한 체크
export const canAccessPage = (userRole: string, path: string): boolean => {
  const permission = PAGE_PERMISSIONS[path as keyof typeof PAGE_PERMISSIONS];
  const hasAccess = hasPermission(userRole, permission);

  if (!permission) return true; // 권한이 정의되지 않은 페이지는 접근 허용
  return hasAccess;
};

// 역할별 표시명
export const ROLE_DISPLAY_NAMES = {
  superuser: '시스템 관리자',
  engineer: '엔지니어',
  user: '내부 사용자',
  'ex-user': '외부 사용자',
} as const;

// 역할 표시명 가져오기
export const getRoleDisplayName = (role: string): string => {
  return ROLE_DISPLAY_NAMES[role as keyof typeof ROLE_DISPLAY_NAMES] || '사용자';
};
