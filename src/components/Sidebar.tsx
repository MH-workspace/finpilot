import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  LineChart,
  Target,
  Repeat,
  Sparkles,
  Settings,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { ActivePage } from '../types/finance';
import { formatCurrency } from '../utils/formatters';

interface SidebarProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  monthList: string[];
  monthlyNet: number;
  monthlyIncome: number;
  currencySymbol: string;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

const NAV_ITEMS: { id: ActivePage; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'Transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'Budgets', label: 'Budgets', icon: PieChart },
  { id: 'Analytics', label: 'Analytics', icon: LineChart },
  { id: 'Savings goals', label: 'Savings Goals', icon: Target },
  { id: 'Recurring', label: 'Recurring', icon: Repeat },
  { id: 'AI Assistant', label: 'AI Financial Copilot', icon: Sparkles },
  { id: 'Settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  selectedMonth,
  setSelectedMonth,
  monthList,
  monthlyNet,
  monthlyIncome,
  currencySymbol,
  isOpenMobile,
  setIsOpenMobile,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-[#E2D8E4] bg-[#F1E8EE] transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex flex-col p-6 pb-4">
          <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#7867B5]">
            YOUR MONEY, MORE CLEARLY
          </div>
          <button
            onClick={() => {
              setActivePage('Dashboard');
              setIsOpenMobile(false);
            }}
            className="group mt-1 flex items-center gap-2 text-left transition-transform active:scale-[0.99]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#A99BEA] to-[#8C7BD0] text-lg font-bold text-white shadow-sm">
              ✳
            </span>
            <span className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-[#29272F] group-hover:text-[#7867B5] transition-colors">
              FinPilot
            </span>
          </button>
          <p className="mt-1 text-xs text-[#7A7285]">
            Thoughtful tools. Clearer financial decisions.
          </p>
        </div>

        {/* Reporting Period Selector */}
        <div className="px-6 py-2">
          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase text-[#6B6375]">
            <Calendar className="h-3.5 w-3.5 text-[#7867B5]" />
            Reporting Month
          </label>
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/70 bg-white/80 px-3.5 py-2 text-xs font-semibold text-[#29272F] shadow-xs outline-none transition-all focus:border-[#A99BEA] focus:bg-white focus:ring-2 focus:ring-[#A99BEA]/20"
            >
              {monthList.map((m) => {
                const [year, month] = m.split('-').map(Number);
                const d = new Date(year, month - 1, 1);
                const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                return (
                  <option key={m} value={m}>
                    {label}
                  </option>
                );
              })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#7A7285]">
              <ChevronRight className="h-3.5 w-3.5 rotate-90" />
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="mt-3 flex-1 overflow-y-auto px-4 py-2">
          <div className="mb-2 px-2 text-[10px] font-bold tracking-[0.14em] uppercase text-[#7A7285]">
            Workspace
          </div>
          <nav className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage(item.id);
                    setIsOpenMobile(false);
                  }}
                  className={`group relative flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#A99BEA] to-[#9B8CE6] text-white font-semibold shadow-md shadow-[#7867B5]/15'
                      : 'text-[#585160] hover:bg-white/70 hover:text-[#29272F]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 transition-transform group-hover:scale-105 ${
                        isActive ? 'text-white' : 'text-[#7867B5]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white shadow-xs" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Calm monthly snapshot footer card */}
        <div className="p-4 pt-2">
          <div className="rounded-2xl border border-white/80 bg-gradient-to-br from-[#FAF8FC]/90 to-[#EDE7F3]/80 p-3.5 shadow-sm">
            <div className="text-[11px] font-semibold text-[#7A7285]">Net Cashflow ({selectedMonth})</div>
            <div
              className={`font-['Plus_Jakarta_Sans'] text-base font-bold tabular-nums tracking-tight ${
                monthlyNet >= 0 ? 'text-[#3E7459]' : 'text-[#9A4E6C]'
              }`}
            >
              {monthlyNet >= 0 ? '+' : ''}
              {formatCurrency(monthlyNet, currencySymbol)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#898393]">
              <span>Monthly In:</span>
              <span className="font-medium text-[#484251] tabular-nums">
                {formatCurrency(monthlyIncome, currencySymbol)}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
