import React from 'react';

import { Select, SelectContent, SelectTrigger, SelectValue } from '../ui/select';

interface SelectWithLabelProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const SelectWithLabel: React.FC<SelectWithLabelProps> = ({
  label,
  value,
  onValueChange,
  placeholder,
  description,
  error,
  children,
  disabled = false,
}) => (
  <div className='mb-3'>
    <div className='flex items-center justify-between mb-1'>
      <label className='text-sm font-medium text-gray-700'>{label}</label>
      {description && <span className='text-xs text-gray-500 ml-2'>{description}</span>}
    </div>
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={`w-full ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
    {error && <div className='text-xs text-red-500 mt-1'>{error}</div>}
  </div>
);

export default SelectWithLabel;
