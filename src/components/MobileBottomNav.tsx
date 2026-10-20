import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Sparkles,
  Plus,
  Menu,
  LineChart,
} from 'lucide-react';
import { ActivePage } from '../types/finance';
import { useAIChat } from '../context/AIChatContext';

interface MobileBottomNavProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  onOpenMobileSidebar: () => void;
  onOpenAddTransaction: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activePage,
  setActivePage,
  onOpenMobileSidebar,
  onOpenAddTransaction,
}) => {
  const { isLoading, hasUnreadReply } = useAIChat();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-[#E2D8E4] bg-[#FAF8FC]/95 px-2 py-1 shadow-lg backdrop-blur-md md:hidden safe-area-pb">
      {/* 1. Dashboard */}
      <button
        onClick={() => setActivePage('Dashboard')}
        className={`flex flex-col items-center justify-center gap-1 px-2.5 py-1 text-[10px] font-semibold transition-colors ${
          activePage === 'Dashboard'
            ? 'text-[#7867B5]'
            : 'text-[#7C7486] hover:text-[#29272F]'
        }`}
      >
        <LayoutDashboard className="h-5 w-5" />
        <span>Home</span>
      </button>

      {/* 2. Transactions */}
      <button
        onClick={() => setActivePage('Transactions')}
        className={`flex flex-col items-center justify-center gap-1 px-2.5 py-1 text-[10px] font-semibold transition-colors ${
          activePage === 'Transactions'
            ? 'text-[#7867B5]'
            : 'text-[#7C7486] hover:text-[#29272F]'
        }`}
      >
        <ArrowLeftRight className="h-5 w-5" />
        <span>Ledger</span>
      </button>

      {/* 3. Center Action: + New Entry */}
      <button
        onClick={onOpenAddTransaction}
        className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#8A79CD] to-[#A99BEA] text-white shadow-lg shadow-[#7867B5]/35 transition-transform active:scale-95"
        aria-label="Add Transaction"
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </button>

      {/* 4. AI Copilot */}
      <button
        onClick={() => setActivePage('AI Assistant')}
        className={`relative flex flex-col items-center justify-center gap-1 px-2.5 py-1 text-[10px] font-semibold transition-colors ${
          activePage === 'AI Assistant'
            ? 'text-[#7867B5]'
            : 'text-[#7C7486] hover:text-[#29272F]'
        }`}
      >
        <div className="relative">
          <Sparkles className={`h-5 w-5 ${isLoading ? 'animate-spin text-[#8C7BD0]' : ''}`} />
          {hasUnreadReply && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#8C7BD0] ring-2 ring-white animate-pulse" />
          )}
        </div>
        <span>AI Copilot</span>
      </button>

      {/* 5. Menu Drawer */}
      <button
        onClick={onOpenMobileSidebar}
        className="flex flex-col items-center justify-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#7C7486] hover:text-[#29272F] transition-colors"
      >
        <Menu className="h-5 w-5" />
        <span>Menu</span>
      </button>
    </nav>
  );
};
