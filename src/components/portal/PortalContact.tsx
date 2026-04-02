import { Phone, Mail, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CONTACT_TELEFOON, CONTACT_EMAIL, CONTACT_WEBSITE } from '@/components/report/reportConstants';
import fotoBram from '@/assets/foto-bram.png';
import logoBlauw from '@/assets/logo-blauw.svg';

export default function PortalContact() {
  return (
    <section className="bg-[#008CFF] text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Photo + name */}
          <div className="flex-shrink-0 text-center">
            <img
              src={fotoBram}
              alt="Bram Keirsschieter"
              className="w-24 h-24 object-cover mx-auto mb-3"
            />
            <p className="font-headline text-lg font-bold">Bram Keirsschieter</p>
            <p className="font-body text-sm text-white/70">Uw vaste contactpersoon</p>
          </div>

          {/* Contact details */}
          <div className="flex-1 space-y-4">
            <p className="font-body text-white/90 text-sm leading-relaxed">
              Heeft u vragen over uw dossier of wilt u een volgende stap plannen?
              Neem gerust contact op — ik help u graag verder.
            </p>

            <div className="space-y-2">
              <a
                href={`tel:${CONTACT_TELEFOON.replace(/\s/g, '')}`}
                className="flex items-center gap-3 text-white hover:text-white/80 transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span className="font-body text-sm">{CONTACT_TELEFOON}</span>
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-3 text-white hover:text-white/80 transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span className="font-body text-sm">{CONTACT_EMAIL}</span>
              </a>
              <a
                href={`https://${CONTACT_WEBSITE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-white hover:text-white/80 transition-colors"
              >
                <Globe className="h-4 w-4" />
                <span className="font-body text-sm">{CONTACT_WEBSITE}</span>
              </a>
            </div>

            <Button
              asChild
              className="bg-white text-[#008CFF] hover:bg-white/90 font-headline text-base px-6 py-5 mt-4"
            >
              <a href={`tel:${CONTACT_TELEFOON.replace(/\s/g, '')}`}>
                Plan een gesprek
              </a>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center mt-10 pt-6 border-t border-white/20">
          <img src={logoBlauw} alt="Zolderpunt" className="h-6 brightness-0 invert opacity-50" />
        </div>
      </div>
    </section>
  );
}
