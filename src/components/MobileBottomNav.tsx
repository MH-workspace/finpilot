import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  Sparkles,
  Plus,
} from 'lucide-react';
import { ActivePage } from '../types/finance';

interface MobileBottomNavProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  onOpenAddTransaction: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activePage,
  setActivePage,
  onOpenAddTransaction,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 block md:hidden border-t border-[#EAE3EE] bg-[#FAF8FC]/95 backdrop-blur-lg px-2 pb-safe pt-1 shadow-lg">
      <div className="flex items-center justify-around h-14">
        {/* Dashboard */}
        <button
          onClick={() => setActivePage('Dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activePage === 'Dashboard' ? 'text-[#7867B5]' : 'text-[#7A7285] hover:text-[#29272F]'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5">Home</span>
        </button>

        {/* Ledger */}
        <button
          onClick={() => setActivePage('Transactions')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activePage === 'Transactions' ? 'text-[#7867B5]' : 'text-[#7A7285] hover:text-[#29272F]'
          }`}
        >
          <ArrowLeftRight className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5">Ledger</span>
        </button>

        {/* Center Quick Add Action Button */}
        <div className="flex items-center justify-center -mt-5 px-1">
          <button
            onClick={onOpenAddTransaction}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#A99BEA] to-[#8C7BD0] text-white shadow-md shadow-[#7867B5]/30 active:scale-90 transition-transform"
            aria-label="Add new transaction"
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Budgets */}
        <button
          onClick={() => setActivePage('Budgets')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activePage === 'Budgets' ? 'text-[#7867B5]' : 'text-[#7A7285] hover:text-[#29272F]'
          }`}
        >
          <PieChart className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5">Budgets</span>
        </button>

        {/* Goals / AI */}
        <button
          onClick={() => setActivePage('AI Assistant')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activePage === 'AI Assistant' ? 'text-[#7867B5]' : 'text-[#7A7285] hover:text-[#29272F]'
          }`}
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5">AI Copilot</span>
        </button>
      </div>
    </div>
  );
};
