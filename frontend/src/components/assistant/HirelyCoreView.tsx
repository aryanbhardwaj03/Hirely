import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { askHirelyCore, ChatMessage } from '../../services/geminiCore';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Opportunity } from '../../types/opportunity';
import {
  Bot,
  Send,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  BrainCircuit,
  ArrowUpRight,
  ChevronDown,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HirelyCoreViewProps {
  embedded?: boolean;
  onClose?: () => void;
}

export const HirelyCoreView: React.FC<HirelyCoreViewProps> = ({ embedded = false, onClose }) => {
  const {
    profile,
    opportunities,
    selectedOpportunity,
    setSelectedOpportunity,
    currentUser,
    chatMessages,
    setChatMessages,
    resetChatMessages
  } = useApp();

  const messages = chatMessages;
  const setMessages = setChatMessages;

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextOpp, setContextOpp] = useState<Opportunity | null>(selectedOpportunity || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (selectedOpportunity) {
      setContextOpp(selectedOpportunity);
    }
  }, [selectedOpportunity]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || isLoading) return;

    setErrorNotice(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputText('');
    setIsLoading(true);

    try {
      const historyPayload = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await askHirelyCore({
        messages: historyPayload,
        userProfile: profile,
        userId: currentUser?.uid || profile.email || 1,
        opportunities,
        selectedOpportunity: contextOpp,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: response.modelUsed,
        isFallback: response.isFallback,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setErrorNotice(err.message || 'Unable to connect to Hirely Core. Please retry.');
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    resetChatMessages();
  };

  const quickPrompts = [
    { label: 'Analyze top Delhi/NCR matches', query: 'Analyze my top matching opportunities in Delhi/NCR and explain why I fit them.' },
    { label: 'Skills gap roadmap', query: 'Identify my top 3 missing skills across all current listings and provide a 2-week learning roadmap.' },
    { label: 'DeepMind application tips', query: 'What specific projects and coursework should I highlight for the Google DeepMind AI Systems internship?' },
    { label: 'Deadlines & stipend summary', query: 'List all opportunities sorted by earliest deadline, including stipend and verified location.' },
  ];

  return (
    <div className={`flex flex-col h-full bg-[#0F0F0F] text-[#F8F8F8] ${embedded ? 'p-0' : 'p-4 sm:p-6 rounded-2xl border border-white/[0.08] shadow-2xl'}`}>
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#122A14] to-[#0A150C] border border-[#5DD62C]/60 flex items-center justify-center shadow-[0_0_18px_rgba(93,214,44,0.25)]">
            <Bot className="w-5 h-5 text-[#5DD62C]" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#5DD62C] shadow-[0_0_8px_#5DD62C]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                Hirely Core <span className="text-[#5DD62C] font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-[#5DD62C]/10 border border-[#5DD62C]/30">AI</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-300 hidden sm:inline">
                · Gemini Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Personalized career guidance grounded in verified TinyFish live web discoveries
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Active Opportunity Context Selector */}
          <div className="relative">
            <select
              value={contextOpp?.id || ''}
              onChange={(e) => {
                const found = opportunities.find((o) => o.id === e.target.value) || null;
                setContextOpp(found);
              }}
              className="appearance-none bg-[#202020] border border-white/[0.12] hover:border-[#5DD62C]/40 text-xs text-slate-200 py-1.5 pl-3 pr-8 rounded-xl focus:outline-none cursor-pointer transition-colors max-w-[200px] truncate"
              title="Active Opportunity Focus"
            >
              <option value="">Context: All Live Feed ({opportunities.length})</option>
              {opportunities.map((opp) => (
                <option key={opp.id} value={opp.id}>
                  {opp.organization} — {opp.title.slice(0, 24)}...
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleResetChat}
            className="p-2 rounded-xl bg-[#202020] border border-white/[0.1] text-slate-300 hover:text-white hover:border-white/20 transition-all cursor-pointer"
            title="Reset Conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 min-h-[350px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 sm:p-5 transition-all ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-[#202020] to-[#262626] border border-white/[0.12] text-white shadow-md'
                  : 'bg-[#202020]/90 border border-white/[0.1] shadow-[0_0_25px_rgba(0,0,0,0.6)] backdrop-blur-xl'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-white/[0.06] text-[11px] font-mono text-slate-300">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  {msg.role === 'user' ? (
                    'You'
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#5DD62C]" />
                      <span className="text-[#5DD62C]">Hirely Core</span>
                      {msg.modelUsed && (
                        <span className="text-[10px] text-slate-300 px-1 rounded bg-white/[0.06]">
                          {msg.modelUsed}
                        </span>
                      )}
                    </>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span>{msg.timestamp}</span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="p-1 rounded hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-[#5DD62C]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Message Content: Rendered via MarkdownRenderer (No Raw ### or **) */}
              <div className="text-xs sm:text-sm">
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <MarkdownRenderer content={msg.content} />
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start">
            <div className="bg-[#202020] border border-white/[0.12] rounded-2xl p-4 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-[#5DD62C] border-t-transparent rounded-full animate-spin" />
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <span className="w-2 h-2 rounded-full bg-[#5DD62C] animate-ping" />
                <span>Hirely Core synthesizing live opportunity telemetry...</span>
              </div>
            </div>
          </div>
        )}

        {errorNotice && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorNotice}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestion Pills */}
      <div className="pt-2 pb-3 flex flex-wrap gap-1.5 sm:gap-2">
        {quickPrompts.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(item.query)}
            disabled={isLoading}
            className="text-[11px] font-mono px-2.5 py-1 rounded-xl bg-[#202020] hover:bg-white/[0.08] border border-white/[0.1] hover:border-[#5DD62C]/40 text-slate-300 hover:text-white transition-all cursor-pointer whitespace-nowrap disabled:opacity-40"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Input Composer */}
      <div className="relative pt-2">
        <div className="relative flex items-center rounded-2xl bg-[#202020] border border-white/[0.14] focus-within:border-[#5DD62C]/60 focus-within:shadow-[0_0_20px_rgba(93,214,44,0.15)] transition-all">
          <textarea
            ref={inputRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Hirely Core about any opportunity, skill match, or paste a job description..."
            className="w-full bg-transparent p-3.5 pr-14 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none resize-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            className="absolute right-3 p-2.5 rounded-xl bg-[#F8F8F8] text-[#0F0F0F] hover:bg-[#5DD62C] hover:shadow-[0_0_15px_rgba(93,214,44,0.4)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-bold"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 mt-1 px-1">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>Powered by Gemini 3.8 Flash & TinyFish</span>
        </div>
      </div>
    </div>
  );
};
