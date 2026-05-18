import { useEffect, useRef } from 'react';
import type { QuestionKey } from '@/types/preIntake';

const QUESTION_KEYS: QuestionKey[] = [
  'budget', 'start_timing', 'duration', 'daily_impact',
  'overlast', 'feasibility_idea', 'attic_condition', 'company_approach',
];

interface HotkeyHandlers {
  onFocusCitaat: () => void;
  onFocusFomu: () => void;
  onToggleQuestion: (key: QuestionKey) => void;
  onOpenNote: () => void;
  onToggleTimer: () => void;
  onCloseAll: () => void;
}

export function useCallingHotkeys(handlers: HotkeyHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target;
      const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;

      // Space toggles timer even in inputs (but not in textareas)
      if (e.key === ' ' && !isInput) {
        e.preventDefault();
        handlersRef.current.onToggleTimer();
        return;
      }

      // Esc always works
      if (e.key === 'Escape') {
        handlersRef.current.onCloseAll();
        return;
      }

      // All other hotkeys only fire when not in an input
      if (isInput) return;

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handlersRef.current.onFocusCitaat();
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handlersRef.current.onFocusFomu();
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handlersRef.current.onOpenNote();
        return;
      }

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 8) {
        e.preventDefault();
        handlersRef.current.onToggleQuestion(QUESTION_KEYS[num - 1]);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
