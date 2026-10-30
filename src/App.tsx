import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActivePage,
  Transaction,
  Budget,
  SavingsGoal,
  RecurringRule,
  UserSettings,
  BackupData,
} from './types/finance';
import {
  DEFAULT_SETTINGS,
  loadTransactions,
  saveTransactions,
  loadBudgets,
  saveBudgets,
  loadGoals,
  saveGoals,
  loadRecurring,
  saveRecurring,
  loadSettings,
  saveSettings,
  resetToDemoData,
  clearAllUserData,
  buildSampleDataset,
  createFullBackup,
  parseBackupForMerge,
  restoreFullBackup,
} from './utils/storage';
import {
  getMonthString,
  generateMonthList,
  advanceRecurringDate,
  getTodayString,
  isDuplicateTransaction,
} from './utils/formatters';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsView } from './components/BudgetsView';
import { AnalyticsView } from './components/AnalyticsView';
import { SavingsGoalsView } from './components/SavingsGoalsView';
import { RecurringView } from './components/RecurringView';
import { AIAdvisorView } from './components/AIAdvisorView';
import { SettingsView } from './components/SettingsView';
import { TransactionModal } from './components/TransactionModal';
import { AuthModal } from './components/AuthModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { useAuth } from './context/AuthContext';
import { useAIChat } from './context/AIChatContext';
import { getReadableFirestoreError } from './firebase/config';
import {
  subscribeToTransactions,
  subscribeToBudgets,
  subscribeToGoals,
  subscribeToRecurring,
  subscribeToUserSettings,
  saveTransactionToFirestore,
  deleteTransactionFromFirestore,
  saveBudgetToFirestore,
  deleteBudgetFromFirestore,
  saveGoalToFirestore,
  deleteGoalFromFirestore,
  saveRecurringToFirestore,
  deleteRecurringFromFirestore,
  saveUserSettingsToFirestore,
  syncLocalDataToFirestore,
  wipeUserCloudData,
} from './firebase/firestoreService';
import {
  CheckCircle2,
  AlertCircle,
  Cloud,
  Sparkles,
  WifiOff,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  const {
    user,
    loading: authLoading,
    authError,
    clearAuthError,
    setIsAuthModalOpen,
    setAuthModalMode,
  } = useAuth();

  const [activePage, setActivePage] = useState<ActivePage>('Dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthString());
  const [monthList] = useState<string[]>(generateMonthList(24));
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Core Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [recurring, setRecurring] = useState<RecurringRule[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Cloud synchronization & error states
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [listenerEpoch, setListenerEpoch] = useState(0);

  // Friendly name for logged in user (used for AI Copilot and greetings)
  const userFriendlyName = useMemo(() => {
    if (!user) return '';
    if (user.displayName && user.displayName.trim() && user.displayName !== 'FinPilot User') {
      return user.displayName.trim();
    }
    if (user.email) {
      const raw = user.email.split('@')[0];
      const cleaned = raw.replace(/[0-9._-]/g, ' ').trim();
      if (cleaned.length > 0) {
        return cleaned
          .split(' ')
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      }
      return raw;
    }
    return '';
  }, [user]);

  // Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Global Toast Banner
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' = 'success') => {
      setToast({ message, type });
      setTimeout(() => {
        setToast((prev) => (prev?.message === message ? null : prev));
      }, 4200);
    },
    []
  );

  const { hasUnreadReply } = useAIChat();

  useEffect(() => {
    if (hasUnreadReply && activePage !== 'AI Assistant') {
      showToast(
        'FinPilot AI Copilot has prepared your financial analysis. Tap "Ask AI" to view.',
        'info'
      );
    }
  }, [hasUnreadReply, activePage, showToast]);

  // Online / Offline tracking
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Strictly isolate authenticated Firestore data per UID vs unauthenticated Guest Mode
  useEffect(() => {
    if (authLoading) return;

    if (user?.uid) {
      const activeUid = user.uid;
      // Clear any previous/guest records immediately before attaching user-isolated listeners
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      setRecurring([]);
      setSettings(DEFAULT_SETTINGS);
      setIsCloudLoading(true);
      setCloudError(null);

      const handleSnapshotError = (errMessage: string) => {
        setCloudError(errMessage);
        setIsCloudLoading(false);
      };

      const unsubTx = subscribeToTransactions(
        activeUid,
        (cloudTxs) => {
          setTransactions(cloudTxs);
          setIsCloudLoading(false);
          setCloudError(null);
        },
        handleSnapshotError
      );

      const unsubBudgets = subscribeToBudgets(
        activeUid,
        (cloudBudgets) => {
          setBudgets(cloudBudgets);
        },
        handleSnapshotError
      );

      const unsubGoals = subscribeToGoals(
        activeUid,
        (cloudGoals) => {
          setGoals(cloudGoals);
        },
        handleSnapshotError
      );

      const unsubRecurring = subscribeToRecurring(
        activeUid,
        (cloudRecurring) => {
          setRecurring(cloudRecurring);
        },
        handleSnapshotError
      );

      const unsubSettings = subscribeToUserSettings(
        activeUid,
        (cloudSettings) => {
          setSettings(cloudSettings);
        },
        handleSnapshotError
      );

      return () => {
        unsubTx();
        unsubBudgets();
        unsubGoals();
        unsubRecurring();
        unsubSettings();
      };
    } else {
      // Guest Mode: isolated strictly to local device storage
      setIsCloudLoading(false);
      setCloudError(null);
      setTransactions(loadTransactions());
      setBudgets(loadBudgets());
      setGoals(loadGoals());
      setRecurring(loadRecurring());
      setSettings(loadSettings());
    }
  }, [user?.uid, authLoading, listenerEpoch]);

  // Derived Financial Statistics for active month
  const monthStats = useMemo(() => {
    const monthTx = transactions.filter((tx) => tx.date.startsWith(selectedMonth));
    const income = monthTx
      .filter((tx) => tx.type === 'Income')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = monthTx
      .filter((tx) => tx.type === 'Expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const net = income - expenses;
    return { income, expenses, net };
  }, [transactions, selectedMonth]);

  // Transaction Handlers
  const handleSaveTransaction = async (
    txData: Omit<Transaction, 'id'>,
    existingId?: string
  ): Promise<boolean> => {
    const targetId =
      existingId || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullTx: Transaction = {
      ...txData,
      id: targetId,
    };

    if (user) {
      try {
        await saveTransactionToFirestore(user.uid, fullTx);
        showToast(
          existingId ? 'Transaction updated in cloud ledger.' : 'Transaction recorded in cloud ledger.',
          'success'
        );
        return true;
      } catch (err) {
        const msg = getReadableFirestoreError(err);
        showToast(msg, 'error');
        return false;
      }
    }

    const next = existingId
      ? transactions.map((t) => (t.id === existingId ? fullTx : t))
      : [fullTx, ...transactions];
    setTransactions(next);
    saveTransactions(next);
    showToast(existingId ? 'Transaction updated.' : 'Transaction recorded locally.', 'success');
    return true;
  };

  const handleAddTransactionDirect = async (
    txData: Omit<Transaction, 'id'>
  ): Promise<boolean> => {
    const isDup = isDuplicateTransaction(
      transactions,
      txData.date,
      txData.description,
      txData.category,
      txData.type,
      txData.amount
    );
    if (isDup) return false;

    const newTx: Transaction = {
      ...txData,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    if (user) {
      try {
        await saveTransactionToFirestore(user.uid, newTx);
        showToast('Transaction recorded in cloud ledger.', 'success');
        return true;
      } catch (err) {
        showToast(getReadableFirestoreError(err), 'error');
        return false;
      }
    }

    const next = [newTx, ...transactions];
    setTransactions(next);
    saveTransactions(next);
    showToast('Transaction recorded locally.', 'success');
    return true;
  };

  const handleDeleteTransaction = async (id: string) => {
    if (user) {
      try {
        await deleteTransactionFromFirestore(user.uid, id);
        showToast('Transaction permanently removed.', 'success');
      } catch (err) {
        showToast(getReadableFirestoreError(err), 'error');
      }
      return;
    }

    const filtered = transactions.filter((t) => t.id !== id);
    setTransactions(filtered);
    saveTransactions(filtered);
    showToast('Transaction permanently removed.', 'success');
  };

  // Budget Handlers
  const handleSaveBudget = async (category: string, monthlyLimit: number) => {
    if (user) {
      try {
        await saveBudgetToFirestore(user.uid, category, monthlyLimit);
        showToast(`Budget limit set for ${category}.`, 'success');
      } catch (err) {
        showToast(getReadableFirestoreError(err), 'error');
      }
      return;
    }

    const exists = budgets.some((b) => b.category.toLowerCase() === category.toLowerCase());
    const next = exists
      ? budgets.map((b) =>
          b.category.toLowerCase() === category.toLowerCase() ? { ...b, monthlyLimit } : b
        )
      : [...budgets, { category, monthlyLimit }];
    setBudgets(next);
    saveBudgets(next);
    showToast(`Budget limit set for ${category}.`, 'success');
  };

  const handleDeleteBudget = async (category: string) => {
    if (user) {
      try {
        await deleteBudgetFromFirestore(user.uid, category);
        showToast(`Budget for ${category} removed.`, 'success');
      } catch (err) {
        showToast(getReadableFirestoreError(err), 'error');
      }
      return;
    }

    const next = budgets.filter((b) => b.category !== category);
    setBudgets(next);
    saveBudgets(next);
    showToast(`Budget for ${category} removed.`, 'success');
  };

  // Goals Handlers
  const handleAddGoal = async (goalData: Omit<SavingsGoal, 'id'>) => {
    const newGoal: SavingsGoal = {
      ...goalData,
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    if (user) {
      try {
        await saveGoalToFirestore(user.uid, newGoal);
        showToast(`Savings goal "${goalData.name}" created.`, 'success');
      } catch (err) {
        showToast(getReadableFirestoreError(err), 'error');
      }
      return;
    }

    const next = [...goals, newGoal];
    setGoals(next);
    saveGoals(next);
    showToast(`Savings goal "${goalData.name}" created.`, 'success');
  };

  const handleUpdateGoal = async (id: string, updates: Partial<SavingsGoal>) => {
    const existing = goals.find((g) => g.id === id);
    if (!existing) return;
    const updated: SavingsGoal = { ...existing, ...updates };

    if (user) {
      try {
        await saveGoalToFirestore(user.uid, updated);
        showToast('Goal progress updated.', 'success');
      } catch (err) {
        showToast(getReadableFirestoreError(err), 'error');
      }
      return;
    }

    const next = goals.map((g) => (g.id === id ? updated : g));
    setGoals(next);
    saveGoals(next);
    showToast('Goal progress updated.', 'success');
  };

  const handleDeleteGoal = async (id: string) => {
    if (user) {
      try {
        await deleteGoalFromFirestore(user.uid, id);
        showToast('Savings goal deleted.', 'success');
      } catch (err) {
        showToast(getReadableFirestoreError(err), 'error');
      }
      return;
    }

    const next = goals.filter((g) => g.id !== id);
    setGoals(next);
    saveGoals(next);
    showToast('Savings goal deleted.', 'success');
  };

  // Recurring Handlers
  const handleAddRecurring = async (ruleData: Omit<RecurringRule, 'id'>) => {
    const newRule: RecurringRule = {
      ...ruleData,
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    if (user) {
      try {
        await saveRecurringToFirestore(user.uid, newRule);
        showToast('Recurring rule created.', 'success');
      } catch (err) {
        showToast(getReadableFirestoreError(err), 'error');
      }
      return;
    }

    const next = [...recurring, newRule];
    setRecurring(next);
    saveRecurring(next);
    showToast('Recurring rule created.', 'success');
  };

  const handleUpdateRecurring = async (id: string, updates: Partial<RecurringRule>) => {
    const existing = recurring.find((r) => r.id === id);
    if (!existing) return;
    const updated: RecurringRule = { ...existing, ...updates };

    if (user) {
      try {
        await saveRecurringToFirestore(user.uid, updated);
        showToast('Recurring rule updated.', 'success');
      } catch (err) {
        showToast(getReadableFirestoreError(err), 'error');
      }
      return;
    }

    const next = recurring.map((r) => (r.id === id ? updated : r));
    setRecurring(next);
    saveRecurring(next);
    showToast('Recurring rule updated.', 'success');
  };

  const handleDeleteRecurring = async (id: string) => {
    if (user) {
      try {
        await deleteRecurringFromFirestore(user.uid, id);
        showToast('Recurring schedule removed.', 'success');
      } catch (err) {
        showToast(getReadableFirestoreError(err), 'error');
      }
      return;
    }

    const next = recurring.filter((r) => r.id !== id);
    setRecurring(next);
    saveRecurring(next);
    showToast('Recurring schedule removed.', 'success');
  };

  // Process Due Recurring items
  const handleProcessDueRecurring = async () => {
    const today = getTodayString();
    const dueRules = recurring.filter((r) => r.active && r.nextDate <= today);
    if (dueRules.length === 0) {
      showToast('No recurring rules are currently due.', 'info');
      return;
    }

    try {
      const addedGuestTxs: Transaction[] = [];
      let updatedGuestRules = [...recurring];

      for (const rule of dueRules) {
        const newTx: Transaction = {
          id: `tx_rec_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          date: rule.nextDate,
          description: rule.description,
          category: rule.category,
          type: rule.type,
          amount: rule.amount,
          notes: `Automated posting from ${rule.frequency} recurring schedule`,
        };

        const advancedDate = advanceRecurringDate(rule.nextDate, rule.frequency);
        const updatedRule: RecurringRule = {
          ...rule,
          nextDate: advancedDate,
        };

        if (user) {
          await saveTransactionToFirestore(user.uid, newTx);
          await saveRecurringToFirestore(user.uid, updatedRule);
        } else {
          addedGuestTxs.push(newTx);
          updatedGuestRules = updatedGuestRules.map((r) =>
            r.id === rule.id ? updatedRule : r
          );
        }
      }

      if (!user) {
        const nextTxs = [...addedGuestTxs, ...transactions];
        setTransactions(nextTxs);
        saveTransactions(nextTxs);
        setRecurring(updatedGuestRules);
        saveRecurring(updatedGuestRules);
      }

      showToast(`Posted ${dueRules.length} due transaction(s) and advanced schedule dates.`);
    } catch (err) {
      showToast(getReadableFirestoreError(err), 'error');
    }
  };

  const handleUpdateUserSettings = async (newSettings: UserSettings): Promise<boolean> => {
    if (user) {
      try {
        await saveUserSettingsToFirestore(user.uid, newSettings);
        setSettings(newSettings);
        showToast('Settings saved to your cloud profile.', 'success');
        return true;
      } catch (err) {
        showToast(getReadableFirestoreError(err), 'error');
        return false;
      }
    }

    setSettings(newSettings);
    saveSettings(newSettings);
    showToast('Settings saved locally.', 'success');
    return true;
  };

  const handleCreateSessionBackup = useCallback((): BackupData => {
    return createFullBackup({
      transactions,
      budgets,
      goals,
      recurring,
      settings,
    });
  }, [transactions, budgets, goals, recurring, settings]);

  const handleRestoreSessionBackup = async (
    backupData: BackupData
  ): Promise<{
    transactionsCount: number;
    budgetsCount: number;
    goalsCount: number;
    recurringCount: number;
  }> => {
    if (user) {
      const parsed = parseBackupForMerge(backupData, transactions);
      await syncLocalDataToFirestore(
        user.uid,
        parsed.addedTransactions,
        parsed.budgets,
        parsed.goals,
        parsed.recurring,
        parsed.settings
      );
      return {
        transactionsCount: parsed.addedTransactions.length,
        budgetsCount: parsed.budgets.length,
        goalsCount: parsed.goals.length,
        recurringCount: parsed.recurring.length,
      };
    }

    const stats = restoreFullBackup(backupData);
    setTransactions(loadTransactions());
    setBudgets(loadBudgets());
    setGoals(loadGoals());
    setRecurring(loadRecurring());
    setSettings(loadSettings());
    return stats;
  };

  // Load Sample Data ONLY when explicitly clicked by user
  const handleResetDemoData = async (): Promise<boolean> => {
    if (user) {
      try {
        const sample = buildSampleDataset();
        await syncLocalDataToFirestore(
          user.uid,
          sample.transactions,
          sample.budgets,
          sample.goals,
          sample.recurring,
          settings
        );
        showToast('Sample dataset loaded into your cloud account.', 'info');
        return true;
      } catch (err) {
        showToast(getReadableFirestoreError(err), 'error');
        return false;
      }
    }

    resetToDemoData();
    setTransactions(loadTransactions());
    setBudgets(loadBudgets());
    setGoals(loadGoals());
    setRecurring(loadRecurring());
    showToast('Sample financial records loaded locally.', 'info');
    return true;
  };

  // Wipe All Data
  const handleWipeAllData = async (): Promise<boolean> => {
    if (user) {
      try {
        await wipeUserCloudData(user.uid);
        showToast('All cloud financial records permanently wiped.', 'info');
        return true;
      } catch (err) {
        showToast(getReadableFirestoreError(err), 'error');
        return false;
      }
    }

    clearAllUserData();
    setTransactions([]);
    setBudgets([]);
    setGoals([]);
    setRecurring([]);
    showToast('All local financial records permanently wiped.', 'info');
    return true;
  };

  // Prevent flashing logged-out / guest mode while Firebase restores session on refresh
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F1F3] text-[#29272F] p-6">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/90 bg-white/90 px-8 py-7 shadow-xs">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#A99BEA] to-[#8C7BD0] text-xl font-bold text-white shadow-sm">
            ✳
          </span>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#585160]">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#7867B5]" />
            <span>Restoring your FinPilot workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F5F1F3] text-[#29272F]">
      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        monthList={monthList}
        monthlyNet={monthStats.net}
        monthlyIncome={monthStats.income}
        currencySymbol={settings.currency.symbol}
        isOpenMobile={isMobileSidebarOpen}
        setIsOpenMobile={setIsMobileSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
        <TopBar
          activePage={activePage}
          selectedMonth={selectedMonth}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenAddTransaction={() => {
            setEditingTx(null);
            setIsTxModalOpen(true);
          }}
          onOpenAI={() => setActivePage('AI Assistant')}
        />

        {/* Offline indicator banner */}
        {!isOnline && (
          <div className="mx-4 md:mx-8 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                You are currently offline. Reconnect to synchronize cloud updates and AI analysis.
              </span>
            </div>
          </div>
        )}

        {/* Cloud Loading Indicator */}
        {user && isCloudLoading && (
          <div className="mx-4 md:mx-8 mt-3 flex items-center gap-2.5 rounded-2xl border border-[#DFD6EE] bg-[#FAF8FC] p-3.5 text-xs text-[#534C5D]">
            <RefreshCw className="h-4 w-4 animate-spin text-[#7867B5] shrink-0" />
            <span>Loading your encrypted cloud ledger for {user.email}...</span>
          </div>
        )}

        {/* Firestore Cloud Error Banner */}
        {user && cloudError && (
          <div className="mx-4 md:mx-8 mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{cloudError}</span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setListenerEpoch((n) => n + 1)}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reconnect</span>
              </button>
              <button
                onClick={() => setCloudError(null)}
                className="text-rose-600 hover:text-rose-800 p-1 text-sm font-bold"
                aria-label="Dismiss cloud error"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Cloud onboarding banner when account has loaded and has no records yet */}
        {user && !isCloudLoading && !cloudError && transactions.length === 0 && (
          <div className="mx-4 md:mx-8 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#AA9FF1]/60 bg-[#FAF7FD] p-3.5 text-xs">
            <div className="flex items-center gap-2.5">
              <Cloud className="h-4 w-4 text-[#7867B5] shrink-0" />
              <span className="text-[#3F364B]">
                Signed in as <strong>{user.email}</strong>. Your cloud ledger is clean and ready.
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => {
                  setEditingTx(null);
                  setIsTxModalOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-[#7867B5] px-3 py-1.5 font-semibold text-white hover:bg-[#6857A4] transition-colors whitespace-nowrap"
              >
                <span>+ Add First Entry</span>
              </button>
              <button
                onClick={() => void handleResetDemoData()}
                className="inline-flex items-center gap-1 rounded-xl border border-[#D5CBE5] bg-white px-3 py-1.5 font-semibold text-[#6857A4] hover:bg-[#F3EEF9] transition-colors whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Explore Sample Data</span>
              </button>
            </div>
          </div>
        )}

        {/* Auth Error Banner (shown when modal is closed) */}
        {authError && (
          <div className="mx-4 md:mx-8 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{authError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setAuthModalMode('signin');
                  setIsAuthModalOpen(true);
                }}
                className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 transition-colors"
              >
                Open Sign-In
              </button>
              <button
                onClick={clearAuthError}
                className="text-rose-600 hover:text-rose-800 p-1 text-sm font-bold"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Global Toast Notification */}
        {toast && (
          <div
            className={`fixed top-20 right-6 z-50 flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-semibold shadow-xl transition-all animate-in fade-in slide-in-from-top-2 max-w-sm ${
              toast.type === 'error'
                ? 'border-rose-300 bg-rose-600 text-white'
                : toast.type === 'info'
                ? 'border-neutral-700 bg-[#29272F] text-white'
                : 'border-[#AA9FF1]/40 bg-[#29272F] text-white'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-rose-200 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-[#A99BEA] shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
          {activePage === 'Dashboard' && (
            <DashboardView
              transactions={transactions}
              budgets={budgets}
              goals={goals}
              recurring={recurring}
              selectedMonth={selectedMonth}
              currencySymbol={settings.currency.symbol}
              targetSavingsRate={settings.targetSavingsRate}
              onNavigate={(page) => setActivePage(page)}
              onOpenAddTransaction={() => {
                setEditingTx(null);
                setIsTxModalOpen(true);
              }}
              onProcessDueRecurring={handleProcessDueRecurring}
            />
          )}

          {activePage === 'Transactions' && (
            <TransactionsView
              transactions={transactions}
              onAddTransaction={handleAddTransactionDirect}
              onUpdateTransaction={(id, tx) => void handleSaveTransaction(tx, id)}
              onDeleteTransaction={handleDeleteTransaction}
              currencySymbol={settings.currency.symbol}
              onCreateBackup={handleCreateSessionBackup}
              onRestoreBackupData={handleRestoreSessionBackup}
              onDataRestored={() => {
                showToast('Financial backup restored.');
              }}
              onOpenEditModal={(tx) => {
                setEditingTx(tx);
                setIsTxModalOpen(true);
              }}
            />
          )}

          {activePage === 'Budgets' && (
            <BudgetsView
              budgets={budgets}
              transactions={transactions}
              selectedMonth={selectedMonth}
              currencySymbol={settings.currency.symbol}
              onSaveBudget={handleSaveBudget}
              onDeleteBudget={handleDeleteBudget}
            />
          )}

          {activePage === 'Analytics' && (
            <AnalyticsView
              transactions={transactions}
              currencySymbol={settings.currency.symbol}
            />
          )}

          {activePage === 'Savings goals' && (
            <SavingsGoalsView
              goals={goals}
              currencySymbol={settings.currency.symbol}
              onAddGoal={handleAddGoal}
              onUpdateGoal={handleUpdateGoal}
              onDeleteGoal={handleDeleteGoal}
            />
          )}

          {activePage === 'Recurring' && (
            <RecurringView
              rules={recurring}
              currencySymbol={settings.currency.symbol}
              onAddRule={handleAddRecurring}
              onUpdateRule={handleUpdateRecurring}
              onDeleteRule={handleDeleteRecurring}
              onProcessDue={handleProcessDueRecurring}
            />
          )}

          {/* AI Advisor - Kept mounted in background so in-flight requests and conversation history are never lost when switching tabs */}
          <div className={activePage === 'AI Assistant' ? 'block' : 'hidden'}>
            <AIAdvisorView
              transactions={transactions}
              budgets={budgets}
              goals={goals}
              recurring={recurring}
              selectedMonth={selectedMonth}
              currencySymbol={settings.currency.symbol}
              targetSavingsRate={settings.targetSavingsRate}
              userName={userFriendlyName}
            />
          </div>

          {activePage === 'Settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateUserSettings}
              stats={{
                transactionsCount: transactions.length,
                budgetsCount: budgets.length,
                goalsCount: goals.length,
                recurringCount: recurring.length,
              }}
              onCreateBackup={handleCreateSessionBackup}
              onResetDemoData={handleResetDemoData}
              onWipeAllData={handleWipeAllData}
            />
          )}
        </main>
      </div>

      {/* Transaction Creation / Edit Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        existingTransaction={editingTx}
        existingTransactions={transactions}
        currencySymbol={settings.currency.symbol}
      />

      {/* Authentication Modal (Sign In / Register / Password Reset) */}
      <AuthModal />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activePage={activePage}
        setActivePage={setActivePage}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onOpenAddTransaction={() => {
          setEditingTx(null);
          setIsTxModalOpen(true);
        }}
      />
    </div>
  );
}
