import { rollDice, isValidRoll, formatRoll, randomInt } from './lib/dice.js';
import { DEFAULT_EXAMPLES, MAX_IMPORT_BYTES, parseExamples, mockProvider } from './lib/quotes.js';

const $ = id => document.getElementById(id);
const storage = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
};
let lastRoll = storage.get('d127:last-roll', null);
let rolling = false;
let generating = false;
let copyTimer;

function showMessage(id, text, success = false) {
  const element = $(id);
  element.textContent = text;
  element.hidden = !text;
  element.classList.toggle('success', success);
}

function displayRoll(roll) {
  $('d127-value').textContent = roll.d127;
  $('d3-value').textContent = roll.d3;
  $('roll-summary').textContent = formatRoll(roll);
  $('roll-summary').parentElement.classList.add('has-roll');
  $('copy-roll').disabled = false;
}
if (isValidRoll(lastRoll)) displayRoll(lastRoll);
else lastRoll = null;

function openView(view) {
  const isDice = view === 'dice';
  $('dice-view').hidden = !isDice;
  $('generator-view').hidden = isDice;
  for (const [id, active] of [['dice-tab', isDice], ['generator-tab', !isDice]]) {
    $(id).classList.toggle('active', active);
    $(id).setAttribute('aria-pressed', String(active));
  }
}
$('dice-tab').addEventListener('click', () => openView('dice'));
$('generator-tab').addEventListener('click', () => openView('generator'));

$('roll-button').addEventListener('click', async () => {
  if (rolling) return;
  rolling = true;
  clearTimeout(copyTimer);
  $('copy-roll').disabled = true;
  $('roll-button').disabled = true;
  $('roll-button-label').textContent = 'Бросаем…';
  showMessage('dice-error', '');
  let interval;
  try {
    const result = rollDice();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      $('dice-board').classList.add('rolling');
      interval = setInterval(() => {
        // Animation is visual only; the result is sampled once above.
        $('d127-value').textContent = randomInt(127);
        $('d3-value').textContent = randomInt(3);
      }, 65);
      await new Promise(resolve => setTimeout(resolve, 520));
      clearInterval(interval);
    }
    lastRoll = result;
    displayRoll(result);
    storage.set('d127:last-roll', result);
    if (typeof navigator.vibrate === 'function') { try { navigator.vibrate(20); } catch {} }
  } catch {
    showMessage('dice-error', 'Не удалось бросить кубики. Обнови страницу в современном браузере.');
    if (lastRoll) displayRoll(lastRoll);
    else { $('d127-value').textContent = '···'; $('d3-value').textContent = '·'; }
  } finally {
    clearInterval(interval);
    rolling = false;
    $('dice-board').classList.remove('rolling');
    $('roll-button').disabled = false;
    $('roll-button-label').textContent = 'Бросить кубики';
  }
});

$('copy-roll').addEventListener('click', async () => {
  if (!lastRoll || rolling) return;
  const rollAtCopy = lastRoll;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(formatRoll(rollAtCopy));
    if (lastRoll !== rollAtCopy || rolling) return;
    $('roll-summary').textContent = 'Результат скопирован';
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { if (!rolling && lastRoll === rollAtCopy) displayRoll(lastRoll); }, 1500);
  } catch { showMessage('dice-error', 'Копирование недоступно. Результат можно переписать с экрана.'); }
});

const savedExamples = storage.get('d127:examples', DEFAULT_EXAMPLES);
try { $('examples').value = parseExamples(JSON.stringify(savedExamples), 'json').join('\n'); }
catch { $('examples').value = DEFAULT_EXAMPLES.join('\n'); }
const savedModel = storage.get('d127:model', '');
$('model').value = typeof savedModel === 'string' ? savedModel.slice(0, 120) : '';

function updateExamples() {
  try {
    const examples = parseExamples($('examples').value);
    $('examples-count').textContent = `${examples.length} / 100`;
    const saved = storage.set('d127:examples', examples);
    showMessage('generator-message', saved ? '' : 'Браузер не разрешает сохранять примеры. В этой вкладке они всё равно работают.');
    return examples;
  } catch (error) {
    $('examples-count').textContent = 'Проверь примеры';
    showMessage('generator-message', error.message);
    return null;
  }
}
updateExamples();
$('examples').addEventListener('input', updateExamples);
$('model').addEventListener('input', () => storage.set('d127:model', $('model').value.trim()));

$('examples-file').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > MAX_IMPORT_BYTES) throw new Error('Файл должен быть меньше 100 КБ.');
    if (!/\.(txt|json)$/i.test(file.name)) throw new Error('Выбери файл .txt или .json.');
    const text = await file.text();
    const examples = parseExamples(text, /\.json$/i.test(file.name) ? 'json' : 'text');
    if (!examples.length) throw new Error('В файле нет цитат.');
    $('examples').value = examples.join('\n');
    updateExamples();
    showMessage('generator-message', `Загружено примеров: ${examples.length}.`, true);
  } catch (error) { showMessage('generator-message', error.message); }
  finally { event.target.value = ''; }
});

$('generator-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (generating) return;
  const examples = updateExamples();
  if (examples === null) return;
  generating = true;
  $('generate-button').disabled = true;
  $('generate-button-label').textContent = 'Подбираем демо-цитату…';
  $('generated-result').setAttribute('aria-busy', 'true');
  try {
    // Key remains in the password field. The mock never reads or sends it.
    // Future integration: replace mockProvider with a real provider after implementing it.
    const result = await mockProvider.generate({ model: $('model').value.trim(), examples });
    $('generated-quote').textContent = result.text;
    $('generated-result').hidden = false;
  } catch (error) { showMessage('generator-message', error.message || 'Не удалось получить цитату. Попробуй ещё раз.'); }
  finally {
    generating = false;
    $('generate-button').disabled = false;
    $('generate-button-label').textContent = 'Ещё демо-цитата';
    $('generated-result').setAttribute('aria-busy', 'false');
  }
});
