import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Upload,
  Trash2,
  Edit2,
  Plus,
  FileSpreadsheet,
  Database,
  CheckCircle2,
  AlertCircle,
  FileDown,
  X,
  Tag,
} from 'lucide-react';
import { Transaction, TransactionType } from '../types/finance';
import {
  formatCurrency,
  formatDate,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  CATEGORY_GLYPHS,
  getTodayString,
} from '../utils/formatters';
import { createFullBackup, restoreFullBackup } from '../utils/storage';

interface TransactionsViewProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => Promise<boolean> | boolean;
  onUpdateTransaction: (id: string, tx: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  currencySymbol: string;
  onDataRestored: () => void;
  onOpenEditModal: (tx: Transaction) => void;
}

const HighlightMatch: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query || !query.trim()) return <>{text}</>;
  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={index}
            className="rounded bg-[#E5DCF8] px-0.5 font-semibold text-[#533E8E]"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  currencySymbol,
  onDataRestored,
  onOpenEditModal,
}) => {
  const [activeTab, setActiveTab] = useState<
    'history' | 'add' | 'import_export' | 'backup_restore'
  >('history');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Income' | 'Expense'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low'>('newest');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setActiveTab('history');
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchTerm('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add Form State (Tab 1)
  const [newType, setNewType] = useState<TransactionType>('Expense');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Food');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(getTodayString());
  const [newNotes, setNewNotes] = useState('');
  const [addFormFeedback, setAddFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // CSV Import State
  const [csvPreview, setCsvPreview] = useState<{
    valid: Omit<Transaction, 'id'>[];
    rejected: { row: number; error: string; raw: string }[];
  } | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // JSON Restore State
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  // Derived filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (typeFilter !== 'All' && tx.type !== typeFilter) return false;
        if (selectedCategory !== 'All' && tx.category !== selectedCategory) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchDesc = tx.description.toLowerCase().includes(q);
          const matchCat = tx.category.toLowerCase().includes(q);
          const matchNotes = tx.notes ? tx.notes.toLowerCase().includes(q) : false;
          if (!matchDesc && !matchCat && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return b.date.localeCompare(a.date);
        if (sortBy === 'oldest') return a.date.localeCompare(b.date);
        if (sortBy === 'amount_high') return b.amount - a.amount;
        return a.amount - b.amount;
      });
  }, [transactions, typeFilter, selectedCategory, searchTerm, sortBy]);

  const totalFilteredIncome = filteredTransactions
    .filter((tx) => tx.type === 'Income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalFilteredExpenses = filteredTransactions
    .filter((tx) => tx.type === 'Expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Unique categories in transactions
  const allKnownCategories = useMemo(() => {
    const set = new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]);
    transactions.forEach((tx) => set.add(tx.category));
    return Array.from(set).sort();
  }, [transactions]);

  // Handle Add Form
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormFeedback(null);
    const amt = parseFloat(newAmount);
    if (!newDesc.trim()) {
      setAddFormFeedback({ type: 'error', message: 'Description cannot be empty.' });
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setAddFormFeedback({ type: 'error', message: 'Amount must be greater than zero.' });
      return;
    }
    if (newDate > getTodayString()) {
      setAddFormFeedback({ type: 'error', message: 'Date cannot be in the future.' });
      return;
    }

    const success = await onAddTransaction({
      date: newDate,
      description: newDesc.trim(),
      category: newCategory,
      type: newType,
      amount: amt,
      notes: newNotes.trim(),
    });

    if (success) {
      setAddFormFeedback({ type: 'success', message: 'Transaction recorded successfully.' });
      setNewDesc('');
      setNewAmount('');
      setNewNotes('');
    } else {
      setAddFormFeedback({
        type: 'error',
        message: 'An exact duplicate transaction exists. You can save duplicates via "+ New Entry" modal.',
      });
    }
  };

  // CSV Template Download
  const handleDownloadTemplate = () => {
    const csvContent =
      'transaction_date,description,category,transaction_type,amount,notes\n' +
      '2026-10-01,Monthly Salary,Salary,Income,85000,Direct deposit\n' +
      '2026-10-02,Apartment Rent,Bills,Expense,22000,House lease\n' +
      '2026-10-05,Groceries,Food,Expense,3200,Weekly market\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'finpilot_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['transaction_date', 'description', 'category', 'transaction_type', 'amount', 'notes'];
    const rows = filteredTransactions.map((tx) => [
      tx.date,
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${tx.category.replace(/"/g, '""')}"`,
      tx.type,
      tx.amount,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finpilot_transactions_${getTodayString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Parse CSV File
  const handleCsvUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setImportStatus('CSV must contain a header row and at least one data row.');
        return;
      }

      const rawHeaders = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
      const dateIdx = rawHeaders.findIndex((h) => h === 'transaction_date' || h === 'date');
      const descIdx = rawHeaders.findIndex((h) => h === 'description' || h === 'item' || h === 'desc');
      const catIdx = rawHeaders.findIndex((h) => h === 'category' || h === 'cat');
      const typeIdx = rawHeaders.findIndex((h) => h === 'transaction_type' || h === 'type');
      const amountIdx = rawHeaders.findIndex((h) => h === 'amount' || h === 'cost' || h === 'value');
      const notesIdx = rawHeaders.findIndex((h) => h === 'notes' || h === 'note' || h === 'memo');

      if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
        setImportStatus(
          'Missing required columns. CSV must include Date, Description, and Amount columns.'
        );
        return;
      }

      const validRows: Omit<Transaction, 'id'>[] = [];
      const rejectedRows: { row: number; error: string; raw: string }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Basic CSV field parser handling quoted strings
        const fields: string[] = [];
        let curr = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const ch = line[j];
          if (ch === '"') inQuotes = !inQuotes;
          else if (ch === ',' && !inQuotes) {
            fields.push(curr.trim());
            curr = '';
          } else curr += ch;
        }
        fields.push(curr.trim());

        const rawDate = fields[dateIdx]?.replace(/^["']|["']$/g, '');
        const rawDesc = fields[descIdx]?.replace(/^["']|["']$/g, '');
        const rawAmount = fields[amountIdx]?.replace(/^["']|["']$/g, '').replace(/[₹$,]/g, '');
        const rawCat = catIdx !== -1 ? fields[catIdx]?.replace(/^["']|["']$/g, '') : 'Other';
        const rawType = typeIdx !== -1 ? fields[typeIdx]?.replace(/^["']|["']$/g, '') : 'Expense';
        const rawNotes = notesIdx !== -1 ? fields[notesIdx]?.replace(/^["']|["']$/g, '') : '';

        const amt = parseFloat(rawAmount);
        const normType: TransactionType =
          rawType.toLowerCase().startsWith('inc') ? 'Income' : 'Expense';

        if (!rawDate || isNaN(Date.parse(rawDate))) {
          rejectedRows.push({ row: i + 1, error: 'Invalid or missing date (use YYYY-MM-DD)', raw: line });
          continue;
        }
        if (!rawDesc || rawDesc.trim().length === 0) {
          rejectedRows.push({ row: i + 1, error: 'Description is required', raw: line });
          continue;
        }
        if (isNaN(amt) || amt <= 0) {
          rejectedRows.push({ row: i + 1, error: 'Amount must be a positive number', raw: line });
          continue;
        }

        validRows.push({
          date: rawDate,
          description: rawDesc.trim(),
          category: rawCat || 'Other',
          type: normType,
          amount: amt,
          notes: rawNotes || '',
        });
      }

      setCsvPreview({ valid: validRows, rejected: rejectedRows });
      setImportStatus(null);
    };
    reader.readAsText(file);
  };

  const handleConfirmCsvImport = async () => {
    if (!csvPreview || csvPreview.valid.length === 0) return;
    let added = 0;
    for (const tx of csvPreview.valid) {
      await onAddTransaction(tx);
      added++;
    }
    setImportStatus(`Successfully imported ${added} transactions.`);
    setCsvPreview(null);
  };

  // JSON Backup & Restore Handlers
  const handleDownloadJsonBackup = () => {
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

  const handleJsonRestoreUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        const stats = restoreFullBackup(parsed);
        setRestoreStatus(
          `Backup restored: merged ${stats.transactionsCount} new transactions, ${stats.budgetsCount} budgets, ${stats.goalsCount} goals, and ${stats.recurringCount} recurring rules.`
        );
        onDataRestored();
      } catch (err: any) {
        setRestoreStatus(`Failed to restore: ${err.message || 'Invalid JSON format'}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#7867B5]">
              MONEY IN · MONEY OUT
            </div>
            <h2 className="mt-1 font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-[#29272F]">
              Transactions Ledger
            </h2>
            <p className="text-xs text-[#7A7285]">
              Track, categorize, filter, import, and safeguard your entire financial history.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D5CBE5] bg-white px-3 py-1.5 text-xs font-semibold text-[#5B4E80] shadow-xs hover:bg-[#F8F5FC] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Segmented Tab Navigation */}
        <div className="mt-6 flex flex-wrap gap-1 rounded-2xl border border-[#EAE3EE] bg-[#F4EFF6] p-1">
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-white text-[#29272F] shadow-xs font-bold'
                : 'text-[#6A6273] hover:text-[#29272F]'
            }`}
          >
            History & Edit ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'add'
                ? 'bg-white text-[#29272F] shadow-xs font-bold'
                : 'text-[#6A6273] hover:text-[#29272F]'
            }`}
          >
            + Add Transaction
          </button>
          <button
            onClick={() => setActiveTab('import_export')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'import_export'
                ? 'bg-white text-[#29272F] shadow-xs font-bold'
                : 'text-[#6A6273] hover:text-[#29272F]'
            }`}
          >
            Import CSV
          </button>
          <button
            onClick={() => setActiveTab('backup_restore')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'backup_restore'
                ? 'bg-white text-[#29272F] shadow-xs font-bold'
                : 'text-[#6A6273] hover:text-[#29272F]'
            }`}
          >
            Backup & Restore (JSON)
          </button>
        </div>
      </div>

      {/* Tab 1: History & Filter */}
      {activeTab === 'history' && (
        <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs space-y-4">
          {/* Main Search & Filter Control Hub */}
          <div className="space-y-3">
            {/* Primary Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7867B5]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by description or category (e.g. Grocery, Rent, Coffee)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-[#D5CBE5] bg-[#FAF8FD] pl-10 pr-9 py-2.5 text-xs text-[#29272F] placeholder:text-[#8D8499] outline-none focus:border-[#7867B5] focus:bg-white focus:ring-3 focus:ring-[#7867B5]/15 transition-all shadow-inner"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-[#EAE2F3] text-[#554094] hover:bg-[#D8CCED] transition-colors"
                    title="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Secondary Select Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="rounded-2xl border border-[#D5CBE5] bg-[#FAF8FD] px-3 py-2.5 text-xs font-medium text-[#29272F] outline-none focus:border-[#7867B5] focus:bg-white transition-colors"
                >
                  <option value="All">All Types (±)</option>
                  <option value="Income">Income (+)</option>
                  <option value="Expense">Expense (−)</option>
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-2xl border border-[#D5CBE5] bg-[#FAF8FD] px-3 py-2.5 text-xs font-medium text-[#29272F] outline-none focus:border-[#7867B5] focus:bg-white transition-colors"
                >
                  <option value="All">All Categories</option>
                  {allKnownCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-2xl border border-[#D5CBE5] bg-[#FAF8FD] px-3 py-2.5 text-xs font-medium text-[#29272F] outline-none focus:border-[#7867B5] focus:bg-white transition-colors"
                  title="Sort order"
                >
                  <option value="newest">Newest Date</option>
                  <option value="oldest">Oldest Date</option>
                  <option value="amount_high">Highest Amount</option>
                  <option value="amount_low">Lowest Amount</option>
                </select>
              </div>
            </div>

            {/* Quick Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar text-xs">
              <span className="text-[11px] font-semibold text-[#8C8397] shrink-0 mr-1 flex items-center gap-1">
                <Tag className="h-3 w-3" /> Filter:
              </span>
              <button
                onClick={() => setSelectedCategory('All')}
                className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all shrink-0 ${
                  selectedCategory === 'All'
                    ? 'bg-[#7867B5] text-white shadow-xs'
                    : 'bg-[#F4EFF6] text-[#6A6273] hover:text-[#29272F] hover:bg-[#EAE2F0]'
                }`}
              >
                All
              </button>
              {allKnownCategories.slice(0, 10).map((cat) => {
                const isSelected = selectedCategory === cat;
                const glyph = CATEGORY_GLYPHS[cat] || '•';
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(isSelected ? 'All' : cat)}
                    className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all shrink-0 ${
                      isSelected
                        ? 'bg-[#7867B5] text-white shadow-xs'
                        : 'bg-[#F4EFF6] text-[#6A6273] hover:text-[#29272F] hover:bg-[#EAE2F0]'
                    }`}
                  >
                    <span>{glyph}</span>
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Search & Filter Tags Bar */}
            {(searchTerm.trim() || selectedCategory !== 'All' || typeFilter !== 'All') && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-[#8C8397]">Active filters:</span>
                {searchTerm.trim() && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5CBE5] bg-[#F7F3FB] px-2.5 py-1 text-[11px] font-medium text-[#533E8E]">
                    <span>Search: <strong>"{searchTerm}"</strong></span>
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-[#7867B5] hover:text-[#29272F]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedCategory !== 'All' && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5CBE5] bg-[#F7F3FB] px-2.5 py-1 text-[11px] font-medium text-[#533E8E]">
                    <span>Category: <strong>{selectedCategory}</strong></span>
                    <button
                      onClick={() => setSelectedCategory('All')}
                      className="text-[#7867B5] hover:text-[#29272F]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {typeFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5CBE5] bg-[#F7F3FB] px-2.5 py-1 text-[11px] font-medium text-[#533E8E]">
                    <span>Type: <strong>{typeFilter}</strong></span>
                    <button
                      onClick={() => setTypeFilter('All')}
                      className="text-[#7867B5] hover:text-[#29272F]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('All');
                    setTypeFilter('All');
                  }}
                  className="text-[11px] font-semibold text-[#7867B5] hover:underline ml-1"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Ledger Summary Sub-bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 pb-1 border-t border-[#F0EBF2] text-xs text-[#7A7285]">
            <div className="flex flex-wrap items-center gap-2.5">
              <span>
                Showing <strong className="text-[#29272F]">{filteredTransactions.length}</strong> of{' '}
                {transactions.length} records
              </span>
              <span className="text-[#C1B7C7]">·</span>
              <span>
                Inflow: <strong className="text-[#3E7459] font-mono">{formatCurrency(totalFilteredIncome, currencySymbol)}</strong>
              </span>
              <span className="text-[#C1B7C7]">·</span>
              <span>
                Outflow: <strong className="text-[#9A4E6C] font-mono">{formatCurrency(totalFilteredExpenses, currencySymbol)}</strong>
              </span>
            </div>

            <span className="text-[10px] text-[#A29AA8] hidden md:inline">
              Tip: Press <kbd className="rounded border border-[#DCD5E0] bg-[#FAF8FB] px-1 py-0.5 font-mono text-[10px] text-[#554E5E]">/</kbd> to search anytime
            </span>
          </div>

          {/* Table / Ledger */}
          {filteredTransactions.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4EFF8] text-[#7867B5] mb-3">
                <Search className="h-6 w-6" />
              </div>
              <h4 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#29272F]">
                {searchTerm || selectedCategory !== 'All' || typeFilter !== 'All'
                  ? 'No matching transactions found'
                  : 'No transactions recorded yet'}
              </h4>
              <p className="mt-1 text-xs text-[#7A7285] max-w-sm mx-auto">
                {searchTerm
                  ? `No transactions matched "${searchTerm}" in description or category. Try adjusting your search term or clearing filters.`
                  : 'Your ledger is currently empty. Add your first transaction or import a statement.'}
              </p>
              {(searchTerm || selectedCategory !== 'All' || typeFilter !== 'All') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('All');
                    setTypeFilter('All');
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#7867B5] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#6857A4] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear Search & Filters</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#F0EDF2] overflow-hidden rounded-2xl border border-[#ECE7F0]">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 hover:bg-[#FAF8FC] transition-colors text-xs"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F0EBF5] font-mono text-sm text-[#7867B5] mt-0.5 sm:mt-0">
                      {CATEGORY_GLYPHS[tx.category] || '•'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-[#29272F] truncate">
                        <HighlightMatch text={tx.description} query={searchTerm} />
                      </div>
                      <div className="text-[11px] text-[#898393]">
                        <span>{formatDate(tx.date)}</span>
                        <span className="mx-1 text-[#C4BBC8]">·</span>
                        <span className="font-medium text-[#655D70]">
                          <HighlightMatch text={tx.category} query={searchTerm} />
                        </span>
                        {tx.notes && (
                          <>
                            <span className="mx-1 text-[#C4BBC8]">·</span>
                            <span className="italic">
                              <HighlightMatch text={tx.notes} query={searchTerm} />
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-11 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <div
                        className={`font-semibold tabular-nums text-sm ${
                          tx.type === 'Income' ? 'text-[#3E7459]' : 'text-[#29272F]'
                        }`}
                      >
                        {tx.type === 'Income' ? '+' : '−'}
                        {formatCurrency(tx.amount, currencySymbol)}
                      </div>
                      <div className="text-[10px] text-[#898393] uppercase tracking-wider">
                        {tx.type}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onOpenEditModal(tx)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E2D9E8] bg-white text-[#6A6273] hover:text-[#7867B5] hover:border-[#A99BEA] transition-colors"
                        title="Edit entry"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (deleteConfirmId === tx.id) {
                            onDeleteTransaction(tx.id);
                            setDeleteConfirmId(null);
                          } else {
                            setDeleteConfirmId(tx.id);
                          }
                        }}
                        className={`flex h-7 items-center justify-center rounded-lg px-2 text-[11px] transition-colors ${
                          deleteConfirmId === tx.id
                            ? 'bg-rose-600 text-white font-bold'
                            : 'border border-[#E2D9E8] bg-white text-[#6A6273] hover:text-rose-600 hover:border-rose-300'
                        }`}
                        title="Delete entry"
                      >
                        {deleteConfirmId === tx.id ? 'Confirm?' : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Add Transaction Form */}
      {activeTab === 'add' && (
        <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs max-w-2xl">
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F] mb-1">
            Record New Transaction
          </h3>
          <p className="text-xs text-[#7A7285] mb-5">
            Manually enter a single income or expense into your permanent ledger.
          </p>

          {addFormFeedback && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-xs ${
                addFormFeedback.type === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {addFormFeedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span>{addFormFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleQuickAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#E5DEE8] bg-[#F1EBF3] p-1">
              <button
                type="button"
                onClick={() => {
                  setNewType('Expense');
                  setNewCategory('Food');
                }}
                className={`rounded-xl py-2 text-xs font-semibold transition-all ${
                  newType === 'Expense' ? 'bg-white text-[#8A3A54] shadow-xs' : 'text-[#6D6577]'
                }`}
              >
                Expense (−)
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewType('Income');
                  setNewCategory('Salary');
                }}
                className={`rounded-xl py-2 text-xs font-semibold transition-all ${
                  newType === 'Income' ? 'bg-white text-[#2B6849] shadow-xs' : 'text-[#6D6577]'
                }`}
              >
                Income (+)
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                Description
              </label>
              <input
                type="text"
                placeholder={newType === 'Expense' ? 'e.g. Organic Groceries' : 'e.g. Monthly Consulting'}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3.5 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                  Amount ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-xs font-bold text-[#7A7285]">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full rounded-xl border border-[#E2D9E8] bg-white pl-8 pr-3.5 py-2.5 text-xs font-semibold tabular-nums text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  max={getTodayString()}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
              >
                {(newType === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Paid via credit card, receipt saved"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3.5 py-2 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-[#A99BEA] to-[#9282D7] py-2.5 text-xs font-semibold text-white shadow-md shadow-[#7867B5]/20 hover:brightness-105 active:scale-95 transition-all"
            >
              Save Record to Ledger
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: CSV Import & Export */}
      {activeTab === 'import_export' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs">
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
              Import Transactions from CSV
            </h3>
            <p className="text-xs text-[#7A7285] mt-1">
              Upload bank statements or spreadsheet exports. FinPilot automatically detects standard column headers.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D5CBE5] bg-[#FAF8FC] px-3.5 py-2 text-xs font-semibold text-[#6654A0] hover:bg-[#F1EBF7] transition-colors"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>Download Sample CSV Template</span>
              </button>
            </div>

            {/* Drop zone */}
            <div className="mt-4 rounded-2xl border-2 border-dashed border-[#DCD5E0] bg-[#FAF8FB] p-8 text-center transition-colors hover:border-[#A99BEA]">
              <Upload className="mx-auto h-8 w-8 text-[#A99BEA]" />
              <div className="mt-2 text-xs font-semibold text-[#29272F]">
                Click or drag CSV file here to preview
              </div>
              <p className="text-[11px] text-[#898393] mt-1">
                Accepted columns: Date (or transaction_date), Description, Amount, Category, Type
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCsvUpload(file);
                }}
                className="mt-4 text-xs text-[#7A7285] file:mr-3 file:rounded-xl file:border-0 file:bg-[#A99BEA] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#9787DE]"
              />
            </div>

            {importStatus && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                {importStatus}
              </div>
            )}

            {/* Preview of Valid & Rejected Rows */}
            {csvPreview && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#29272F]">
                    CSV Parsed: {csvPreview.valid.length} valid row(s), {csvPreview.rejected.length} skipped
                  </div>
                  {csvPreview.valid.length > 0 && (
                    <button
                      onClick={handleConfirmCsvImport}
                      className="rounded-xl bg-gradient-to-r from-[#789687] to-[#5F8271] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:brightness-105"
                    >
                      Confirm Import ({csvPreview.valid.length} Entries)
                    </button>
                  )}
                </div>

                {csvPreview.rejected.length > 0 && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-900">
                    <div className="font-semibold mb-1">Skipped Rows:</div>
                    <ul className="list-disc list-inside space-y-1 text-[11px]">
                      {csvPreview.rejected.slice(0, 5).map((r, i) => (
                        <li key={i}>
                          Row {r.row}: {r.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {csvPreview.valid.length > 0 && (
                  <div className="max-h-60 overflow-y-auto rounded-2xl border border-[#ECE7F0] divide-y divide-[#F0EDF2]">
                    {csvPreview.valid.slice(0, 20).map((row, idx) => (
                      <div key={idx} className="flex justify-between p-2.5 text-xs">
                        <div>
                          <span className="font-semibold text-[#29272F]">{row.description}</span>
                          <span className="text-[#898393] ml-2 text-[11px]">{row.date} · {row.category}</span>
                        </div>
                        <div className="tabular-nums font-semibold">
                          {row.type === 'Income' ? '+' : '−'}
                          {formatCurrency(row.amount, currencySymbol)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Backup & Restore */}
      {activeTab === 'backup_restore' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7867B5]">
                <Database className="h-4 w-4" />
                <span>Export Snapshot</span>
              </div>
              <h3 className="mt-2 font-['Plus_Jakarta_Sans'] text-lg font-bold text-[#29272F]">
                Download Complete JSON Backup
              </h3>
              <p className="text-xs text-[#7A7285] mt-1 leading-relaxed">
                Includes all your recorded transactions, category budgets, savings goals, recurring rules, and preferences in one portable JSON file.
              </p>
            </div>

            <button
              onClick={handleDownloadJsonBackup}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#A99BEA] to-[#9282D7] py-2.5 text-xs font-semibold text-white shadow-xs hover:brightness-105 active:scale-95 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>Download JSON Backup</span>
            </button>
          </div>

          <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7867B5]">
                <Upload className="h-4 w-4" />
                <span>Restore Snapshot</span>
              </div>
              <h3 className="mt-2 font-['Plus_Jakarta_Sans'] text-lg font-bold text-[#29272F]">
                Restore or Merge Backup
              </h3>
              <p className="text-xs text-[#7A7285] mt-1 leading-relaxed">
                Upload a previous FinPilot JSON backup. New entries will be merged safely without creating duplicates.
              </p>

              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleJsonRestoreUpload(file);
                }}
                className="mt-4 text-xs text-[#7A7285] file:mr-3 file:rounded-xl file:border-0 file:bg-[#EDE7F5] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#6857A4] hover:file:bg-[#E3D9F0]"
              />

              {restoreStatus && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
                  {restoreStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
