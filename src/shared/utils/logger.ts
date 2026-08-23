import pino from 'pino';
import { env } from '../../config/env';

export const logger = pino({
  level: env.logLevel,
  redact: {
    paths: ['password', '*.password', 'token', '*.token', 'authorization'],
    censor: '[REDACTED]',
  },
});
