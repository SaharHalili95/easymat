'use client';
import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { UnitSelector } from '@/components/UnitSelector';

interface BagrutQuestion {
  text: string;
  year: string;
  moed: string;
  shalon: string;
  source: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  bagrutQuestion?: BagrutQuestion;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unitLevel, setUnitLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string, imageBase64?: string) => {
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(({ role, content }) => ({ role, content })),
          unitLevel,
          imageBase64,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      if (!res.body) throw new Error('No response body');

      let bagrutQuestion: BagrutQuestion | undefined;
      const bqHeader = res.headers.get('X-Bagrut-Question');
      if (bqHeader) {
        try { bagrutQuestion = JSON.parse(decodeURIComponent(bqHeader)); } catch {}
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '', bagrutQuestion }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { id: assistantId, role: 'assistant', content: assistantText },
        ]);
      }
    } catch {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        const base =
          last?.role === 'assistant' && last.content === '' ? prev.slice(0, -1) : prev;
        return [...base, { id: crypto.randomUUID(), role: 'assistant', content: 'שגיאה בחיבור לשרת. נסה שנית.' }];
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto shadow-lg">
      <header className="p-4 border-b text-center bg-white">
        <h1 className="text-xl font-bold text-blue-700">בגרות מאסטר</h1>
        <p className="text-xs text-gray-500 mt-0.5">מורה מתמטיקה לבגרות | 3, 4, 5 יחידות</p>
      </header>

      <UnitSelector value={unitLevel} onChange={setUnitLevel} />

      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 mt-20 text-sm">
            שאל שאלת מתמטיקה ואענה לך צעד אחר צעד
          </p>
        )}
        {messages.map((m) => (
          <ChatMessage key={m.id} role={m.role} content={m.content} bagrutQuestion={m.bagrutQuestion} />
        ))}
        {loading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="text-center text-gray-400 text-sm">חושב...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
