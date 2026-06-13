import { supabase } from '@/integrations/supabase/client';

export interface GoogleReview {
  author: string;
  authorPhoto?: string;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
}

export interface GoogleReviewsPayload {
  reviews: GoogleReview[];
  rating: number;
  total: number;
  fetchedAt: string;
  cached?: boolean;
  stale?: boolean;
}

export async function fetchGoogleReviews(): Promise<GoogleReviewsPayload | null> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-google-reviews');
    if (error) throw error;
    if (!data || !Array.isArray((data as any).reviews)) return null;
    return data as GoogleReviewsPayload;
  } catch (err) {
    console.error('[googleReviews] fetch error', err);
    return null;
  }
}
