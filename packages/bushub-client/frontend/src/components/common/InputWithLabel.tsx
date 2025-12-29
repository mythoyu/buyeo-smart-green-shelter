import { DollarSign, Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';

import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';

interface InputWithLabelProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  description?: string;
  error?: string;
  type?: string;
  showPasswordToggle?: boolean;
  disabled?: boolean;
  defaultValue?: string;
  showDefaultValueButton?: boolean;
}

const InputWithLabel: React.FC<InputWithLabelProps> = ({
  label,
  value,
  onChange,
  placeholder,
  description,
  error,
  type,
  showPasswordToggle = false,
  disabled = false,
  defaultValue,
  showDefaultValueButton = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  // 비밀번호 토글 처리
  const handleTogglePassword = () => {
    if (disabled) return;
    setShowPassword(!showPassword);
  };

  // 입력 타입 결정 (비밀번호 토글이 활성화된 경우)
  const inputType = showPasswordToggle && type === 'password' ? (showPassword ? 'text' : 'password') : type;

  // 기본값 설정 핸들러
  const handleSetDefaultValue = () => {
    if (disabled) return;
    if (defaultValue) {
      const syntheticEvent = {
        target: { value: defaultValue },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <div className='mb-3'>
      <div className='flex items-center gap-2 mb-1'>
        <Label className='text-sm font-medium text-gray-700'>{label}</Label>
        {description && (
          <Badge
            variant={
              description === '설정되지 않음' || description === '미설정' || !description.trim()
                ? 'subtle-error'
                : 'subtle-success'
            }
            className='text-xs'
          >
            {description}
          </Badge>
        )}
      </div>
      <div className='relative'>
        <Input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={type === 'password' ? 'text' : inputType}
          disabled={disabled}
          autoComplete={type === 'password' ? 'new-password' : 'off'}
          data-lpignore={type === 'password' ? 'true' : undefined}
          className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 placeholder:text-xs placeholder:text-gray-400 hover:border-blue-300 ${
            error ? 'border-red-400' : 'border-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
          style={
            type === 'password' && !showPassword
              ? ({
                  WebkitTextSecurity: 'disc',
                  fontFamily: 'text-security-disc, monospace',
                } as React.CSSProperties)
              : undefined
          }
        />
        {/* 기본값 설정 버튼 */}
        {showDefaultValueButton && defaultValue && (
          <button
            type='button'
            onClick={handleSetDefaultValue}
            disabled={disabled}
            aria-disabled={disabled}
            className={`absolute top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-blue-600 transition-colors duration-200 ${
              showPasswordToggle && type === 'password' ? 'right-12' : 'right-3'
            } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
            aria-label='기본값으로 설정'
            title='기본값으로 설정'
          >
            <DollarSign className='h-4 w-4' />
          </button>
        )}

        {/* 비밀번호 토글 버튼 */}
        {showPasswordToggle && type === 'password' && (
          <button
            type='button'
            onClick={handleTogglePassword}
            disabled={disabled}
            aria-disabled={disabled}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors duration-200 ${
              disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
            }`}
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
          >
            {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
          </button>
        )}
      </div>
      {error && <div className='text-xs text-red-500 mt-1'>{error}</div>}
    </div>
  );
};

export default InputWithLabel;
