import React, { useState } from 'react';
import {
  DollarSign,
  Database,
  RefreshCw,
  Trash2,
  Download,
  ShieldCheck,
  CheckCircle2,
  LogIn,
  LogOut,
  Cloud,
  UserCheck,
  Lock,
  Upload,
} from 'lucide-react';
import { UserSettings } from '../types/finance';
import { createFullBackup, restoreFullBackup } from '../utils/storage';
import { getTodayString } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  stats: {
    transactionsCount: number;
    budgetsCount: number;
    goalsCount: number;
    recurringCount: number;
  };
  onResetDemoData: () => void;
  onWipeAllData: () => void;
}

const CURRENCIES = [
  { symbol: '₹', code: 'INR', name: 'Indian Rupee (₹)' },
  { symbol: '$', code: 'USD', name: 'US Dollar ($)' },
  { symbol: '€', code: 'EUR', name: 'Euro (€)' },
  { symbol: '£', code: 'GBP', name: 'British Pound (£)' },
  { symbol: '¥', code: 'JPY', name: 'Japanese Yen (¥)' },
  { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar (C$)' },
  { symbol: 'A$', code: 'AUD', name: 'Australian Dollar (A$)' },
  { symbol: 'CHF', code: 'CHF', name: 'Swiss Franc (CHF)' },
  { symbol: 'AED', code: 'AED', name: 'UAE Dirham (AED)' },
  { symbol: 'SG$', code: 'SGD', name: 'Singapore Dollar (SG$)' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  stats,
  onResetDemoData,
  onWipeAllData,
}) => {
  const { user, signOut, setIsAuthModalOpen, setAuthModalMode } = useAuth();
  const [targetRate, setTargetRate] = useState(settings.targetSavingsRate || 20);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState(
    settings.currency.code || 'INR'
  );
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSaveSettings = () => {
    const curr = CURRENCIES.find((c) => c.code === selectedCurrencyCode) || settings.currency;
    onUpdateSettings({
      ...settings,
      currency: curr,
      targetSavingsRate: Number(targetRate),
    });
    setStatusMessage('Preferences updated successfully.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDownloadBackup = () => {
    const backup = createFullBackup();
    const str = JSON.stringify(backup, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finpilot_backup_${getTodayString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs">
        <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#7867B5]">
          YOUR SPACE, YOUR CONTROL
        </div>
        <h2 className="mt-1 font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-[#29272F]">
          Settings & Preferences
        </h2>
        <p className="text-xs text-[#7A7285]">
          Manage your account profile, active currency, savings target, and data controls.
        </p>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Account & Synchronization */}
      <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-[#7867B5] uppercase tracking-wider mb-1">
          <UserCheck className="h-4 w-4" />
          <span>Account & Cloud Sync</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
              {user ? 'Signed-In Account' : 'Guest Mode (Local Storage)'}
            </h3>
            <p className="text-xs text-[#7A7285] mt-0.5">
              {user
                ? 'Your ledger, budgets, and goals are securely isolated and synced in real-time.'
                : 'Your financial entries are stored locally on this device. Sign in to sync across your phone and laptop.'}
            </p>
          </div>

          <div>
            {user ? (
              <button
                onClick={() => signOut()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthModalMode('signin');
                    setIsAuthModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#A99BEA] to-[#9282D7] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:brightness-105 active:scale-95 transition-all"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('signup');
                    setIsAuthModalOpen(true);
                  }}
                  className="rounded-xl border border-[#D5CBE5] bg-white px-3.5 py-2 text-xs font-semibold text-[#6857A4] hover:bg-[#FAF8FC] transition-colors"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>

        {user && (
          <div className="mt-4 rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-[#898393]">Email Address:</span>
                <div className="font-semibold text-[#29272F] mt-0.5 truncate">{user.email}</div>
              </div>
              <div>
                <span className="text-[11px] text-[#898393]">Display Name:</span>
                <div className="font-semibold text-[#29272F] mt-0.5 truncate">
                  {user.displayName || 'FinPilot User'}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-[#898393]">Sync Status:</span>
                <div className="font-semibold text-[#3E7459] mt-0.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3E7459]" />
                  <span>Cloud Encrypted & Active</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Preferences + Storage Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Currency & Savings Target Form */}
        <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#7867B5] uppercase tracking-wider mb-1">
              <DollarSign className="h-4 w-4" />
              <span>Display & Benchmarks</span>
            </div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
              Financial Preferences
            </h3>
            <p className="text-xs text-[#7A7285] mb-5">
              Choose your primary currency symbol and target monthly savings percentage.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                  Active Currency
                </label>
                <select
                  value={selectedCurrencyCode}
                  onChange={(e) => setSelectedCurrencyCode(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3.5 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-[#534C5D]">
                    Target Savings Rate
                  </label>
                  <span className="font-mono text-xs font-bold text-[#7867B5]">
                    {targetRate}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={targetRate}
                  onChange={(e) => setTargetRate(Number(e.target.value))}
                  className="w-full accent-[#7867B5]"
                />
                <div className="flex justify-between text-[10px] text-[#898393] mt-1">
                  <span>5% (Relaxed)</span>
                  <span>20% (Standard 50/30/20)</span>
                  <span>50% (High Velocity)</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#A99BEA] to-[#9282D7] py-2.5 text-xs font-semibold text-white shadow-xs hover:brightness-105 active:scale-95 transition-all"
          >
            Apply Changes
          </button>
        </div>

        {/* Database Health & Document Summary */}
        <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#7867B5] uppercase tracking-wider mb-1">
              <Database className="h-4 w-4" />
              <span>Record Summary</span>
            </div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
              Your Ledger Records
            </h3>
            <p className="text-xs text-[#7A7285] mb-4">
              Overview of all active documents managed under your FinPilot profile.
            </p>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-3">
                <div className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#29272F] tabular-nums">
                  {stats.transactionsCount}
                </div>
                <div className="text-[11px] text-[#7A7285]">Transactions</div>
              </div>
              <div className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-3">
                <div className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#29272F] tabular-nums">
                  {stats.budgetsCount}
                </div>
                <div className="text-[11px] text-[#7A7285]">Category Budgets</div>
              </div>
              <div className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-3">
                <div className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#29272F] tabular-nums">
                  {stats.goalsCount}
                </div>
                <div className="text-[11px] text-[#7A7285]">Savings Goals</div>
              </div>
              <div className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-3">
                <div className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#29272F] tabular-nums">
                  {stats.recurringCount}
                </div>
                <div className="text-[11px] text-[#7A7285]">Recurring Schedules</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={handleDownloadBackup}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D5CBE5] bg-white py-2 text-xs font-semibold text-[#6857A4] hover:bg-[#FAF8FC] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Full JSON Backup</span>
            </button>
            <button
              onClick={onResetDemoData}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E2D9E8] bg-white px-3 py-2 text-xs font-semibold text-[#6A6273] hover:bg-[#F3EFF5] transition-colors"
              title="Populate sample records for exploring features"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Load Sample Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security & Privacy Commitment Card */}
      <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-[#7867B5] uppercase tracking-wider mb-1">
          <ShieldCheck className="h-4 w-4" />
          <span>Security & Privacy Commitment</span>
        </div>
        <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
          How FinPilot Protects Your Data
        </h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#524B5C] leading-relaxed">
          <div className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-3.5">
            <strong className="text-[#29272F] block mb-1">Zero-Trust Isolation</strong>
            <p className="text-[#7A7285]">
              Every transaction and budget record is strictly scoped to your authorized account UID. No other user or client can read or alter your entries.
            </p>
          </div>
          <div className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-3.5">
            <strong className="text-[#29272F] block mb-1">Encrypted in Transit & at Rest</strong>
            <p className="text-[#7A7285]">
              Data transfers use end-to-end TLS 1.3 encryption, and cloud records are encrypted with AES-256 in enterprise cloud storage.
            </p>
          </div>
          <div className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-3.5">
            <strong className="text-[#29272F] block mb-1">Export Anytime</strong>
            <p className="text-[#7A7285]">
              Your financial records belong entirely to you. You can export complete CSV spreadsheets or JSON snapshots at any time with a single click.
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone: Wipe Data */}
      <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-6">
        <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-rose-900 mb-1">
          Danger Zone
        </h3>
        <p className="text-xs text-rose-700 mb-4">
          Permanently clear all ledger records, budgets, savings goals, and recurring rules from this account.
        </p>

        {!confirmWipe ? (
          <button
            onClick={() => setConfirmWipe(true)}
            className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
          >
            Clear Entire Database
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onWipeAllData();
                setConfirmWipe(false);
                setStatusMessage('All personal data cleared.');
              }}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700"
            >
              Yes, Permanently Delete All
            </button>
            <button
              onClick={() => setConfirmWipe(false)}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
