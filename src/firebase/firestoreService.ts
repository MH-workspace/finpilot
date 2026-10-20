import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import {
  Transaction,
  Budget,
  SavingsGoal,
  RecurringRule,
  UserSettings,
} from '../types/finance';

/**
 * Real-time listener for user's transactions in Firestore
 */
export function subscribeToTransactions(
  userId: string,
  onUpdate: (transactions: Transaction[]) => void
): () => void {
  const path = `users/${userId}/transactions`;
  const colRef = collection(db, 'users', userId, 'transactions');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: data.id || docSnap.id,
          date: data.date,
          description: data.description,
          category: data.category,
          type: data.type,
          amount: Number(data.amount),
          notes: data.notes || '',
        });
      });
      // Sort newest first
      items.sort((a, b) => b.date.localeCompare(a.date));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Real-time listener for user's budgets in Firestore
 */
export function subscribeToBudgets(
  userId: string,
  onUpdate: (budgets: Budget[]) => void
): () => void {
  const path = `users/${userId}/budgets`;
  const colRef = collection(db, 'users', userId, 'budgets');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Budget[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          category: data.category,
          monthlyLimit: Number(data.monthlyLimit),
        });
      });
      items.sort((a, b) => a.category.localeCompare(b.category));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Real-time listener for user's savings goals in Firestore
 */
export function subscribeToGoals(
  userId: string,
  onUpdate: (goals: SavingsGoal[]) => void
): () => void {
  const path = `users/${userId}/goals`;
  const colRef = collection(db, 'users', userId, 'goals');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: SavingsGoal[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: data.id || docSnap.id,
          name: data.name,
          targetAmount: Number(data.targetAmount),
          savedAmount: Number(data.savedAmount),
          targetDate: data.targetDate || undefined,
          notes: data.notes || '',
        });
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Real-time listener for user's recurring rules in Firestore
 */
export function subscribeToRecurring(
  userId: string,
  onUpdate: (rules: RecurringRule[]) => void
): () => void {
  const path = `users/${userId}/recurring`;
  const colRef = collection(db, 'users', userId, 'recurring');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: RecurringRule[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: data.id || docSnap.id,
          description: data.description,
          category: data.category,
          type: data.type,
          amount: Number(data.amount),
          frequency: data.frequency,
          nextDate: data.nextDate,
          active: Boolean(data.active),
        });
      });
      items.sort((a, b) => a.nextDate.localeCompare(b.nextDate));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Real-time listener for user settings in Firestore
 */
export function subscribeToUserSettings(
  userId: string,
  onUpdate: (settings: UserSettings) => void
): () => void {
  const path = `users/${userId}/settings/preferences`;
  const docRef = doc(db, 'users', userId, 'settings', 'preferences');

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onUpdate({
          currency: {
            symbol: data.currencySymbol || '₹',
            code: data.currencyCode || 'INR',
            name: data.currencyName || 'Indian Rupee (₹)',
          },
          targetSavingsRate: Number(data.targetSavingsRate || 20),
          hasLoadedInitialData: true,
        });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Write / Update transaction in Firestore
 */
export async function saveTransactionToFirestore(
  userId: string,
  tx: Transaction
): Promise<void> {
  const path = `users/${userId}/transactions/${tx.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'transactions', tx.id);
    await setDoc(
      docRef,
      {
        id: tx.id,
        userId,
        date: tx.date,
        description: tx.description,
        category: tx.category,
        type: tx.type,
        amount: tx.amount,
        notes: tx.notes || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete transaction in Firestore
 */
export async function deleteTransactionFromFirestore(
  userId: string,
  transactionId: string
): Promise<void> {
  const path = `users/${userId}/transactions/${transactionId}`;
  try {
    const docRef = doc(db, 'users', userId, 'transactions', transactionId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save budget in Firestore
 */
export async function saveBudgetToFirestore(
  userId: string,
  category: string,
  monthlyLimit: number
): Promise<void> {
  const cleanId = category.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const path = `users/${userId}/budgets/${cleanId}`;
  try {
    const docRef = doc(db, 'users', userId, 'budgets', cleanId);
    await setDoc(
      docRef,
      {
        id: cleanId,
        userId,
        category,
        monthlyLimit,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete budget in Firestore
 */
export async function deleteBudgetFromFirestore(
  userId: string,
  category: string
): Promise<void> {
  const cleanId = category.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const path = `users/${userId}/budgets/${cleanId}`;
  try {
    const docRef = doc(db, 'users', userId, 'budgets', cleanId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save / Update savings goal in Firestore
 */
export async function saveGoalToFirestore(
  userId: string,
  goal: SavingsGoal
): Promise<void> {
  const path = `users/${userId}/goals/${goal.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'goals', goal.id);
    await setDoc(
      docRef,
      {
        id: goal.id,
        userId,
        name: goal.name,
        targetAmount: goal.targetAmount,
        savedAmount: goal.savedAmount,
        targetDate: goal.targetDate || '',
        notes: goal.notes || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete goal in Firestore
 */
export async function deleteGoalFromFirestore(
  userId: string,
  goalId: string
): Promise<void> {
  const path = `users/${userId}/goals/${goalId}`;
  try {
    const docRef = doc(db, 'users', userId, 'goals', goalId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save / Update recurring rule in Firestore
 */
export async function saveRecurringToFirestore(
  userId: string,
  rule: RecurringRule
): Promise<void> {
  const path = `users/${userId}/recurring/${rule.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'recurring', rule.id);
    await setDoc(
      docRef,
      {
        id: rule.id,
        userId,
        description: rule.description,
        category: rule.category,
        type: rule.type,
        amount: rule.amount,
        frequency: rule.frequency,
        nextDate: rule.nextDate,
        active: rule.active,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete recurring rule in Firestore
 */
export async function deleteRecurringFromFirestore(
  userId: string,
  ruleId: string
): Promise<void> {
  const path = `users/${userId}/recurring/${ruleId}`;
  try {
    const docRef = doc(db, 'users', userId, 'recurring', ruleId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save user preferences in Firestore
 */
export async function saveUserSettingsToFirestore(
  userId: string,
  settings: UserSettings
): Promise<void> {
  const path = `users/${userId}/settings/preferences`;
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'preferences');
    await setDoc(
      docRef,
      {
        userId,
        currencySymbol: settings.currency.symbol,
        currencyCode: settings.currency.code,
        currencyName: settings.currency.name,
        targetSavingsRate: settings.targetSavingsRate,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Bulk upload local data into Firestore for newly signed-in user
 */
export async function syncLocalDataToFirestore(
  userId: string,
  localTransactions: Transaction[],
  localBudgets: Budget[],
  localGoals: SavingsGoal[],
  localRecurring: RecurringRule[],
  localSettings: UserSettings
): Promise<void> {
  try {
    for (const tx of localTransactions) {
      await saveTransactionToFirestore(userId, tx);
    }
    for (const b of localBudgets) {
      await saveBudgetToFirestore(userId, b.category, b.monthlyLimit);
    }
    for (const g of localGoals) {
      await saveGoalToFirestore(userId, g);
    }
    for (const r of localRecurring) {
      await saveRecurringToFirestore(userId, r);
    }
    await saveUserSettingsToFirestore(userId, localSettings);
  } catch (error) {
    console.error('Failed to sync local data to Firestore:', error);
  }
}
