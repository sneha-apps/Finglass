/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useFirebase } from '../FirebaseContext';
import { TransactionDef, CurrencyRate } from '../types';
import { CURRENCIES, convertToUsd, formatCurrency, formatWithUsdPane } from '../currency';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Zap, 
  Check, 
  DollarSign, 
  Users, 
  User, 
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  PieChart as PieIcon,
  HelpCircle,
  FileCheck2,
  Bell
} from 'lucide-react';

const CATEGORIES = {
  earning: ['Salary', 'Freelance', 'Dividends', 'Gift', 'Refund', 'Other Earning'],
  expense: ['Groceries', 'Rent & Housing', 'Utilities', 'Food & Dining', 'Subscriptions', 'Transport', 'Insurance', 'Shopping', 'Entertainment', 'Taxes', 'Medical', 'Other Expense']
};

export const EverydayTracker: React.FC = () => {
  const {
    userProfile,
    householdMembers,
    transactions,
    addTransaction,
    deleteTransaction,
    togglePaidStatus,
    selectedMember,
    setSelectedMember,
    timePeriod,
    setTimePeriod
  } = useFirebase();

  // Transaction form states
  const [type, setType] = useState<'earning' | 'expense'>('expense');
  const [amountInput, setAmountInput] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState(CATEGORIES.expense[0]);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  
  // Specific Bill/Subscription fields
  const [isBill, setIsBill] = useState(false);
  const [isSubscription, setIsSubscription] = useState(false);
  const [dueDate, setDueDate] = useState('');

  // Active filter states & UI states
  const [showAddForm, setShowAddForm] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'regular' | 'bill' | 'subscription'>('regular');
  const [trackerTab, setTrackerTab] = useState<'all' | 'bills' | 'subscriptions'>('all');
  const [memberAllocation, setMemberAllocation] = useState<string>('Household');

  // Real-time conversion calculation helper for form
  const realTimeUsdValue = useMemo(() => {
    const rawVal = parseFloat(amountInput);
    if (isNaN(rawVal) || rawVal <= 0) return 0;
    return convertToUsd(rawVal, currency);
  }, [amountInput, currency]);

  // Handle Type Switches (resets categories matching type)
  const handleTypeChange = (newType: 'earning' | 'expense') => {
    setType(newType);
    setCategory(CATEGORIES[newType][0]);
  };

  // Handle transaction submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawVal = parseFloat(amountInput);
    if (isNaN(rawVal) || rawVal <= 0) return;

    const usdVal = convertToUsd(rawVal, currency);

    // Default status setup based on subscriptions & bills
    let initStatus: 'paid' | 'unpaid' | 'active' | 'cancelled' | 'overdue' = 'paid';
    if (isSubscription) {
      initStatus = 'active';
    } else if (isBill) {
      initStatus = 'unpaid';
    }

    await addTransaction({
      memberName: memberAllocation,
      type,
      category,
      amount: usdVal,
      originalAmount: rawVal,
      originalCurrency: currency,
      date,
      description: description.trim() || category,
      isBill,
      isSubscription,
      dueDate: isBill || isSubscription ? (dueDate || date) : '',
      status: initStatus
    });

    // Reset inputs
    setAmountInput('');
    setDescription('');
    setIsBill(false);
    setIsSubscription(false);
    setDueDate('');
    setShowAddForm(false);
  };

  // Filter transactions based on selected profile & time periods
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Member Filter
      if (selectedMember !== 'All') {
        if (selectedMember === 'Household' && t.memberName !== 'Household') return false;
        if (selectedMember !== 'Household' && t.memberName !== selectedMember) return false;
      }

      // 2. Time-Period filter
      const tDate = new Date(t.date);
      const today = new Date();
      
      const diffTime = Math.abs(today.getTime() - tDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (timePeriod === 'daily') {
        const todayStr = today.toISOString().split('T')[0];
        return t.date === todayStr;
      } else if (timePeriod === 'weekly') {
        return diffDays <= 7;
      } else if (timePeriod === 'monthly') {
        // match year & month
        const tYear = tDate.getFullYear();
        const tMonth = tDate.getMonth();
        return tYear === today.getFullYear() && tMonth === today.getMonth();
      } else if (timePeriod === 'yearly') {
        return tDate.getFullYear() === today.getFullYear();
      }
      return true; // "all"
    });
  }, [transactions, selectedMember, timePeriod]);

  // Summary Computations
  const summary = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let pendingBills = 0;
    let activeSubs = 0;

    filteredTransactions.forEach(t => {
      if (t.type === 'earning') {
        inflow += t.amount;
      } else {
        outflow += t.amount;
      }

      if (t.isBill && t.status === 'unpaid') {
        pendingBills += t.amount;
      }
      if (t.isSubscription && t.status === 'active') {
        activeSubs += t.amount;
      }
    });

    return {
      inflow,
      outflow,
      balance: inflow - outflow,
      pendingBills,
      activeSubs
    };
  }, [filteredTransactions]);

  // Category summary calculations for visualization
  const categorySummary = useMemo(() => {
    const counts: { [cat: string]: number } = {};
    let totalExpensesSum = 0;

    filteredTransactions.forEach(t => {
      if (t.type === 'expense') {
        counts[t.category] = (counts[t.category] || 0) + t.amount;
        totalExpensesSum += t.amount;
      }
    });

    return Object.keys(counts).map(cat => ({
      name: cat,
      value: counts[cat],
      percentage: totalExpensesSum > 0 ? (counts[cat] / totalExpensesSum) * 100 : 0
    })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Subscription Renewal & Overdue Alarm calculators
  const dynamicAlerts = useMemo(() => {
    const alertItems: { message: string; type: 'warning' | 'info'; date: string }[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    transactions.forEach(t => {
      if (t.isBill && t.status === 'unpaid' && t.dueDate) {
        if (t.dueDate < todayStr) {
          alertItems.push({
            message: `Overdue bill: "${t.description}" (${formatCurrency(t.amount)}) was due on ${t.dueDate}`,
            type: 'warning',
            date: t.dueDate
          });
        } else {
          // within 5 days
          const diff = Math.ceil((new Date(t.dueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 3000 * 24));
          if (diff <= 5 && diff >= 0) {
            alertItems.push({
              message: `Upcoming bill: "${t.description}" due in ${diff} days (${t.dueDate})`,
              type: 'info',
              date: t.dueDate
            });
          }
        }
      }

      if (t.isSubscription && t.status === 'active' && t.dueDate) {
        const diff = Math.ceil((new Date(t.dueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 3000 * 24));
        if (diff <= 3 && diff >= 0) {
          alertItems.push({
            message: `Subscription renewing soon: "${t.description}" in ${diff} days (${t.dueDate})`,
            type: 'info',
            date: t.dueDate
          });
        }
      }
    });

    return alertItems.slice(0, 3); // show top 3 alerts
  }, [transactions]);

  // Filter based on selected sub-tab
  const currentViewTransactions = useMemo(() => {
    if (trackerTab === 'bills') {
      return filteredTransactions.filter(t => t.isBill);
    }
    if (trackerTab === 'subscriptions') {
      return filteredTransactions.filter(t => t.isSubscription);
    }
    return filteredTransactions;
  }, [filteredTransactions, trackerTab]);

  return (
    <div id="everyday-tracker-root" className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-zinc-900">
      
      {/* GIANT THEME HEADER: Available Balance showcase (Dynamic breakdown of decimals) */}
      <div className="lg:col-span-3 border-b-2 border-zinc-200 pb-8 mb-2">
        <span className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-400 block mb-2 font-sans">
          AVAILABLE BALANCE (USD COGNIZANCE)
        </span>
        <div className="flex items-baseline justify-between flex-wrap gap-6">
          <h2 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter leading-none text-zinc-950 flex items-baseline">
            <span>
              {summary.balance < 0 ? '-' : ''}
              ${Math.floor(Math.abs(summary.balance)).toLocaleString()}
              <span className="text-3xl sm:text-4xl md:text-5xl text-zinc-450 font-bold">
                {(Math.abs(summary.balance) % 1).toFixed(2).slice(1)}
              </span>
            </span>
            <div className="ml-6 flex flex-col items-start justify-center font-mono text-xs leading-none">
              <span className={`font-black text-sm uppercase tracking-wide tracking-tight ${summary.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {summary.balance >= 0 ? '▲' : '▼'} {summary.balance >= 0 ? '+' : ''}{((summary.balance / (summary.inflow || 1)) * 100).toFixed(1)}%
              </span>
              <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-sans font-bold mt-1">out of dynamic inflow</span>
            </div>
          </h2>

          <div className="flex gap-4 font-mono text-[10px] uppercase font-bold tracking-widest text-zinc-400">
            <div className="text-right">
              <span className="block text-[8px] text-zinc-400">Ledger Influx</span>
              <span className="block text-zinc-900 font-black text-sm">{formatCurrency(summary.inflow)}</span>
            </div>
            <div className="text-right border-l border-zinc-200 pl-4">
              <span className="block text-[8px] text-zinc-400">Ledger Outflux</span>
              <span className="block text-rose-600 font-black text-sm">-{formatCurrency(summary.outflow)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* LEFT SECTION: Main Cash Flow Overview & Logs */}
      <div className="lg:col-span-2 space-y-8">
        
        {/* Dynamic Alerts Banner */}
        {dynamicAlerts.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-900 rounded-none p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-950 text-[10px] font-black uppercase tracking-[0.25em]">
              <Bell className="w-4 h-4 animate-bounce stroke-amber-900 shrink-0" />
              Dynamic Deadlines Warning
            </div>
            <div className="divide-y divide-amber-950/10 text-xs font-semibold text-amber-900">
              {dynamicAlerts.map((alert, i) => (
                <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                  <span>{alert.message}</span>
                  <span className="font-mono text-[10px] text-amber-800 font-bold uppercase tracking-wider bg-white px-2 py-0.5 border border-amber-900/35">{alert.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters and Actions Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between bg-zinc-50 border border-zinc-200 p-4 rounded-none gap-4">
          <div className="flex bg-zinc-100 p-1 border border-zinc-200 rounded-none shrink-0 overflow-x-auto">
            {(['all', 'bills', 'subscriptions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setTrackerTab(tab)}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  trackerTab === tab 
                    ? 'bg-zinc-900 text-white font-black' 
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-neutral-100/50'
                }`}
              >
                {tab === 'all' ? 'Everyday Feed' : tab}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              if (!showAddForm) {
                // preset fields based on active tab
                setIsBill(trackerTab === 'bills');
                setIsSubscription(trackerTab === 'subscriptions');
              }
            }}
            className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-[11px] uppercase tracking-[0.25em] py-3.5 px-6 rounded-none transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {showAddForm ? 'Close Entry Block' : 'Log Entry to Ledger'}
          </button>
        </div>

        {/* LOG TRANSACTION FORM */}
        <AnimatePresence>
          {showAddForm && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
              className="bg-white border-4 border-zinc-900 rounded-none p-6 space-y-6 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b-2 border-zinc-200 pb-4">
                <span className="text-[11px] font-black tracking-[0.25em] text-zinc-900 uppercase">Insert Shared Entry</span>
                <div className="flex gap-1 bg-zinc-100 border border-zinc-200 p-1 rounded-none">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${type === 'expense' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-900'}`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('earning')}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${type === 'earning' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-900'}`}
                  >
                    Earning
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Outflow/Inflow Amount */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Amount & Currency</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className="flex-1 bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-3 text-sm font-semibold focus:outline-none focus:border-zinc-900"
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-2 text-xs font-mono font-black focus:outline-none focus:border-zinc-900"
                    >
                      {CURRENCIES.map(curr => (
                        <option key={curr.code} value={curr.code}>{curr.code}</option>
                      ))}
                    </select>
                  </div>
                  {currency !== 'USD' && realTimeUsdValue > 0 && (
                    <span className="text-[10px] text-zinc-400 block font-mono font-bold uppercase tracking-wider">
                      ≈ {formatCurrency(realTimeUsdValue, 'USD')} in Real Time
                    </span>
                  )}
                </div>

                {/* Category Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-3 text-sm font-bold focus:outline-none focus:border-zinc-900"
                  >
                    {CATEGORIES[type].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Member Allocation */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Allocate to family member</label>
                  <select
                    value={memberAllocation}
                    onChange={(e) => setMemberAllocation(e.target.value)}
                    className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-3 text-sm font-bold focus:outline-none focus:border-zinc-900"
                  >
                    <option value="Household">Entire Household</option>
                    {userProfile && <option value={userProfile.displayName}>{userProfile.displayName} (You)</option>}
                    {householdMembers.filter(m => m.uid !== userProfile?.uid).map(m => (
                      <option key={m.uid} value={m.displayName}>{m.displayName}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Log Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-3 text-sm font-bold focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Details / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly family organic groceries, salary deposit"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2.5 px-3 text-sm font-semibold focus:outline-none focus:border-zinc-900"
                />
              </div>

              {/* Advanced Flags (Bills / Subscriptions) */}
              <div className="bg-zinc-50 border-l-4 border-zinc-900 rounded-none p-4 space-y-4">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Ledger Classification</span>
                <div className="flex flex-col sm:flex-row gap-6 text-xs text-zinc-800 font-bold">
                  <label className="flex items-center gap-2 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBill}
                      onChange={(e) => {
                        setIsBill(e.target.checked);
                        if (e.target.checked) setIsSubscription(false);
                      }}
                      className="rounded-none border-2 border-zinc-900 text-zinc-900 focus:ring-0 w-4 h-4"
                    />
                    Future Bill / Auto-Debit to Pay
                  </label>

                  <label className="flex items-center gap-2 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSubscription}
                      onChange={(e) => {
                        setIsSubscription(e.target.checked);
                        if (e.target.checked) setIsBill(false);
                      }}
                      className="rounded-none border-2 border-zinc-900 text-zinc-900 focus:ring-0 w-4 h-4"
                    />
                    Recurring Subscription Feed
                  </label>
                </div>

                {(isBill || isSubscription) && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-200"
                  >
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">
                        {isBill ? 'Bill Due Deadline' : 'Subscription Next Renewal'}
                      </label>
                      <input
                        type="date"
                        required
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-white border-2 border-zinc-250 rounded-none py-2 px-3 text-xs focus:outline-none focus:border-zinc-900"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 border border-zinc-300 text-zinc-500 font-bold uppercase tracking-wider text-[10px] hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase tracking-widest text-[10px]"
                >
                  Post to Shared Ledger
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* FEED / LIST OF TRANSACTIONS */}
        <div className="bg-white border-2 border-zinc-200 rounded-none overflow-hidden">
          <div className="px-6 py-4 border-b-2 border-zinc-200 bg-zinc-50 flex items-center justify-between">
            <span className="text-[11px] font-black tracking-[0.25em] text-zinc-900 uppercase">
              {trackerTab === 'all' ? 'Shared Ledger Feed' : trackerTab === 'bills' ? 'Outstanding Auto Bills' : 'Active Subscriptions Log'}
            </span>
            <span className="font-mono text-[9px] bg-zinc-200 text-zinc-800 font-bold px-2.5 py-1 tracking-wider uppercase border border-zinc-300">{currentViewTransactions.length} Items</span>
          </div>

          {currentViewTransactions.length === 0 ? (
            <div className="px-6 py-16 text-center space-y-4">
              <span className="text-xs uppercase tracking-widest text-zinc-400 font-bold block">No ledger entries match your parameters.</span>
              <button
                onClick={() => setShowAddForm(true)}
                className="text-xs font-black uppercase tracking-widest text-zinc-900 underline hover:no-underline cursor-pointer decoration-2"
              >
                Log your first household entry
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 bg-white">
              {currentViewTransactions.map((t) => (
                <div key={t.id} className="p-6 flex items-center justify-between gap-4 transition-colors hover:bg-zinc-50">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-sm text-zinc-950 truncate tracking-tight">{t.description}</span>
                      
                      {/* Interactive pill action for Bills / Subscriptions */}
                      {t.isBill && (
                        <button
                          onClick={() => togglePaidStatus(t.id, t.status, false)}
                          className={`px-2 py-0.5 rounded-none text-[8px] font-black uppercase tracking-[0.15em] border transition-all ${
                            t.status === 'paid' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : 'bg-rose-550 bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                          }`}
                          title="Click to toggle Paid/Unpaid"
                        >
                          Bill • {t.status}
                        </button>
                      )}
                      
                      {t.isSubscription && (
                        <button
                          onClick={() => togglePaidStatus(t.id, t.status, true)}
                          className={`px-2 py-0.5 rounded-none text-[8px] font-black uppercase tracking-[0.15em] border transition-all ${
                            t.status === 'active' 
                              ? 'bg-zinc-900 text-white border-zinc-900' 
                              : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                          }`}
                          title="Click to toggle Active/Cancelled"
                        >
                          Sub • {t.status}
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-[9px] text-zinc-400 font-mono font-bold tracking-wider flex-wrap">
                      <span>{t.date}</span>
                      <span>•</span>
                      <span className="bg-zinc-100 px-2 py-0.5 text-zinc-800 font-bold border border-zinc-200 uppercase text-[8px]">#{t.category}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        {t.memberName === 'Household' ? <Users className="w-3 h-3 text-zinc-900" /> : <User className="w-3 h-3 text-zinc-900" />}
                        <span className="text-zinc-600 uppercase font-black tracking-widest text-[8px]">{t.memberName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right whitespace-nowrap pl-4">
                    {/* Currency Display showing converted USD if necessary */}
                    <div className="flex flex-col items-end">
                      <span className={`block text-sm font-black font-mono tracking-tight ${t.type === 'earning' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                        {t.type === 'earning' ? '+' : '-'}{formatCurrency(t.originalAmount, t.originalCurrency)}
                      </span>
                      {t.originalCurrency !== 'USD' && (
                        <span className="block text-[9px] text-zinc-450 font-mono font-bold uppercase">
                          ({t.type === 'earning' ? '+' : '-'}{formatCurrency(t.amount, 'USD')})
                        </span>
                      )}
                    </div>

                    {/* Delete entry */}
                    <button
                      onClick={() => deleteTransaction(t.id)}
                      className="text-zinc-300 hover:text-rose-600 p-1.5 border border-transparent hover:border-zinc-200 hover:bg-zinc-100 transition-all cursor-pointer"
                      title="Remove entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Static Distributions and Dynamic Overviews */}
      <div className="space-y-8">
        
        {/* Profile Card indicating Active filtering (Pure monochrome flat layout) */}
        <div className="bg-zinc-900 text-white rounded-none p-6 space-y-5 border-l-8 border-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-[0.25em] text-zinc-450 uppercase block">Ledger Scope View</span>
            <SlidersHorizontal className="w-4 h-4 stroke-zinc-400" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-none border-2 border-white/20 bg-white/10 flex items-center justify-center font-black text-sm text-white">
                {selectedMember === 'All' ? 'G' : selectedMember[0].toUpperCase()}
              </div>
              <div>
                <span className="block text-[9px] font-black font-mono tracking-[0.2em] text-zinc-400 uppercase">ACTIVE FILTER</span>
                <span className="block text-base font-black tracking-tight uppercase italic">{selectedMember === 'All' ? 'GLOBAL LEDGER FEED' : `${selectedMember}'s workspace`}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono font-bold border-t border-zinc-800 pt-4">
            <div className="space-y-1">
              <span className="block text-[8px] tracking-[0.2em] text-zinc-500 uppercase">UNPAID BILLS</span>
              <span className="block text-sm font-black text-rose-400">
                {formatCurrency(summary.pendingBills)}
              </span>
            </div>
            
            <div className="space-y-1 border-l border-zinc-800 pl-4">
              <span className="block text-[8px] tracking-[0.2em] text-zinc-500 uppercase">ACTIVE SUBS</span>
              <span className="block text-sm font-black text-white">
                {formatCurrency(summary.activeSubs)}
              </span>
            </div>
          </div>
        </div>

        {/* Spend Category Distribution (Custom beautiful progress bars aligned with typography) */}
        <div className="bg-white border-2 border-zinc-200 rounded-none p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
            <span className="text-[11px] font-black tracking-[0.25em] text-zinc-900 uppercase flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-zinc-450" />
              Categorical Outflow
            </span>
          </div>

          {categorySummary.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400 uppercase font-black tracking-wider font-mono">
              No outflow logs logged.
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {categorySummary.slice(0, 5).map((cat) => (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs text-zinc-800 font-bold uppercase tracking-tight">
                    <span>{cat.name}</span>
                    <span className="font-mono font-black">{formatCurrency(cat.value)} ({cat.percentage.toFixed(0)}%)</span>
                  </div>
                  {/* Clean flat progress bar */}
                  <div className="w-full h-2 bg-zinc-100 rounded-none overflow-hidden border border-zinc-200">
                    <div 
                      className="bg-zinc-900 h-full rounded-none transition-all duration-500"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {categorySummary.length > 5 && (
                <div className="text-[9px] text-zinc-400 text-center font-black uppercase tracking-[0.15em] pt-3 border-t border-zinc-150">
                  + {categorySummary.length - 5} other categories
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Household Roster */}
        <div className="bg-white border-2 border-zinc-200 rounded-none p-6 space-y-4">
          <span className="text-[10px] font-black tracking-[0.25em] text-zinc-400 uppercase block">Family Ledger Roster</span>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setSelectedMember('All')}
              className={`w-full flex items-center justify-between text-left p-2.5 border transition-all cursor-pointer ${
                selectedMember === 'All' 
                  ? 'bg-zinc-900 border-zinc-900 text-white font-black' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-800 font-bold hover:bg-zinc-100'
              }`}
            >
              <span className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold">
                <Users className="w-4 h-4 shrink-0" />
                Show All Logs
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest font-black opacity-80">COMBINED</span>
            </button>

            {userProfile && (
              <button 
                onClick={() => setSelectedMember(userProfile.displayName)}
                className={`w-full flex items-center justify-between text-left p-2.5 border transition-all cursor-pointer ${
                  selectedMember === userProfile.displayName 
                    ? 'bg-zinc-900 border-zinc-900 text-white font-black' 
                    : 'bg-zinc-50 border-zinc-200 text-zinc-800 font-bold hover:bg-zinc-100'
                }`}
              >
                <span className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold">
                  <div className="w-4 h-4 rounded-none bg-zinc-200 flex items-center justify-center text-[8px] font-black text-zinc-900 border border-zinc-300 shrink-0">
                    Y
                  </div>
                  {userProfile.displayName} (YOU)
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest font-black opacity-80">OWNER</span>
              </button>
            )}

            {householdMembers.filter(m => m.uid !== userProfile?.uid).map(member => (
              <button 
                key={member.uid}
                onClick={() => setSelectedMember(member.displayName)}
                className={`w-full flex items-center justify-between text-left p-2.5 border transition-all cursor-pointer ${
                  selectedMember === member.displayName 
                    ? 'bg-zinc-900 border-zinc-900 text-white font-black' 
                    : 'bg-zinc-50 border-zinc-200 text-zinc-800 font-bold hover:bg-zinc-100'
                }`}
              >
                <span className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold">
                  <div className="w-4 h-4 rounded-none bg-zinc-205 flex items-center justify-center text-[8px] font-black text-zinc-900 bg-zinc-200 border border-zinc-300 shrink-0">
                    {member.displayName[0].toUpperCase()}
                  </div>
                  {member.displayName}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest font-black opacity-80">MEMBER</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
