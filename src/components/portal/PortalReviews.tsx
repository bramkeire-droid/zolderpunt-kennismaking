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
    <section className="bg-[#F8F3EB] py-14">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="font-headline text-xl text-[#2B6CA0] font-bold uppercase tracking-wider mb-3">
          Wat klanten zeggen
        </h2>
        <div className="flex items-center gap-2 mb-10">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-5 w-5 fill-[#008CFF] text-[#008CFF]" />
            ))}
          </div>
          <span className="font-headline text-base font-semibold text-[#2B6CA0]">
            {GOOGLE_REVIEW_SCORE}/5
          </span>
          <span className="font-body text-sm text-[#2B6CA0]/50">
            op Google ({GOOGLE_REVIEW_COUNT} reviews)
          </span>
        </div>

        <div className="space-y-5">
          {REVIEWS.map((review, idx) => {
            const photo = review.hasPhoto ? PHOTO_MAP[review.photoKey] : null;
            const initials = review.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2);

            return (
              <div key={idx} className="bg-[#2B6CA0]/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  {photo ? (
                    <img
                      src={photo}
                      alt={review.name}
                      className="w-12 h-12 object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-[#008CFF]/10 flex items-center justify-center text-[#008CFF] font-headline text-sm font-bold">
                      {initials}
                    </div>
                  )}
                  <div>
                    <p className="font-headline text-base font-bold text-[#2B6CA0]">
                      {review.name}
                    </p>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-[#008CFF] text-[#008CFF]" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="font-body text-base text-[#1A1A1A] leading-relaxed italic">
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
