Zolderpunt intake app — Belgian attic renovation company, owner Bram Keirsschieter

BRAND COLORS (HSL):
- Primary blue: 209 100% 50% (#008CFF)
- Dark blue: 207 56% 40% (#2B6CA0)
- Warm white: 34 47% 95% (#F8F3EB)
- Dark text: 240 33% 14% (#1A1A2E)

TYPOGRAPHY:
- Headlines: Space Grotesk (Bold/Semibold)
- Body: Rethink Sans (Regular)
- Labels: uppercase, letter-spacing 1.6px, primary blue

DESIGN ELEMENTS:
- 40° angled decorative shape in primary blue
- "Punt" accent: small blue rectangle with clip-path
- Lots of whitespace, modern, trustworthy
- ALL corners: rounded-none (sharp rectangles, NO rounded corners anywhere)
- Decorative shapes: also sharp corners (no rounded-[48px])

RULES:
- No required field markers (* symbols) — user decides what to fill
- Separate "Opslaan" button distinct from "Volgende" navigation
- gevonden_via: dedicated slide 0A2 with clickable cards (not dropdown)
- Slide 3: all fields editable inline
- Slide 2A: steps are clickable with inline photo display
- project_timing field on LeadData

AUTH:
- Email/password login, AuthProvider wraps app
- profiles table + user_roles table (app_role enum: admin, user)
- has_role() security definer function
- Leads RLS: authenticated users only

SLIDE ORDER:
- 0A (klantdossier), 0A2 (gevonden via), 0B (projectinfo), 0C (technische config)
- 1 (welkom), 2A (traject), 2B (agenda), 3 (wat we weten), 4 (situatie), 5 (technisch), 5B (calculator), 6 (budget), 7 (volgende stap)
- 8 (transcript), 9 (preview), 10 (PDF)

SVG LOGOS: src/assets/logo-blauw.svg, logo-zwart.svg, beeldmerk-blauw.svg

PDF RAPPORT:
- @react-pdf/renderer for PDF generation
- Edge function generate-value-text (Lovable AI, gemini-3-flash-preview) for dynamic value text
- 8 sections: Cover, Samenvatting, Prijs+Waarde, Foto's, Werkwijze, Garanties, Reviews, CTA
- Hardcoded constants in reportConstants.ts (reviews, guarantees, contact info)
- Assets: foto-bram.png, review-foto-brandon.jpg, review-foto-tom.png, review-foto-cecilia.png
