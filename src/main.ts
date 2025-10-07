import dotenv from 'dotenv';
dotenv.config();
 

import Redis from 'ioredis';
import Fastify from 'fastify';
import FastifyCors from '@fastify/cors';

import chalk from 'chalk';

export const redis =
  (process.env.REDIS_URI && new Redis(process.env.REDIS_URI)) ||
  (process.env.REDIS_HOST &&
    new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
    }));

const fastify = Fastify({
  maxParamLength: 1000,
  logger: true,
});
export const tmdbApi = process.env.TMDB_KEY || 'b424d062aa0e133deb5e46b46eb3549e';
export const tmdbReadAccessToken =
  process.env.TMDB_READ_ACCESS_TOKEN ||
  'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiNDI0ZDA2MmFhMGUxMzNkZWI1ZTQ2YjQ2ZWIzNTQ5ZSIsIm5iZiI6MTc1OTc4MjAwMi4xNSwic3ViIjoiNjhlNDI0NzJhMGYyNzA2NWE1MjViYWFhIiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.HyZaG2-LNCQjFCwhXTnJIIQHXKkRIWYwqdq20ayPqco';
// Ensure the read token is available for providers that read directly from env
if (!process.env.TMDB_READ_ACCESS_TOKEN) {
  process.env.TMDB_READ_ACCESS_TOKEN = tmdbReadAccessToken;
}

  (async () => {
  const PORT = Number(process.env.PORT) || 10000;
  // Required startup log
  console.log('Server running on PORT', process.env.PORT || 10000);
  console.log('✅ Using Zoro as primary provider');

  await fastify.register(FastifyCors, {
    origin: process.env.CORS_ORIGIN
      ? (process.env.CORS_ORIGIN.includes(',')
          ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
          : process.env.CORS_ORIGIN)
      : '*',
    methods: ['GET', 'OPTIONS'],
  });

  console.log(chalk.green(`Starting server on port ${PORT}... 🚀`));
  
  if (!process.env.REDIS_HOST)
    console.warn(chalk.yellowBright('Redis not found. Cache disabled.'));
  if (!process.env.TMDB_KEY)
    console.warn(
      chalk.yellowBright('TMDB api key not found. the TMDB meta route may not work.'),
    );

  // Dynamically import route modules so failures do not crash startup
  try {
    const mod = await import('./routes/anime');
    await fastify.register(mod.default, { prefix: '/anime' });
  } catch (e:any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register anime routes');
  }
  try {
    const mod = await import('./routes/meta');
    await fastify.register(mod.default, { prefix: '/meta' });
  } catch (e:any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register meta routes');
  }
  try {
    const mod = await import('./routes/manga');
    await fastify.register(mod.default, { prefix: '/manga' });
  } catch (e:any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register manga routes');
  }
  try {
    const mod = await import('./routes/movies');
    await fastify.register(mod.default, { prefix: '/movies' });
  } catch (e:any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register movies routes');
  }
  try {
    const mod = await import('./routes/books');
    await fastify.register(mod.default, { prefix: '/books' });
  } catch (e:any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register books routes');
  }
  try {
    const mod = await import('./routes/light-novels');
    await fastify.register(mod.default, { prefix: '/light-novels' });
  } catch (e:any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register light-novels routes');
  }
  try {
    const mod = await import('./routes/news');
    await fastify.register(mod.default, { prefix: '/news' });
  } catch (e:any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register news routes');
  }
  try {
    const mod = await import('./utils');
    await fastify.register(mod.default, { prefix: '/utils' });
  } catch (e:any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register utils routes');
  }

  // Healthcheck for Render
  fastify.get('/health', async (_, reply) => {
    reply.status(200).send({ status: 'ok' });
  });

  try {
    fastify.get('/', (_, rp) => {
      rp.status(200).send(
        `Welcome to consumet api! 🎉 \n${process.env.NODE_ENV === 'DEMO'
          ? 'This is a demo of the api. You should only use this for testing purposes.'
          : ''
        }`,
      );
    });
    fastify.setNotFoundHandler((request, reply) => {
      reply.status(404).send({
        message: '',
        error: 'page not found',
      });
    });

    fastify.listen({ port: PORT, host: '0.0.0.0' }, (e, address) => {
      if (e) {
        console.error('Fastify listen failed:', e?.message || e);
        return;
      }
      console.log(`server listening on ${address}`);
      console.log(`Server running on PORT ${PORT}`);
    });
  } catch (err: any) {
    console.error('Startup error:', err?.message || err);
    // Do not exit; keep process alive even if a provider or route fails to register
  }
})();
export default async function handler(req: any, res: any) {
  await fastify.ready();
  fastify.server.emit('request', req, res);
}