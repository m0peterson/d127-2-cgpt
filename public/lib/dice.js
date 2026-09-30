const UINT32_RANGE = 2 ** 32;

/** An unbiased integer in [1, sides]; rejection avoids modulo bias. */
export function randomInt(sides, cryptoSource = globalThis.crypto) {
  if (!Number.isSafeInteger(sides) || sides < 1 || sides > UINT32_RANGE) {
    throw new RangeError('Invalid number of sides');
  }
  if (!cryptoSource?.getRandomValues) throw new Error('Secure random generator unavailable');
  const limit = UINT32_RANGE - (UINT32_RANGE % sides);
  const buffer = new Uint32Array(1);
  do { cryptoSource.getRandomValues(buffer); } while (buffer[0] >= limit);
  return (buffer[0] % sides) + 1;
}

/** Both dice belong to a single roll, with one timestamp. */
export function rollDice(cryptoSource = globalThis.crypto) {
  return { d127: randomInt(127, cryptoSource), d3: randomInt(3, cryptoSource), rolledAt: new Date().toISOString() };
}

export function isValidRoll(value) {
  return value != null && Number.isInteger(value.d127) && value.d127 >= 1 && value.d127 <= 127 &&
    Number.isInteger(value.d3) && value.d3 >= 1 && value.d3 <= 3 &&
    typeof value.rolledAt === 'string' && Number.isFinite(Date.parse(value.rolledAt));
}

export function formatRoll(roll) {
  if (!isValidRoll(roll)) throw new TypeError('Invalid roll');
  return `Страница ${roll.d127}, цитата ${roll.d3}`;
}
