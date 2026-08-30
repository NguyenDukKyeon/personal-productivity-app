'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Flame,
  FolderGit2,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const laterItems = [
  { name: 'Habits', icon: CheckCircle2 },
  { name: 'Planner', icon: CalendarDays },
  { name: 'Projects', icon: FolderGit2 },
  { name: 'Review', icon: BarChart3 },
] as const;

function NavLink({
  href,
  active,
  icon: Icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: typeof Zap;
  children: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold',
        active
          ? 'bg-slate-100 text-indigo-600 dark:bg-[#161b26] dark:text-indigo-400'
          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-[#121620]',
      )}
    >
      {active ? (
        <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-indigo-600 dark:bg-indigo-500" />
      ) : null}
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const todayActive = pathname === '/today' || pathname === '/';
  const focusActive = pathname === '/focus' || pathname.startsWith('/focus');

  return (
    <aside
      className={cn(
        'flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-[#1e2538] dark:bg-[#0d1017]',
        className,
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5 dark:border-[#1e2538]">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Zap className="h-4 w-4 fill-current" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight">Smart Planner</p>
          <p className="text-[11px] font-medium text-slate-400">Personal Productivity</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Workstation
        </p>
        <NavLink href="/today" active={todayActive} icon={Zap}>
          Today
        </NavLink>
        <NavLink href="/focus" active={focusActive} icon={Flame}>
          Focus
        </NavLink>

        {laterItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              aria-disabled="true"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-400"
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4" />
                {item.name}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-[#161b26]">
                Later
              </span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
