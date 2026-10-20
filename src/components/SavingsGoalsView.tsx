import React, { useState } from 'react';
import {
  Target,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { SavingsGoal } from '../types/finance';
import { formatCurrency, formatDate, getTodayString } from '../utils/formatters';

interface SavingsGoalsViewProps {
  goals: SavingsGoal[];
  currencySymbol: string;
  onAddGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  onUpdateGoal: (id: string, goal: Partial<SavingsGoal>) => void;
  onDeleteGoal: (id: string) => void;
}

export const SavingsGoalsView: React.FC<SavingsGoalsViewProps> = ({
  goals,
  currencySymbol,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
}) => {
  // New Goal Form State
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Quick Deposit/Withdraw Modal State
  const [activeAdjustGoal, setActiveAdjustGoal] = useState<SavingsGoal | null>(null);
  const [adjustType, setAdjustType] = useState<'deposit' | 'withdraw'>('deposit');
  const [adjustAmount, setAdjustAmount] = useState('');

  // Handle Create Goal
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const target = parseFloat(targetAmount);
    const saved = savedAmount ? parseFloat(savedAmount) : 0;

    if (!name.trim()) {
      setError('Please provide a goal name.');
      return;
    }
    if (isNaN(target) || target <= 0) {
      setError('Target amount must be greater than zero.');
      return;
    }
    if (saved < 0 || saved > target) {
      setError('Already saved amount must be between 0 and the target amount.');
      return;
    }

    onAddGoal({
      name: name.trim(),
      targetAmount: target,
      savedAmount: saved,
      targetDate: targetDate || undefined,
      notes: notes.trim(),
    });

    setName('');
    setTargetAmount('');
    setSavedAmount('');
    setTargetDate('');
    setNotes('');
  };

  // Handle Quick Deposit / Withdraw
  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAdjustGoal) return;
    const delta = parseFloat(adjustAmount);
    if (isNaN(delta) || delta <= 0) return;

    let newSaved = activeAdjustGoal.savedAmount;
    if (adjustType === 'deposit') {
      newSaved += delta;
    } else {
      newSaved = Math.max(0, newSaved - delta);
    }

    onUpdateGoal(activeAdjustGoal.id, { savedAmount: newSaved });
    setActiveAdjustGoal(null);
    setAdjustAmount('');
  };

  const totalSavedAcrossGoals = goals.reduce((sum, g) => sum + g.savedAmount, 0);
  const totalTargetAcrossGoals = goals.reduce((sum, g) => sum + g.targetAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#7867B5]">
              MAKE ROOM FOR WHAT MATTERS
            </div>
            <h2 className="mt-1 font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-[#29272F]">
              Savings Goals
            </h2>
            <p className="text-xs text-[#7A7285]">
              Turn ambitious milestones into concrete, monthly contributions.
            </p>
          </div>
        </div>

        {/* Global Progress Strip */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-4">
            <div className="text-[11px] font-semibold text-[#7A7285]">Total Saved Across Goals</div>
            <div className="mt-1 font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#3E7459] tabular-nums">
              {formatCurrency(totalSavedAcrossGoals, currencySymbol)}
            </div>
            <div className="text-[10px] text-[#898393] mt-0.5">{goals.length} target(s) underway</div>
          </div>

          <div className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-4">
            <div className="text-[11px] font-semibold text-[#7A7285]">Total Financial Targets</div>
            <div className="mt-1 font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#29272F] tabular-nums">
              {formatCurrency(totalTargetAcrossGoals, currencySymbol)}
            </div>
            <div className="text-[10px] text-[#898393] mt-0.5">
              {totalTargetAcrossGoals > 0
                ? `${((totalSavedAcrossGoals / totalTargetAcrossGoals) * 100).toFixed(0)}% overall completion`
                : 'No targets defined'}
            </div>
          </div>

          <div className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-4">
            <div className="text-[11px] font-semibold text-[#7A7285]">Still Needed</div>
            <div className="mt-1 font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#7867B5] tabular-nums">
              {formatCurrency(Math.max(0, totalTargetAcrossGoals - totalSavedAcrossGoals), currencySymbol)}
            </div>
            <div className="text-[10px] text-[#898393] mt-0.5">To achieve all milestones</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Create Goal + Active Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Goal Form */}
        <div className="lg:col-span-5 rounded-3xl border border-white/90 bg-white p-6 shadow-xs h-fit">
          <div className="flex items-center gap-2 text-xs font-bold text-[#7867B5] uppercase tracking-wider mb-1">
            <Plus className="h-4 w-4" />
            <span>New Milestone</span>
          </div>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
            Create a Savings Goal
          </h3>
          <p className="text-xs text-[#7A7285] mb-4">
            Specify a target amount and deadline to compute required monthly savings.
          </p>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                Goal Name
              </label>
              <input
                type="text"
                placeholder="e.g. Emergency Fund (6 Months)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3.5 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                  Target ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="100"
                  min="1"
                  placeholder="250000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3 py-2.5 text-xs font-semibold tabular-nums text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                  Already Saved ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  placeholder="0"
                  value={savedAmount}
                  onChange={(e) => setSavedAmount(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3 py-2.5 text-xs font-semibold tabular-nums text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                Target Date (Optional)
              </label>
              <input
                type="date"
                min={getTodayString()}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                Notes
              </label>
              <input
                type="text"
                placeholder="e.g. High-yield savings reserve account"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3.5 py-2 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-[#A99BEA] to-[#9282D7] py-2.5 text-xs font-semibold text-white shadow-xs hover:brightness-105 active:scale-95 transition-all"
            >
              Add Savings Goal
            </button>
          </form>
        </div>

        {/* Goals List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs">
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F] mb-1">
              Active Goals
            </h3>
            <p className="text-xs text-[#7A7285] mb-5">
              Review current progress, add contributions, or update milestones.
            </p>

            {goals.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#7A7285]">
                No goals added yet. Set your first financial milestone on the left.
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((g) => {
                  const ratio = g.targetAmount > 0 ? g.savedAmount / g.targetAmount : 0;
                  const percent = Math.min(ratio * 100, 100);
                  const isCompleted = g.savedAmount >= g.targetAmount;
                  const remaining = Math.max(0, g.targetAmount - g.savedAmount);

                  // Calculate required monthly contribution
                  let monthlyRequired: number | null = null;
                  let monthsRemaining: number | null = null;
                  if (g.targetDate && !isCompleted) {
                    const today = new Date();
                    const target = new Date(g.targetDate);
                    const diffMonths =
                      (target.getFullYear() - today.getFullYear()) * 12 +
                      (target.getMonth() - today.getMonth());
                    if (diffMonths > 0) {
                      monthsRemaining = diffMonths;
                      monthlyRequired = remaining / diffMonths;
                    }
                  }

                  return (
                    <div
                      key={g.id}
                      className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-4 transition-all hover:bg-white hover:shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-[#29272F]">{g.name}</h4>
                            {isCompleted && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-[#3E7459] bg-[#EAF2ED] px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-3 w-3" />
                                Completed!
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#898393] mt-0.5">
                            {g.targetDate ? `Due: ${formatDate(g.targetDate)}` : 'No set target date'}
                            {g.notes && ` · ${g.notes}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => {
                              setActiveAdjustGoal(g);
                              setAdjustType('deposit');
                            }}
                            className="rounded-xl border border-[#D5CBE5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6857A4] hover:bg-[#F3EEF9] transition-colors"
                          >
                            + Add Funds
                          </button>
                          <button
                            onClick={() => {
                              setActiveAdjustGoal(g);
                              setAdjustType('withdraw');
                            }}
                            className="rounded-xl border border-[#E2D9E8] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#7A7285] hover:bg-[#F3EFF5] transition-colors"
                          >
                            Withdraw
                          </button>
                          <button
                            onClick={() => onDeleteGoal(g.id)}
                            className="text-[#9E95A5] hover:text-rose-600 transition-colors p-1"
                            title="Delete goal"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#EAE3F0]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#789687] to-[#5F8271] transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="tabular-nums font-semibold text-[#29272F]">
                          {formatCurrency(g.savedAmount, currencySymbol)}{' '}
                          <span className="text-[#898393] font-normal">
                            of {formatCurrency(g.targetAmount, currencySymbol)} ({percent.toFixed(0)}%)
                          </span>
                        </div>

                        {monthlyRequired !== null && (
                          <div className="text-[11px] text-[#7867B5] font-medium bg-[#F3EEFA] px-2.5 py-0.5 rounded-lg">
                            Save <strong>{formatCurrency(monthlyRequired, currencySymbol)}/mo</strong> for {monthsRemaining} mo
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Deposit / Withdraw Modal */}
      {activeAdjustGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-3xl border border-white/90 bg-[#FAF8FC] p-6 shadow-2xl">
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
              {adjustType === 'deposit' ? 'Add Funds to Goal' : 'Withdraw Funds from Goal'}
            </h3>
            <p className="text-xs text-[#7A7285] mt-1">
              {activeAdjustGoal.name} (Current: {formatCurrency(activeAdjustGoal.savedAmount, currencySymbol)})
            </p>

            <form onSubmit={handleApplyAdjustment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                  Amount to {adjustType} ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="50"
                  min="1"
                  placeholder="e.g. 5000"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3.5 py-2.5 text-xs font-semibold tabular-nums text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveAdjustGoal(null)}
                  className="rounded-xl border border-[#DCD5E0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#665D70] hover:bg-[#F3EFF5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#A99BEA] to-[#9282D7] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:brightness-105"
                >
                  Confirm {adjustType === 'deposit' ? 'Deposit' : 'Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
