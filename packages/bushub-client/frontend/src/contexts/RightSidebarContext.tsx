import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';

interface RightSidebarContextType {
  content: ReactNode | null;
  setContent: (content: ReactNode | null) => void;
}

const RightSidebarContext = createContext<RightSidebarContextType | undefined>(undefined);

export const useRightSidebar = () => {
  const context = useContext(RightSidebarContext);
  if (!context) {
    throw new Error('useRightSidebar must be used within RightSidebarProvider');
  }
  return context;
};

interface RightSidebarProviderProps {
  children: ReactNode;
}

export const RightSidebarProvider: React.FC<RightSidebarProviderProps> = ({ children }) => {
  const [content, setContent] = useState<ReactNode | null>(null);

  // setContent를 useCallback으로 메모이제이션 (안정적인 참조 보장)
  const memoizedSetContent = useCallback((newContent: ReactNode | null) => {
    setContent(newContent);
  }, []);

  // Context value 메모이제이션 (불필요한 리렌더 방지)
  const value = useMemo(
    () => ({
      content,
      setContent: memoizedSetContent,
    }),
    [content, memoizedSetContent]
  );

  return (
    <RightSidebarContext.Provider value={value}>
      {children}
    </RightSidebarContext.Provider>
  );
};
