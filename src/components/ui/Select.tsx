import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Select({
  label,
  id,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const selectId = id ?? label.replace(/\s+/g, '-').toLowerCase();
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400" htmlFor={selectId}>
      <span>{label}</span>
      <select
        id={selectId}
        className={cn(
          'h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none ring-indigo-500 focus:border-indigo-400 focus:ring-2 dark:border-[#1e2538] dark:bg-[#161b26] dark:text-white',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
