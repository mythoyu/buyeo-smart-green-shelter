import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';

import { useChangePasswordForm } from '../../hooks/useChangePasswordForm';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { usePasswordValidation } from '../../hooks/usePasswordValidation';
import { useWebSocket } from '../../hooks/useWebSocket';
import { TopLogPanel } from '../common/TopLogPanel';
import { Card, CardHeader, CardContent, CardTitle, Button, Input, Label, Badge } from '../ui';

export default function ChangePasswordPage() {
  const currentUser = useCurrentUser();
  const { isConnected } = useWebSocket({});

  const {
    formData,
    showCurrentPassword,
    showNewPassword,
    showConfirmPassword,
    isSubmitting,
    updateFormData,
    togglePasswordVisibility,
    handleSubmit,
  } = useChangePasswordForm(currentUser?.id || '');

  const passwordValidation = usePasswordValidation(formData.newPassword);

  if (!currentUser) {
    return (
      <div className='space-y-2'>
        <TopLogPanel isConnected={isConnected} />
        <div className='flex items-center justify-center'>
          <div className='w-full max-w-md'>
            <Card>
              <CardContent className='text-center py-8'>
                <p className='text-muted-foreground'>사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {/* 로그 패널 */}
      <TopLogPanel isConnected={isConnected} />

      <div className='flex items-center justify-center'>
        <div className='w-full max-w-md'>
          <Card>
            <CardHeader className='flex flex-col items-center gap-2 text-center'>
              <div className='w-12 h-12 flex items-center justify-center bg-muted rounded-full mb-2'>
                <Lock className='w-6 h-6 text-primary' />
              </div>
              <CardTitle className='text-2xl'>비밀번호 변경</CardTitle>
              <p className='text-muted-foreground'>새 비밀번호를 입력해 주세요</p>
            </CardHeader>
            <CardContent className='space-y-6'>
              <form onSubmit={handleSubmit} className='space-y-6'>
                <div className='space-y-2'>
                  <Label htmlFor='currentPassword'>현재 비밀번호</Label>
                  <div className='relative'>
                    <Input
                      id='currentPassword'
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={formData.currentPassword}
                      onChange={e => updateFormData('currentPassword', e.target.value)}
                      required
                      placeholder='현재 비밀번호를 입력하세요'
                      disabled={isSubmitting}
                      className='pr-10'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                      onClick={() => togglePasswordVisibility('currentPassword')}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className='h-4 w-4 text-muted-foreground' />
                      ) : (
                        <Eye className='h-4 w-4 text-muted-foreground' />
                      )}
                    </Button>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='newPassword'>새 비밀번호</Label>
                  <div className='relative'>
                    <Input
                      id='newPassword'
                      type={showNewPassword ? 'text' : 'password'}
                      value={formData.newPassword}
                      onChange={e => updateFormData('newPassword', e.target.value)}
                      required
                      placeholder='새 비밀번호를 입력하세요'
                      disabled={isSubmitting}
                      className='pr-10'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                      onClick={() => togglePasswordVisibility('newPassword')}
                    >
                      {showNewPassword ? (
                        <EyeOff className='h-4 w-4 text-muted-foreground' />
                      ) : (
                        <Eye className='h-4 w-4 text-muted-foreground' />
                      )}
                    </Button>
                  </div>
                  {passwordValidation.hasValidation && (
                    <div className='space-y-2'>
                      {/* 비밀번호 강도 표시 */}
                      <div className='flex items-center justify-between'>
                        <span className='text-xs text-muted-foreground'>비밀번호 강도:</span>
                        <Badge variant={passwordValidation.strengthVariant as 'default' | 'secondary'}>
                          {passwordValidation.strengthText}
                        </Badge>
                      </div>

                      {/* 상세 검증 결과 */}
                      <div className='space-y-1'>
                        {['length', 'characterTypes', 'sequential', 'repeated'].map(key => {
                          const item = passwordValidation.getValidationItem(key as any);
                          if (!item) return null;

                          return (
                            <div key={key} className={`flex items-center text-xs ${item.color}`}>
                              <span className='mr-1'>{item.icon}</span>
                              {item.message}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='confirmPassword'>새 비밀번호 확인</Label>
                  <div className='relative'>
                    <Input
                      id='confirmPassword'
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={e => updateFormData('confirmPassword', e.target.value)}
                      required
                      placeholder='새 비밀번호를 다시 입력하세요'
                      disabled={isSubmitting}
                      className='pr-10'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                      onClick={() => togglePasswordVisibility('confirmPassword')}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className='h-4 w-4 text-muted-foreground' />
                      ) : (
                        <Eye className='h-4 w-4 text-muted-foreground' />
                      )}
                    </Button>
                  </div>
                  {formData.confirmPassword && (
                    <div className='flex items-center text-xs'>
                      {formData.newPassword === formData.confirmPassword ? (
                        <div className='flex items-center text-green-600'>
                          <CheckCircle className='h-3 w-3 mr-1' />
                          비밀번호가 일치합니다
                        </div>
                      ) : (
                        <div className='flex items-center text-red-600'>
                          <AlertTriangle className='h-3 w-3 mr-1' />
                          비밀번호가 일치하지 않습니다
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button type='submit' className='w-full' disabled={isSubmitting}>
                  {isSubmitting ? (
                    <div className='flex items-center justify-center'>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2'></div>
                      변경 중...
                    </div>
                  ) : (
                    <div className='flex items-center justify-center'>
                      <CheckCircle className='h-4 w-4 mr-2' />
                      비밀번호 변경
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
