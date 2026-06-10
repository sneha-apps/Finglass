/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useFirebase } from '../FirebaseContext';
import { GoalDef } from '../types';
import { formatCurrency } from '../currency';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Target, 
  Home, 
  Palmtree, 
  PiggyBank, 
  Coins, 
  TrendingUp, 
  Lightbulb, 
  Calendar,
  AlertCircle
} from 'lucide-react';

const CATEGORY_DETAILS = {
  trip: { label: 'Vacation & Trips', icon: Palmtree, color: 'text-amber-600 bg-amber-50' },
  house: { label: 'Real Estate & House', icon: Home, color: 'text-blue-600 bg-blue-50' },
  retirement: { label: 'Retirement fund', icon: Coins, color: 'text-purple-600 bg-purple-50' },
  savings: { label: 'Rainy Day Savings', icon: PiggyBank, color: 'text-emerald-600 bg-emerald-50' },
  other: { label: 'Major Purchases', icon: Target, color: 'text-neutral-600 bg-neutral-50' }
};

export const GoalsView: React.FC = () => {
  const { goals, addGoal, deleteGoal, updateGoalProgress } = useFirebase();

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'trip' | 'house' | 'retirement' | 'savings' | 'other'>('savings');
  const [targetAmountInput, setTargetAmountInput] = useState('');
  const [currentAmountInput, setCurrentAmountInput] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Interactive contribution modifier
  const [activeGoalAdjustmentId, setActiveGoalAdjustmentId] = useState<string | null>(null);
  const [savedIncreaseValue, setSavedIncreaseValue] = useState('');

  // Calculate recommendation metrics for each goal
  const enrichedGoals = useMemo(() => {
    const today = new Date();
    
    return goals.map(g => {
      const gDate = new Date(g.targetDate);
      
      // Calculate remaining time in months & weeks. Default to at least 1 month
      const diffMs = gDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const monthsRemaining = Math.max(1, Math.ceil(diffDays / 30.4));
      const weeksRemaining = Math.max(1, Math.ceil(diffDays / 7));
      
      const remainingAmount = Math.max(0, g.targetAmount - g.currentAmount);
      
      // Calculations
      const monthlySuggestion = remainingAmount / monthsRemaining;
      const weeklySuggestion = remainingAmount / weeksRemaining;

      const progressPercent = g.targetAmount > 0 
        ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) 
        : 0;

      return {
        ...g,
        monthsRemaining,
        weeksRemaining,
        remainingAmount,
        monthlySuggestion,
        weeklySuggestion,
        progressPercent,
        isCompleted: g.currentAmount >= g.targetAmount
      };
    });
  }, [goals]);

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmt = parseFloat(targetAmountInput);
    const currentAmt = parseFloat(currentAmountInput) || 0;

    if (isNaN(targetAmt) || targetAmt <= 0) return;
    if (!title.trim() || !targetDate) return;

    await addGoal({
      title: title.trim(),
      category,
      targetAmount: targetAmt,
      currentAmount: currentAmt,
      targetDate
    });

    // Reset fields
    setTitle('');
    setCategory('savings');
    setTargetAmountInput('');
    setCurrentAmountInput('');
    setTargetDate('');
    setShowForm(false);
  };

  // Saved incremental balance modifier
  const handleAddContribution = async (goal: GoalDef) => {
    const incremValue = parseFloat(savedIncreaseValue);
    if (isNaN(incremValue) || incremValue <= 0) return;

    const nextBal = goal.currentAmount + incremValue;
    await updateGoalProgress(goal.id, Number(nextBal.toFixed(2)));
    
    setActiveGoalAdjustmentId(null);
    setSavedIncreaseValue('');
  };

  return (
    <div id="goals-view-root" className="space-y-8 font-sans text-zinc-900">
      
      {/* Upper header action banner */}
      <div className="flex items-center justify-between pb-6 border-b-2 border-zinc-200 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic text-zinc-950">Milestone Saving Goals</h2>
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-1 leading-snug">Establish and forecast future capital plans with active saving recommendations.</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-[11px] uppercase tracking-[0.25em] py-3.5 px-6 rounded-none transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Discard Goal Form' : 'Establish New Goal'}
        </button>
      </div>

      {/* NEW GOAL SUBMIT FORM */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit}
            className="bg-white border-4 border-zinc-900 rounded-none p-6 space-y-6 max-w-2xl overflow-hidden"
          >
            <span className="text-[11px] font-black tracking-[0.25em] text-zinc-900 uppercase block border-b border-zinc-200 pb-3">Milestone Goal parameters</span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Goal Name / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Buy Family House, Europe Summer Trip"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-3 text-sm font-semibold focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Milestone Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-3 text-sm font-bold focus:outline-none focus:border-zinc-900"
                >
                  <option value="savings">Rainy Day Savings</option>
                  <option value="house">Real Estate & House Purchase</option>
                  <option value="trip">Vacation & Family Trips</option>
                  <option value="retirement">Retirement Fund</option>
                  <option value="other">Other Big Expense</option>
                </select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Target Capital Needed (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="$10,000.00"
                  value={targetAmountInput}
                  onChange={(e) => setTargetAmountInput(e.target.value)}
                  className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-3 text-sm font-semibold focus:outline-none focus:border-zinc-900 font-mono"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Starting Balance (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="$0.00"
                  value={currentAmountInput}
                  onChange={(e) => setCurrentAmountInput(e.target.value)}
                  className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-3 text-sm font-semibold focus:outline-none focus:border-zinc-900 font-mono"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Target Deadline Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-3 text-sm font-bold focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-zinc-300 text-zinc-500 font-bold uppercase tracking-wider text-[10px] hover:bg-zinc-50"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase tracking-widest text-[10px]"
              >
                Track Saving Goal
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* DYNAMIC GOALS GRID CARD LAYOUT */}
      {enrichedGoals.length === 0 ? (
        <div className="bg-white border-2 border-zinc-900 rounded-none p-12 text-center max-w-lg mx-auto space-y-4">
          <Target className="w-10 h-10 text-zinc-400 mx-auto" />
          <span className="text-sm font-black uppercase tracking-widest text-zinc-900 block">No Active Goals Established</span>
          <p className="text-xs text-zinc-500 leading-relaxed font-semibold">Establishing crystal-clear targets helps align your household savings.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-zinc-900 hover:bg-zinc-850 text-white font-black uppercase tracking-[0.2em] text-[10px]"
          >
            Create first saving goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {enrichedGoals.map((g) => {
            const CatConfig = CATEGORY_DETAILS[g.category] || CATEGORY_DETAILS.other;
            const CatIcon = CatConfig.icon;

            return (
              <div 
                key={g.id} 
                className="bg-white border-2 border-zinc-200 rounded-none p-6 space-y-6 hover:border-zinc-900 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Goal Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-none border border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-900 shrink-0">
                        <CatIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black tracking-tight text-zinc-950 uppercase italic leading-none mb-1">{g.title}</h3>
                        <span className="text-[9px] text-zinc-400 uppercase font-black tracking-[0.15em] font-sans">{CatConfig.label}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => deleteGoal(g.id)}
                      className="text-zinc-300 hover:text-rose-600 p-1.5 border border-transparent hover:border-zinc-200 hover:bg-zinc-100 transition-all cursor-pointer"
                      title="Remove goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Pricing Progress and Sliders */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-baseline text-xs font-mono font-bold">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-450">PROGRESS RATIO</span>
                      <span className="font-mono font-black text-zinc-950">
                        {formatCurrency(g.currentAmount)} <span className="text-zinc-400 font-normal">/</span> {formatCurrency(g.targetAmount)}
                      </span>
                    </div>

                    <div className="relative w-full h-3 bg-zinc-100 rounded-none overflow-hidden border border-zinc-200">
                      <div 
                        className="bg-zinc-950 h-full rounded-none transition-all duration-500"
                        style={{ width: `${g.progressPercent}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-mono font-black text-zinc-400 pt-0.5 uppercase tracking-wider">
                      <span className="bg-zinc-100 text-zinc-805 text-zinc-800 px-2 py-0.5 font-bold border border-zinc-200">{g.progressPercent.toFixed(0)}% Completed</span>
                      <span className="flex items-center gap-1.5 font-sans">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        Target: {g.targetDate}
                      </span>
                    </div>
                  </div>

                  {/* Suggestions Callout Box */}
                  {!g.isCompleted ? (
                    <div className="bg-zinc-50 border-l-4 border-zinc-900 rounded-none p-4 space-y-3">
                      <div className="flex items-center gap-2 text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em] border-b border-zinc-200/60 pb-1.5">
                        <Lightbulb className="w-4 h-4 stroke-zinc-900 fill-white" />
                        Forecast Savings Recommendations
                      </div>
                      <p className="text-[11px] text-zinc-650 leading-relaxed font-semibold">
                        To hit this goal in <span className="font-mono font-black text-zinc-900 bg-zinc-200 px-1">{g.monthsRemaining} months</span>, you must save:
                      </p>
                      <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                        <div className="bg-white border border-zinc-200 p-2 text-center rounded-none font-mono">
                          <span className="block text-[8px] text-zinc-400 font-black uppercase tracking-widest mb-1">Monthly Goal</span>
                          <span className="font-black text-zinc-900 block text-sm">
                            {formatCurrency(g.monthlySuggestion)}
                          </span>
                        </div>
                        <div className="bg-white border border-zinc-200 p-2 text-center rounded-none font-mono">
                          <span className="block text-[8px] text-zinc-400 font-black uppercase tracking-widest mb-1">Weekly Goal</span>
                          <span className="font-black text-zinc-900 block text-sm">
                            {formatCurrency(g.weeklySuggestion)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border-2 border-emerald-950 rounded-none p-4 flex items-center gap-3 text-emerald-950">
                      <Target className="w-6 h-6 stroke-emerald-900 shrink-0" />
                      <div>
                        <span className="block text-xs font-black uppercase tracking-[0.15em] leading-none mb-1">Goal Fulfilled</span>
                        <span className="block text-[10px] font-semibold leading-normal text-emerald-900">You have secured 100% of the target capital!</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Adjusting Current Balance Inline */}
                <div className="pt-4 border-t border-zinc-200 flex items-center justify-between">
                  {activeGoalAdjustmentId === g.id ? (
                    <div className="flex gap-2 w-full">
                      <input
                        type="number"
                        placeholder="Add savings ($)"
                        value={savedIncreaseValue}
                        onChange={(e) => setSavedIncreaseValue(e.target.value)}
                        className="flex-1 bg-zinc-50 border-2 border-zinc-250 rounded-none px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-900 font-mono font-bold"
                      />
                      <button
                        onClick={() => handleAddContribution(g)}
                        className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-none px-4 py-1.5 text-xs font-black uppercase tracking-widest cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setActiveGoalAdjustmentId(null)}
                        className="border border-zinc-300 rounded-none px-3 py-1.5 text-xs text-zinc-500 font-bold uppercase tracking-wider hover:bg-zinc-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveGoalAdjustmentId(g.id);
                        setSavedIncreaseValue('');
                      }}
                      className="text-zinc-900 hover:text-zinc-700 underline hover:no-underline text-xs font-black uppercase tracking-widest flex items-center gap-1.5 decoration-2 cursor-pointer"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Add Savings Contribution
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
