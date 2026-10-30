import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  getReadableFirestoreError,
  OperationType,
  sanitizeFirestoreId,
} from './config';
import {
  Transaction,
  Budget,
  SavingsGoal,
  RecurringRule,
  UserSettings,
} from '../types/finance';

export type FirestoreListenerErrorHandler = (readableMessage: string) => void;

function reportSnapshotError(
  error: unknown,
  op: OperationType,
  path: string,
  onError?: FirestoreListenerErrorHandler
): void {
  let thrown: unknown = error;
  try {
    handleFirestoreError(error, op, path);
  } catch (structuredErr) {
    thrown = structuredErr;
  }
  if (onError) {
    onError(getReadableFirestoreError(thrown));
  }
}

function getBudgetDocId(category: string): string {
  return sanitizeFirestoreId(category.toLowerCase(), 'budget');
}

/**
 * Real-time listener for user's transactions in Firestore
 */
export function subscribeToTransactions(
  userId: string,
  onUpdate: (transactions: Transaction[]) => void,
  onError?: FirestoreListenerErrorHandler
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
          date: String(data.date || ''),
          description: String(data.description || ''),
          category: String(data.category || 'Other'),
          type: data.type === 'Income' ? 'Income' : 'Expense',
          amount: Number(data.amount) || 0,
          notes: data.notes ? String(data.notes) : '',
        });
      });
      items.sort((a, b) => b.date.localeCompare(a.date));
      onUpdate(items);
    },
    (error) => {
      reportSnapshotError(error, OperationType.LIST, path, onError);
    }
  );
}

/**
 * Real-time listener for user's budgets in Firestore
 */
export function subscribeToBudgets(
  userId: string,
  onUpdate: (budgets: Budget[]) => void,
  onError?: FirestoreListenerErrorHandler
): () => void {
  const path = `users/${userId}/budgets`;
  const colRef = collection(db, 'users', userId, 'budgets');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Budget[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.category) {
          items.push({
            category: String(data.category),
            monthlyLimit: Number(data.monthlyLimit) || 0,
          });
        }
      });
      items.sort((a, b) => a.category.localeCompare(b.category));
      onUpdate(items);
    },
    (error) => {
      reportSnapshotError(error, OperationType.LIST, path, onError);
    }
  );
}

/**
 * Real-time listener for user's savings goals in Firestore
 */
export function subscribeToGoals(
  userId: string,
  onUpdate: (goals: SavingsGoal[]) => void,
  onError?: FirestoreListenerErrorHandler
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
          name: String(data.name || ''),
          targetAmount: Number(data.targetAmount) || 0,
          savedAmount: Number(data.savedAmount) || 0,
          targetDate: data.targetDate ? String(data.targetDate) : undefined,
          notes: data.notes ? String(data.notes) : '',
        });
      });
      onUpdate(items);
    },
    (error) => {
      reportSnapshotError(error, OperationType.LIST, path, onError);
    }
  );
}

/**
 * Real-time listener for user's recurring rules in Firestore
 */
export function subscribeToRecurring(
  userId: string,
  onUpdate: (rules: RecurringRule[]) => void,
  onError?: FirestoreListenerErrorHandler
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
          description: String(data.description || ''),
          category: String(data.category || 'Other'),
          type: data.type === 'Income' ? 'Income' : 'Expense',
          amount: Number(data.amount) || 0,
          frequency: data.frequency,
          nextDate: String(data.nextDate || ''),
          active: Boolean(data.active),
        });
      });
      items.sort((a, b) => a.nextDate.localeCompare(b.nextDate));
      onUpdate(items);
    },
    (error) => {
      reportSnapshotError(error, OperationType.LIST, path, onError);
    }
  );
}

/**
 * Real-time listener for user settings in Firestore
 */
export function subscribeToUserSettings(
  userId: string,
  onUpdate: (settings: UserSettings) => void,
  onError?: FirestoreListenerErrorHandler
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
          targetSavingsRate: Number(data.targetSavingsRate ?? 20),
          hasLoadedInitialData: true,
        });
      }
    },
    (error) => {
      reportSnapshotError(error, OperationType.GET, path, onError);
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
  const safeId = sanitizeFirestoreId(tx.id, 'tx');
  const path = `users/${userId}/transactions/${safeId}`;
  try {
    const docRef = doc(db, 'users', userId, 'transactions', safeId);
    await setDoc(
      docRef,
      {
        id: safeId,
        userId,
        date: String(tx.date).slice(0, 32),
        description: String(tx.description).trim().slice(0, 256),
        category: String(tx.category || 'Other').trim().slice(0, 64),
        type: tx.type === 'Income' ? 'Income' : 'Expense',
        amount: Number(tx.amount),
        notes: String(tx.notes || '').slice(0, 1000),
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
  const safeId = sanitizeFirestoreId(transactionId, 'tx');
  const path = `users/${userId}/transactions/${safeId}`;
  try {
    const docRef = doc(db, 'users', userId, 'transactions', safeId);
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
  const cleanId = getBudgetDocId(category);
  const path = `users/${userId}/budgets/${cleanId}`;
  try {
    const docRef = doc(db, 'users', userId, 'budgets', cleanId);
    await setDoc(
      docRef,
      {
        id: cleanId,
        userId,
        category: category.trim().slice(0, 64),
        monthlyLimit: Number(monthlyLimit),
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
  const cleanId = getBudgetDocId(category);
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
  const safeId = sanitizeFirestoreId(goal.id, 'goal');
  const path = `users/${userId}/goals/${safeId}`;
  try {
    const docRef = doc(db, 'users', userId, 'goals', safeId);
    await setDoc(
      docRef,
      {
        id: safeId,
        userId,
        name: String(goal.name).trim().slice(0, 128),
        targetAmount: Number(goal.targetAmount),
        savedAmount: Number(goal.savedAmount),
        targetDate: String(goal.targetDate || '').slice(0, 32),
        notes: String(goal.notes || '').slice(0, 1000),
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
  const safeId = sanitizeFirestoreId(goalId, 'goal');
  const path = `users/${userId}/goals/${safeId}`;
  try {
    const docRef = doc(db, 'users', userId, 'goals', safeId);
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
  const safeId = sanitizeFirestoreId(rule.id, 'rec');
  const path = `users/${userId}/recurring/${safeId}`;
  try {
    const docRef = doc(db, 'users', userId, 'recurring', safeId);
    await setDoc(
      docRef,
      {
        id: safeId,
        userId,
        description: String(rule.description).trim().slice(0, 256),
        category: String(rule.category || 'Other').trim().slice(0, 64),
        type: rule.type === 'Income' ? 'Income' : 'Expense',
        amount: Number(rule.amount),
        frequency: rule.frequency,
        nextDate: String(rule.nextDate).slice(0, 32),
        active: Boolean(rule.active),
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
  const safeId = sanitizeFirestoreId(ruleId, 'rec');
  const path = `users/${userId}/recurring/${safeId}`;
  try {
    const docRef = doc(db, 'users', userId, 'recurring', safeId);
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
        currencySymbol: String(settings.currency.symbol).slice(0, 16),
        currencyCode: String(settings.currency.code).slice(0, 16),
        currencyName: String(settings.currency.name || '').slice(0, 64),
        targetSavingsRate: Math.min(100, Math.max(0, Number(settings.targetSavingsRate))),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Bulk upload data into Firestore for an authenticated user (used for sample dataset or JSON restore).
 * Propagates errors to caller rather than failing silently.
 */
export async function syncLocalDataToFirestore(
  userId: string,
  transactionsToSync: Transaction[],
  budgetsToSync: Budget[],
  goalsToSync: SavingsGoal[],
  recurringToSync: RecurringRule[],
  settingsToSync?: UserSettings
): Promise<void> {
  const nowIso = new Date().toISOString();
  const operations: ((batch: ReturnType<typeof writeBatch>) => void)[] = [];

  for (const tx of transactionsToSync) {
    const safeId = sanitizeFirestoreId(tx.id, 'tx');
    const docRef = doc(db, 'users', userId, 'transactions', safeId);
    operations.push((batch) =>
      batch.set(
        docRef,
        {
          id: safeId,
          userId,
          date: String(tx.date).slice(0, 32),
          description: String(tx.description).trim().slice(0, 256),
          category: String(tx.category || 'Other').trim().slice(0, 64),
          type: tx.type === 'Income' ? 'Income' : 'Expense',
          amount: Number(tx.amount),
          notes: String(tx.notes || '').slice(0, 1000),
          updatedAt: nowIso,
        },
        { merge: true }
      )
    );
  }

  for (const b of budgetsToSync) {
    const cleanId = getBudgetDocId(b.category);
    const docRef = doc(db, 'users', userId, 'budgets', cleanId);
    operations.push((batch) =>
      batch.set(
        docRef,
        {
          id: cleanId,
          userId,
          category: b.category.trim().slice(0, 64),
          monthlyLimit: Number(b.monthlyLimit),
          updatedAt: nowIso,
        },
        { merge: true }
      )
    );
  }

  for (const g of goalsToSync) {
    const safeId = sanitizeFirestoreId(g.id, 'goal');
    const docRef = doc(db, 'users', userId, 'goals', safeId);
    operations.push((batch) =>
      batch.set(
        docRef,
        {
          id: safeId,
          userId,
          name: String(g.name).trim().slice(0, 128),
          targetAmount: Number(g.targetAmount),
          savedAmount: Number(g.savedAmount),
          targetDate: String(g.targetDate || '').slice(0, 32),
          notes: String(g.notes || '').slice(0, 1000),
          updatedAt: nowIso,
        },
        { merge: true }
      )
    );
  }

  for (const r of recurringToSync) {
    const safeId = sanitizeFirestoreId(r.id, 'rec');
    const docRef = doc(db, 'users', userId, 'recurring', safeId);
    operations.push((batch) =>
      batch.set(
        docRef,
        {
          id: safeId,
          userId,
          description: String(r.description).trim().slice(0, 256),
          category: String(r.category || 'Other').trim().slice(0, 64),
          type: r.type === 'Income' ? 'Income' : 'Expense',
          amount: Number(r.amount),
          frequency: r.frequency,
          nextDate: String(r.nextDate).slice(0, 32),
          active: Boolean(r.active),
          updatedAt: nowIso,
        },
        { merge: true }
      )
    );
  }

  if (settingsToSync) {
    const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
    operations.push((batch) =>
      batch.set(
        settingsRef,
        {
          userId,
          currencySymbol: String(settingsToSync.currency.symbol).slice(0, 16),
          currencyCode: String(settingsToSync.currency.code).slice(0, 16),
          currencyName: String(settingsToSync.currency.name || '').slice(0, 64),
          targetSavingsRate: Math.min(100, Math.max(0, Number(settingsToSync.targetSavingsRate))),
          updatedAt: nowIso,
        },
        { merge: true }
      )
    );
  }

  // Firestore writeBatch supports up to 500 writes per batch
  const CHUNK_SIZE = 400;
  try {
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      const slice = operations.slice(i, i + CHUNK_SIZE);
      for (const applyOp of slice) {
        applyOp(batch);
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * Deletes all financial subcollection documents for the authenticated user.
 */
export async function wipeUserCloudData(userId: string): Promise<void> {
  const subcollections = ['transactions', 'budgets', 'goals', 'recurring'] as const;
  const refsToDelete: ReturnType<typeof doc>[] = [];

  try {
    for (const sub of subcollections) {
      const snap = await getDocs(collection(db, 'users', userId, sub));
      snap.forEach((d) => refsToDelete.push(d.ref));
    }

    const CHUNK_SIZE = 400;
    for (let i = 0; i < refsToDelete.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      for (const ref of refsToDelete.slice(i, i + CHUNK_SIZE)) {
        batch.delete(ref);
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
  }
}
