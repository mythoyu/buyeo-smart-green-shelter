import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';

interface RightSidebarContextType {
  content: ReactNode | null;
  setContent: (content: ReactNode | null) => void;
  /** 모바일 페이지 항목 시트 열림 상태 (BottomNavigation Sheet) */
  mobileSheetOpen: boolean;
  setMobileSheetOpen: (open: boolean) => void;
  /** 모바일 시트 닫기 (등록 등 모달을 열 때 호출) */
  closeMobileSheet: () => void;
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
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const memoizedSetContent = useCallback((newContent: ReactNode | null) => {
    setContent(newContent);
  }, []);

  const closeMobileSheet = useCallback(() => {
    setMobileSheetOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      content,
      setContent: memoizedSetContent,
      mobileSheetOpen,
      setMobileSheetOpen,
      closeMobileSheet,
    }),
    [content, memoizedSetContent, mobileSheetOpen, closeMobileSheet]
  );

  return (
    <RightSidebarContext.Provider value={value}>
      {children}
    </RightSidebarContext.Provider>
  );
};
