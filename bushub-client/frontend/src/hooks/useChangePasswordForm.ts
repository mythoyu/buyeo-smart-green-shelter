import { useState } from 'react';
import { toast } from 'sonner';

import { useChangePassword } from '../api/queries/auth';

interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordFormState {
  formData: ChangePasswordFormData;
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  isSubmitting: boolean;
}

export const useChangePasswordForm = (userId: string) => {
  const [formState, setFormState] = useState<ChangePasswordFormState>({
    formData: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    showCurrentPassword: false,
    showNewPassword: false,
    showConfirmPassword: false,
    isSubmitting: false,
  });

  const changePasswordMutation = useChangePassword();

  const updateFormData = (field: keyof ChangePasswordFormData, value: string) => {
    setFormState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value,
      },
    }));
  };

  const togglePasswordVisibility = (field: 'currentPassword' | 'newPassword' | 'confirmPassword') => {
    setFormState(prev => ({
      ...prev,
      [`show${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof ChangePasswordFormState]:
        !prev[`show${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof ChangePasswordFormState],
    }));
  };

  const resetForm = () => {
    setFormState(prev => ({
      ...prev,
      formData: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      toast.error('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.', { id: 'change-password-user-missing' });
      return;
    }

    if (formState.formData.newPassword !== formState.formData.confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.', { id: 'change-password-mismatch' });
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        userId,
        passwordData: formState.formData,
      });

      toast.success('비밀번호가 성공적으로 변경되었습니다.', { id: 'change-password-success' });
      resetForm();
    } catch (error: any) {
      toast.error(error.message || '비밀번호 변경에 실패했습니다.', { id: 'change-password-error' });
    }
  };

  return {
    formData: formState.formData,
    showCurrentPassword: formState.showCurrentPassword,
    showNewPassword: formState.showNewPassword,
    showConfirmPassword: formState.showConfirmPassword,
    isSubmitting: changePasswordMutation.isPending,
    updateFormData,
    togglePasswordVisibility,
    handleSubmit,
  };
};
