import { z } from 'zod';

// 공통 비밀번호 검증 유틸리티 함수들
export function hasSequentialChars(password: string): boolean {
  const sequentialPatterns = [
    'abcdefghijklmnopqrstuvwxyz',
    'zyxwvutsrqponmlkjihgfedcba',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'ZYXWVUTSRQPONMLKJIHGFEDCBA',
    '0123456789',
    '9876543210',
    'qwertyuiop',
    'poiuytrewq',
    'asdfghjkl',
    'lkjhgfdsa',
    'zxcvbnm',
    'mnbvcxz',
  ];

  for (const pattern of sequentialPatterns) {
    for (let i = 0; i <= pattern.length - 3; i++) {
      const sequence = pattern.substring(i, i + 3);
      if (password.toLowerCase().includes(sequence)) return true;
    }
  }
  return false;
}

export function hasRepeatedChars(password: string): boolean {
  for (let i = 0; i <= password.length - 3; i++) {
    if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
      return true;
    }
  }
  return false;
}

// 기본 스키마
export const stringRequired = z.string().min(1, { message: '필수 입력 항목입니다.' });
export const numberRequired = z.number({ message: '숫자를 입력하세요.' });
export const booleanRequired = z.boolean();
export const dateRequired = z.string().refine(v => !isNaN(Date.parse(v)), {
  message: '올바른 날짜 형식이 아닙니다.',
});

// URL 등 zod 내장
export const urlSchema = z.string().url({ message: '올바른 URL을 입력하세요.' });

// 숫자 min/max
export const intSchema = z.number().int({ message: '정수를 입력하세요.' });
export const floatSchema = z.number({ message: '실수를 입력하세요.' });
export const positiveNumber = z.number().positive({ message: '양수를 입력하세요.' });
export const nonNegativeNumber = z.number().min(0, { message: '0 이상의 값을 입력하세요.' });

// 커스텀 스키마
export const ipSchema = z
  .string()
  .regex(/^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, {
    message: '올바른 IP 주소를 입력하세요.',
  });
export const domainSchema = z.string().regex(/^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/, {
  message: '유효한 도메인 형식이 아닙니다.',
});
export const timezoneSchema = z.string().regex(/^([A-Za-z]+\/)+[A-Za-z_]+$/, {
  message: '올바른 타임존을 입력하세요. 예: Asia/Seoul',
});
export const ntpServerSchema = z.string().regex(/^([a-zA-Z0-9.-]+)$/, {
  message: '올바른 NTP 서버 주소를 입력하세요.',
});
export const timeSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
  message: '시간은 HH:MM 형식이어야 합니다.',
});

// GS 인증 기준 비밀번호 스키마 (8자 이상, 문자종류 3종, 연속/반복 3자 금지)
export const passwordSchema = z
  .string()
  .min(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  .refine(
    v => [/[A-Z]/, /[a-z]/, /[0-9]/, /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/].filter(r => r.test(v)).length >= 3,
    {
      message: '영문 대/소문자, 숫자, 특수문자 중 3가지 이상을 조합해야 합니다.',
    }
  )
  .refine(v => !hasSequentialChars(v), {
    message: '연속된 문자 3자 이상을 사용할 수 없습니다.',
  })
  .refine(v => !hasRepeatedChars(v), {
    message: '동일한 문자를 3자 이상 연속으로 사용할 수 없습니다.',
  });

// 기타 자주 쓰는 스키마 추가 가능
