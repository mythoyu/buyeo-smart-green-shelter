export type PollingRecoveryPromptStatus = 'pending' | 'accepted' | 'dismissed' | 'expired';

export interface PollingRecoveryPrompt {
  promptId: string;
  issuedAt: string;
  expiresAt: string;
  status: PollingRecoveryPromptStatus;
}

export const POLLING_RECOVERY_AUTO_DISMISS_SEC = 30;
