// 비밀번호 강도 평가 및 디자인/UX 헬퍼 함수만 남김
import { passwordSchema } from '../lib/validationSchemas';

// 연속 문자 검사
function hasSequentialChars(password: string): boolean {
  for (let i = 0; i < password.length - 2; i++) {
    const char1 = password.charCodeAt(i);
    const char2 = password.charCodeAt(i + 1);
    const char3 = password.charCodeAt(i + 2);
    if (char2 === char1 + 1 && char3 === char2 + 1) {
      return true;
    }
  }
  return false;
}

// 반복 문자 검사
function hasRepeatedChars(password: string): boolean {
  for (let i = 0; i < password.length - 2; i++) {
    if (password[i] === password[i + 1] && password[i + 1] === password[i + 2]) {
      return true;
    }
  }
  return false;
}

// zod 스키마를 사용한 비밀번호 검증 함수 (기존 코드 호환성)
export function validatePassword(password: string) {
  const result = passwordSchema.safeParse(password);

  if (result.success) {
    const strength = getPasswordStrength(password);
    return {
      isValid: true,
      strength,
      errors: [],
      details: {
        length: { valid: true, message: '8자 이상' },
        characterTypes: { valid: true, message: '문자종류 3가지 이상' },
        sequential: { valid: true, message: '연속문자 없음' },
        repeated: { valid: true, message: '반복문자 없음' },
      },
    };
  }
  const strength = getPasswordStrength(password);
  const errors = result.error.issues.map((e: { message: string }) => e.message);

  // 상세 검증 결과 생성 (validationSchemas.ts의 함수 활용)
  const details = {
    length: {
      valid: password.length >= 8,
      message: '8자 이상',
    },
    characterTypes: {
      valid:
        [/[A-Z]/, /[a-z]/, /[0-9]/, /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/].filter(r => r.test(password)).length >= 3,
      message: '문자종류 3가지 이상',
    },
    sequential: {
      valid: !hasSequentialChars(password),
      message: '연속문자 없음',
    },
    repeated: {
      valid: !hasRepeatedChars(password),
      message: '반복문자 없음',
    },
  };

  return {
    isValid: false,
    strength,
    errors,
    details,
  };
}

// 강도 평가: weak/medium/strong
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  // 문자 종류 개수
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const charTypes = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars].filter(Boolean).length;

  if (password.length >= 12 && charTypes === 4) return 'strong';
  if (password.length >= 10 && charTypes >= 3) return 'medium';
  return 'weak';
}

export function getPasswordStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'bg-red-500 text-white';
    case 'medium':
      return 'bg-yellow-500 text-white';
    case 'strong':
      return 'bg-green-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

export function getPasswordStrengthText(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return '약함';
    case 'medium':
      return '보통';
    case 'strong':
      return '강함';
    default:
      return '';
  }
}

// 실시간 검증 상태를 위한 헬퍼 함수
export function getValidationStatusColor(isValid: boolean): string {
  return isValid ? 'text-green-600' : 'text-red-600';
}

export function getValidationIcon(isValid: boolean): string {
  return isValid ? '✓' : '✗';
}
