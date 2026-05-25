import React, { useEffect, useRef, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

export interface PollingRecoveryPromptData {
  promptId: string;
  autoDismissSec: number;
  expiresAt?: string;
}

/** expiresAt 기준 남은 초 (없으면 autoDismissSec fallback) */
export function getPollingRecoveryRemainingSec(
  expiresAt: string | undefined,
  fallbackSec: number,
): number {
  if (expiresAt) {
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 1000));
  }
  return Math.max(0, fallbackSec);
}

interface PollingRecoveryDialogProps {
  isOpen: boolean;
  prompt: PollingRecoveryPromptData | null;
  onAcceptDashboard: () => void;
  onDismiss: () => void;
  onClose: () => void;
  /** 카운트다운 0 도달 시 1회 호출 (setState 밖에서 처리) */
  onAutoExpire: () => void;
}

/**
 * 폴링 자동복구 제안 (대시보드 제외 전역)
 */
export const PollingRecoveryDialog: React.FC<PollingRecoveryDialogProps> = ({
  isOpen,
  prompt,
  onAcceptDashboard,
  onDismiss,
  onClose,
  onAutoExpire,
}) => {
  const fallbackSec = prompt?.autoDismissSec ?? 30;
  const [countdown, setCountdown] = useState(() =>
    getPollingRecoveryRemainingSec(prompt?.expiresAt, fallbackSec),
  );
  const autoExpireFiredRef = useRef(false);
  const onAutoExpireRef = useRef(onAutoExpire);
  onAutoExpireRef.current = onAutoExpire;

  useEffect(() => {
    if (!isOpen || !prompt) {
      autoExpireFiredRef.current = false;
      return undefined;
    }

    autoExpireFiredRef.current = false;

    const tick = () => {
      const remaining = getPollingRecoveryRemainingSec(prompt.expiresAt, fallbackSec);
      setCountdown(remaining);

      if (remaining <= 0 && !autoExpireFiredRef.current) {
        autoExpireFiredRef.current = true;
        onAutoExpireRef.current();
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isOpen, prompt?.promptId, prompt?.expiresAt, fallbackSec]);

  return (
    <AlertDialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-2'>
            <div className='w-3 h-3 bg-amber-500 rounded-full animate-pulse' />
            폴링 자동 복구
          </AlertDialogTitle>
          <AlertDialogDescription className='space-y-2'>
            <p>
              폴링이 중지된 상태가 지속되어 운영 폴링을 다시 켤지 선택해 주세요. 하드웨어 직접 제어를 계속하려면
              폴링 중지를 선택하세요.
            </p>
            <p className='text-sm font-semibold text-red-600'>
              {countdown > 0
                ? `${countdown}초 후 자동으로 폴링을 시작하고 대시보드로 이동합니다.`
                : '곧 폴링을 시작하고 대시보드로 이동합니다…'}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className='flex-col sm:flex-row gap-2'>
          <AlertDialogAction onClick={onAcceptDashboard} className='w-full sm:w-auto'>
            대시보드로 이동 (폴링 시작)
          </AlertDialogAction>
          <AlertDialogAction onClick={onDismiss} className='w-full sm:w-auto'>
            폴링 중지 유지
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
