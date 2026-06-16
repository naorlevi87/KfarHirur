import assert from 'node:assert/strict';
import { spectrumHex, spectrumConic, SPECTRUM } from './spectrum.js';

// 6 banded stops, red → purple
assert.equal(SPECTRUM.length, 6);
assert.equal(SPECTRUM[0], '#ff5a5a');
assert.equal(SPECTRUM[5], '#9a6bff');

// fraction clamps to [0,1]
assert.equal(spectrumHex(-1), SPECTRUM[0]);
assert.equal(spectrumHex(2), SPECTRUM[5]);
// 0 → red, 1 → purple, 0.5 → a middle band (green-ish, index 2 or 3)
assert.equal(spectrumHex(0), '#ff5a5a');
assert.equal(spectrumHex(1), '#9a6bff');

// partial conic: filled portion ends at the fraction, rest transparent
const partial = spectrumConic(0.76);
assert.ok(partial.includes('transparent 76%'), 'partial ends in transparent at the fraction');
assert.ok(partial.startsWith('conic-gradient('));

// full conic: closes the wheel through magenta back to red, no transparent
const full = spectrumConic(1);
assert.ok(full.includes('#e85ac0'), 'full ring bridges through magenta');
assert.ok(!full.includes('transparent'), 'full ring has no gap');

console.log('spectrum.test.mjs OK');
