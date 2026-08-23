import { createApp } from './app';
import { env } from './config/env';
import { logger } from './shared/utils/logger';

const app = createApp();

app.listen(env.port, () => {
  logger.info(`API escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
});
