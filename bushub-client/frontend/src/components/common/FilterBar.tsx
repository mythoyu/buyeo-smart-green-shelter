import React from 'react';

import { Button, Badge } from '../ui';

interface FilterOption {
  key: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  colorClass?: string; // ex: 'bg-blue-100 text-blue-700'
}

interface FilterBarProps {
  options: FilterOption[];
  selected: string;
  onSelect: (key: string) => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({ options, selected, onSelect, className = '' }) => (
  <div className={`flex flex-wrap items-center gap-2 ${className}`}>
    {options.map(opt => (
      <Button
        key={opt.key}
        variant='outline'
        size='sm'
        className={`relative min-w-[120px] h-9 rounded-xl border border-gray-200 transition-all ${
          selected === opt.key
            ? opt.colorClass || 'border-primary bg-primary/10 text-primary'
            : 'hover:border-primary/50 hover:bg-primary/5'
        }`}
        onClick={() => onSelect(opt.key)}
      >
        {opt.icon && <span className='mr-2'>{opt.icon}</span>}
        <span className='hidden sm:inline'>{opt.label}</span>

        {typeof opt.count === 'number' && (
          <Badge
            variant='outline'
            className={`absolute -top-2 -right-2 h-4 min-w-[20px] text-xs ${
              selected === opt.key
                ? 'bg-white text-primary border-primary'
                : opt.colorClass || 'bg-gray-100 text-gray-700 border-gray-300'
            }`}
          >
            {opt.count}
          </Badge>
        )}
      </Button>
    ))}
  </div>
);
