import { useEffect, useRef, useState } from 'react';
import type { ZarvisStatus } from '@/contexts/ZarvisContext';
import { spreekNiveau } from '@/lib/zarvis/niveau';
import ZarvisOrb from './ZarvisOrb';

/**
 * De aanwezigheid van Zarvis: een zwart gat met een lichtende schijf errond,
 * live getekend op de grafische kaart. Wat het doet, zegt wie aan het woord is:
 *
 *   rust      de schijf draait traag
 *   luistert  de schijf dooft en stroomt naar binnen; de ring blijft stil branden
 *             (de microfoonknop toont de stem van de gebruiker)
 *   denkt     de schijf versnelt en er cirkelt een lichtpunt rond het gat
 *   spreekt   de schijf licht op en golft naar buiten op het volume van de stem
 *
 * Louter beeld: de toestand staat ernaast ook in woorden. Zonder WebGL valt het
 * terug op de bol.
 */

const VERTEX = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_t, u_fase, u_spreek, u_luister, u_denk;
uniform vec2 u_kantel;
uniform vec3 u_bg;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruis(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a*ruis(p); p = p*2.03 + 17.; a *= .5; } return s; }

void main(){
  vec2 p = (gl_FragCoord.xy - .5*u_res) / u_res.y;
  p.y -= .03;
  p -= u_kantel * .012;
  float R = .2 * (1. + .035*u_spreek);
  float r = length(p), q = r / R;
  float sinA = p.y / max(r, 1e-4), cosA = p.x / max(r, 1e-4);
  float a = atan(p.y, p.x);
  float buitenGat = smoothstep(.985, 1.015, q);

  // De achterkant van de schijf, door de zwaartekracht over het gat gebogen.
  float boven = smoothstep(-1., 1., sinA);
  float rand = mix(1.5, 2.1, boven) + 1.1*pow(1. - abs(sinA), 5.);
  float t = clamp((q - 1.) / (rand - 1.), 0., 1.);
  vec2 draai = vec2(cos(a + u_fase), sin(a + u_fase));
  float draden = fbm(vec2(q*17. + u_t*1.6*u_luister, 0.) + draai*1.7);
  draden = pow(draden, 1.7) * 2.6;
  float halo = pow(1. - t, 1.6) * smoothstep(.04, .3, t) * draden;
  halo *= (.45 + 1.0*cosA*cosA) * mix(.55, 1., boven);
  halo *= (1. - .6*u_luister) * (1. + 1.5*u_spreek);

  // De dunne lichtring vlak tegen het gat.
  float ring = exp(-pow((q - 1.035) / .02, 2.)) * (1.05 + .5*u_spreek + .25*u_luister);

  // De voorkant van de schijf: een vlakke band die voor het gat langs loopt.
  float x = p.x / R, ax = abs(x);
  float yd = p.y + R*(.13 + .05*u_kantel.y);
  float dikte = R * (.03 + .13*exp(-ax*.95));
  float strepen = fbm(vec2(x*2.2 - u_fase*2.4, yd/R*46.));
  float schijf = exp(-pow(yd / dikte, 2.)) * smoothstep(4.5, .9, ax) * (.3 + .7*smoothstep(.5, 1.35, ax));
  schijf *= (.35 + 1.5*strepen) * (1. - .07*x) * (1. - .5*u_luister) * (1. + 1.1*u_spreek);

  // Spreken: golven die van het gat weg lopen, en een gloed errond.
  float golf = pow(.5 + .5*sin(q*11. - u_t*8.), 5.);
  float spraak = u_spreek * (golf*.55*exp(-(q - 1.)*1.15) + .22*exp(-(q - 1.)*1.7)) * buitenGat;

  // Denken: een lichtpunt op een baan in het vlak van de schijf.
  float th = u_t*2.3;
  vec2 punt = R * vec2(2.25*cos(th), .3*sin(th) - .13);
  float achter = step(0., sin(th)) * (1. - smoothstep(.95, 1.1, length(punt)/R));
  float stip = u_denk * (1. - achter) * (exp(-dot(p - punt, p - punt) / (R*R*.0035)) * 1.6 + exp(-dot(p - punt, p - punt) / (R*R*.05)) * .25);

  float I = (halo + ring + spraak) * buitenGat + schijf + stip;
  I = 1. - exp(-I * 1.35);
  // Naar de randen van het vlak vloeit alles uit in de achtergrond.
  vec2 uv = gl_FragCoord.xy / u_res;
  I *= smoothstep(0., .1, uv.x) * smoothstep(1., .9, uv.x) * smoothstep(0., .08, uv.y) * smoothstep(1., .92, uv.y);
  I += (hash(gl_FragCoord.xy + u_t) - .5) * .012;
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
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) { zetZonderWebgl(true); return; }

    const maak = (soort: number, bron: string) => {
      const s = gl.createShader(soort)!;
      gl.shaderSource(s, bron);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
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
    const uRes = u('u_res'), uT = u('u_t'), uFase = u('u_fase'), uSpreek = u('u_spreek'),
      uLuister = u('u_luister'), uDenk = u('u_denk'), uKantel = u('u_kantel'), uBg = u('u_bg');
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

    // De schijf kantelt een beetje mee met de muis.
    const doel = { x: 0, y: 0 };
    const opMuis = (e: PointerEvent) => {
      doel.x = (e.clientX / window.innerWidth) * 2 - 1;
      doel.y = 1 - (e.clientY / window.innerHeight) * 2;
    };
    window.addEventListener('pointermove', opMuis);

    const rustig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let spreek = 0, luister = 0, denk = 0, fase = 0, kx = 0, ky = 0;
    let vorige = performance.now(), t = 0, beeld = 0;

    const teken = (nu: number) => {
      beeld = requestAnimationFrame(teken);
      const dt = Math.min(0.05, (nu - vorige) / 1000);
      vorige = nu;
      const st = statusRef.current;
      const tempo = rustig ? 0.25 : 1;
      t += dt * tempo;

      let doelSpreek = 0;
      if (st === 'spreekt') {
        const echt = spreekNiveau();
        // Zonder meting (stem van de browser) een eigen spreekritme, zodat het
        // verschil met zwijgen even duidelijk blijft.
        doelSpreek = echt !== null && echt > 0.01
          ? 0.25 + 0.75 * echt
          : 0.35 + 0.65 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1));
      }
      const naar = (v: number, d: number, snel: number) => v + (d - v) * Math.min(1, dt * snel);
      spreek = naar(spreek, doelSpreek, doelSpreek > spreek ? 18 : 7);
      luister = naar(luister, st === 'luistert' ? 1 : 0, 5);
      denk = naar(denk, st === 'denkt' ? 1 : 0, 4);
      fase += dt * tempo * (0.1 + 0.75 * denk + 0.22 * spreek - 0.05 * luister);
      kx = naar(kx, doel.x, 3);
      ky = naar(ky, doel.y, 3);

      gl.uniform1f(uT, t);
      gl.uniform1f(uFase, fase);
      gl.uniform1f(uSpreek, rustig ? Math.min(spreek, 0.5) : spreek);
      gl.uniform1f(uLuister, luister);
      gl.uniform1f(uDenk, denk);
      gl.uniform2f(uKantel, kx, ky);
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
