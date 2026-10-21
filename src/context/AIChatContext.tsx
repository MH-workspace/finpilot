import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { generateAdvancedFinancialAdvice } from '../utils/financialIntelligence';

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
  const storageKey = `finpilot_ai_copilot_v5_${user ? user.uid : 'guest'}`;

  const createInitialWelcome = (name: string, monthLabel = 'this month', txCount = 0): AIMessage => {
    const greeting = name ? `Welcome back, ${name}!` : 'Welcome to FinPilot AI Copilot!';
    return {
      id: 'welcome',
      sender: 'assistant',
      text: `${greeting} I am your specialized Financial Intelligence Copilot.

I am actively connected with your financial records for **${monthLabel}** (${txCount > 0 ? `${txCount} transactions recorded` : 'ready for new entries'}). 

You can ask me to:
- 📊 **Analyze Cashflow & Spending:** Inspect inflow, outflow, and net cashflow
- 🎯 **50/30/20 Budget Blueprint:** Balance your Needs, Wants, and Savings targets
- ⚠️ **Audit Overspending:** Check budget category limits and leakages
- 🔄 **Subscription & Bill Check:** Audit recurring monthly fixed costs
- 💡 **Accelerate Goals:** Calculate exact monthly contributions to hit targets on time

What would you like to review today?`,
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
      const key = `finpilot_ai_copilot_v5_${user ? user.uid : 'guest'}`;
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
      const key = `finpilot_ai_copilot_v5_${user ? user.uid : 'guest'}`;
      localStorage.setItem(key, JSON.stringify(messages));
    } catch {
      // ignore quota
    }
  }, [messages, user]);

  const setWelcomeIfNeeded = useCallback((name: string, monthLabel: string, txCount: number) => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        const greeting = name ? `Welcome back, ${name}!` : 'Welcome to FinPilot AI Copilot!';
        return [
          {
            id: 'welcome',
            sender: 'assistant',
            text: `${greeting} I am your specialized Financial Intelligence Copilot.

I am actively connected with your financial records for **${monthLabel}** (${txCount > 0 ? `${txCount} transactions recorded` : 'ready for new entries'}).

You can ask me to:
- 📊 **Analyze Cashflow & Spending:** Inspect inflow, outflow, and net cashflow
- 🎯 **50/30/20 Budget Blueprint:** Balance your Needs, Wants, and Savings targets
- ⚠️ **Audit Overspending:** Check budget category limits and leakages
- 🔄 **Subscription & Bill Check:** Audit recurring monthly fixed costs
- 💡 **Accelerate Goals:** Calculate exact monthly contributions to hit targets on time

What would you like to review today?`,
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
      const key = `finpilot_ai_copilot_v5_${userRef.current ? userRef.current.uid : 'guest'}`;
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
        const timeoutId = setTimeout(() => controller.abort(), 30000);

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
          // Instant deep financial reasoning fallback
          replyText = generateAdvancedFinancialAdvice(financialSnapshot, trimmed, userName);
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
        // High quality fallback on timeout or offline
        const replyText = generateAdvancedFinancialAdvice(financialSnapshot, trimmed, userName);
        const fallbackMsg: AIMessage = {
          id: `bot_${Date.now()}`,
          sender: 'assistant',
          text: replyText,
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
