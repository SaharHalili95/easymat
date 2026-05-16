'use client';
import { useState, useRef } from 'react';

interface Props {
  onSend: (text: string, imageBase64?: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !image) return;
    onSend(text, image ?? undefined);
    setText('');
    setImage(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t bg-white">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImage}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="px-3 py-2 rounded-lg border text-gray-600 hover:bg-gray-50"
        title="העלה תמונה"
      >
        📷
      </button>
      {image && (
        <span className="self-center text-xs text-green-600 font-medium">תמונה מצורפת ✓</span>
      )}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="שאל שאלת מתמטיקה... / Ask a math question..."
        className="flex-1 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
        dir="auto"
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || (!text.trim() && !image)}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        שלח
      </button>
    </form>
  );
}
