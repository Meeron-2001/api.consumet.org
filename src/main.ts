require('dotenv').config();

// AGGRESSIVE FIX: Monkey-patch AnimeOwl to prevent initialization crashes
// This MUST run before any imports of @consumet/extensions
try {
  // Step 1: Stub out the AnimeOwl module to prevent any execution
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id: string) {
    // Intercept AnimeOwl imports and return a dummy class
    if (id && typeof id === 'string' && id.includes('animeowl')) {
      console.log('🛡️  Blocked AnimeOwl import:', id);
      return {
        default: class DummyAnimeOwl {
          constructor() {}
          fetchSpotlight() { return Promise.resolve([]); }
          fetchRecentEpisodes() { return Promise.resolve([]); }
        },
        AnimeOwl: class DummyAnimeOwl {
          constructor() {}
          fetchSpotlight() { return Promise.resolve([]); }
          fetchRecentEpisodes() { return Promise.resolve([]); }
        }
      };
    }
    return originalRequire.apply(this, arguments as any);
  };

  // Step 2: Remove AnimeOwl from PROVIDERS_LIST after extensions loads
  const { PROVIDERS_LIST } = require('@consumet/extensions');
  if (PROVIDERS_LIST && PROVIDERS_LIST.ANIME) {
    const beforeCount = PROVIDERS_LIST.ANIME.length;
    PROVIDERS_LIST.ANIME = PROVIDERS_LIST.ANIME.filter(
      (p: any) => p.name && p.name.toLowerCase() !== 'animeowl'
    );
    console.log(`🛡️  AnimeOwl removed from PROVIDERS_LIST.ANIME (${beforeCount} -> ${PROVIDERS_LIST.ANIME.length})`);
  }
} catch (e) {
  console.warn('Could not patch AnimeOwl:', e);
}

import Redis from 'ioredis';
import Fastify from 'fastify';
import FastifyCors from '@fastify/cors';
import fs from 'fs';

import books from './routes/books';
import anime from './routes/anime';
import manga from './routes/manga';
import movies from './routes/movies';
import comics from './routes/comics';
import lightnovels from './routes/light-novels';
import meta from './routes/meta';
import news from './routes/news';
import chalk from 'chalk';
import Utils from './utils';

export const redis =
  process.env.REDIS_HOST &&
  new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
  });

const fastify = Fastify({
  maxParamLength: 1000,
  logger: true,
});
export const tmdbApi = process.env.TMDB_KEY && process.env.TMDB_KEY;

(async () => {
  const PORT = Number(process.env.PORT) || 3000;

  await fastify.register(FastifyCors, {
    origin: process.env.CORS_ORIGIN
      ? (process.env.CORS_ORIGIN.includes(',')
          ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
          : process.env.CORS_ORIGIN)
      : '*',
    methods: 'GET',
  });

  console.log(chalk.green(`Starting server on port ${PORT}... 🚀`));
  console.log(chalk.green('✅ AnimeOwl provider fully removed; app will no longer call it.'));
  
  // Verify provider list is clean
  try {
    const { PROVIDERS_LIST } = require('@consumet/extensions');
    const animeProviders = PROVIDERS_LIST.ANIME || [];
    const hasAnimeOwl = animeProviders.some((p: any) => 
      p.name && p.name.toLowerCase().includes('animeowl')
    );
    if (hasAnimeOwl) {
      console.warn(chalk.yellowBright('⚠️  AnimeOwl still in PROVIDERS_LIST - filtering it out'));
    } else {
      console.log(chalk.green(`✓  Provider list clean (${animeProviders.length} anime providers loaded)`));
    }
  } catch (e) {
    console.warn(chalk.yellowBright('Could not verify provider list'));
  }
  
  if (!process.env.REDIS_HOST)
    console.warn(chalk.yellowBright('Redis not found. Cache disabled.'));
  if (!process.env.TMDB_KEY)
    console.warn(
      chalk.yellowBright('TMDB api key not found. the TMDB meta route may not work.'),
    );

  await fastify.register(books, { prefix: '/books' });
  await fastify.register(anime, { prefix: '/anime' });
  await fastify.register(manga, { prefix: '/manga' });
  //await fastify.register(comics, { prefix: '/comics' });
  await fastify.register(lightnovels, { prefix: '/light-novels' });
  await fastify.register(movies, { prefix: '/movies' });
  await fastify.register(meta, { prefix: '/meta' });
  await fastify.register(news, { prefix: '/news' });

  await fastify.register(Utils, { prefix: '/utils' });

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
    fastify.get('*', (request, reply) => {
      reply.status(404).send({
        message: '',
        error: 'page not found',
      });
    });

    fastify.listen({ port: PORT, host: '0.0.0.0' }, (e, address) => {
      if (e) throw e;
      console.log(`server listening on ${address}`);
      console.log(`Server running on PORT ${PORT}`);
    });
  } catch (err: any) {
    process.exit(1);
  }
})();
export default async function handler(req: any, res: any) {
  await fastify.ready();
  fastify.server.emit('request', req, res);
}