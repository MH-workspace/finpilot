import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { FinancialSnapshot } from '../utils/financialIntelligence';

export interface AIMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface FailedAIRequest {
  prompt: string;
  financialSnapshot: FinancialSnapshot;
  userName: string;
}

interface AIChatContextType {
  messages: AIMessage[];
  isLoading: boolean;
  error: string | null;
  canRetry: boolean;
  activePrompt: string | null;
  hasUnreadReply: boolean;
  sendMessage: (
    prompt: string,
    financialSnapshot: FinancialSnapshot,
    userName: string
  ) => Promise<void>;
  retryLastMessage: (
    latestSnapshot?: FinancialSnapshot,
    latestUserName?: string
  ) => Promise<void>;
  dismissError: () => void;
  clearChat: () => void;
  markChatAsRead: () => void;
  setWelcomeIfNeeded: (name: string, monthLabel: string, txCount: number) => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

function getChatStorageKey(uid: string | null | undefined): string {
  return `finpilot_ai_copilot_v6_${uid ? uid : 'guest'}`;
}

function createInitialWelcome(name: string, monthLabel = 'this month', txCount = 0): AIMessage {
  const userBadge = name ? ` • Portfolio: ${name}` : '';
  return {
    id: 'welcome',
    sender: 'assistant',
    text: `### 📊 FinPilot Financial Intelligence Terminal${userBadge}
Active ledger connection established for **${monthLabel}** (${
      txCount > 0 ? `${txCount} transactions loaded` : 'ready for ledger data'
    }).

**Ask natural-language questions about your finances, such as:**
- ⚖️ **Income & Spending:** Explain my income, expenses, and 50/30/20 allocation
- ⚠️ **Spending Patterns & Anomalies:** Identify unusual expenses or over-budget categories
- 🔄 **Recurring Commitments:** Audit my monthly bills and active subscriptions
- 💡 **Savings & Budgeting:** Suggest practical ways to reach my savings goals faster

Select a topic chip above or type any question below.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export const AIChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUid = user?.uid ?? null;

  const [messages, setMessages] = useState<AIMessage[]>(() => [createInitialWelcome('')]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedRequest, setFailedRequest] = useState<FailedAIRequest | null>(null);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [hasUnreadReply, setHasUnreadReply] = useState(false);

  const inFlightRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const userRef = useRef(user);
  userRef.current = user;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Synchronize isolated chat history whenever authentication state settles or UID changes
  useEffect(() => {
    if (authLoading) return;

    // Abort any in-flight request belonging to previous auth session
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    inFlightRef.current = false;
    setIsLoading(false);
    setError(null);
    setFailedRequest(null);
    setActivePrompt(null);
    setHasUnreadReply(false);

    try {
      const key = getChatStorageKey(currentUid);
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      // Ignore storage parse errors
    }

    const displayName = user?.displayName || user?.email?.split('@')[0] || '';
    setMessages([createInitialWelcome(displayName)]);
  }, [currentUid, authLoading]);

  // Persist isolated chat thread per UID
  useEffect(() => {
    if (authLoading) return;
    try {
      const key = getChatStorageKey(currentUid);
      localStorage.setItem(key, JSON.stringify(messages));
    } catch {
      // Ignore storage quota limits
    }
  }, [messages, currentUid, authLoading]);

  const setWelcomeIfNeeded = useCallback((name: string, monthLabel: string, txCount: number) => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        const updated = createInitialWelcome(name, monthLabel, txCount);
        updated.timestamp = prev[0].timestamp;
        return [updated];
      }
      return prev;
    });
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const clearChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    inFlightRef.current = false;
    setIsLoading(false);
    setError(null);
    setFailedRequest(null);
    setActivePrompt(null);
    setHasUnreadReply(false);

    const displayName = userRef.current?.displayName || userRef.current?.email?.split('@')[0] || '';
    const initial = [createInitialWelcome(displayName)];
    setMessages(initial);
    try {
      const key = getChatStorageKey(userRef.current?.uid);
      localStorage.setItem(key, JSON.stringify(initial));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const markChatAsRead = useCallback(() => {
    setHasUnreadReply(false);
  }, []);

  const executeRequest = useCallback(
    async (
      trimmedPrompt: string,
      financialSnapshot: FinancialSnapshot,
      userName: string,
      appendUserBubble: boolean
    ) => {
      if (!trimmedPrompt || inFlightRef.current) return;

      const requestSessionUid = userRef.current?.uid ?? null;
      inFlightRef.current = true;
      setError(null);
      setFailedRequest(null);
      setIsLoading(true);
      setActivePrompt(trimmedPrompt);

      // Capture conversation history prior to this prompt (excluding welcome card)
      const nonWelcome = messagesRef.current.filter((m) => m.id !== 'welcome');
      const baseHistory = appendUserBubble ? nonWelcome : nonWelcome.slice(0, -1);
      const priorHistory = baseHistory.slice(-10).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      if (appendUserBubble) {
        const userMsg: AIMessage = {
          id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          sender: 'user',
          text: trimmedPrompt,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, userMsg]);
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      let didTimeout = false;
      const timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, 30000);

      try {
        const res = await fetch('/api/ai/advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: trimmedPrompt,
            context: financialSnapshot,
            history: priorHistory,
            userName: userName || undefined,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Ensure user session did not switch while awaiting response
        if ((userRef.current?.uid ?? null) !== requestSessionUid) {
          return;
        }

        let payload: { reply?: string; error?: string } = {};
        try {
          payload = await res.json();
        } catch {
          throw new Error('Received an invalid response from the AI server. Please try again.');
        }

        if (!res.ok) {
          throw new Error(
            payload.error || `AI Assistant request failed (status ${res.status}). Please retry.`
          );
        }

        const replyText = typeof payload.reply === 'string' ? payload.reply.trim() : '';
        if (!replyText) {
          throw new Error('The AI Assistant returned an empty answer. Please retry.');
        }

        const botMsg: AIMessage = {
          id: `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          sender: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, botMsg]);
        setHasUnreadReply(true);
      } catch (err: any) {
        clearTimeout(timeoutId);

        // Ignore deliberate aborts triggered by Clear Chat or user logout
        if (err?.name === 'AbortError' && !didTimeout) {
          return;
        }

        if ((userRef.current?.uid ?? null) !== requestSessionUid) {
          return;
        }

        let readableError = 'Unable to get a response from FinPilot AI. Please try again.';
        if (didTimeout || err?.name === 'AbortError') {
          readableError =
            'The AI request timed out after 30 seconds. Check your connection and click Retry.';
        } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
          readableError =
            'You appear to be offline. Reconnect to the internet and click Retry.';
        } else if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
          readableError =
            'Network connection interrupted while contacting FinPilot AI. Click Retry to resend.';
        } else if (err?.message) {
          readableError = err.message;
        }

        setError(readableError);
        setFailedRequest({
          prompt: trimmedPrompt,
          financialSnapshot,
          userName,
        });
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        inFlightRef.current = false;
        setIsLoading(false);
        setActivePrompt(null);
      }
    },
    []
  );

  const sendMessage = useCallback(
    async (prompt: string, financialSnapshot: FinancialSnapshot, userName: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || inFlightRef.current) return;
      await executeRequest(trimmed, financialSnapshot, userName, true);
    },
    [executeRequest]
  );

  const retryLastMessage = useCallback(
    async (latestSnapshot?: FinancialSnapshot, latestUserName?: string) => {
      if (!failedRequest || inFlightRef.current) return;
      await executeRequest(
        failedRequest.prompt,
        latestSnapshot || failedRequest.financialSnapshot,
        latestUserName !== undefined ? latestUserName : failedRequest.userName,
        false
      );
    },
    [failedRequest, executeRequest]
  );

  return (
    <AIChatContext.Provider
      value={{
        messages,
        isLoading,
        error,
        canRetry: Boolean(failedRequest),
        activePrompt,
        hasUnreadReply,
        sendMessage,
        retryLastMessage,
        dismissError,
        clearChat,
        markChatAsRead,
        setWelcomeIfNeeded,
      }}
    >
      {children}
    </AIChatContext.Provider>
  );
};

export const useAIChat = () => {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error('useAIChat must be used within an AIChatProvider');
  }
  return context;
};
