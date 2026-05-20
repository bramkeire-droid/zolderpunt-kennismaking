
-- Step 1: merge duplicate pre_intake rows into the newest row per lead
WITH ranked AS (
  SELECT lead_id,
    (array_agg(id ORDER BY updated_at DESC))[1] AS keep_id,
    (array_agg(call_started_at ORDER BY updated_at DESC) FILTER (WHERE call_started_at IS NOT NULL))[1] AS call_started_at,
    (array_agg(call_ended_at ORDER BY updated_at DESC) FILTER (WHERE call_ended_at IS NOT NULL))[1] AS call_ended_at,
    (array_agg(call_duration_seconds ORDER BY updated_at DESC) FILTER (WHERE call_duration_seconds IS NOT NULL AND call_duration_seconds > 0))[1] AS call_duration_seconds,
    (array_agg(trigger_text ORDER BY updated_at DESC) FILTER (WHERE NULLIF(trigger_text,'') IS NOT NULL))[1] AS trigger_text,
    (array_agg(emotional_keywords ORDER BY updated_at DESC) FILTER (WHERE jsonb_array_length(COALESCE(emotional_keywords,'[]'::jsonb)) > 0))[1] AS emotional_keywords,
    (array_agg(fomu_concerns ORDER BY updated_at DESC) FILTER (WHERE jsonb_array_length(COALESCE(fomu_concerns,'[]'::jsonb)) > 0))[1] AS fomu_concerns,
    (array_agg(buying_committee ORDER BY updated_at DESC) FILTER (WHERE NULLIF(buying_committee,'') IS NOT NULL))[1] AS buying_committee,
    (array_agg(general_impression ORDER BY updated_at DESC) FILTER (WHERE NULLIF(general_impression,'') IS NOT NULL))[1] AS general_impression,
    (array_agg(questions_raised ORDER BY updated_at DESC) FILTER (WHERE questions_raised IS NOT NULL AND questions_raised <> '{}'::jsonb))[1] AS questions_raised,
    (array_agg(qual_in_region ORDER BY updated_at DESC) FILTER (WHERE qual_in_region IS NOT NULL))[1] AS qual_in_region,
    (array_agg(qual_real_attic ORDER BY updated_at DESC) FILTER (WHERE qual_real_attic IS NOT NULL))[1] AS qual_real_attic,
    (array_agg(qual_is_owner ORDER BY updated_at DESC) FILTER (WHERE qual_is_owner IS NOT NULL))[1] AS qual_is_owner,
    (array_agg(qual_is_decision_maker ORDER BY updated_at DESC) FILTER (WHERE qual_is_decision_maker IS NOT NULL))[1] AS qual_is_decision_maker,
    (array_agg(region_gemeente ORDER BY updated_at DESC) FILTER (WHERE NULLIF(region_gemeente,'') IS NOT NULL))[1] AS region_gemeente,
    bool_or(photos_promised) AS photos_promised,
    bool_or(measurement_promised) AS measurement_promised,
    (array_agg(deliverables_due_date ORDER BY updated_at DESC) FILTER (WHERE deliverables_due_date IS NOT NULL))[1] AS deliverables_due_date,
    (array_agg(scenario_chosen ORDER BY updated_at DESC) FILTER (WHERE NULLIF(scenario_chosen,'') IS NOT NULL))[1] AS scenario_chosen,
    (array_agg(videocall_scheduled_at ORDER BY updated_at DESC) FILTER (WHERE videocall_scheduled_at IS NOT NULL))[1] AS videocall_scheduled_at,
    (array_agg(google_meet_link ORDER BY updated_at DESC) FILTER (WHERE NULLIF(google_meet_link,'') IS NOT NULL))[1] AS google_meet_link,
    (array_agg(quick_notes ORDER BY updated_at DESC) FILTER (WHERE NULLIF(quick_notes,'') IS NOT NULL))[1] AS quick_notes,
    (array_agg(locked_at ORDER BY updated_at DESC) FILTER (WHERE locked_at IS NOT NULL))[1] AS locked_at
  FROM public.pre_intake
  WHERE lead_id IS NOT NULL
  GROUP BY lead_id
)
UPDATE public.pre_intake p SET
  call_started_at = r.call_started_at,
  call_ended_at = r.call_ended_at,
  call_duration_seconds = r.call_duration_seconds,
  trigger_text = COALESCE(r.trigger_text, p.trigger_text),
  emotional_keywords = COALESCE(r.emotional_keywords, p.emotional_keywords),
  fomu_concerns = COALESCE(r.fomu_concerns, p.fomu_concerns),
  buying_committee = COALESCE(r.buying_committee, p.buying_committee),
  general_impression = COALESCE(r.general_impression, p.general_impression),
  questions_raised = COALESCE(r.questions_raised, p.questions_raised),
  qual_in_region = r.qual_in_region,
  qual_real_attic = r.qual_real_attic,
  qual_is_owner = r.qual_is_owner,
  qual_is_decision_maker = r.qual_is_decision_maker,
  region_gemeente = COALESCE(r.region_gemeente, p.region_gemeente),
  photos_promised = r.photos_promised,
  measurement_promised = r.measurement_promised,
  deliverables_due_date = r.deliverables_due_date,
  scenario_chosen = r.scenario_chosen,
  videocall_scheduled_at = r.videocall_scheduled_at,
  google_meet_link = COALESCE(r.google_meet_link, p.google_meet_link),
  quick_notes = COALESCE(r.quick_notes, p.quick_notes),
  locked_at = r.locked_at,
  updated_at = now()
FROM ranked r
WHERE p.id = r.keep_id;

-- Step 2: merge impression_tags separately (text[] aggregation needs subquery)
UPDATE public.pre_intake p SET impression_tags = sub.impression_tags
FROM (
  SELECT DISTINCT ON (lead_id) lead_id, impression_tags
  FROM public.pre_intake
  WHERE lead_id IS NOT NULL AND COALESCE(array_length(impression_tags,1),0) > 0
  ORDER BY lead_id, updated_at DESC
) sub
WHERE p.lead_id = sub.lead_id
  AND p.id = (SELECT id FROM public.pre_intake p2 WHERE p2.lead_id = p.lead_id ORDER BY p2.updated_at DESC LIMIT 1);

-- Step 3: delete the older duplicates
DELETE FROM public.pre_intake p
USING (
  SELECT lead_id, (array_agg(id ORDER BY updated_at DESC))[1] AS keep_id
  FROM public.pre_intake WHERE lead_id IS NOT NULL GROUP BY lead_id
) r
WHERE p.lead_id = r.lead_id AND p.id <> r.keep_id;

-- Step 4: prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS pre_intake_lead_id_unique
  ON public.pre_intake(lead_id) WHERE lead_id IS NOT NULL;
