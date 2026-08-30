import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input({
  label,
  id,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const inputId = id ?? label.replace(/\s+/g, '-').toLowerCase();
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400" htmlFor={inputId}>
      <span>{label}</span>
      <input
        id={inputId}
        className={cn(
          'h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none ring-indigo-500 focus:border-indigo-400 focus:ring-2 dark:border-[#1e2538] dark:bg-[#161b26] dark:text-white',
          className,
        )}
        {...props}
      />
    </label>
  );
}
