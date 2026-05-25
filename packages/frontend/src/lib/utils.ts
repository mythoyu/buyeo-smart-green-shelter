import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// export function cn(...inputs: ClassValue[]) {
//   const clsxResult = clsx(inputs)
//   const mergedResult = twMerge(clsxResult)
//   if (process.env.NODE_ENV !== "production") {
//     // 개발 환경에서만 로그 출력
//     console.log("[cn] inputs:", inputs)
//     console.log("[cn] clsx result:", clsxResult)
//     console.log("[cn] twMerge result:", mergedResult)
//   }
//   return mergedResult
// }
