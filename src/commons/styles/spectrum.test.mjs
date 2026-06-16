import assert from 'node:assert/strict';
import { spectrumHex, spectrumConic, SPECTRUM } from './spectrum.js';

// 6 banded stops, red → purple
assert.equal(SPECTRUM.length, 6);
assert.equal(SPECTRUM[0], '#ff5a5a');
assert.equal(SPECTRUM[5], '#9a6bff');

// fraction clamps to [0,1]
assert.equal(spectrumHex(-1), SPECTRUM[0]);
assert.equal(spectrumHex(2), SPECTRUM[5]);
assert.equal(spectrumHex(0), '#ff5a5a');
assert.equal(spectrumHex(1), '#9a6bff');
assert.equal(spectrumHex(0.76), '#46c0ff'); // blue band at 76%

// partial: a SOLID hue fills up to the fraction, the rest transparent
const partial = spectrumConic(0.76);
assert.ok(partial.startsWith('conic-gradient('));
assert.ok(partial.includes('#46c0ff 0 76%'), 'solid hue fills up to the fraction');
assert.ok(partial.includes('transparent 76%'), 'rest is transparent');

// full: solid purple, no gap, no transparent
assert.equal(spectrumConic(1), 'conic-gradient(#9a6bff 0 100%)');
assert.ok(!spectrumConic(1).includes('transparent'));

console.log('spectrum.test.mjs OK');
