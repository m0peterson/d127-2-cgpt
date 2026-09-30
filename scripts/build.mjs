import { cp, mkdir, rm, stat } from 'node:fs/promises';

for (const path of ['public/index.html', 'public/styles.css', 'public/app.js', 'public/lib/dice.js', 'public/lib/quotes.js']) {
  await stat(new URL(`../${path}`, import.meta.url));
}
const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL('../public/', import.meta.url), output, { recursive: true });
console.log('Static app built in dist/');
