import { useEffect, useRef, useState } from 'react';
import type { ZarvisStatus } from '@/contexts/ZarvisContext';
import { BANDEN, spreekNiveau, spreekSpectrum } from '@/lib/zarvis/niveau';
import ZarvisOrb from './ZarvisOrb';

/**
 * De aanwezigheid van Zarvis: een zwart gat, live berekend op de grafische kaart.
 *
 * Geen tekening van een zwart gat maar een kleine simulatie: voor elk beeldpunt
 * wordt een lichtstraal gevolgd die door de zwaartekracht afbuigt. Daardoor zie
 * je de achterkant van de schijf als een boog boven het gat en de onderkant als
 * een boog eronder, net als op de bekende beelden, en klopt het beeld vanzelf
 * wanneer het standpunt verandert.
 *
 * Wie aan het woord is, zie je aan de schijf zelf:
 *
 *   rust      de schijf draait traag, bijna van opzij gezien
 *   luistert  het gat keert zich plat en dooft; de materie stroomt naar binnen
 *             (de microfoonknop toont de stem van de gebruiker)
 *   denkt     de schijf versnelt en er cirkelt een heldere klomp rond het gat
 *   spreekt   het gat richt zich op naar de kijker en de schijf wordt de stem:
 *             elke toonhoogte laat een eigen ring oplichten, lage tonen dicht
 *             bij het gat en hoge aan de rand, met golven die naar buiten lopen
 *             en een nevel die opzwelt met het volume
 *
 * Louter beeld: de toestand staat ernaast ook in woorden. Zonder WebGL valt het
 * terug op de bol.
 */

const VERTEX = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_t, u_fase, u_spreek, u_luister, u_denk, u_helling, u_draai;
uniform float u_band[${BANDEN}];
uniform vec3 u_bg;

const float R_IN = 2.7;    // binnenrand van de schijf (de waarnemingshorizon ligt op 1)
const float R_UIT = 11.5;  // buitenrand
const float AFSTAND = 27.;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruis(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a*ruis(p); p = p*2.07 + 13.; a *= .5; } return s; }

// De stem per toonband, vloeiend over de straal van de schijf uitgesmeerd.
float stem(float x){
  float s = 0.;
  for (int i = 0; i < ${BANDEN}; i++) s += u_band[i] * max(0., 1. - abs(x*${BANDEN - 1}. - float(i)));
  return s;
}

// Draden in de schijf op straal r en hoek ph, voor één fase van de stroming.
float draden(float r, float ph, float fase){
  // Binnen draait sneller dan buiten; de fase houdt de schering begrensd.
  float a = ph + u_fase + (fase - .5) * 9. * pow(R_IN / r, 1.5);
  return fbm(vec2(r*2.3 + u_t*1.2*u_luister, 0.) + 1.9*vec2(cos(a), sin(a)))
       * (.55 + .9*fbm(vec2(r*9., 3.) + 3.1*vec2(cos(a*2.), sin(a*2.))));
}

// Het licht van de schijf op het punt q (in het vlak y = 0), gezien langs v.
float schijf(vec3 q, vec3 v){
  float r = length(q.xz);
  if (r < R_IN || r > R_UIT) return 0.;
  float ph = atan(q.z, q.x);
  float x = (r - R_IN) / (R_UIT - R_IN);

  float f1 = fract(u_t*.05), f2 = fract(u_t*.05 + .5);
  float d = mix(draden(r, ph, f1), draden(r, ph, f2), abs(2.*f1 - 1.));
  d = pow(d, 1.6) * 5.2;

  float profiel = pow(R_IN / r, 1.9) * smoothstep(0., .07, x) * smoothstep(1., .55, x);

  // De kant die naar de kijker toe draait, is helderder.
  vec3 raak = normalize(vec3(-q.z, 0., q.x));
  float naarOns = dot(raak, -v);
  float straling = pow(1. / (1. - .45*naarOns), 3.) * .55;

  // De stem: ringen per toonhoogte, en golven die naar buiten lopen.
  float golven = .5 + .5*sin(r*2.4 - u_t*9.);
  float klank = u_spreek * (2.1*stem(x) * (.6 + .4*d) * mix(1., .45, x) + .7*pow(golven, 3.) * profiel);

  // Denken: een heldere klomp op een baan dicht bij het gat.
  float baan = 4.6, hoek = -u_t*2.1;
  float dph = atan(sin(ph - hoek), cos(ph - hoek));
  float klomp = u_denk * 2.4 * exp(-pow((r - baan) / .5, 2.) - pow(dph * baan / 1.5, 2.) * (dph > 0. ? .25 : 1.));

  return (profiel * d * (1. - .6*u_luister) * (1. + .45*u_spreek) + klank * smoothstep(0., .05, x) * smoothstep(1., .8, x) + klomp) * straling;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - .5*u_res) / u_res.y;
  uv.y -= .045;

  // Het standpunt: hoe schuin we op de schijf kijken, en een beetje opzij.
  float ch = cos(u_helling), sh = sin(u_helling), cd = cos(u_draai), sd = sin(u_draai);
  vec3 oog = AFSTAND * vec3(sd*ch, sh, -cd*ch);
  vec3 vooruit = normalize(-oog);
  vec3 rechts = normalize(cross(vec3(0., 1., 0.), vooruit));
  vec3 omhoog = cross(vooruit, rechts);
  vec3 v = normalize(vooruit*1.72 + rechts*uv.x + omhoog*uv.y);
  vec3 p = oog;

  // Hoe dicht de straal langs het gat scheert; daarop zit de dunne lichtring.
  vec3 h = cross(p, v);
  float h2 = dot(h, h);

  float licht = 0., door = 1., nevel = 0.;
  for (int i = 0; i < 110; i++){
    float r2 = dot(p, p), r = sqrt(r2);
    if (r < 1.02){ door = 0.; break; }
    if (r > AFSTAND + 4. && dot(p, v) > 0.) break;
    float dt = .085*r + .02;
    // Afbuiging van licht rond een zwart gat.
    v += -1.5 * h2 * p / (r2*r2*r) * dt;
    vec3 n = p + v*dt;
    if (p.y * n.y < 0.){
      vec3 q = mix(p, n, p.y / (p.y - n.y));
      float e = schijf(q, v);
      licht += door * e;
      door *= 1. - clamp(e*.5, 0., .85);
    }
    // Een ijle nevel boven en onder de schijf, die opzwelt met het volume.
    float rv = length(n.xz);
    nevel += door * dt * exp(-abs(n.y) * (2.6 - 1.5*u_spreek)) * smoothstep(R_UIT, R_IN + 1., rv) * step(R_IN, rv);
    p = n;
  }

  float b = sqrt(h2);
  float ring = exp(-pow((b - 2.6) / .05, 2.)) * (.9 + 1.1*u_spreek + .35*u_luister);
  licht += ring + nevel * (.022 + .075*u_spreek);

  float I = 1. - exp(-licht * 1.25);
  I += (hash(gl_FragCoord.xy + u_t) - .5) * .014;
  gl_FragColor = vec4(u_bg + I * vec3(.93, .96, 1.), 1.);
}`;

interface Props {
  status: ZarvisStatus;
  className?: string;
}

export default function ZarvisGat({ status, className }: Props) {
  const doek = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef(status);
  statusRef.current = status;
  const [zonderWebgl, zetZonderWebgl] = useState(false);

  useEffect(() => {
    const canvas = doek.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) { zetZonderWebgl(true); return; }

    const maak = (soort: number, bron: string) => {
      const s = gl.createShader(soort)!;
      gl.shaderSource(s, bron);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('zwart gat:', gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = maak(gl.VERTEX_SHADER, VERTEX);
    const fs = maak(gl.FRAGMENT_SHADER, FRAGMENT);
    const prog = gl.createProgram()!;
    if (!vs || !fs) { zetZonderWebgl(true); return; }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { zetZonderWebgl(true); return; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const plek = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(plek);
    gl.vertexAttribPointer(plek, 2, gl.FLOAT, false, 0, 0);
    const u = (naam: string) => gl.getUniformLocation(prog, naam);
    const uRes = u('u_res'), uT = u('u_t'), uFase = u('u_fase'), uSpreek = u('u_spreek'), uLuister = u('u_luister'),
      uDenk = u('u_denk'), uHelling = u('u_helling'), uDraai = u('u_draai'), uBand = u('u_band[0]'), uBg = u('u_bg');
    gl.uniform3f(uBg, 7 / 255, 9 / 255, 15 / 255);

    const pasAan = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const b = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== b || canvas.height !== h) { canvas.width = b; canvas.height = h; }
      gl.viewport(0, 0, b, h);
      gl.uniform2f(uRes, b, h);
    };
    const kijker = new ResizeObserver(pasAan);
    kijker.observe(canvas);
    pasAan();

    // Met de muis kijk je een beetje om het gat heen.
    const muis = { x: 0, y: 0 };
    const opMuis = (e: PointerEvent) => {
      muis.x = (e.clientX / window.innerWidth) * 2 - 1;
      muis.y = 1 - (e.clientY / window.innerHeight) * 2;
    };
    window.addEventListener('pointermove', opMuis);

    const rustig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gemeten = new Float32Array(BANDEN);
    const banden = new Float32Array(BANDEN);
    let spreek = 0, luister = 0, denk = 0, fase = 0, helling = 0.07, draai = 0, mx = 0, my = 0;
    let vorige = performance.now(), t = 0, beeld = 0;
    const naar = (v: number, d: number, dt: number, snel: number) => v + (d - v) * Math.min(1, dt * snel);

    const teken = (nu: number) => {
      beeld = requestAnimationFrame(teken);
      if (document.hidden) { vorige = nu; return; }
      const dt = Math.min(0.05, (nu - vorige) / 1000);
      vorige = nu;
      const st = statusRef.current;
      const tempo = rustig ? 0.3 : 1;
      t += dt * tempo;

      // De stem: echt gemeten als dat kan (Azure-stem), anders een eigen
      // spreekritme met wisselende klanken, zodat spreken er nooit stil uitziet.
      let doelSpreek = 0;
      if (st === 'spreekt') {
        const echt = spreekNiveau();
        const meet = echt !== null && echt > 0.01 && spreekSpectrum(gemeten);
        if (meet) {
          doelSpreek = 0.3 + 0.7 * echt!;
        } else {
          const lettergreep = Math.pow(Math.abs(Math.sin(t * 6.4) * Math.sin(t * 2.3 + 1)), 0.7);
          doelSpreek = 0.3 + 0.7 * lettergreep;
          const klank = 1.6 + 2.2 * (0.5 + 0.5 * Math.sin(t * 1.9)) + 1.2 * Math.sin(t * 5.1);
          for (let i = 0; i < BANDEN; i++) {
            gemeten[i] = lettergreep * (0.9 * Math.exp(-Math.pow((i - klank) / 1.1, 2)) + 0.5 * Math.exp(-Math.pow((i - klank - 3.2) / 1.3, 2)));
          }
        }
      } else {
        gemeten.fill(0);
      }
      for (let i = 0; i < BANDEN; i++) banden[i] = naar(banden[i], gemeten[i], dt, gemeten[i] > banden[i] ? 26 : 9);
      spreek = naar(spreek, doelSpreek, dt, doelSpreek > spreek ? 16 : 6);
      luister = naar(luister, st === 'luistert' ? 1 : 0, dt, 4);
      denk = naar(denk, st === 'denkt' ? 1 : 0, dt, 4);
      fase += dt * tempo * (0.09 + 0.7 * denk + 0.25 * spreek - 0.04 * luister);

      // Spreken: het gat richt zich op. Luisteren: het keert zich plat.
      const doelHelling = st === 'spreekt' ? 0.2 : st === 'luistert' ? 0.035 : st === 'denkt' ? 0.11 : 0.075;
      mx = naar(mx, muis.x, dt, 3);
      my = naar(my, muis.y, dt, 3);
      helling = naar(helling, doelHelling + my * 0.045, dt, 2.2);
      draai = naar(draai, mx * 0.16, dt, 2.2);

      gl.uniform1f(uT, t);
      gl.uniform1f(uFase, fase);
      gl.uniform1f(uSpreek, rustig ? Math.min(spreek, 0.45) : spreek);
      gl.uniform1f(uLuister, luister);
      gl.uniform1f(uDenk, denk);
      gl.uniform1f(uHelling, helling);
      gl.uniform1f(uDraai, draai);
      gl.uniform1fv(uBand, banden);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    beeld = requestAnimationFrame(teken);

    return () => {
      cancelAnimationFrame(beeld);
      kijker.disconnect();
      window.removeEventListener('pointermove', opMuis);
    };
  }, []);

  if (zonderWebgl) {
    return (
      <div className={`flex items-center justify-center ${className ?? ''}`}>
        <ZarvisOrb status={status} maat={96} />
      </div>
    );
  }
  return <canvas ref={doek} aria-hidden data-status={status} className={`block ${className ?? ''}`} />;
}
