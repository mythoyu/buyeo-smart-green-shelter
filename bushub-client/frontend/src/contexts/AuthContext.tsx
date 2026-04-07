import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  role: 'superuser' | 'user' | 'engineer' | 'ex-user';
  apiKey?: {
    id: string;
    name: string;
    key: string;
    type: 'internal' | 'external' | 'universal';
    permissions?: string[];
  };
  companyId?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  setIsLoggedIn: (v: boolean) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // sessionStorage에서 초기값 읽기 (accessToken → apiKey)
  const [isLoggedIn, setIsLoggedInState] = useState<boolean>(!!sessionStorage.getItem('accessToken'));
  const [user, setUserState] = useState<User | null>(() => {
    const savedUser = sessionStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // setUser, setIsLoggedIn이 호출될 때 sessionStorage도 동기화
  const setUser = (user: User | null) => {
    setUserState(user);
    if (user) {
      sessionStorage.setItem('user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('user');
    }
  };
  const setIsLoggedIn = (v: boolean) => {
    setIsLoggedInState(v);
    // 로그인/로그아웃 시 accessToken 존재 여부로 판별
    if (!v) {
      sessionStorage.removeItem('accessToken');
    }
  };

  const isAdmin = user?.role === 'superuser';

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        user,
        setUser,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
