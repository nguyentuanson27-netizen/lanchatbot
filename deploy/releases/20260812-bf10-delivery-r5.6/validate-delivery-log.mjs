import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , logPath] = process.argv;
if (!logPath) throw new Error('USAGE: validate-delivery-log.mjs <log-file>');
const lines = readFileSync(resolve(logPath), 'utf8').split(/\r?\n/u);
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  if (/(^|[^a-z])(fatal|uncaught|unhandled|\[error\])([^a-z]|$)/iu.test(trimmed)) {
    throw new Error('DELIVERY_LOG_FATAL_OR_ERROR_TEXT_DETECTED');
  }
  if (trimmed.startsWith('{')) {
    try {
      const record = JSON.parse(trimmed);
      if (typeof record === 'object' && record !== null && String(record.level ?? '').toLowerCase() === 'error') {
        throw new Error('DELIVERY_LOG_STRUCTURED_ERROR_LEVEL_DETECTED');
      }
    } catch (error) {
      if (error instanceof SyntaxError) continue;
      throw error;
    }
  }
}
console.log('delivery log safety validation: PASS');
