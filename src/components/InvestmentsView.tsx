/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useFirebase } from '../FirebaseContext';
import { InvestmentDef } from '../types';
import { formatCurrency } from '../currency';
import { motion, AnimatePresence } from 'motion/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  Plus,
  Trash2,
  PieChart,
  Building,
  Coins,
  DollarSign,
  Briefcase,
  HelpCircle,
  PiggyBank,
  ChevronRight,
  TrendingDown
} from 'lucide-react';

const ASSET_CAT_CONFIGS = {
  stocks: { label: 'Stocks & Bonds', icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
  crypto: { label: 'Crypto & Web3', icon: Coins, color: 'text-purple-600 bg-purple-50' },
  real_estate: { label: 'Real Estate Property', icon: Building, color: 'text-amber-600 bg-amber-50' },
  savings_account: { label: 'High Yield Savings', icon: PiggyBank, color: 'text-emerald-600 bg-emerald-50' },
  retirement: { label: 'Retirement Accounts (401k/IRA)', icon: DollarSign, color: 'text-indigo-600 bg-indigo-50' },
  other: { label: 'Alternative Assets', icon: TrendingUp, color: 'text-neutral-600 bg-neutral-50' }
};

export const InvestmentsView: React.FC = () => {
  const { investments, addInvestment, deleteInvestment } = useFirebase();

  // Form states
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'stocks' | 'crypto' | 'real_estate' | 'savings_account' | 'retirement' | 'other'>('stocks');
  const [principalInput, setPrincipalInput] = useState('');
  const [yieldRateInput, setYieldRateInput] = useState('7'); // default 7%
  const [contributionInput, setContributionInput] = useState('');

  // Forecast duration slider state
  const [forecastYears, setForecastYears] = useState<10 | 20 | 30>(10);

  // Calculate global totals
  const totalPrincipal = useMemo(() => {
    return investments.reduce((sum, item) => sum + item.principal, 0);
  }, [investments]);

  const totalContributions = useMemo(() => {
    return investments.reduce((sum, item) => sum + item.contribution, 0);
  }, [investments]);

  // Forecast computation algorithm for charts (compounds month-by-month, groups by year)
  const compoundForecastData = useMemo(() => {
    const data: { year: string; principalOnly: number; projectedBalance: number }[] = [];
    const basePrincipal = totalPrincipal;
    const baseContrib = totalContributions;

    // Default simulation baseline if none exist so the chart displays beautifully
    const itemsToSimulate = investments.length > 0 
      ? investments 
      : [
          { principal: 10000, yieldRate: 7, contribution: 300, name: 'S&P 500 Index Sample' }
        ];

    // Compound calculations year-by-year
    for (let yr = 0; yr <= forecastYears; yr++) {
      let projectedYearSum = 0;
      let principalYearSum = 0;

      itemsToSimulate.forEach((inv) => {
        const rate = (inv.yieldRate || 0) / 100;
        const P = inv.principal;
        const PMT = inv.contribution;
        
        if (yr === 0) {
          projectedYearSum += P;
          principalYearSum += P;
        } else {
          // Compound Interest with Regular Monthly Contributions Formula:
          // A = P * (1 + r/n)^(n*t) + PMT * [((1 + r/n)^(n*t) - 1) / (r/n)]
          const n = 12; // monthly compounds
          const r_n = rate / n;
          const nt = n * yr;

          let compoundValue = P;
          if (r_n > 0) {
            const pPart = P * Math.pow(1 + r_n, nt);
            const cPart = PMT * ((Math.pow(1 + r_n, nt) - 1) / r_n);
            compoundValue = pPart + cPart;
          } else {
            compoundValue = P + (PMT * nt);
          }

          projectedYearSum += compoundValue;
          principalYearSum += P + (PMT * nt);
        }
      });

      data.push({
        year: yr === 0 ? 'Today' : `Yr ${yr}`,
        principalOnly: Math.round(principalYearSum),
        projectedBalance: Math.round(projectedYearSum)
      });
    }

    return data;
  }, [investments, totalPrincipal, totalContributions, forecastYears]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const principal = parseFloat(principalInput);
    const yieldRate = parseFloat(yieldRateInput);
    const contribution = parseFloat(contributionInput) || 0;

    if (isNaN(principal) || principal < 0) return;
    if (isNaN(yieldRate)) return;
    if (!name.trim()) return;

    await addInvestment({
      name: name.trim(),
      category,
      principal,
      yieldRate,
      contribution
    });

    // Reset fields
    setName('');
    setCategory('stocks');
    setPrincipalInput('');
    setYieldRateInput('7');
    setContributionInput('');
    setShowAdd(false);
  };

  return (
    <div id="investments-root" className="space-y-8 font-sans text-zinc-900">
      
      {/* Upper action header */}
      <div className="flex items-center justify-between pb-6 border-b-2 border-zinc-200 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic text-zinc-950">Investment Portfolios</h2>
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-1 leading-snug">Track current capital balances and run forecasts on asset growth trajectories.</p>
        </div>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-[11px] uppercase tracking-[0.25em] py-3.5 px-6 rounded-none transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {showAdd ? 'Close Asset Form' : 'Register Investment Asset'}
        </button>
      </div>

      {/* INVESTMENT ENTRY FORM */}
      <AnimatePresence>
        {showAdd && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit}
            className="bg-white border-4 border-zinc-900 rounded-none p-6 space-y-6 max-w-2xl overflow-hidden"
          >
            <span className="text-[11px] font-black tracking-[0.25em] text-zinc-900 uppercase block border-b border-zinc-200 pb-3">Asset Parameters</span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S&P 500 ETF, Crypto Holding, High-Yield Reserve"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-3 text-sm font-semibold focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Asset Classification</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-3 text-sm font-bold focus:outline-none focus:border-zinc-900"
                >
                  <option value="stocks">Stocks & Bonds ETFs</option>
                  <option value="crypto">Cryptocurrencies & Tokens</option>
                  <option value="real_estate">Real Estate / Property Stake</option>
                  <option value="savings_account">High Yield Savings Account</option>
                  <option value="retirement">Retirement Fund (401k/IRA)</option>
                  <option value="other">Alternative Assets</option>
                </select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Initial Principal Balance (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="$5,000.00"
                  value={principalInput}
                  onChange={(e) => setPrincipalInput(e.target.value)}
                  className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-3 text-sm font-semibold focus:outline-none focus:border-zinc-900 font-mono"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Expected Annual Yield multiplier (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="7.5"
                  value={yieldRateInput}
                  onChange={(e) => setYieldRateInput(e.target.value)}
                  className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-3 text-sm font-semibold focus:outline-none focus:border-zinc-900 font-mono"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Monthly Contribution Addition (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="$250.00"
                  value={contributionInput}
                  onChange={(e) => setContributionInput(e.target.value)}
                  className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-3 text-sm font-semibold focus:outline-none focus:border-zinc-900 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-6 py-2 border border-zinc-300 text-zinc-500 font-bold uppercase tracking-wider text-[10px] hover:bg-zinc-50"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase tracking-widest text-[10px]"
              >
                Register Asset
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COMPASS: Dynamic Forecasting Visual Charts (recharts) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-2 border-zinc-900 rounded-none p-6 space-y-6">
            
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4 flex-wrap gap-2">
              <div>
                <span className="text-xs font-black tracking-[0.2em] text-zinc-900 uppercase flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-zinc-500" />
                  Compound Capital projection
                </span>
                {investments.length === 0 && (
                  <span className="text-[9px] text-amber-600 font-black uppercase tracking-wider block mt-1">
                    ★ Showing Sample Projection (S&P 500 benchmark)
                  </span>
                )}
              </div>

              {/* Year Selector */}
              <div className="flex gap-1 bg-zinc-100 rounded-none p-1 border border-zinc-200">
                {([10, 20, 30] as const).map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setForecastYears(yr)}
                    className={`px-3 py-1.5 text-[10px] font-black rounded-none uppercase transition-all duration-200 cursor-pointer ${
                      forecastYears === yr 
                        ? 'bg-zinc-900 text-white' 
                        : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
                    }`}
                  >
                    {yr} Yr
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Forecast Chart */}
            <div className="h-64 sm:h-80 w-full text-xs font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={compoundForecastData}
                  margin={{ top: 10, right: 10, left: 15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                  <XAxis 
                    dataKey="year" 
                    stroke="#27272a" 
                    axisLine={true}
                    tickLine={true}
                    style={{ fontWeight: 'bold' }}
                  />
                  <YAxis 
                    stroke="#27272a" 
                    axisLine={true} 
                    tickLine={true}
                    style={{ fontWeight: 'bold' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value.toLocaleString()}`, undefined]} 
                    contentStyle={{ border: '2px solid #000000', borderRadius: '0px', zIndex: 10, fontFamily: 'monospace', fontWeight: 'bold' }}
                  />
                  <Legend iconType="rect" style={{ fontWeight: 'bold' }} />
                  <Line 
                    name="Compound value" 
                    type="monotone" 
                    dataKey="projectedBalance" 
                    stroke="#000000" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    name="Principal value alone" 
                    type="monotone" 
                    dataKey="principalOnly" 
                    stroke="#a1a1aa" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-zinc-50 border-l-4 border-zinc-900 rounded-none p-4 flex gap-3 text-xs leading-relaxed text-zinc-600">
              <HelpCircle className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <span className="block font-black text-zinc-900 pb-0.5 uppercase tracking-wide text-[10px]">Forecast Methodology Details</span>
                Projections are formulated on a <span className="font-semibold text-zinc-900">monthly compounding structure</span> incorporating aggregate initial family principal assets of <span className="font-mono font-black text-zinc-900 bg-zinc-200 px-1">{formatCurrency(totalPrincipal)}</span> and continuous asset allocation velocities of <span className="font-mono font-black text-zinc-900 bg-zinc-200 px-1">{formatCurrency(totalContributions)}/mo</span>. Projections are theoretical and market indexes will have continuous variance.
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COMPASS: Registered Investments & Net Totals */}
        <div className="space-y-6">
          
          {/* Net Asset Worth Card */}
          <div className="bg-white border-4 border-zinc-900 rounded-none p-6 space-y-4">
            <span className="text-[10px] font-black tracking-[0.25em] text-zinc-400 uppercase block">Total Net Assets</span>
            <div className="space-y-2">
              <span className="text-3xl font-black tracking-tight block font-mono text-zinc-950">
                {formatCurrency(totalPrincipal)}
              </span>
              <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-widest leading-relaxed">
                + {formatCurrency(totalContributions)} Monthly Compound Influx
              </span>
            </div>
          </div>

          {/* Registered Investments asset list */}
          <div className="bg-white border-2 border-zinc-900 rounded-none overflow-hidden">
            <div className="px-5 py-4 border-b-2 border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <span className="text-[11px] font-black tracking-[0.2em] text-zinc-900 uppercase">Registered Assets</span>
              <span className="font-mono text-[10px] font-black text-zinc-400 bg-zinc-200 px-2 py-0.5">{investments.length} tracked</span>
            </div>

            {investments.length === 0 ? (
              <div className="p-8 py-14 text-center text-xs text-zinc-400 space-y-3">
                <span className="font-semibold text-zinc-500 block">No investment positions mapped.</span>
                <button
                  onClick={() => setShowAdd(true)}
                  className="font-black text-zinc-950 block w-full underline hover:no-underline text-xs uppercase tracking-widest"
                >
                  Register first portfolio
                </button>
              </div>
            ) : (
              <div className="divide-y-2 divide-zinc-200 max-h-96 overflow-y-auto">
                {investments.map((inv) => {
                  const subConfig = ASSET_CAT_CONFIGS[inv.category] || ASSET_CAT_CONFIGS.other;
                  const IconComp = subConfig.icon;

                  return (
                    <div key={inv.id} className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 border border-zinc-200 bg-white text-zinc-950 rounded-none shrink-0">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-black text-zinc-900 truncate leading-tight uppercase font-sans">{inv.name}</span>
                          <span className="block text-[8px] text-zinc-400 font-mono uppercase font-bold tracking-wider mt-0.5">Yield Target: {inv.yieldRate}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="block text-xs font-black font-mono text-zinc-950">
                            {formatCurrency(inv.principal)}
                          </span>
                          {inv.contribution > 0 && (
                            <span className="block text-[9px] text-zinc-400 font-mono">
                              +{formatCurrency(inv.contribution)}/mo
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => deleteInvestment(inv.id)}
                          className="text-zinc-300 hover:text-rose-600 p-1.5 border border-transparent hover:border-zinc-200 hover:bg-zinc-100 transition-all cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
