import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EMOJI_PICKER_OPTIONS } from '@/types/mixer';
import { useState } from 'react';

interface EmojiPickerProps {
  currentEmoji: string;
  onSelect: (emoji: string) => void;
  children: React.ReactNode;
}

export function EmojiPicker({ currentEmoji, onSelect, children }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="grid grid-cols-6 gap-1">
          {EMOJI_PICKER_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onSelect(emoji); setOpen(false); }}
              className={`text-lg p-1.5 rounded hover:bg-secondary transition-colors ${emoji === currentEmoji ? 'bg-primary/20 ring-1 ring-primary' : ''}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
