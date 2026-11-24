// Bouwt Zarvis-installatie.exe: eerst het programma zelf (electron-builder),
// dan de wizard eromheen met de NSIS die electron-builder al binnenhaalde.
// Werkt op Linux, macOS en Windows, zonder Wine.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const hier = __dirname;
const versie = require('./package.json').version;
const bin = (naam) => path.join(hier, 'node_modules', '.bin', naam + (process.platform === 'win32' ? '.cmd' : ''));

execFileSync(bin('electron-builder'), ['--win', 'dir', '--x64', '--publish', 'never'], { cwd: hier, stdio: 'inherit', shell: process.platform === 'win32' }); // Windows start een .cmd alleen via de shell

const cache = process.env.ELECTRON_BUILDER_CACHE
  || (process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache')
    : process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Caches', 'electron-builder')
      : path.join(os.homedir(), '.cache', 'electron-builder'));
const zoek = (map) => fs.existsSync(map) ? fs.readdirSync(map).filter((n) => n.startsWith('nsis-3')).map((n) => path.join(map, n)) : [];
const nsisMap = zoek(cache).flatMap(zoek)[0];
if (!nsisMap) {
  console.error('NSIS niet gevonden in ' + cache + '. Draai één keer "npx electron-builder --win portable" om het binnen te halen.');
  process.exit(1);
}
const makensis = process.platform === 'win32' ? path.join(nsisMap, 'Bin', 'makensis.exe')
  : path.join(nsisMap, process.platform === 'darwin' ? 'mac' : 'linux', 'makensis');
execFileSync(makensis, ['-V2', `-DVERSIE=${versie}`, 'installatie.nsi'], { cwd: hier, stdio: 'inherit', env: { ...process.env, NSISDIR: nsisMap } });
console.log('Klaar: ' + path.join(hier, 'dist', 'Zarvis-installatie.exe'));
