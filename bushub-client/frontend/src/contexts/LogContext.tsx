import React, { createContext, useContext, useState, ReactNode } from 'react';

import { LogMessage, CommandStatusMessage } from '../hooks/useWebSocket';

interface LogContextType {
  isLogPanelOpen: boolean;
  toggleLogPanel: () => void;
  openLogPanel: () => void;
  closeLogPanel: () => void;
  isLogPanelExpanded: boolean;
  toggleLogPanelExpanded: () => void;
  logs: (LogMessage | CommandStatusMessage)[];
  addLog: (log: LogMessage | CommandStatusMessage) => void;
  clearLogs: () => void;
  logCount: number;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export const useLogContext = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLogContext must be used within a LogProvider');
  }
  return context;
};

interface LogProviderProps {
  children: ReactNode;
}

export const LogProvider: React.FC<LogProviderProps> = ({ children }) => {
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(false);
  const [isLogPanelExpanded, setIsLogPanelExpanded] = useState(false);
  const [logs, setLogs] = useState<(LogMessage | CommandStatusMessage)[]>([]);

  const toggleLogPanel = () => setIsLogPanelOpen(!isLogPanelOpen);
  const openLogPanel = () => setIsLogPanelOpen(true);
  const closeLogPanel = () => setIsLogPanelOpen(false);
  const toggleLogPanelExpanded = () => setIsLogPanelExpanded(!isLogPanelExpanded);

  const addLog = (log: LogMessage | CommandStatusMessage) => {
    setLogs(prev => {
      const newLogs = [log, ...prev.slice(0, 99)]; // 최대 100개 유지
      return newLogs;
    });
  };

  const clearLogs = () => setLogs([]);

  const value: LogContextType = {
    isLogPanelOpen,
    toggleLogPanel,
    openLogPanel,
    closeLogPanel,
    isLogPanelExpanded,
    toggleLogPanelExpanded,
    logs,
    addLog,
    clearLogs,
    logCount: logs.length,
  };

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
};
