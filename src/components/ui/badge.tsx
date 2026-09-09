import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      default: 'bg-primary/10 text-primary',
      success: 'bg-emerald-500/10 text-emerald-600',
      warning: 'bg-amber-500/10 text-amber-600',
      destructive: 'bg-destructive/10 text-destructive',
      muted: 'bg-muted text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
