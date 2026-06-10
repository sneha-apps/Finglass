/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserDef {
  uid: string;
  email: string;
  displayName: string;
  householdId: string;
  photoURL: string;
  createdAt: string;
}

export interface HouseholdDef {
  id: string;
  name: string;
  members: string[]; // array of member UIDs
  invitedEmails: string[];
  baseCurrency: string;
  createdAt: string;
}

export interface TransactionDef {
  id: string;
  householdId: string;
  userId: string;
  creatorName: string;
  memberName: string; // "John", "Sarah", or "Household"
  type: 'earning' | 'expense';
  category: string;
  amount: number; // Converted to USD
  originalAmount: number;
  originalCurrency: string;
  date: string; // YYYY-MM-DD
  description: string;
  isBill: boolean;
  isSubscription: boolean;
  dueDate: string; // YYYY-MM-DD (fallback/empty if not applicable)
  status: 'paid' | 'unpaid' | 'active' | 'cancelled' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

export interface GoalDef {
  id: string;
  householdId: string;
  userId: string;
  title: string;
  category: 'trip' | 'house' | 'retirement' | 'savings' | 'other';
  targetAmount: number; // in USD
  currentAmount: number; // in USD
  targetDate: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentDef {
  id: string;
  householdId: string;
  userId: string;
  name: string;
  category: 'stocks' | 'crypto' | 'real_estate' | 'savings_account' | 'retirement' | 'other';
  principal: number; // in USD
  yieldRate: number; // percentage, e.g. 8 for 8%
  contribution: number; // monthly contribution in USD
  createdAt: string;
  updatedAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface CurrencyRate {
  code: string;
  symbol: string;
  name: string;
  rateToUsd: number; // how much 1 unit is worth in USD. E.g. EUR node is 1.08, INR is 0.012
}
