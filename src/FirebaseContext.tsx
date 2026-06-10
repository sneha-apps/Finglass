/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { auth, db, signInWithGoogle, logOut, handleFirestoreError } from './firebase';
import { 
  UserDef, 
  HouseholdDef, 
  TransactionDef, 
  GoalDef, 
  InvestmentDef, 
  OperationType 
} from './types';

interface FirebaseContextType {
  user: FirebaseUser | null;
  userProfile: UserDef | null;
  household: HouseholdDef | null;
  householdMembers: UserDef[];
  transactions: TransactionDef[];
  goals: GoalDef[];
  investments: InvestmentDef[];
  loading: boolean;
  selectedMember: string; // "All" or family member display name
  setSelectedMember: (member: string) => void;
  timePeriod: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';
  setTimePeriod: (period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all') => void;
  
  // Actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (householdId: string) => Promise<void>;
  inviteMember: (email: string) => Promise<void>;
  changeBaseCurrency: (currency: string) => Promise<void>;
  
  // Everyday Tracker (Transactions) Actions
  addTransaction: (data: Omit<TransactionDef, 'id' | 'householdId' | 'userId' | 'creatorName' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  togglePaidStatus: (id: string, currentStatus: string, isSubscription: boolean) => Promise<void>;
  
  // Goals Actions
  addGoal: (data: Omit<GoalDef, 'id' | 'householdId' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGoalProgress: (id: string, amount: number) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  
  // Investments Actions
  addInvestment: (data: Omit<InvestmentDef, 'id' | 'householdId' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserDef | null>(null);
  const [household, setHousehold] = useState<HouseholdDef | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<UserDef[]>([]);
  const [transactions, setTransactions] = useState<TransactionDef[]>([]);
  const [goals, setGoals] = useState<GoalDef[]>([]);
  const [investments, setInvestments] = useState<InvestmentDef[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedMember, setSelectedMember] = useState<string>('All');
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'>('monthly');

  // Handle Authentication State Shifts
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserProfile(null);
        setHousehold(null);
        setHouseholdMembers([]);
        setTransactions([]);
        setGoals([]);
        setInvestments([]);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        let activeProfile: UserDef;
        
        if (userSnap.exists()) {
          activeProfile = userSnap.data() as UserDef;
          setUserProfile(activeProfile);
        } else {
          // Initialize a default household for the user
          const defaultHouseholdId = `house_${firebaseUser.uid}`;
          const initialProfile: UserDef = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            householdId: defaultHouseholdId,
            photoURL: firebaseUser.photoURL || '',
            createdAt: new Date().toISOString()
          };
          
          await setDoc(userRef, initialProfile);
          activeProfile = initialProfile;
          setUserProfile(initialProfile);

          // Build default household if not yet created
          const houseRef = doc(db, 'households', defaultHouseholdId);
          const houseSnap = await getDoc(houseRef);
          if (!houseSnap.exists()) {
            const defaultHouseholdName = `${initialProfile.displayName}'s Pane`;
            const initialHouse: HouseholdDef = {
              id: defaultHouseholdId,
              name: defaultHouseholdName,
              members: [firebaseUser.uid],
              invitedEmails: [],
              baseCurrency: 'USD',
              createdAt: new Date().toISOString()
            };
            await setDoc(houseRef, initialHouse);
          }
        }
      } catch (err) {
        console.error("Error setting up user session profiles:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to Household configuration
  useEffect(() => {
    if (!user || !userProfile?.householdId) return;

    const path = `households/${userProfile.householdId}`;
    const unsubscribe = onSnapshot(
      doc(db, 'households', userProfile.householdId),
      (docSnap) => {
        if (docSnap.exists()) {
          setHousehold(docSnap.data() as HouseholdDef);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [user, userProfile?.householdId]);

  // Listen to Household members
  useEffect(() => {
    if (!user || !userProfile?.householdId) return;

    const path = `users`;
    const q = query(collection(db, 'users'), where('householdId', '==', userProfile.householdId));
    const unsubscribe = onSnapshot(
      q,
      (querySnap) => {
        const membersList: UserDef[] = [];
        querySnap.forEach((doc) => {
          membersList.push(doc.data() as UserDef);
        });
        setHouseholdMembers(membersList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [user, userProfile?.householdId]);

  // Bind transactions, goals, and investments of current household
  useEffect(() => {
    if (!user || !userProfile?.householdId) return;

    const tPath = 'transactions';
    const tQuery = query(collection(db, 'transactions'), where('householdId', '==', userProfile.householdId));
    const unsubscribeTransactions = onSnapshot(tQuery, (snapshot) => {
      const items: TransactionDef[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as TransactionDef);
      });
      // Sort transactions by date descending, then createdAt descending
      items.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
      setTransactions(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, tPath);
    });

    const gPath = 'goals';
    const gQuery = query(collection(db, 'goals'), where('householdId', '==', userProfile.householdId));
    const unsubscribeGoals = onSnapshot(gQuery, (snapshot) => {
      const items: GoalDef[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as GoalDef);
      });
      setGoals(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, gPath);
    });

    const iPath = 'investments';
    const iQuery = query(collection(db, 'investments'), where('householdId', '==', userProfile.householdId));
    const unsubscribeInvestments = onSnapshot(iQuery, (snapshot) => {
      const items: InvestmentDef[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as InvestmentDef);
      });
      setInvestments(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, iPath);
    });

    return () => {
      unsubscribeTransactions();
      unsubscribeGoals();
      unsubscribeInvestments();
    };
  }, [user, userProfile?.householdId]);

  // Authentication methods
  const login = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error("Login call failed", e);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logOut();
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      setLoading(false);
    }
  };

  // Actions
  const createHousehold = async (name: string) => {
    if (!user || !userProfile) return;
    const newHouseId = `house_${user.uid}_${Date.now()}`;
    const path = `households/${newHouseId}`;
    try {
      const newHouse: HouseholdDef = {
        id: newHouseId,
        name,
        members: [user.uid],
        invitedEmails: [],
        baseCurrency: 'USD',
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'households', newHouseId), newHouse);
      
      // Update user to refer to this new unique house
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { householdId: newHouseId });
      
      setUserProfile(prev => prev ? { ...prev, householdId: newHouseId } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const joinHousehold = async (householdId: string) => {
    if (!user || !userProfile) return;
    const path = `households/${householdId}`;
    try {
      const houseRef = doc(db, 'households', householdId);
      const houseSnap = await getDoc(houseRef);
      if (!houseSnap.exists()) {
        throw new Error("Target family household was not found.");
      }
      
      const houseData = houseSnap.data() as HouseholdDef;
      const updatedMembers = [...houseData.members];
      if (!updatedMembers.includes(user.uid)) {
        updatedMembers.push(user.uid);
      }
      
      // Filter email invitations once successful join
      const updatedInvited = houseData.invitedEmails.filter(email => email.toLowerCase() !== userProfile.email.toLowerCase());

      await updateDoc(houseRef, { 
        members: updatedMembers,
        invitedEmails: updatedInvited
      });

      // Update user reference
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { householdId });
      
      setUserProfile(prev => prev ? { ...prev, householdId } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const inviteMember = async (email: string) => {
    if (!user || !household) return;
    const path = `households/${household.id}`;
    try {
      const invitedEmails = [...household.invitedEmails];
      const targetEmail = email.trim().toLowerCase();
      if (!invitedEmails.includes(targetEmail)) {
        invitedEmails.push(targetEmail);
        await updateDoc(doc(db, 'households', household.id), { invitedEmails });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const changeBaseCurrency = async (baseCurrency: string) => {
    if (!user || !household) return;
    const path = `households/${household.id}`;
    try {
      await updateDoc(doc(db, 'households', household.id), { baseCurrency });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Everyday tracker calculations (Transactions)
  const addTransaction = async (data: Omit<TransactionDef, 'id' | 'householdId' | 'userId' | 'creatorName' | 'createdAt' | 'updatedAt'>) => {
    if (!user || !userProfile?.householdId) return;
    const transId = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const path = `transactions/${transId}`;
    try {
      const newTransaction: TransactionDef = {
        ...data,
        id: transId,
        householdId: userProfile.householdId,
        userId: user.uid,
        creatorName: userProfile.displayName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'transactions', transId), newTransaction);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const deleteTransaction = async (id: string) => {
    const path = `transactions/${id}`;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const togglePaidStatus = async (id: string, currentStatus: string, isSubscription: boolean) => {
    const path = `transactions/${id}`;
    try {
      // Rotate active subscription states: "active" <-> "cancelled" or bills paid: "paid" <-> "unpaid"
      let nextStatus: 'paid' | 'unpaid' | 'active' | 'cancelled' | 'overdue' = 'paid';
      
      if (isSubscription) {
        nextStatus = currentStatus === 'active' ? 'cancelled' : 'active';
      } else {
        nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
      }

      await updateDoc(doc(db, 'transactions', id), { 
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Financial goals
  const addGoal = async (data: Omit<GoalDef, 'id' | 'householdId' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user || !userProfile?.householdId) return;
    const goalId = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const path = `goals/${goalId}`;
    try {
      const newGoal: GoalDef = {
        ...data,
        id: goalId,
        householdId: userProfile.householdId,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'goals', goalId), newGoal);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateGoalProgress = async (id: string, currentAmount: number) => {
    const path = `goals/${id}`;
    try {
      await updateDoc(doc(db, 'goals', id), { 
        currentAmount,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteGoal = async (id: string) => {
    const path = `goals/${id}`;
    try {
      await deleteDoc(doc(db, 'goals', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Investment logic
  const addInvestment = async (data: Omit<InvestmentDef, 'id' | 'householdId' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user || !userProfile?.householdId) return;
    const invId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const path = `investments/${invId}`;
    try {
      const newInvest: InvestmentDef = {
        ...data,
        id: invId,
        householdId: userProfile.householdId,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'investments', invId), newInvest);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const deleteInvestment = async (id: string) => {
    const path = `investments/${id}`;
    try {
      await deleteDoc(doc(db, 'investments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <FirebaseContext.Provider value={{
      user,
      userProfile,
      household,
      householdMembers,
      transactions,
      goals,
      investments,
      loading,
      selectedMember,
      setSelectedMember,
      timePeriod,
      setTimePeriod,
      
      login,
      logout,
      createHousehold,
      joinHousehold,
      inviteMember,
      changeBaseCurrency,
      
      addTransaction,
      deleteTransaction,
      togglePaidStatus,
      
      addGoal,
      updateGoalProgress,
      deleteGoal,
      
      addInvestment,
      deleteInvestment
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
