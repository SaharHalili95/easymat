'use client';

interface Props {
  value: number | null;
  onChange: (unit: number | null) => void;
}

export function UnitSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 p-3 justify-center border-b bg-gray-50">
      <span className="text-sm text-gray-500 self-center">רמת יחידות:</span>
      {[3, 4, 5].map((u) => (
        <button
          key={u}
          onClick={() => onChange(value === u ? null : u)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            value === u
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}
        >
          {u} יחידות
        </button>
      ))}
    </div>
  );
}
