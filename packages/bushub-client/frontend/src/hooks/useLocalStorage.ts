import { useState, useCallback } from 'react';

const LS_KEY = 'system_settings_local';

export const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(LS_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        return parsed[key] !== undefined ? parsed[key] : defaultValue;
      }
    } catch (error) {
      console.warn('로컬스토리지 읽기 실패:', error);
    }
    return defaultValue;
  });

  const setStoredValue = useCallback(
    (newValue: T) => {
      try {
        const item = localStorage.getItem(LS_KEY);
        const parsed = item ? JSON.parse(item) : {};
        parsed[key] = newValue;
        localStorage.setItem(LS_KEY, JSON.stringify(parsed));
        setValue(newValue);
      } catch (error) {
        console.warn('로컬스토리지 저장 실패:', error);
      }
    },
    [key]
  );

  const removeStoredValue = useCallback(() => {
    try {
      const item = localStorage.getItem(LS_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        delete parsed[key];
        localStorage.setItem(LS_KEY, JSON.stringify(parsed));
        setValue(defaultValue);
      }
    } catch (error) {
      console.warn('로컬스토리지 삭제 실패:', error);
    }
  }, [key, defaultValue]);

  return [value, setStoredValue, removeStoredValue] as const;
};
