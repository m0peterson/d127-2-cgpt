import test from 'node:test';
import assert from 'node:assert/strict';
import { randomInt, rollDice, isValidRoll, formatRoll } from '../public/lib/dice.js';

function source(values) {
  let index = 0;
  return { getRandomValues(buffer) { assert.ok(index < values.length, 'Random source exhausted'); buffer[0] = values[index++]; return buffer; } };
}

test('inclusive ranges: 1, 127 and 1, 3', () => {
  assert.equal(randomInt(127, source([0])), 1);
  assert.equal(randomInt(127, source([126])), 127);
  assert.equal(randomInt(3, source([0])), 1);
  assert.equal(randomInt(3, source([2])), 3);
});

test('rejects tail values instead of biasing either die', () => {
  assert.equal(randomInt(127, source([0xffffffff, 126])), 127);
  assert.equal(randomInt(3, source([0xffffffff, 2])), 3);
});

test('pair uses separate draws and a valid shared timestamp', () => {
  const roll = rollDice(source([126, 0]));
  assert.equal(roll.d127, 127);
  assert.equal(roll.d3, 1);
  assert.ok(isValidRoll(roll));
  assert.equal(formatRoll(roll), 'Страница 127, цитата 1');
});

test('all 381 pairs can be produced', () => {
  const pairs = new Set();
  for (let page = 0; page < 127; page++) {
    for (let quote = 0; quote < 3; quote++) {
      const roll = rollDice(source([page, quote]));
      pairs.add(`${roll.d127}:${roll.d3}`);
    }
  }
  assert.equal(pairs.size, 381);
});

test('corrupted saved rolls are not accepted', () => {
  for (const value of [null, {}, { d127: 0, d3: 1, rolledAt: new Date().toISOString() }, { d127: 127, d3: 4, rolledAt: new Date().toISOString() }, { d127: 1, d3: 1, rolledAt: 'invalid' }]) {
    assert.equal(isValidRoll(value), false);
  }
});

test('invalid dice fail explicitly', () => {
  for (const sides of [0, -1, 1.5, NaN, Infinity, 2 ** 32 + 1]) assert.throws(() => randomInt(sides), RangeError);
  assert.throws(() => randomInt(127, {}), /unavailable/);
});
