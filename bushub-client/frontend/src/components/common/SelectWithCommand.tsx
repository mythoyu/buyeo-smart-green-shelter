import { Check, ChevronsUpDown } from 'lucide-react';
import { useState, useMemo } from 'react';

import { Command, CommandInput, CommandList, CommandItem } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

export interface SelectOption<T = any> {
  value: string;
  label: string;
  category: string;
  description?: string;
}

interface SelectWithCommandProps<T = any> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  options: SelectOption<T>[];
  isLoading?: boolean;
  allowCustomInput?: boolean; // 직접 입력 허용 여부
  searchPlaceholder?: string;
  className?: string;
}

const SelectWithCommand = <T = any,>({
  label,
  value,
  onChange,
  placeholder,
  description,
  error,
  disabled = false,
  options,
  isLoading = false,
  allowCustomInput = true,
  searchPlaceholder,
  className = '',
}: SelectWithCommandProps<T>) => {
  const [open, setOpen] = useState(false);

  // 선택된 옵션 찾기
  const selectedOption = useMemo(() => {
    return options.find(option => option.value === value);
  }, [options, value]);

  // Command에서 선택 처리
  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
  };

  // 카테고리별 색상 매핑 (라이트/다크)
  const getCategoryColor = (category?: string) => {
    if (!category) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';

    const lowerCategory = category.toLowerCase();

    // 네트워크 인터페이스 상태별 색상
    if (lowerCategory.includes('-connected')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
    }
    if (lowerCategory.includes('-disconnected')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
    }
    if (lowerCategory.includes('-unavailable')) {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
    if (lowerCategory.includes('-unmanaged')) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
    }

    // 기존 카테고리별 색상
    switch (lowerCategory) {
      case 'public':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'regional':
      case 'local':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'commercial':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
      case 'asia':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200';
      case 'global':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200';
      case 'ethernet':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200';
      case 'wifi':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 라벨 */}
      <div className='flex items-center'>
        <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>{label}</label>
        {description && <span className='text-xs text-gray-500 dark:text-gray-400 ml-2'>{description}</span>}
      </div>

      {/* Popover + Command */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            role='combobox'
            aria-expanded={open}
            className={`w-full flex items-center justify-between h-9 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:border-blue-300 dark:hover:border-gray-500 text-sm ${
              disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600' : 'border-gray-300 dark:border-gray-600'
            }`}
            disabled={disabled}
            onClick={() => setOpen(!open)}
          >
            <span className={selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-xs text-gray-400 dark:text-gray-500'}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </button>
        </PopoverTrigger>
        <PopoverContent className='p-0' align='start' style={{ width: 'var(--radix-popover-trigger-width)' }}>
          <Command>
            <CommandInput
              placeholder={searchPlaceholder || `${label} 검색 또는 입력...`}
              value={allowCustomInput ? value : ''}
              onValueChange={allowCustomInput ? onChange : () => {}}
            />
            <CommandList className='max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto custom-scrollbar'>
              {isLoading ? (
                <div className='p-4 text-center text-sm text-gray-500 dark:text-gray-400'>로딩 중...</div>
              ) : options.length === 0 ? (
                <div className='p-4 text-center text-sm text-gray-500 dark:text-gray-400'>옵션이 없습니다</div>
              ) : (
                options.map((option, index) => (
                  <CommandItem
                    key={`${option.value}-${index}`}
                    value={option.value}
                    onSelect={handleSelect}
                    className='flex items-center gap-2 px-2 py-1.5 cursor-pointer'
                  >
                    <Check className={`mr-2 h-4 w-4 ${value === option.value ? 'opacity-100' : 'opacity-0'}`} />
                    <div className='flex-1 min-w-0'>
                      <div className='font-medium truncate'>{option.label}</div>
                      {option.description && (
                        <div className='text-xs text-gray-500 dark:text-gray-400 mt-1 truncate'>{option.description}</div>
                      )}
                      <div className='text-xs text-gray-400 dark:text-gray-500 mt-1 truncate'>{option.category}</div>
                    </div>
                    <div
                      className={`text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0 ${getCategoryColor(
                        option.category
                      )}`}
                    >
                      {option.category?.includes('-') ? option.category.split('-')[1] : option.category}
                    </div>
                  </CommandItem>
                ))
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* 에러 메시지 */}
      {error && <div className='text-xs text-red-500 dark:text-red-400 mt-1'>{error}</div>}
    </div>
  );
};

export default SelectWithCommand;
