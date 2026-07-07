export interface EmotionalKeyword {
  text: string;
  added_at: string;
}

export interface FomuConcern {
  text: string;
  added_at: string;
}

export interface QuestionRaised {
  raised: boolean;
  note: string;
}

export interface QuestionsRaisedMap {
  budget: QuestionRaised;
  start_timing: QuestionRaised;
  duration: QuestionRaised;
  daily_impact: QuestionRaised;
  overlast: QuestionRaised;
  feasibility_idea: QuestionRaised;
  attic_condition: QuestionRaised;
  company_approach: QuestionRaised;
}

export type QuestionKey = keyof QuestionsRaisedMap;

export type ScenarioType = 'A' | 'B' | 'C' | 'D';

export type ImpressionTag = 'gehaast' | 'rustig' | 'sceptisch' | 'enthousiast' | 'overweldigd';

export interface PreIntakeData {
  id?: string;
  lead_id?: string;

  call_started_at: string | null;
  call_ended_at: string | null;
  call_duration_seconds: number;

  trigger_text: string;
  emotional_keywords: EmotionalKeyword[];
  fomu_concerns: FomuConcern[];
  buying_committee: string;
  general_impression: string;
  impression_tags: ImpressionTag[];

  questions_raised: QuestionsRaisedMap;

  qual_in_region: boolean | null;
  qual_real_attic: boolean | null;
  qual_is_owner: boolean | null;
  qual_is_decision_maker: boolean | null;
  region_gemeente: string;

  photos_promised: boolean;
  measurement_promised: boolean;
  deliverables_due_date: string | null;

  scenario_chosen: ScenarioType | null;
  videocall_scheduled_at: string | null;
  google_meet_link: string;

  quick_notes: string;

  wat_tags: string[];
  waarom_nu_timing: string;
  videocall_planned: boolean;
  plaatsbezoek_planned: boolean;


  locked_at: string | null;
}

export const defaultQuestionsRaised: QuestionsRaisedMap = {
  budget: { raised: false, note: '' },
  start_timing: { raised: false, note: '' },
  duration: { raised: false, note: '' },
  daily_impact: { raised: false, note: '' },
  overlast: { raised: false, note: '' },
  feasibility_idea: { raised: false, note: '' },
  attic_condition: { raised: false, note: '' },
  company_approach: { raised: false, note: '' },
};

export const defaultPreIntake: PreIntakeData = {
  call_started_at: null,
  call_ended_at: null,
  call_duration_seconds: 0,
  trigger_text: '',
  emotional_keywords: [],
  fomu_concerns: [],
  buying_committee: '',
  general_impression: '',
  impression_tags: [],
  questions_raised: { ...defaultQuestionsRaised },
  qual_in_region: null,
  qual_real_attic: null,
  qual_is_owner: null,
  qual_is_decision_maker: null,
  region_gemeente: '',
  photos_promised: false,
  measurement_promised: false,
  deliverables_due_date: null,
  scenario_chosen: null,
  videocall_scheduled_at: null,
  google_meet_link: '',
  quick_notes: '',
  wat_tags: [],
  videocall_planned: false,
  plaatsbezoek_planned: false,
  locked_at: null,
};

export interface TranscriptAnalysis {
  id?: string;
  pre_intake_id: string;
  lead_id: string;
  ai_analysis: AiAnalysisResult;
  coaching_feedback: string | null;
  coaching_scores: CoachingScores | null;
  match_scores: MatchScores | null;
  accepted_fields: string[];
  analyzed_at: string | null;
}

export interface AiAnalysisResult {
  trigger: { found: boolean; content: string; evidence: string };
  emotional_keywords: { quote: string; speaker: string; interpretation: string }[];
  fomu_concerns: { quote: string; category: string; interpretation: string }[];
  buying_committee: { primary_caller: string; other_decision_makers: string[]; dynamics: string };
  general_impression: { tone: string; summary: string };
  eight_questions_raised: Record<string, { raised: boolean; evidence: string }>;
  missed_opportunities: { moment: string; what_happened: string; what_should_have_happened: string; principle: string }[];
  qualification_signals: { geographic_in_region: string; real_attic_renovation: string; is_owner: string; evidence_notes: string };
}

export interface CoachingScores {
  emotional_awareness: number;
  literal_quotes: number;
  buying_committee: number;
  qualification: number;
  question_detection: number;
}

export interface MatchScores {
  trigger: 'match' | 'partial' | 'missed' | 'ai_only';
  emotional_keywords: 'match' | 'partial' | 'missed' | 'ai_only';
  fomu_concerns: 'match' | 'partial' | 'missed' | 'ai_only';
  buying_committee: 'match' | 'partial' | 'missed' | 'ai_only';
  general_impression: 'match' | 'partial' | 'missed' | 'ai_only';
}
