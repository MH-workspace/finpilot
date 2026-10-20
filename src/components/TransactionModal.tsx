import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Sparkles } from 'lucide-react';
import { Transaction, TransactionType } from '../types/finance';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getTodayString,
  isDuplicateTransaction,
} from '../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>, id?: string) => void;
  existingTransaction?: Transaction | null;
  existingTransactions: Transaction[];
  currencySymbol: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingTransaction,
  existingTransactions,
  currencySymbol,
}) => {
  const [type, setType] = useState<TransactionType>('Expense');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [notes, setNotes] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingTransaction) {
      setType(existingTransaction.type);
      setDescription(existingTransaction.description);
      const isPredefined = (existingTransaction.type === 'Income'
        ? INCOME_CATEGORIES
        : EXPENSE_CATEGORIES
      ).includes(existingTransaction.category);
      if (isPredefined) {
        setCategory(existingTransaction.category);
        setIsCustomCategory(false);
      } else {
        setIsCustomCategory(true);
        setCustomCategory(existingTransaction.category);
      }
      setAmount(existingTransaction.amount.toString());
      setDate(existingTransaction.date);
      setNotes(existingTransaction.notes || '');
    } else {
      resetForm();
    }
  }, [existingTransaction, isOpen]);

  const resetForm = () => {
    setType('Expense');
    setDescription('');
    setCategory('Food');
    setCustomCategory('');
    setIsCustomCategory(false);
    setAmount('');
    setDate(getTodayString());
    setNotes('');
    setDuplicateWarning(false);
    setError(null);
  };

  if (!isOpen) return null;

  const categories = type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Smart heuristic categorization
  const handleDescriptionChange = (desc: string) => {
    setDescription(desc);
    const lower = desc.toLowerCase();
    if (!existingTransaction && !isCustomCategory) {
      if (type === 'Expense') {
        if (/grocery|food|swiggy|zomato|coffee|cafe|market|eat|lunch|dinner|pizza/i.test(lower)) {
          setCategory('Food');
        } else if (/uber|ola|cab|fuel|petrol|diesel|metro|train|flight|bus/i.test(lower)) {
          setCategory('Transport');
        } else if (/amazon|flipkart|myntra|clothes|shoes|store|shop/i.test(lower)) {
          setCategory('Shopping');
        } else if (/rent|wifi|broadband|electricity|water|bill|recharge|mobile/i.test(lower)) {
          setCategory('Bills');
        } else if (/doctor|pharmacy|medicine|hospital|clinic|gym|fitness/i.test(lower)) {
          setCategory('Health');
        } else if (/course|udemy|book|school|college|tuition/i.test(lower)) {
          setCategory('Education');
        } else if (/netflix|movie|cinema|spotify|concert|game|steam/i.test(lower)) {
          setCategory('Entertainment');
        }
      } else {
        if (/salary|paycheck|payroll/i.test(lower)) {
          setCategory('Salary');
        } else if (/freelance|upwork|contract|gig/i.test(lower)) {
          setCategory('Freelance');
        } else if (/dividend|interest|mutual|stock|crypto/i.test(lower)) {
          setCategory('Investments');
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent, forceDuplicate = false) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (!description.trim()) {
      setError('Please provide a description.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter an amount greater than zero.');
      return;
    }
    if (!date) {
      setError('Please select a valid transaction date.');
      return;
    }
    if (date > getTodayString()) {
      setError('Transaction date cannot be in the future.');
      return;
    }

    const finalCategory = isCustomCategory ? customCategory.trim() || 'Other' : category;

    // Duplicate check
    if (!forceDuplicate) {
      const isDup = isDuplicateTransaction(
        existingTransactions,
        date,
        description,
        finalCategory,
        type,
        parsedAmount,
        existingTransaction?.id
      );
      if (isDup) {
        setDuplicateWarning(true);
        return;
      }
    }

    onSave(
      {
        date,
        description: description.trim(),
        category: finalCategory,
        type,
        amount: parsedAmount,
        notes: notes.trim(),
      },
      existingTransaction?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-white/90 bg-[#FAF8FC] p-5 sm:p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EAE5EC] pb-4">
          <div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-[#29272F]">
              {existingTransaction ? 'Edit Transaction' : 'Record Transaction'}
            </h3>
            <p className="text-xs text-[#7A7285]">
              {existingTransaction ? 'Modify details or update amounts' : 'Add cash in or cash out to your ledger'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#898393] hover:bg-[#EAE5EC] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {duplicateWarning && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Exact duplicate detected
            </div>
            <p className="mt-1 text-amber-800">
              A transaction with this exact date, description, category, and amount already exists.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700 transition-colors"
              >
                Save as Separate Entry
              </button>
              <button
                type="button"
                onClick={() => setDuplicateWarning(false)}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium text-amber-800 hover:bg-amber-50 transition-colors"
              >
                Go Back & Adjust
              </button>
            </div>
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)} className="mt-4 space-y-4">
          {/* Type Segmented Control */}
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[#E5DEE8] bg-[#F1EBF3] p-1">
            <button
              type="button"
              onClick={() => {
                setType('Expense');
                setCategory('Food');
              }}
              className={`rounded-xl py-2 text-xs font-semibold transition-all ${
                type === 'Expense'
                  ? 'bg-white text-[#8A3A54] shadow-xs'
                  : 'text-[#6D6577] hover:text-[#29272F]'
              }`}
            >
              Expense (−)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('Income');
                setCategory('Salary');
              }}
              className={`rounded-xl py-2 text-xs font-semibold transition-all ${
                type === 'Income'
                  ? 'bg-white text-[#2B6849] shadow-xs'
                  : 'text-[#6D6577] hover:text-[#29272F]'
              }`}
            >
              Income (+)
            </button>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#534C5D] mb-1">
              Description
            </label>
            <input
              type="text"
              placeholder={type === 'Expense' ? 'e.g. Supermarket Groceries' : 'e.g. Monthly Salary'}
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3.5 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20 transition-all"
              required
            />
          </div>

          {/* Amount & Date Grid */}
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
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white pl-8 pr-3.5 py-2.5 text-xs font-semibold tabular-nums text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20 transition-all"
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
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20 transition-all"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#534C5D]">
                Category
              </label>
              <button
                type="button"
                onClick={() => setIsCustomCategory(!isCustomCategory)}
                className="text-[11px] font-medium text-[#7867B5] hover:underline"
              >
                {isCustomCategory ? 'Pick standard category' : '+ Custom category'}
              </button>
            </div>

            {isCustomCategory ? (
              <input
                type="text"
                placeholder="Enter custom category name"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3.5 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
              />
            ) : (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3.5 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#534C5D] mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. split with roommate, tax deductible"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3.5 py-2 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#DCD5E0] bg-white px-4 py-2 text-xs font-semibold text-[#665D70] hover:bg-[#F3EFF5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-[#A99BEA] to-[#9282D7] px-5 py-2 text-xs font-semibold text-white shadow-md shadow-[#7867B5]/20 hover:brightness-105 active:scale-95 transition-all"
            >
              {existingTransaction ? 'Update Record' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
