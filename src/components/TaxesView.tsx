/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useFirebase } from '../FirebaseContext';
import { formatCurrency } from '../currency';
import { motion } from 'motion/react';
import { 
  Calculator, 
  FileText, 
  HelpCircle, 
  TrendingUp, 
  User, 
  Users, 
  Settings, 
  CheckCircle2, 
  Printer, 
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

// Progressive tax brackets for 2026 tax indices
const BRACKETS_2026 = {
  single: [
    { limit: 12000, rate: 0.10 },
    { limit: 49000, rate: 0.12 },
    { limit: 104000, rate: 0.22 },
    { limit: 198000, rate: 0.24 },
    { limit: 252000, rate: 0.32 },
    { limit: 630000, rate: 0.35 },
    { limit: Infinity, rate: 0.37 }
  ],
  married: [
    { limit: 24000, rate: 0.10 },
    { limit: 98000, rate: 0.12 },
    { limit: 208000, rate: 0.22 },
    { limit: 396000, rate: 0.24 },
    { limit: 504000, rate: 0.32 },
    { limit: 756000, rate: 0.35 },
    { limit: Infinity, rate: 0.37 }
  ]
};

const STANDARD_DEDUCTION_2026 = {
  single: 15300,
  married: 30600
};

export const TaxesView: React.FC = () => {
  const { transactions } = useFirebase();

  // Filing status selection (Single vs Household Married Jointly)
  const [filingStatus, setFilingStatus] = useState<'single' | 'married'>('married');
  const [customDeductionInput, setCustomDeductionInput] = useState('');
  
  // Tax preparation checklists completed state
  const [completedItems, setCompletedItems] = useState<{ [id: string]: boolean }>({});

  // Compute fiscal metrics for year
  const taxMetrics = useMemo(() => {
    // Filter transactions to current calendar year
    const currentYear = new Date().getFullYear();
    const annualTransactions = transactions.filter(t => {
      const tYear = new Date(t.date).getFullYear();
      return tYear === currentYear;
    });

    let w2Earnings = 0;
    let businessEarnings = 0; // Freelance / business
    let otherEarnings = 0;
    let businessExpenses = 0; // deductible expenses e.g. Freelance costs
    let otherDeductibleExpenses = 0; // standard itemized deductions

    annualTransactions.forEach(t => {
      if (t.type === 'earning') {
        if (t.category === 'Salary') {
          w2Earnings += t.amount;
        } else if (t.category === 'Freelance') {
          businessEarnings += t.amount;
        } else {
          otherEarnings += t.amount;
        }
      } else { // expense
        if (t.category === 'Taxes') {
          otherDeductibleExpenses += t.amount;
        } else if (t.category === 'Rent & Housing' && businessEarnings > 0) {
          // Freelancer Home office micro-deduction heuristic (e.g. 5% of housing if business exists)
          businessExpenses += t.amount * 0.05;
        } else if (t.category === 'Subscriptions' && businessEarnings > 0) {
          // Business subscriptions deduction heuristic (e.g. softwares for freelance work)
          businessExpenses += t.amount * 0.5; // assume 50% write-off
        }
      }
    });

    const totalGrossIncome = w2Earnings + businessEarnings + otherEarnings;
    
    // Select standard deduction Based on status
    const standardDeductionVal = STANDARD_DEDUCTION_2026[filingStatus];
    const customDeduction = parseFloat(customDeductionInput) || 0;
    const activeDeduction = Math.max(standardDeductionVal, customDeduction) + businessExpenses;

    const taxableIncome = Math.max(0, totalGrossIncome - activeDeduction);

    // Compute Progressive Federal Tax Liability
    let estimatedTaxOwed = 0;
    let tempIncome = taxableIncome;
    let prevLimit = 0;
    
    const activeBrackets = BRACKETS_2026[filingStatus];
    const bracketDetails: { bracket: string; taxableInBracket: number; ratePercent: number; taxDue: number }[] = [];

    for (let i = 0; i < activeBrackets.length; i++) {
      const b = activeBrackets[i];
      const currentBracketCap = b.limit - prevLimit;
      
      if (tempIncome > 0) {
        const taxableInThisBracket = Math.min(tempIncome, currentBracketCap);
        const taxDueForBracket = taxableInThisBracket * b.rate;
        
        estimatedTaxOwed += taxDueForBracket;
        bracketDetails.push({
          bracket: b.limit === Infinity ? `Over $${prevLimit.toLocaleString()}` : `$${prevLimit.toLocaleString()} to $${b.limit.toLocaleString()}`,
          taxableInBracket: taxableInThisBracket,
          ratePercent: b.rate * 100,
          taxDue: taxDueForBracket
        });

        tempIncome -= taxableInThisBracket;
      }
      prevLimit = b.limit;
    }

    // Estimate Social Security and Medicare taxes (FICA) (7.65% on W2, 15.3% on SE Freelance self-employed)
    const ficaTaxW2 = w2Earnings * 0.0765;
    const ficaSelfEmployed = businessEarnings * 0.9235 * 0.153; // SE Tax logic 
    const totalFicaOwed = ficaTaxW2 + ficaSelfEmployed;

    const aggregateTaxLiability = estimatedTaxOwed + totalFicaOwed;
    const effectiveTaxRate = totalGrossIncome > 0 
      ? (aggregateTaxLiability / totalGrossIncome) * 100 
      : 0;

    return {
      currentYear,
      w2Earnings,
      businessEarnings,
      otherEarnings,
      totalGrossIncome,
      businessExpenses,
      activeDeduction,
      taxableIncome,
      estimatedTaxOwed,
      totalFicaOwed,
      aggregateTaxLiability,
      effectiveTaxRate,
      bracketDetails
    };
  }, [transactions, filingStatus, customDeductionInput]);

  // Handle Checklist toggles
  const toggleChecklist = (id: string) => {
    setCompletedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Static filing checklist items
  const filingChecklist = [
    { id: 'w2', text: 'Gather W-2 Wage statements from employers.', help: 'Each employer transmits copy by end of January.' },
    { id: '1099nec', text: 'Compile 1099-NEC Self-employment income sheets.', help: 'Required if you logged freelance inflows.' },
    { id: 'expenses', text: 'Audit deductibility on subscriptions and office supplies.', help: 'Tracked in Finglass under Freelance deductions.' },
    { id: 'deductions', text: 'Confirm health insurance write-offs or HSA deposits.', help: 'Qualifying pre-tax accounts reduce Gross Income.' },
    { id: 'joint_filing', text: 'Sync spouse financial transactions.', help: 'Household views automatically aggregate both ledgers.' }
  ];

  return (
    <div id="taxes-view-root" className="space-y-8 font-sans text-zinc-900">
      
      {/* Upper header */}
      <div className="flex items-center justify-between pb-6 border-b-2 border-zinc-200 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic text-zinc-950">Tax Preparation Portal</h2>
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-1 leading-snug">Estimate current progressive liabilities and audit qualifying write-offs in real time (US IRS standard).</p>
        </div>

        {/* Copy / Print Summary action button */}
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 border-2 border-zinc-900 bg-white hover:bg-zinc-50 text-zinc-950 font-black text-[11px] uppercase tracking-[0.2em] py-3.5 px-6 rounded-none transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Print / Export Statement
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COMPASS: Federal Calculator & liability metrics */}
        <div className="lg:col-span-2 space-y-6 print:col-span-3">
          
          <div className="bg-white border-2 border-zinc-900 rounded-none p-6 space-y-6">
            
            {/* Calculator parameters selector */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-zinc-200">
              <span className="text-xs font-black tracking-[0.2em] text-zinc-900 uppercase flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-zinc-500" />
                {taxMetrics.currentYear} Federal Tax Liability Calculator
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => setFilingStatus('single')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-none border-2 transition-all cursor-pointer ${
                    filingStatus === 'single'
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5 inline mr-1" />
                  Single
                </button>
                <button
                  onClick={() => setFilingStatus('married')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-none border-2 transition-all cursor-pointer ${
                    filingStatus === 'married'
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 inline mr-1" />
                  Married Jointly
                </button>
              </div>
            </div>

            {/* Main numbers display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-50 rounded-none p-4 border border-zinc-200">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">Gross Fiscal Income</span>
                <span className="text-xl font-black font-mono text-zinc-950">
                  {formatCurrency(taxMetrics.totalGrossIncome)}
                </span>
                <span className="block text-[9px] text-zinc-400 font-bold uppercase tracking-wider pt-1">Logged in Finglass</span>
              </div>

              <div className="bg-zinc-50 rounded-none p-4 border border-zinc-200">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">Write-off Deductions</span>
                <span className="text-xl font-black font-mono text-zinc-900">
                  -{formatCurrency(taxMetrics.activeDeduction)}
                </span>
                <span className="block text-[9px] text-zinc-400 font-bold uppercase tracking-wider pt-1">Standard + Business deductions</span>
              </div>

              <div className="bg-zinc-50 rounded-none p-4 border border-zinc-200">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">Taxable Income</span>
                <span className="text-xl font-black font-mono text-zinc-950">
                  {formatCurrency(taxMetrics.taxableIncome)}
                </span>
                <span className="block text-[9px] text-zinc-400 font-bold uppercase tracking-wider pt-1">Estimated taxable pool</span>
              </div>
            </div>

            {/* Detailed calculation rows */}
            <div className="space-y-4 pt-2">
              <span className="text-[11px] font-black text-zinc-900 tracking-[0.2em] uppercase block border-b border-zinc-200 pb-2">Structured breakdown</span>
              
              <div className="divide-y-2 divide-zinc-100 text-xs font-semibold">
                
                <div className="py-3.5 flex justify-between">
                  <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">Salary Receipts (W-2 Wages)</span>
                  <span className="font-mono text-zinc-900 font-black">{formatCurrency(taxMetrics.w2Earnings)}</span>
                </div>

                <div className="py-3.5 flex justify-between">
                  <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">Self-Employment Receipts (1099 Business)</span>
                  <span className="font-mono text-zinc-900 font-black">{formatCurrency(taxMetrics.businessEarnings)}</span>
                </div>

                <div className="py-3.5 flex justify-between">
                  <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">Assessed Business write-offs</span>
                  <span className="font-mono text-emerald-800 font-black">{formatCurrency(taxMetrics.businessExpenses)}</span>
                </div>

                <div className="py-3.5 flex justify-between">
                  <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">Estimative Progressive Income Tax</span>
                  <span className="font-mono text-zinc-900 font-black">{formatCurrency(taxMetrics.estimatedTaxOwed)}</span>
                </div>

                <div className="py-3.5 flex justify-between">
                  <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">Assessed FICA Taxes (Medicare + SS)</span>
                  <span className="font-mono text-zinc-900 font-black">{formatCurrency(taxMetrics.totalFicaOwed)}</span>
                </div>

                <div className="py-4 flex justify-between border-t-2 border-zinc-900 font-black text-sm">
                  <span className="text-zinc-950 uppercase tracking-widest text-xs">Estimated Cumulative Liability</span>
                  <span className="font-mono text-zinc-950 text-base">{formatCurrency(taxMetrics.aggregateTaxLiability)}</span>
                </div>

                <div className="py-3 flex justify-between text-zinc-550 font-black uppercase text-[10px] tracking-widest">
                  <span>Assessed Effective tax rate</span>
                  <span className="font-mono text-zinc-900 text-xs">{taxMetrics.effectiveTaxRate.toFixed(1)}%</span>
                </div>

              </div>
            </div>

            {/* Bracket progressive path display */}
            <div className="space-y-4 pt-3">
              <span className="text-[11px] font-black text-zinc-900 tracking-[0.2em] uppercase block">Progressive Tax Bracket Distribution</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {taxMetrics.bracketDetails.map((b, idx) => (
                  <div key={idx} className="bg-zinc-50 border border-zinc-200 p-4 rounded-none flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="font-black block text-zinc-900 uppercase tracking-tight">{b.bracket}</span>
                      <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-widest pt-1 block">{b.ratePercent}% Federal Margin</span>
                    </div>
                    <div className="text-right">
                      <span className="block font-black text-zinc-900">{formatCurrency(b.taxDue)}</span>
                      <span className="block text-[8px] text-zinc-400 uppercase font-bold tracking-widest mt-0.5">due on bracket</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COMPASS: Dynamic filing checklist & advice panel */}
        <div className="space-y-6">
          
          {/* Actionable tax compliance Checklist */}
          <div className="bg-white border-2 border-zinc-905 border-zinc-900 rounded-none p-5 shadow-sm space-y-4">
            <span className="text-[11px] font-black tracking-[0.2em] text-zinc-900 uppercase block flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-zinc-505 text-zinc-500" />
              Preparations checklist
            </span>

            <div className="space-y-4 pt-1">
              {filingChecklist.map((item) => {
                const isCompleted = completedItems[item.id] || false;

                return (
                  <div 
                    key={item.id} 
                    onClick={() => toggleChecklist(item.id)}
                    className="flex gap-3 select-none cursor-pointer group"
                  >
                    <div className={`mt-0.5 w-4.5 h-4.5 rounded-none border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isCompleted 
                        ? 'bg-zinc-900 border-zinc-900 text-white' 
                        : 'border-zinc-300 group-hover:border-zinc-500 bg-white'
                    }`}>
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3px]" />}
                    </div>
                    <div className="space-y-1">
                      <span className={`text-xs block font-bold uppercase tracking-tight leading-snug transition-colors ${isCompleted ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                        {item.text}
                      </span>
                      <span className="block text-[10px] text-zinc-400 leading-snug font-semibold">
                        {item.help}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* IRS instruction callout box */}
          <div className="bg-amber-50 border-2 border-amber-900 rounded-none p-5 space-y-3 text-amber-950 text-xs leading-relaxed">
            <div className="flex items-center gap-1.5 font-black uppercase tracking-[0.15em] text-[10px] text-amber-800 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              IRS Compliance Statement
            </div>
            Estimated liabilities are strictly projection indicators computed according to standard pre-release 2026 tax tables and tax deductions logic. Finglass recommends obtaining formal guidance from fully accredited CPAs prior to submitting regulatory IRS Form 1040 document disclosures.
          </div>

        </div>

      </div>

    </div>
  );
};
