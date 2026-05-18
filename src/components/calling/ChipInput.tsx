import { useState, useRef } from 'react';

interface ChipInputProps {
  chips: { text: string }[];
  onAdd: (text: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
  accentColor?: string;
  maxChips?: number;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function ChipInput({
  chips,
  onAdd,
  onRemove,
  placeholder = 'Typ en druk Enter...',
  accentColor = 'bg-[#F8F3EB] text-[#0F1419] border-[#DDD5C5]',
  maxChips = 10,
  inputRef: externalRef,
}: ChipInputProps) {
  const [value, setValue] = useState('');
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = externalRef || internalRef;

  const handleAdd = () => {
    if (value.trim() && chips.length < maxChips) {
      onAdd(value);
      setValue('');
      (ref as React.RefObject<HTMLInputElement>).current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      <div className="flex gap-0">
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 border border-[#DDD5C5] border-r-0 bg-[#F8F3EB] px-2 py-[6px] font-body text-[11.5px] text-[#0F1419] focus:outline-none focus:border-[#008CFF] focus:bg-white"
        />
        <button type="button" onClick={handleAdd}
          className="bg-[#008CFF] text-white border-none w-[28px] font-dm font-bold text-[14px] cursor-pointer hover:bg-[#0070CC]">
          +
        </button>
      </div>
      {chips.length > 0 && (
        <div className="mt-[6px] flex flex-wrap gap-1">
          {chips.map((chip, i) => (
            <span key={i} className={`inline-flex items-center gap-[5px] px-[7px] py-[3px] text-[10.5px] font-body italic border leading-[1.2] ${accentColor}`}>
              "{chip.text}"
              <button type="button" onClick={() => onRemove(i)} className="text-[#5B6470] cursor-pointer not-italic font-semibold text-[10px] hover:opacity-70">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
