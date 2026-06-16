import assert from 'node:assert/strict';
import { spectrumHex, spectrumConic, cakeConic, SPECTRUM } from './spectrum.js';

// 5 stops, orange → purple, NO red
assert.equal(SPECTRUM.length, 5);
assert.equal(SPECTRUM[0], '#ff9a3d');
assert.equal(SPECTRUM[4], '#9a6bff');
assert.ok(!SPECTRUM.includes('#ff5a5a'), 'no red in the palette');

// fraction clamps to [0,1]
assert.equal(spectrumHex(-1), SPECTRUM[0]);
assert.equal(spectrumHex(2), SPECTRUM[4]);
assert.equal(spectrumHex(0), '#ff9a3d');   // orange at the start
assert.equal(spectrumHex(1), '#9a6bff');   // purple at the end
assert.equal(spectrumHex(0.76), '#46c0ff'); // blue band

// big ring partial: solid hue up to the fraction, rest transparent
const partial = spectrumConic(0.76);
assert.ok(partial.includes('#46c0ff 0 76%'), 'solid hue to the fraction');
assert.ok(partial.includes('transparent 76%'), 'rest transparent');

// big ring at 100%: a full rainbow wheel (all stops), no transparent
const full = spectrumConic(1);
assert.ok(full.includes('#ff9a3d') && full.includes('#9a6bff'), 'rainbow spans the spectrum');
assert.ok(!full.includes('transparent'), 'no gap at 100%');

// small cake: wedge in the hue to the fraction, neutral track for the rest; purple-solid at 100%
const cake = cakeConic(0.5, '#14161f');
assert.ok(cake.includes('#5cd66e 0 50%'), 'wedge cut to the fraction in its hue');
assert.ok(cake.includes('#14161f 50% 100%'), 'track for the rest');
assert.equal(cakeConic(1, '#14161f'), 'conic-gradient(#9a6bff 0 100%)'); // ends at purple

console.log('spectrum.test.mjs OK');
