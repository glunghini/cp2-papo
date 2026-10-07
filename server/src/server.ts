import { env } from './config/env';
import { createApp } from './app';

const app = createApp();

app.listen(env.port, () => {
  console.info(`[api] papo-api ouvindo na porta ${env.port}`);
});
