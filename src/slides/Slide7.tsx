import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import { Calendar, Users, MessageCircle } from 'lucide-react';

export default function Slide7() {
  const { lead, updateLead } = useSession();
  const selected = lead.volgende_stap;

  const voornaam = lead.voornaam?.trim();
  const headline = voornaam
    ? `${voornaam}, jullie zolder verdient de volgende stap.`
    : 'Jullie zolder verdient de volgende stap.';

  return (
    <SlideLayout variant="raw">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="flex flex-col h-full min-h-0" style={{ backgroundColor: '#F8F3EB' }}>

        {/* ═══ ZONE 1 — Hero header ═══ */}
        <div
          className="relative overflow-hidden"
          style={{
            backgroundColor: '#008CFF',
            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 48px), 0 100%)',
            minHeight: '32%',
          }}
        >
          {/* Decoratief punt-element (grafisch systeem) */}
          <div
            className="absolute pointer-events-none"
            style={{
              right: '-40px',
              top: '-20px',
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.12)',
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              right: '80px',
              top: '60px',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          />

          <div className="relative z-10 flex flex-col items-center justify-center text-center px-8 py-12">
            <span
              className="block mb-3 text-white uppercase"
              style={{
                fontFamily: "'Rethink Sans', 'DM Sans', system-ui, sans-serif",
                fontSize: '0.7rem',
                letterSpacing: '0.1em',
                opacity: 0.7,
              }}
            >
              WAT GEBEURT ER NU?
            </span>
            <h2
              className="text-white mb-3"
              style={{
                fontFamily: "'Brockmann', 'Space Grotesk', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '2rem',
                lineHeight: 1.2,
              }}
            >
              {headline}
            </h2>
            <p
              className="text-white"
              style={{
                fontFamily: "'Rethink Sans', 'DM Sans', system-ui, sans-serif",
                fontSize: '0.9rem',
                opacity: 0.85,
              }}
            >
              Kies hoe jullie verder willen gaan.
            </p>
          </div>
        </div>

        {/* ═══ ZONE 2 — Drie opties ═══ */}
        <div className="flex-1 px-8 py-8" style={{ backgroundColor: '#F8F3EB' }}>
          <div className="flex gap-6 max-w-5xl mx-auto items-stretch">

            {/* Optie 1 — Plaatsbezoek (dominant, 45%) */}
            <button
              onClick={() => updateLead({ volgende_stap: 'plaatsbezoek' })}
              className="text-left flex flex-col transition-all"
              style={{
                width: '45%',
                flexShrink: 0,
                padding: '28px',
                backgroundColor: selected === 'plaatsbezoek' ? '#008CFF' : '#FFFFFF',
                border: selected === 'plaatsbezoek' ? '2px solid #008CFF' : '2px solid #008CFF',
                animation: 'fadeInUp 0.35s ease 0.05s both',
              }}
            >
              {/* Badge */}
              <span
                className="inline-block mb-4 self-start"
                style={{
                  backgroundColor: selected === 'plaatsbezoek' ? 'rgba(255,255,255,0.2)' : '#008CFF',
                  color: '#FFFFFF',
                  fontFamily: "'Rethink Sans', 'DM Sans', system-ui, sans-serif",
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                }}
              >
                MEEST GEKOZEN
              </span>
              <Calendar
                className="mb-4"
                size={32}
                color={selected === 'plaatsbezoek' ? '#FFFFFF' : '#008CFF'}
              />
              <h3
                className="mb-3"
                style={{
                  fontFamily: "'Brockmann', 'Space Grotesk', system-ui, sans-serif",
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: selected === 'plaatsbezoek' ? '#FFFFFF' : '#1A1A1A',
                }}
              >
                Plaatsbezoek inplannen
              </h3>
              <p
                className="mb-4 flex-1"
                style={{
                  fontFamily: "'Rethink Sans', 'DM Sans', system-ui, sans-serif",
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  color: selected === 'plaatsbezoek' ? 'rgba(255,255,255,0.85)' : '#444',
                }}
              >
                We komen bij jullie thuis, meten alles op en maken een gedetailleerd 3D-ontwerp en offerte. Geen verplichtingen, geen verrassingen.
              </p>
              <a
                href="https://calendly.com/belhouse/plaatsbezoek-zolderpunt"
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="mb-2 inline-block underline"
                style={{
                  fontFamily: "'Rethink Sans', 'DM Sans', system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  color: selected === 'plaatsbezoek' ? '#FFFFFF' : '#008CFF',
                }}
              >
                → Plan direct een plaatsbezoek in
              </a>
              <p
                style={{
                  fontFamily: "'Rethink Sans', 'DM Sans', system-ui, sans-serif",
                  fontSize: '0.75rem',
                  fontStyle: 'italic',
                  color: selected === 'plaatsbezoek' ? 'rgba(255,255,255,0.6)' : '#888',
                }}
              >
                De meeste klanten plannen het bezoek binnen de week.
              </p>
            </button>

            {/* Optie 2 — Overleggen (27.5%) */}
            <button
              onClick={() => updateLead({ volgende_stap: 'overleggen' })}
              className="text-left flex flex-col transition-all"
              style={{
                width: '27.5%',
                flexShrink: 0,
                padding: '20px',
                backgroundColor: selected === 'overleggen' ? '#008CFF' : '#FFFFFF',
                border: selected === 'overleggen' ? '2px solid #008CFF' : '1px solid #E2E8F0',
                animation: 'fadeInUp 0.35s ease 0.15s both',
              }}
            >
              <Users
                className="mb-4"
                size={24}
                color={selected === 'overleggen' ? '#FFFFFF' : '#1A1A1A'}
              />
              <h3
                className="mb-3"
                style={{
                  fontFamily: "'Brockmann', 'Space Grotesk', system-ui, sans-serif",
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: selected === 'overleggen' ? '#FFFFFF' : '#1A1A1A',
                }}
              >
                Eerst intern overleggen
              </h3>
              <p
                className="mb-4 flex-1"
                style={{
                  fontFamily: "'Rethink Sans', 'DM Sans', system-ui, sans-serif",
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                  color: selected === 'overleggen' ? 'rgba(255,255,255,0.85)' : '#555',
                }}
              >
                Jullie bespreken dit samen. Wanneer jullie klaar zijn, plannen we het bezoek.
              </p>
              <p
                style={{
                  fontFamily: "'Rethink Sans', 'DM Sans', system-ui, sans-serif",
                  fontSize: '0.8rem',
                  color: selected === 'overleggen' ? '#FFFFFF' : '#008CFF',
                }}
              >
                → Jullie nemen contact op wanneer het past
              </p>
            </button>

            {/* Optie 3 — Nadenken (27.5%, muted) */}
            <button
              onClick={() => updateLead({ volgende_stap: 'nadenken' })}
              className="text-left flex flex-col transition-all"
              style={{
                width: '27.5%',
                flexShrink: 0,
                padding: '20px',
                backgroundColor: selected === 'nadenken' ? '#008CFF' : '#FFFFFF',
                border: selected === 'nadenken' ? '2px solid #008CFF' : '1px solid #E2E8F0',
                opacity: selected === 'nadenken' ? 1 : 0.7,
                animation: 'fadeInUp 0.35s ease 0.25s both',
              }}
            >
              <MessageCircle
                className="mb-4"
                size={24}
                color={selected === 'nadenken' ? '#FFFFFF' : '#888'}
              />
              <h3
                className="mb-3"
                style={{
                  fontFamily: "'Brockmann', 'Space Grotesk', system-ui, sans-serif",
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: selected === 'nadenken' ? '#FFFFFF' : '#555',
                }}
              >
                Nog even nadenken
              </h3>
              <p
                className="flex-1"
                style={{
                  fontFamily: "'Rethink Sans', 'DM Sans', system-ui, sans-serif",
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                  color: selected === 'nadenken' ? 'rgba(255,255,255,0.85)' : '#666',
                }}
              >
                Geen probleem. Het rapport van dit gesprek staat klaar in jullie mailbox.
              </p>
            </button>
          </div>

          {/* ═══ ZONE 3 — Quote blok ═══ */}
          <div
            className="flex items-start gap-4 max-w-5xl mx-auto mt-10"
            style={{ borderLeft: '4px solid #008CFF', paddingLeft: '20px' }}
          >
            {/* Avatar */}
            <div
              className="shrink-0 flex items-center justify-center"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#008CFF',
              }}
            >
              <span
                style={{
                  fontFamily: "'Brockmann', 'Space Grotesk', system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: '#FFFFFF',
                }}
              >
                Z
              </span>
            </div>

            {/* Quote text */}
            <div>
              <p
                style={{
                  fontFamily: "'Rethink Sans', 'DM Sans', system-ui, sans-serif",
                  fontSize: '0.95rem',
                  fontStyle: 'italic',
                  lineHeight: 1.6,
                  color: '#1A1A1A',
                }}
              >
                "Wat jullie ook kiezen — het rapport van dit gesprek is onderweg. Geen druk, geen haast."
              </p>
              <p
                className="mt-2"
                style={{
                  fontFamily: "'Rethink Sans', 'DM Sans', system-ui, sans-serif",
                  fontSize: '0.8rem',
                  color: '#888',
                }}
              >
                — Bram, Zolderpunt
              </p>
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
