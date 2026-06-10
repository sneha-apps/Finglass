/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFirebase } from '../FirebaseContext';
import { motion } from 'motion/react';
import { 
  Users, 
  Plus, 
  Copy, 
  Check, 
  Send, 
  Building, 
  X, 
  ShieldAlert, 
  LogOut, 
  UserPlus2,
  FolderLock
} from 'lucide-react';

interface FamilyConsoleProps {
  onClose: () => void;
}

export const FamilyConsole: React.FC<FamilyConsoleProps> = ({ onClose }) => {
  const {
    userProfile,
    household,
    householdMembers,
    createHousehold,
    joinHousehold,
    inviteMember,
    logout
  } = useFirebase();

  // form states
  const [houseNameInput, setHouseNameInput] = useState('');
  const [joinIdInput, setJoinIdInput] = useState('');
  const [inviteEmailInput, setInviteEmailInput] = useState('');

  // UI state
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: 'info' });

  const handleCopyId = () => {
    if (!household?.id) return;
    navigator.clipboard.writeText(household.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseNameInput.trim()) return;
    try {
      await createHousehold(houseNameInput.trim());
      setStatusMsg({ text: 'Created new family household!', type: 'success' });
      setHouseNameInput('');
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Error creating household', type: 'error' });
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinIdInput.trim()) return;
    try {
      await joinHousehold(joinIdInput.trim());
      setStatusMsg({ text: 'Successfully joined household!', type: 'success' });
      setJoinIdInput('');
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Error joining household', type: 'error' });
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmailInput.trim()) return;
    try {
      await inviteMember(inviteEmailInput.trim());
      setStatusMsg({ text: `Invitation sent to ${inviteEmailInput.trim()}!`, type: 'success' });
      setInviteEmailInput('');
    } catch (err: any) {
      setStatusMsg({ text: 'Error sending invitation', type: 'error' });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-zinc-950/40 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="bg-white border-4 border-zinc-100 border-zinc-900 rounded-none w-full max-w-lg p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-zinc-200 pb-4">
          <div className="flex items-center gap-2 text-zinc-950">
            <Users className="w-5 h-5 text-zinc-900" />
            <h2 className="text-sm font-black uppercase tracking-widest italic leading-none pt-0.5">Family Council Management</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-2 border-2 border-transparent hover:border-zinc-900 hover:bg-zinc-50 text-zinc-400 hover:text-zinc-950 transition-all rounded-none cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {statusMsg.text && (
          <div className={`p-4 rounded-none text-xs font-black uppercase tracking-wider border-2 ${statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-950 border-emerald-900' : 'bg-rose-50 text-rose-950 border-rose-900'}`}>
            {statusMsg.text}
          </div>
        )}

        {/* CURRENT HOUSEHOLD DETAILS */}
        {household ? (
          <div className="space-y-4">
            <div className="bg-zinc-50 border-2 border-zinc-200 rounded-none p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block mb-1">Active Household Name</span>
                  <span className="block text-sm font-black uppercase tracking-tight text-zinc-900">{household.name}</span>
                </div>
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-1.5 bg-white border-2 border-zinc-950 rounded-none py-1.5 px-3 text-[10px] font-black text-zinc-950 uppercase tracking-widest hover:bg-zinc-50 cursor-pointer font-sans"
                  title="Copy House ID code"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3px]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy House ID'}
                </button>
              </div>

              <div className="text-[10px] text-zinc-405 font-mono flex items-center justify-between border-t border-zinc-200/80 pt-2.5">
                <span className="uppercase font-bold tracking-wider">Household ID Code:</span>
                <span className="text-zinc-950 font-bold truncate max-w-[240px]">{household.id}</span>
              </div>
            </div>

            {/* Members row */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Authorized Members</span>
              <div className="divide-y-2 divide-zinc-200 bg-white border-2 border-zinc-250 rounded-none overflow-hidden max-h-36 overflow-y-auto">
                {householdMembers.map((member) => (
                  <div key={member.uid} className="p-3 px-4 flex items-center gap-2 justify-between text-xs font-semibold text-zinc-900 font-mono">
                    <span className="flex items-center gap-2 font-bold font-sans uppercase tracking-tight text-zinc-950 text-xs">
                      <div className="w-6 h-6 rounded-none border border-zinc-300 bg-zinc-50 flex items-center justify-center text-[10px] font-black text-zinc-950 uppercase">
                        {member.displayName[0].toUpperCase()}
                      </div>
                      {member.displayName} {member.uid === userProfile?.uid && '(You)'}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">{member.email}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Send Invitation */}
            <form onSubmit={handleInvite} className="space-y-2 pt-1.5">
              <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Invite family member by email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="family-member@gmail.com"
                  value={inviteEmailInput}
                  onChange={(e) => setInviteEmailInput(e.target.value)}
                  className="flex-1 bg-zinc-50 border-2 border-zinc-200 rounded-none py-1.5 px-3 text-xs focus:outline-none focus:border-zinc-900 font-mono font-bold"
                />
                <button
                  type="submit"
                  className="bg-zinc-900 hover:bg-zinc-800 text-white font-black text-[10px] uppercase tracking-[0.2em] py-2 px-4 rounded-none transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Invite
                </button>
              </div>
            </form>

            {household.invitedEmails.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block">Outstanding Invitations</span>
                <div className="flex flex-wrap gap-1.5">
                  {household.invitedEmails.map((email) => (
                    <span key={email} className="bg-zinc-150 text-zinc-950 font-mono font-bold text-[9px] p-1 px-2.5 rounded-none border border-zinc-300">
                      {email}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-zinc-450 font-black uppercase tracking-wider">
            No household initialized. Please create or join one below.
          </div>
        )}

        {/* JOIN OR CREATE ANOTHER FAMILY HOUSING PANE */}
        <div className="border-t-2 border-zinc-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* JOIN */}
          <form onSubmit={handleJoin} className="space-y-2.5">
            <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block flex items-center gap-1.5 font-bold">
              <UserPlus2 className="w-3.5 h-3.5 text-zinc-500" />
              Join a household
            </span>
            <input
              type="text"
              required
              placeholder="Paste Household ID code..."
              value={joinIdInput}
              onChange={(e) => setJoinIdInput(e.target.value)}
              className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-2.5 text-[11px] focus:outline-none focus:border-zinc-900 font-mono font-bold"
            />
            <button
              type="submit"
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-black text-[10px] uppercase tracking-[0.15em] py-2.5 px-3 rounded-none transition-all cursor-pointer"
            >
              Merge Finance Portals
            </button>
          </form>

          {/* CREATE NEW */}
          <form onSubmit={handleCreate} className="space-y-2.5">
            <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase block flex items-center gap-1.5 font-bold">
              <Building className="w-3.5 h-3.5 text-zinc-500" />
              Establish new council
            </span>
            <input
              type="text"
              required
              placeholder="e.g. Miller Family Ledger"
              value={houseNameInput}
              onChange={(e) => setHouseNameInput(e.target.value)}
              className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-none py-2 px-2.5 text-[11px] focus:outline-none focus:border-zinc-900 font-sans font-bold"
            />
            <button
              type="submit"
              className="w-full border-2 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 text-zinc-850 font-black text-[10px] uppercase tracking-[0.15em] py-2.5 px-3 rounded-none transition-all cursor-pointer"
            >
              Create New Base
            </button>
          </form>

        </div>

        {/* Sign Out Button */}
        <div className="border-t-2 border-zinc-200 pt-5 flex justify-between items-center text-xs flex-wrap gap-2">
          <span className="text-zinc-400 font-mono font-semibold">Active Profile: {userProfile?.email}</span>
          <button
            onClick={async () => {
              await logout();
              onClose();
            }}
            className="flex items-center gap-1.5 text-zinc-505 text-zinc-500 hover:text-rose-700 font-black uppercase tracking-[0.15em] text-[10px] transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Unlink Profile
          </button>
        </div>

      </motion.div>
    </motion.div>
  );
};
