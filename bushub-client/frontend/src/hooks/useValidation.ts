import { useState, useCallback } from 'react';

import { ipSchema, timezoneSchema, ntpServerSchema } from '../lib/validationSchemas';

interface ValidationErrors {
  [key: string]: string;
}

export const useValidation = () => {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateField = useCallback((section: string, field: string, value: string): string => {
    let error = '';

    try {
      if (section === 'softap' && ['interface', 'ssid', 'password'].includes(field)) {
        if (value && value.trim() === '') {
          error = `${field}은(는) 필수 입력 항목입니다.`;
        }
      } else if (section === 'network') {
        if (field === 'interface' && value && value.trim() === '') {
          error = '네트워크 인터페이스는 필수 입력 항목입니다.';
        } else if (field === 'addresses' && value) {
          // CIDR 형식 검증 (예: 192.168.1.10/24)
          const cidrRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/;
          if (!cidrRegex.test(value)) {
            error = 'IP 주소는 CIDR 형식(예: 192.168.1.10/24)으로 입력해주세요.';
          }
        } else if (['gateway', 'subnetmask'].includes(field) && value) {
          const result = ipSchema.safeParse(value);
          if (!result.success) {
            error = result.error.issues[0].message;
          }
        } else if (field === 'nameservers' && value) {
          // DNS 서버들 검증
          const dnsServers = value.split(',').map(s => s.trim());
          for (const dns of dnsServers) {
            if (dns && !ipSchema.safeParse(dns).success) {
              error = 'DNS 서버 주소 형식이 올바르지 않습니다.';
              break;
            }
          }
        }
      } else if (section === 'ntp' && field === 'primaryServer') {
        if (value) {
          const result = ntpServerSchema.safeParse(value);
          if (!result.success) {
            error = result.error.issues[0].message;
          }
        }
      } else if (section === 'ntp' && field === 'fallbackServers') {
        if (value) {
          // 백업 NTP 서버들 검증
          const servers = value.split(',').map(s => s.trim());
          for (const server of servers) {
            if (server && !ntpServerSchema.safeParse(server).success) {
              error = '백업 NTP 서버 주소 형식이 올바르지 않습니다.';
              break;
            }
          }
        }
      } else if (section === 'ntp' && field === 'timezone') {
        if (value) {
          const result = timezoneSchema.safeParse(value);
          if (!result.success) {
            error = result.error.issues[0].message;
          }
        }
      }
    } catch (err) {
      error = '유효성 검사 중 오류가 발생했습니다.';
    }

    return error;
  }, []);

  const setFieldError = useCallback((section: string, field: string, error: string) => {
    setErrors(prev => ({
      ...prev,
      [`${section}.${field}`]: error,
    }));
  }, []);

  const clearFieldError = useCallback((section: string, field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${section}.${field}`];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const hasErrors = useCallback(
    (section?: string): boolean => {
      if (section) {
        return Object.keys(errors).some(key => key.startsWith(`${section}.`));
      }
      return Object.keys(errors).length > 0;
    },
    [errors]
  );

  const getFieldError = useCallback(
    (section: string, field: string): string => {
      return errors[`${section}.${field}`] || '';
    },
    [errors]
  );

  return {
    errors,
    validateField,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    hasErrors,
    getFieldError,
  };
};
