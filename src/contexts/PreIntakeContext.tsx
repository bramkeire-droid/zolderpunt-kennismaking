import React, { createContext, useContext, useState, useCallback } from 'react';
import type { PreIntakeData, EmotionalKeyword, FomuConcern, ImpressionTag, QuestionKey, ScenarioType } from '@/types/preIntake';
import { defaultPreIntake, defaultQuestionsRaised } from '@/types/preIntake';

interface PreIntakeContextType {
  data: PreIntakeData;
  setData: React.Dispatch<React.SetStateAction<PreIntakeData>>;
  update: (partial: Partial<PreIntakeData>) => void;
  addEmotionalKeyword: (text: string) => void;
  removeEmotionalKeyword: (index: number) => void;
  addFomuConcern: (text: string) => void;
  removeFomuConcern: (index: number) => void;
  toggleQuestion: (key: QuestionKey) => void;
  updateQuestionNote: (key: QuestionKey, note: string) => void;
  toggleImpressionTag: (tag: ImpressionTag) => void;
  resetPreIntake: (leadId?: string) => void;
  loadPreIntake: (preIntake: PreIntakeData) => void;
}

const PreIntakeContext = createContext<PreIntakeContextType | null>(null);

export function PreIntakeProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PreIntakeData>({ ...defaultPreIntake });

  const update = useCallback((partial: Partial<PreIntakeData>) => {
    setData(prev => ({ ...prev, ...partial }));
  }, []);

  const addEmotionalKeyword = useCallback((text: string) => {
    if (!text.trim()) return;
    setData(prev => ({
      ...prev,
      emotional_keywords: [
        ...prev.emotional_keywords,
        { text: text.trim(), added_at: new Date().toISOString() },
      ],
    }));
  }, []);

  const removeEmotionalKeyword = useCallback((index: number) => {
    setData(prev => ({
      ...prev,
      emotional_keywords: prev.emotional_keywords.filter((_, i) => i !== index),
    }));
  }, []);

  const addFomuConcern = useCallback((text: string) => {
    if (!text.trim()) return;
    setData(prev => ({
      ...prev,
      fomu_concerns: [
        ...prev.fomu_concerns,
        { text: text.trim(), added_at: new Date().toISOString() },
      ],
    }));
  }, []);

  const removeFomuConcern = useCallback((index: number) => {
    setData(prev => ({
      ...prev,
      fomu_concerns: prev.fomu_concerns.filter((_, i) => i !== index),
    }));
  }, []);

  const toggleQuestion = useCallback((key: QuestionKey) => {
    setData(prev => ({
      ...prev,
      questions_raised: {
        ...prev.questions_raised,
        [key]: {
          ...prev.questions_raised[key],
          raised: !prev.questions_raised[key].raised,
        },
      },
    }));
  }, []);

  const updateQuestionNote = useCallback((key: QuestionKey, note: string) => {
    setData(prev => ({
      ...prev,
      questions_raised: {
        ...prev.questions_raised,
        [key]: { ...prev.questions_raised[key], note },
      },
    }));
  }, []);

  const toggleImpressionTag = useCallback((tag: ImpressionTag) => {
    setData(prev => ({
      ...prev,
      impression_tags: prev.impression_tags.includes(tag)
        ? prev.impression_tags.filter(t => t !== tag)
        : [...prev.impression_tags, tag],
    }));
  }, []);

  const resetPreIntake = useCallback((leadId?: string) => {
    setData({
      ...defaultPreIntake,
      lead_id: leadId,
      questions_raised: { ...defaultQuestionsRaised },
    });
  }, []);

  const loadPreIntake = useCallback((preIntake: PreIntakeData) => {
    const merged: PreIntakeData = {
      ...defaultPreIntake,
      ...preIntake,
      wat_tags: Array.isArray((preIntake as any).wat_tags) ? (preIntake as any).wat_tags : [],
      waarom_nu_timing: (preIntake as any).waarom_nu_timing ?? '',
      videocall_planned: !!(preIntake as any).videocall_planned,
      plaatsbezoek_planned: !!(preIntake as any).plaatsbezoek_planned,
      box_notes: {
        wat: [], aannemer: [], waarom: [], budget: [],
        ...((preIntake as any).box_notes || {}),
      },
      questions_raised: { ...defaultQuestionsRaised, ...(preIntake.questions_raised || {}) },
    };
    setData(merged);
  }, []);


  return (
    <PreIntakeContext.Provider value={{
      data, setData, update,
      addEmotionalKeyword, removeEmotionalKeyword,
      addFomuConcern, removeFomuConcern,
      toggleQuestion, updateQuestionNote,
      toggleImpressionTag,
      resetPreIntake, loadPreIntake,
    }}>
      {children}
    </PreIntakeContext.Provider>
  );
}

export function usePreIntake() {
  const ctx = useContext(PreIntakeContext);
  if (!ctx) throw new Error('usePreIntake must be used within PreIntakeProvider');
  return ctx;
}
