import { REVIEWS, GOOGLE_REVIEW_SCORE, GOOGLE_REVIEW_COUNT } from '@/components/report/reportConstants';
import { Star } from 'lucide-react';
import reviewBrandon from '@/assets/review-foto-brandon.jpg';
import reviewTom from '@/assets/review-foto-tom.png';
import reviewCecilia from '@/assets/review-foto-cecilia.png';

const PHOTO_MAP: Record<string, string> = {
  brandon: reviewBrandon,
  tom: reviewTom,
  cecilia: reviewCecilia,
};

export default function PortalReviews() {
  return (
    <section className="bg-white py-10">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="font-headline text-xs text-[#008CFF] uppercase tracking-wider font-semibold mb-2">
          Wat klanten zeggen
        </h2>
        <div className="flex items-center gap-2 mb-8">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-4 w-4 fill-[#F6AD55] text-[#F6AD55]" />
            ))}
          </div>
          <span className="font-body text-xs text-[#888888]">
            {GOOGLE_REVIEW_SCORE}/5 op Google ({GOOGLE_REVIEW_COUNT} reviews)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REVIEWS.map((review, idx) => {
            const photo = review.hasPhoto ? PHOTO_MAP[review.photoKey] : null;
            const initials = review.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2);

            return (
              <div key={idx} className="bg-[#F8F3EB] p-5">
                <div className="flex items-center gap-3 mb-3">
                  {photo ? (
                    <img
                      src={photo}
                      alt={review.name}
                      className="w-10 h-10 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-[#008CFF]/10 flex items-center justify-center text-[#008CFF] font-headline text-sm font-bold">
                      {initials}
                    </div>
                  )}
                  <div>
                    <p className="font-headline text-sm font-semibold text-[#1A1A1A]">
                      {review.name}
                    </p>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="h-3 w-3 fill-[#F6AD55] text-[#F6AD55]" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="font-body text-sm text-[#555555] leading-relaxed italic">
                  "{review.quote}"
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
