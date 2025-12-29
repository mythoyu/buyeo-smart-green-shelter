import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../lib';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary: 'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        subtle:
          'bg-gradient-to-br from-slate-50 to-slate-100/50 text-slate-700 border-slate-200/80 shadow-sm hover:shadow-md hover:bg-slate-100 hover:border-slate-300/80 transition-all duration-200 font-medium px-2.5 py-1 rounded-lg',
        'subtle-success':
          'bg-gradient-to-br from-green-50 to-emerald-50/50 text-green-700 border-green-200/80 shadow-sm hover:shadow-md hover:bg-green-100 hover:border-green-300/80 transition-all duration-200 font-medium px-2.5 py-1 rounded-lg',
        'subtle-error':
          'bg-gradient-to-br from-red-50 to-rose-50/50 text-red-700 border-red-200/80 shadow-sm hover:shadow-md hover:bg-red-100 hover:border-red-300/80 transition-all duration-200 font-medium px-2.5 py-1 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';

  return <Comp data-slot='badge' className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
