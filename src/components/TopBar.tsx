import React, { useState } from 'react';
import { Menu, Plus, Sparkles, LogIn, LogOut, Cloud, CloudOff } from 'lucide-react';
import { ActivePage } from '../types/finance';
import { getMonthLabel } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

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
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleOpenSignIn = () => {
    setAuthModalMode('signin');
    setIsAuthModalOpen(true);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#EAE5EC] bg-[#F5F1F3]/90 px-4 md:px-8 backdrop-blur-md">
      {/* Zone 1: Mobile toggle + Breadcrumb Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/80 bg-white/70 text-[#29272F] shadow-xs md:hidden active:scale-95"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-[#756E80]">
          <span className="font-semibold text-[#29272F]">FinPilot</span>
          <span className="text-[#C1B7C7]">/</span>
          <span className="text-[#5B5467]">{activePage}</span>
          <span className="hidden sm:inline text-[#C1B7C7]">/</span>
          <span className="hidden sm:inline text-[#7867B5] font-semibold">
            {getMonthLabel(selectedMonth)}
          </span>
        </div>
      </div>

      {/* Zone 2: Sync Status Indicator */}
      <div className="hidden lg:flex items-center gap-2 text-xs text-[#898393]">
        {user ? (
          <>
            <Cloud className="h-3.5 w-3.5 text-[#3E7459]" />
            <span className="text-[#3E7459] font-medium">Cloud Synchronized</span>
          </>
        ) : (
          <>
            <CloudOff className="h-3.5 w-3.5 text-[#898393]" />
            <span>Local Storage Active</span>
          </>
        )}
      </div>

      {/* Zone 3: Primary Actions & Auth */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          onClick={onOpenAI}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#D5CBE5] bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#6654A0] shadow-xs transition-all hover:bg-[#F3EEF9] hover:border-[#A99BEA] active:scale-95 whitespace-nowrap"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#8C7BD0]" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>

        <button
          onClick={onOpenAddTransaction}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#A99BEA] to-[#9282D7] px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-[#7867B5]/25 transition-all hover:brightness-105 active:scale-95 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>New Entry</span>
        </button>

        {/* Auth Button / User Profile Avatar */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-xl border border-[#E2D9E8] bg-white p-1 pr-2.5 text-xs font-semibold text-[#29272F] shadow-xs hover:border-[#A99BEA] transition-colors"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-6 w-6 rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F0ECFA] text-[#7867B5] font-bold text-[10px]">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              <span className="hidden md:inline max-w-[100px] truncate text-[11px]">
                {user.displayName || user.email?.split('@')[0]}
              </span>
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/90 bg-[#FAF8FC] p-3 shadow-xl z-50 text-xs"
                onClick={() => setShowUserMenu(false)}
              >
                <div className="border-b border-[#ECE7F0] pb-2 mb-2">
                  <div className="font-semibold text-[#29272F] truncate">
                    {user.displayName || 'FinPilot User'}
                  </div>
                  <div className="text-[11px] text-[#898393] truncate">{user.email}</div>
                </div>
                <div className="text-[10px] text-[#3E7459] font-medium mb-2 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3E7459]" />
                  <span>Cloud Database Active</span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-2 rounded-xl p-2 text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors"
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D5CBE5] bg-white px-3 py-1.5 text-xs font-semibold text-[#302D35] shadow-xs hover:bg-[#F3EEF9] hover:border-[#A99BEA] transition-all disabled:opacity-50 whitespace-nowrap"
          >
            <LogIn className="h-3.5 w-3.5 text-[#7867B5]" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
