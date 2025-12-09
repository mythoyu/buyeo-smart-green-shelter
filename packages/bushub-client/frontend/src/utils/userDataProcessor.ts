import type { User, ApiKey } from '../hooks/useUserManagement';

// 백엔드 응답을 프론트엔드 형식으로 변환
export const processUserData = (user: any): User => {
  return {
    ...user,
    username: user.name || user.username, // 백엔드에서 name 필드로 오는 경우 처리
  };
};

// API 키 데이터 처리
export const processApiKeyData = (apiKey: any): ApiKey => {
  return {
    ...apiKey,
    // name 필드를 username으로 매핑 (백엔드 호환성)
    username: apiKey.username || apiKey.name,
    // 필요한 경우 추가 데이터 처리
  };
};

// 사용자 데이터 검증
export const validateUserData = (userData: Partial<User>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!userData.username && !userData.name) {
    errors.push('사용자명은 필수입니다.');
  }

  if (!userData.role) {
    errors.push('권한은 필수입니다.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// 사용자별 API 키 매칭
export const matchUserWithApiKey = (user: User, apiKeys: ApiKey[]): ApiKey | null => {
  return apiKeys.find(key => key.username === (user.name || user.username)) || null;
};

// 기본 API 키 생성 (API 키가 없을 경우)
export const createDefaultApiKey = (user: User): ApiKey => {
  const userName = user.name || user.username;
  return {
    id: `default-${user.id}`,
    username: userName,
    key: `${userName}_universal_key_${new Date().getFullYear()}`,
    type: user.role === 'superuser' ? 'universal' : 'external',
    permissions: [],
    status: 'active',
    createdAt: new Date().toISOString(),
    description: `${userName} 기본 API 키`,
    createdBy: user.id,
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
    },
  };
};

// 사용자 역할별 필터링
export const filterUsersByRole = (users: User[], role: string): User[] => {
  if (role === 'all') return users;
  return users.filter(user => user.role === role);
};

// 사용자 검색
export const searchUsers = (users: User[], searchTerm: string): User[] => {
  if (!searchTerm) return users;

  const lowerSearchTerm = searchTerm.toLowerCase();
  return users.filter(
    user =>
      user.username.toLowerCase().includes(lowerSearchTerm) ||
      (user.name && user.name.toLowerCase().includes(lowerSearchTerm)) ||
      user.role.toLowerCase().includes(lowerSearchTerm)
  );
};

// 사용자 정렬
export const sortUsers = (
  users: User[],
  sortBy: 'username' | 'role' | 'createdAt' = 'username',
  order: 'asc' | 'desc' = 'asc'
): User[] => {
  return [...users].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortBy) {
      case 'username':
        aValue = a.name || a.username;
        bValue = b.name || b.username;
        break;
      case 'role':
        aValue = a.role;
        bValue = b.role;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
        break;
      default:
        aValue = a.name || a.username;
        bValue = b.name || b.username;
    }

    if (order === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    }
    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
  });
};
