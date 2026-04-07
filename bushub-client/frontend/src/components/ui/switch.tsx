import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as React from 'react';

import { cn } from '../../lib';

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  // checked 상태를 직접 prop에서 추출
  const checked = props.checked ?? props.defaultChecked;
  return (
    <SwitchPrimitive.Root
      data-slot='switch'
      className={cn(
        'relative peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-6 w-12 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot='switch-thumb'
        className={cn(
          'absolute left-0 top-0 bg-white pointer-events-none w-5 h-5 rounded-full ring-0 transition-transform border border-blue-200 shadow',
          checked ? 'translate-x-full' : 'translate-x-0'
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
