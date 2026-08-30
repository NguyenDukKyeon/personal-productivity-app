import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({
  className,
  title,
  action,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-[#1e2538] dark:bg-[#11141d]',
        className,
      )}
      {...props}
    >
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title ? <h2 className="text-sm font-semibold tracking-tight">{title}</h2> : <span />}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
