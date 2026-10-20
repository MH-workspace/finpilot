import React, { useState } from 'react';
import { Menu, Plus, Sparkles, LogIn, LogOut, Cloud, CloudOff, User } from 'lucide-react';
import { ActivePage } from '../types/finance';
import { getMonthLabel } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useAIChat } from '../context/AIChatContext';

interface TopBarProps {
  activePage: ActivePage;
  selectedMonth: string;
  onOpenMobileSidebar: () => void;
  onOpenAddTransaction: () => void;
  onOpenAI: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePage,
  selectedMonth,
  onOpenMobileSidebar,
  onOpenAddTransaction,
  onOpenAI,
}) => {
  const { user, signOut, setIsAuthModalOpen, setAuthModalMode, loading } = useAuth();
  const { isLoading: isAILoading, hasUnreadReply } = useAIChat();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleOpenSignIn = () => {
    setAuthModalMode('signin');
    setIsAuthModalOpen(true);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#EAE5EC] bg-[#F5F1F3]/95 px-3 sm:px-6 md:px-8 backdrop-blur-md">
      {/* Zone 1: Mobile toggle + Breadcrumb Context */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
        <button
          onClick={onOpenMobileSidebar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/80 text-[#29272F] shadow-xs md:hidden active:scale-95 transition-transform"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4 text-[#585160]" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs md:text-sm font-medium text-[#756E80] min-w-0">
          <span className="font-['Plus_Jakarta_Sans'] font-bold text-[#29272F] shrink-0">
            FinPilot
          </span>
          <span className="text-[#C1B7C7]">/</span>
          <span className="text-[#5B5467] font-semibold truncate max-w-[95px] sm:max-w-none">
            {activePage}
          </span>
          <span className="hidden md:inline text-[#C1B7C7]">/</span>
          <span className="hidden md:inline text-[#7867B5] font-semibold">
            {getMonthLabel(selectedMonth)}
          </span>
        </div>
      </div>

      {/* Zone 2: Sync Status Indicator (Desktop only) */}
      <div className="hidden lg:flex items-center gap-2 text-xs text-[#898393]">
        {user ? (
          <>
            <Cloud className="h-3.5 w-3.5 text-[#3E7459]" />
            <span className="text-[#3E7459] font-medium">Cloud Synchronized</span>
          </>
        ) : (
          <>
            <CloudOff className="h-3.5 w-3.5 text-[#898393]" />
            <span>Local Mode</span>
          </>
        )}
      </div>

      {/* Zone 3: Primary Actions & Auth - Always visible, never pushed off screen */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Ask AI button on tablets/desktop */}
        <button
          onClick={onOpenAI}
          className="relative hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#D5CBE5] bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#6654A0] shadow-xs transition-all hover:bg-[#F3EEF9] hover:border-[#A99BEA] active:scale-95 whitespace-nowrap shrink-0"
        >
          <Sparkles className={`h-3.5 w-3.5 text-[#8C7BD0] ${isAILoading ? 'animate-spin' : ''}`} />
          <span>Ask AI</span>
          {hasUnreadReply && (
            <span className="h-2 w-2 rounded-full bg-[#8C7BD0] animate-pulse" />
          )}
        </button>

        {/* New Entry Button */}
        <button
          onClick={onOpenAddTransaction}
          className="inline-flex items-center gap-1 sm:gap-1.5 rounded-xl bg-gradient-to-r from-[#A99BEA] to-[#9282D7] px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs shadow-[#7867B5]/25 transition-all hover:brightness-105 active:scale-95 whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span className="hidden xs:inline">New Entry</span>
          <span className="xs:hidden">New</span>
        </button>

        {/* Auth / Profile button - Prominent on both mobile and desktop */}
        {user ? (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-[#D5CBE5] bg-white p-1 pr-2 sm:pr-2.5 text-xs font-semibold text-[#29272F] shadow-xs hover:border-[#7867B5] transition-colors active:scale-95"
              aria-label="User account menu"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-6 w-6 rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#EFEAF6] text-[#7867B5] font-bold text-[10px]">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              <span className="hidden sm:inline max-w-[90px] truncate text-[11px] font-medium text-[#383141]">
                {user.displayName || user.email?.split('@')[0]}
              </span>
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-60 rounded-2xl border border-white/90 bg-[#FAF8FC] p-3 shadow-xl z-50 text-xs"
                onClick={() => setShowUserMenu(false)}
              >
                <div className="border-b border-[#ECE7F0] pb-2.5 mb-2">
                  <div className="font-semibold text-[#29272F] truncate">
                    {user.displayName || 'FinPilot Member'}
                  </div>
                  <div className="text-[11px] text-[#898393] truncate">{user.email}</div>
                </div>
                <div className="text-[11px] text-[#3E7459] font-medium mb-3 flex items-center gap-1.5 bg-[#EAF5EF] p-2 rounded-xl">
                  <span className="h-2 w-2 rounded-full bg-[#3E7459]" />
                  <span>Cloud Ledger Synchronized</span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-2 rounded-xl p-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleOpenSignIn}
            disabled={loading}
            className="inline-flex items-center gap-1 sm:gap-1.5 rounded-xl bg-gradient-to-r from-[#7867B5] to-[#6A58A5] px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs shadow-[#7867B5]/20 hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <LogIn className="h-3.5 w-3.5 text-white" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
