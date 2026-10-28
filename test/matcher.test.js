'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isShiftCall } = require('../src/matcher');

test('matches a timed Turkish invitation to a shift', () => {
  assert.equal(isShiftCall('Yarın saat 18:00 için kimler gelebilir?'), true);
});

test('requires both a valid time and an invitation', () => {
  assert.equal(isShiftCall('Yarın 18:00 toplantı notları gönderildi'), false);
  assert.equal(isShiftCall('Kimler gelebilir?'), false);
  assert.equal(isShiftCall('25:99 için kimler gelebilir?'), false);
});

test('handles Turkish casing, spacing, and other common wording', () => {
  assert.equal(isShiftCall('SAAT 08.30   İÇİN   KİMLER   GELEBİLİR?'), true);
  assert.equal(isShiftCall('20:15 için gelebilecek olanlar yazsın'), true);
});

test('does not respond when the invitation is cancelled or filled', () => {
  assert.equal(isShiftCall('18:00 için kimler gelebilir? İPTAL'), false);
  assert.equal(isShiftCall('18:00 için kimler gelebilir? Kontenjan doldu.'), false);
});

test('does not match non-text content', () => {
  assert.equal(isShiftCall(undefined), false);
  assert.equal(isShiftCall(''), false);
});
