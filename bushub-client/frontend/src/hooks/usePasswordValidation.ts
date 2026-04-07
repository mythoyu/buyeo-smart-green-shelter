import { useMemo } from 'react';

import {
  validatePassword,
  getPasswordStrengthText,
  getValidationStatusColor,
  getValidationIcon,
} from '../utils/passwordValidation';

export const usePasswordValidation = (password: string) => {
  const validation = useMemo(() => {
    if (!password) return null;
    return validatePassword(password);
  }, [password]);

  const strengthText = useMemo(() => {
    if (!validation) return '';
    return getPasswordStrengthText(validation.strength);
  }, [validation]);

  const strengthVariant = useMemo(() => {
    if (!validation) return 'secondary';
    return validation.strength === 'strong' ? 'default' : 'secondary';
  }, [validation]);

  const getValidationItem = (key: string) => {
    if (!validation) return null;

    const detail = validation.details[key as keyof typeof validation.details];
    return {
      isValid: detail.valid,
      message: detail.message,
      color: getValidationStatusColor(detail.valid),
      icon: getValidationIcon(detail.valid),
    };
  };

  return {
    validation,
    strengthText,
    strengthVariant,
    getValidationItem,
    hasValidation: !!validation,
  };
};
