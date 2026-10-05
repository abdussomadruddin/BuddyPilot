const test = require('node:test');
const assert = require('node:assert/strict');
const { buildThreadsPromoteCaption } = require('../lib/threads-promote-caption');
const { validateProductAudience } = require('../lib/supabase-db');

test('caption calls target market, states supplied highlight and ends with comment/DM CTA', () => {
  for (let variant = 0; variant < 4; variant++) {
    const caption = buildThreadsPromoteCaption({name:'Produk',targetMarket:'owner bisnes',highlight:'Template untuk susun maklumat produk.'},variant);
    const parts = caption.split('\n\n');
    assert.equal(parts.length, 3);
    assert.match(parts[0], /owner bisnes/);
    assert.equal(parts[1], 'Template untuk susun maklumat produk.');
    assert.match(parts[2], /Komen/);
    assert.match(parts[2], /DM/);
    assert.ok(caption.length <= 280);
  }
});

test('target market is required and max-length captions retain the CTA', () => {
  assert.throws(() => validateProductAudience({targetMarket:'  '}), /wajib/);
  assert.throws(() => buildThreadsPromoteCaption({name:'Produk'}), /target market/);
  assert.throws(() => validateProductAudience({targetMarket:'x'.repeat(81)}), /80/);
  const caption = buildThreadsPromoteCaption({name:'x'.repeat(100),targetMarket:'x'.repeat(80)});
  assert.ok(caption.length <= 280);
  assert.match(caption, /DM/);
});
