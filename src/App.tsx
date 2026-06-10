/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FirebaseProvider, useFirebase } from './FirebaseContext';
import { EverydayTracker } from './components/EverydayTracker';
import { GoalsView } from './components/GoalsView';
import { InvestmentsView } from './components/InvestmentsView';
import { TaxesView } from './components/TaxesView';
import { FamilyConsole } from './components/FamilyConsole';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Settings, 
  HelpCircle, 
  ChevronRight, 
  ArrowRight,
  TrendingUp,
  Brain,
  ShieldCheck,
  Building2,
  Lock
} from 'lucide-react';

function FinglassDashboard() {
  const { 
    user, 
    userProfile, 
    household, 
    loading, 
    login,
    selectedMember,
    timePeriod,
    setTimePeriod
  } = useFirebase();

  // Active workspace tab view
  const [activeTab, setActiveTab] = useState<'tracker' | 'goals' | 'investments' | 'taxes'>('tracker');
  
  // Modal visibility
  const [showConsole, setShowConsole] = useState(false);

  // loading splash screen
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center space-y-3">
        <motion.div 
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-zinc-900 tracking-[0.3em] font-sans font-black text-2xl uppercase italic"
        >
          FINGLASS
        </motion.div>
        <span className="text-[10px] text-zinc-450 uppercase font-mono tracking-[0.2em] font-bold">LOADING SHARED LEDGER...</span>
      </div>
    );
  }

  // Not verified / Authenticated onboarding page
  if (!user || !userProfile) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center p-4">
        {/* Flat black border box */}
        <div className="w-full max-w-md bg-white border-8 border-zinc-900 rounded-none p-8 sm:p-10 space-y-8 relative">
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tighter uppercase italic leading-none">
              Finglass
            </h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold max-w-xs mx-auto">
              A minimalist, transparent pane into shared family finance
            </p>
          </div>

          <div className="bg-zinc-50 rounded-none p-5 border-l-4 border-zinc-900 text-zinc-800 text-xs leading-relaxed space-y-4">
            <span className="font-bold text-zinc-900 uppercase tracking-[0.2em] text-[10px] block">Portal Scope</span>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 mt-1.5 shrink-0" />
              <span>Log everyday multi-currency inflows, outflows, auto-debits, and recurring subscriptions.</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 mt-1.5 shrink-0" />
              <span>Track joint trip, asset, or retirement milestone targets with dynamic compound suggestion modules.</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 mt-1.5 shrink-0" />
              <span>Forecast investment portfolio compounding timelines up to 30 years with interactive curves.</span>
            </div>
          </div>

          <button
            onClick={login}
            id="google-signin-btn"
            className="w-full flex items-center justify-center gap-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-[0.2em] py-4 px-4 transition-all"
          >
            <Lock className="w-4 h-4 text-zinc-400 fill-white" />
            Sign In with Google
          </button>

          <div className="text-[9px] text-zinc-400 uppercase tracking-[0.25em] text-center font-mono font-bold pt-1">
            SECURE SHARED MULTI-MEMBER ARCHITECTURE
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans selection:bg-zinc-900 selection:text-white border-8 border-zinc-100 p-4 md:p-8">
      
      {/* 1. MASTER UPPER HEADER CHIP (The flat high-contrast frame top) */}
      <header className="mb-8 border-b border-zinc-200 pb-6">
        <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Logo Title */}
          <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tighter uppercase italic text-zinc-950">
              Finglass
            </h1>
            <div className="flex gap-4 mt-2 text-[10px] tracking-widest uppercase font-semibold text-zinc-400">
              <span className="text-zinc-910 text-zinc-900 border-b-2 border-zinc-900 pb-0.5 font-bold">
                {household ? household.name : 'Ledger Workspace'}
              </span>
              <span>Individual View</span>
            </div>
          </div>

          {/* User profiles & navigation controllers */}
          <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-end">
            
            <button
              onClick={() => setShowConsole(true)}
              className="flex items-center gap-1.5 border-2 border-zinc-900 hover:bg-zinc-900 hover:text-white text-zinc-900 font-bold text-[10px] uppercase tracking-widest py-2 px-4 transition-all cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Family Settings</span>
            </button>

            {/* Avatar block */}
            <div className="flex items-center gap-2">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={userProfile.displayName} 
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-none border-2 border-zinc-900 shadow-sm"
                />
              ) : (
                <div className="w-9 h-9 rounded-none bg-zinc-900 text-white flex items-center justify-center font-bold text-xs select-none border-2 border-zinc-900">
                  {userProfile.displayName[0].toUpperCase()}
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* 2. SUB NAVIGATION RAILS: Time-Period Filter & Workspace Selection */}
      <div className="w-full max-w-7xl mx-auto space-y-8 flex-1 flex flex-col">
        
        {/* Navigation Tabs bar & Universal Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-zinc-200 pb-4">
          
          {/* Menu Sections Tabs (Bold inline styling) */}
          <div className="flex flex-wrap gap-6">
            {[
              { id: 'tracker', label: 'Everyday Tracker' },
              { id: 'goals', label: 'Capital Goals' },
              { id: 'investments', label: 'Investments' },
              { id: 'taxes', label: 'Tax Preparation' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 text-[11px] font-black uppercase tracking-[0.25em] transition-all hover:text-zinc-900 relative cursor-pointer ${
                  activeTab === tab.id
                    ? 'text-zinc-900 border-b-2 border-zinc-900 font-black'
                    : 'text-zinc-400 border-b-2 border-transparent font-bold'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Time scale filters matching design config precisely */}
          {activeTab === 'tracker' && (
            <div className="flex bg-zinc-100 p-1 rounded-sm gap-1 border border-zinc-200">
              {[
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
                { id: 'yearly', label: 'Yearly' },
                { id: 'all', label: 'All-Time' }
              ].map((period) => (
                <button
                  key={period.id}
                  onClick={() => setTimePeriod(period.id as any)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${
                    timePeriod === period.id 
                      ? 'bg-white text-zinc-900 shadow-sm font-black' 
                      : 'text-zinc-400 hover:text-zinc-900 bg-transparent'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* 3. CORE SUB-WORKSPACE VIEWPORT */}
        <main className="flex-1 transition-all">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'tracker' && <EverydayTracker />}
              {activeTab === 'goals' && <GoalsView />}
              {activeTab === 'investments' && <InvestmentsView />}
              {activeTab === 'taxes' && <TaxesView />}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>

      {/* 4. MASTER COMPASS FOOTER & REGISTRATION DETAILS */}
      <footer className="mt-12 pt-8 border-t border-zinc-200 w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-400 font-mono text-[9px] uppercase tracking-widest font-bold">
        
        <div className="flex flex-col sm:flex-row gap-8 text-center sm:text-left">
          <div className="flex flex-col">
            <span className="text-zinc-400">FINANCIAL COMPASS SECURED NODE</span>
            <span className="text-zinc-900 font-black mt-1">EST. 2026 UNIFIED SYSTEM</span>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-400">DATA CONNECTION</span>
            <span className="text-zinc-900 font-black mt-1">ACTIVE ENCRYPTED FIRESTORE</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 leading-none bg-zinc-100 p-2 border border-zinc-200">
          <ShieldCheck className="w-3.5 h-3.5 stroke-zinc-900" />
          <span className="text-zinc-900 text-[10px]">VERIFIED GATEWAY PIN ACTIVE</span>
        </div>

      </footer>

      {/* 5. OVERLAYS: Admin FamilyConsole modal panel */}
      {showConsole && (
        <FamilyConsole onClose={() => setShowConsole(false)} />
      )}

    </div>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <FinglassDashboard />
    </FirebaseProvider>
  );
}

