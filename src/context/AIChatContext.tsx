import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

export interface AIMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface AIChatContextType {
  messages: AIMessage[];
  isLoading: boolean;
  activePrompt: string | null;
  hasUnreadReply: boolean;
  sendMessage: (prompt: string, financialSnapshot: any, userName: string) => Promise<void>;
  clearChat: () => void;
  markChatAsRead: () => void;
  setWelcomeIfNeeded: (name: string, monthLabel: string, txCount: number) => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

export const AIChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const storageKey = `finpilot_ai_copilot_v4_${user ? user.uid : 'guest'}`;

  const createInitialWelcome = (name: string, monthLabel = 'this month'): AIMessage => {
    const greeting = name ? `Hello ${name}!` : 'Hello!';
    return {
      id: 'welcome',
      sender: 'assistant',
      text: `${greeting} I am your FinPilot Financial Copilot powered by Gemini.\n\nI am actively connected with your financial records for **${monthLabel}**. You can ask me to summarize cashflow, find spending leaks, create a 50/30/20 budget recommendation, audit recurring bills, or evaluate your savings goals.\n\nHow can I help you optimize your money today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  // Load initial messages from localStorage
  const [messages, setMessages] = useState<AIMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [createInitialWelcome('')];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [hasUnreadReply, setHasUnreadReply] = useState(false);
  const userRef = useRef(user);
  userRef.current = user;

  // Reload history when user changes (e.g. login / logout)
  useEffect(() => {
    try {
      const key = `finpilot_ai_copilot_v4_${user ? user.uid : 'guest'}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
      // If no saved history for this user, provide fresh welcome
      const displayName = user?.displayName || user?.email?.split('@')[0] || '';
      setMessages([createInitialWelcome(displayName)]);
    } catch {
      // ignore
    }
  }, [user?.uid]);

  // Save messages whenever they change
  useEffect(() => {
    try {
      const key = `finpilot_ai_copilot_v4_${user ? user.uid : 'guest'}`;
      localStorage.setItem(key, JSON.stringify(messages));
    } catch {
      // ignore quota
    }
  }, [messages, user]);

  const setWelcomeIfNeeded = useCallback((name: string, monthLabel: string, txCount: number) => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        const greeting = name ? `Hello ${name}!` : 'Hello!';
        return [
          {
            id: 'welcome',
            sender: 'assistant',
            text: `${greeting} I am your FinPilot Financial Copilot powered by Gemini.\n\nI am actively connected with your financial records for **${monthLabel}** (${txCount} transactions recorded). Ask me anything about your spending, or select a quick topic below.`,
            timestamp: prev[0].timestamp,
          },
        ];
      }
      return prev;
    });
  }, []);

  const clearChat = useCallback(() => {
    const displayName = userRef.current?.displayName || userRef.current?.email?.split('@')[0] || '';
    const initial = [createInitialWelcome(displayName)];
    setMessages(initial);
    try {
      const key = `finpilot_ai_copilot_v4_${userRef.current ? userRef.current.uid : 'guest'}`;
      localStorage.setItem(key, JSON.stringify(initial));
    } catch {}
    setHasUnreadReply(false);
  }, []);

  const markChatAsRead = useCallback(() => {
    setHasUnreadReply(false);
  }, []);

  const sendMessage = useCallback(
    async (prompt: string, financialSnapshot: any, userName: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || isLoading) return;

      const userMsg: AIMessage = {
        id: `user_${Date.now()}`,
        sender: 'user',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setActivePrompt(trimmed);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const res = await fetch('/api/ai/advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: trimmed,
            context: financialSnapshot,
            userName: userName || undefined,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        let replyText = '';
        if (res.ok) {
          const data = await res.json();
          replyText = data.reply;
        }

        if (!replyText) {
          // Instant fallback calculation
          const greeting = userName ? `Hello ${userName}!` : 'Hello!';
          const net = Number(financialSnapshot?.net || 0);
          const symbol = financialSnapshot?.currencySymbol || '₹';
          replyText = `${greeting}\n\nHere is your financial status for **${financialSnapshot?.selectedMonth || 'this month'}**:\n` +
            `- **Income:** ${symbol}${Number(financialSnapshot?.income || 0).toLocaleString()}\n` +
            `- **Expenses:** ${symbol}${Number(financialSnapshot?.expenses || 0).toLocaleString()}\n` +
            `- **Net Cash Flow:** ${net >= 0 ? '+' : ''}${symbol}${net.toLocaleString()}\n` +
            `- **Savings Rate:** ${financialSnapshot?.savingsRatePercentage || '0'}%\n\n` +
            `${net >= 0 ? `✅ You are running a surplus of ${symbol}${net.toLocaleString()}.` : `⚠️ Expenses exceed income by ${symbol}${Math.abs(net).toLocaleString()}.`}`;
        }

        const botMsg: AIMessage = {
          id: `bot_${Date.now()}`,
          sender: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, botMsg]);
        setHasUnreadReply(true);
      } catch (err: any) {
        const greeting = userName ? `Hello ${userName}!` : 'Hello!';
        const net = Number(financialSnapshot?.net || 0);
        const symbol = financialSnapshot?.currencySymbol || '₹';
        const fallbackMsg: AIMessage = {
          id: `bot_${Date.now()}`,
          sender: 'assistant',
          text: `${greeting}\n\nHere is an instant breakdown based on your records for **${financialSnapshot?.selectedMonth || 'this month'}**:\n` +
            `- **Income:** ${symbol}${Number(financialSnapshot?.income || 0).toLocaleString()}\n` +
            `- **Expenses:** ${symbol}${Number(financialSnapshot?.expenses || 0).toLocaleString()}\n` +
            `- **Net Cash Flow:** ${net >= 0 ? '+' : ''}${symbol}${net.toLocaleString()}\n` +
            `- **Savings Rate:** ${financialSnapshot?.savingsRatePercentage || '0'}%\n\n` +
            `*(Instant calculations from your local ledger)*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        setHasUnreadReply(true);
      } finally {
        setIsLoading(false);
        setActivePrompt(null);
      }
    },
    [isLoading]
  );

  return (
    <AIChatContext.Provider
      value={{
        messages,
        isLoading,
        activePrompt,
        hasUnreadReply,
        sendMessage,
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
