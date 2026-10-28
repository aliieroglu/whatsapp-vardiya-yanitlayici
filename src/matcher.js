'use strict';

const CALL_PHRASES = [
  'kimler gelebilir', 'kim gelebilir', 'gelebilecek', 'gelebilen',
  'gelebilir misiniz', 'uygun olanlar', 'gelmek isteyen', 'personel lazım',
];
const TIME = /(?:^|[^\d])(?:[01]?\d|2[0-3])[:.][0-5]\d(?!\d)/u;
const CANCELLED = ['iptal', 'kontenjan doldu', 'alım tamam', 'gerek kalmadı'];

function isShiftCall(text, phrases = CALL_PHRASES) {
  if (typeof text !== 'string') return false;
  const normalized = text.toLocaleLowerCase('tr-TR').replace(/\s+/gu, ' ').trim();
  return TIME.test(normalized) && !CANCELLED.some((phrase) => normalized.includes(phrase)) &&
    phrases.some((phrase) => normalized.includes(phrase));
}

module.exports = { isShiftCall };
