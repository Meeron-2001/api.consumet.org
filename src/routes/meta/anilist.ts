import { Redis } from 'ioredis';
import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { META } from '@consumet/extensions';
import { Genres, SubOrSub } from '@consumet/extensions/dist/models';
import Anilist from '@consumet/extensions/dist/providers/meta/anilist';
import { StreamingServers } from '@consumet/extensions/dist/models';

import cache from '../../utils/cache';
import { redis } from '../../main';
import Zoro from '@consumet/extensions/dist/providers/anime/zoro';
import Gogoanime from '@consumet/extensions/dist/providers/anime/gogoanime';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro:
        "Welcome to the anilist provider: check out the provider's website @ https://anilist.co/",
      routes: ['/:query', '/info/:id', '/watch/:episodeId'],
      documentation: 'https://docs.consumet.org/#tag/anilist',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const anilist = generateAnilistMeta();

    const query = (request.params as { query: string }).query;

    const page = (request.query as { page: number }).page;
    const perPage = (request.query as { perPage: number }).perPage;

    const res = await anilist.search(query, page, perPage);

    reply.status(200).send(res);
  });

  fastify.get(
    '/advanced-search',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = (request.query as { query: string }).query;
      const page = (request.query as { page: number }).page;
      const perPage = (request.query as { perPage: number }).perPage;
      const type = (request.query as { type: string }).type;
      let genres = (request.query as { genres: string | string[] }).genres;
      const id = (request.query as { id: string }).id;
      const format = (request.query as { format: string }).format;
      let sort = (request.query as { sort: string | string[] }).sort;
      const status = (request.query as { status: string }).status;
      const year = (request.query as { year: number }).year;
      const season = (request.query as { season: string }).season;

      const anilist = generateAnilistMeta();

      if (genres) {
        JSON.parse(genres as string).forEach((genre: string) => {
          if (!Object.values(Genres).includes(genre as Genres)) {
            return reply.status(400).send({ message: `${genre} is not a valid genre` });
          }
        });

        genres = JSON.parse(genres as string);
      }

      if (sort) sort = JSON.parse(sort as string);

      if (season)
        if (!['WINTER', 'SPRING', 'SUMMER', 'FALL'].includes(season))
          return reply.status(400).send({ message: `${season} is not a valid season` });

      const res = await anilist.advancedSearch(
        query,
        type,
        page,
        perPage,
        format,
        sort as string[],
        genres as string[],
        id,
        year,
        status,
        season,
      );

      reply.status(200).send(res);
    },
  );

  fastify.get('/trending', async (request: FastifyRequest, reply: FastifyReply) => {
    const page = (request.query as { page: number }).page;
    const perPage = (request.query as { perPage: number }).perPage;

    const anilist = generateAnilistMeta();

    redis
      ? reply
        .status(200)
        .send(
          await cache.fetch(
            redis as Redis,
            `anilist:trending;${page};${perPage}`,
            async () => await anilist.fetchTrendingAnime(page, perPage),
            60 * 60,
          ),
        )
      : reply.status(200).send(await anilist.fetchTrendingAnime(page, perPage));
  });

  fastify.get('/popular', async (request: FastifyRequest, reply: FastifyReply) => {
    const page = (request.query as { page: number }).page;
    const perPage = (request.query as { perPage: number }).perPage;

    const anilist = generateAnilistMeta();

    redis
      ? reply
        .status(200)
        .send(
          await cache.fetch(
            redis as Redis,
            `anilist:popular;${page};${perPage}`,
            async () => await anilist.fetchPopularAnime(page, perPage),
            60 * 60,
          ),
        )
      : reply.status(200).send(await anilist.fetchPopularAnime(page, perPage));
  });

  fastify.get(
    '/airing-schedule',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const page = (request.query as { page: number }).page;
      const perPage = (request.query as { perPage: number }).perPage;
      const weekStart = (request.query as { weekStart: number | string }).weekStart;
      const weekEnd = (request.query as { weekEnd: number | string }).weekEnd;
      const notYetAired = (request.query as { notYetAired: boolean }).notYetAired;

      const anilist = generateAnilistMeta();
      const _weekStart = Math.ceil(Date.now() / 1000);

      const res = await anilist.fetchAiringSchedule(
        page ?? 1,
        perPage ?? 20,
        weekStart ?? _weekStart,
        weekEnd ?? _weekStart + 604800,
        notYetAired ?? true,
      );

      reply.status(200).send(res);
    },
  );

  fastify.get('/genre', async (request: FastifyRequest, reply: FastifyReply) => {
    const genres = (request.query as { genres: string }).genres;
    const page = (request.query as { page: number }).page;
    const perPage = (request.query as { perPage: number }).perPage;

    const anilist = generateAnilistMeta();

    if (typeof genres === 'undefined')
      return reply.status(400).send({ message: 'genres is required' });

    JSON.parse(genres).forEach((genre: string) => {
      if (!Object.values(Genres).includes(genre as Genres)) {
        return reply.status(400).send({ message: `${genre} is not a valid genre` });
      }
    });

    const res = await anilist.fetchAnimeGenres(JSON.parse(genres), page, perPage);

    reply.status(200).send(res);
  });

  fastify.get(
    '/recent-episodes',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const providerRaw = (request.query as { provider?: string }).provider;
      const page = (request.query as { page: number }).page;
      const perPage = (request.query as { perPage: number }).perPage;

      const allowed = new Set(['zoro', 'gogoanime']);
      const provider = providerRaw && allowed.has(providerRaw.toLowerCase())
        ? providerRaw.toLowerCase()
        : 'zoro';

      const anilist = generateAnilistMeta(provider);

      try {
        const res = await anilist.fetchRecentEpisodes(provider, page, perPage);
        reply.status(200).send(res);
      } catch (err: any) {
        fastify.log.error({ err: err?.message || err, provider }, 'recent-episodes failed');
        reply.status(500).send({ message: 'Provider failed: ' + (err?.message || String(err)) });
      }
    },
  ),
    fastify.get('/random-anime', async (request: FastifyRequest, reply: FastifyReply) => {
      const anilist = generateAnilistMeta();

      const res = await anilist.fetchRandomAnime().catch((err) => {
        return reply.status(404).send({ message: 'Anime not found' });
      });
      reply.status(200).send(res);
    });

  fastify.get('/servers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;
    const providerRaw = (request.query as { provider?: string }).provider;

    const allowed = new Set(['zoro', 'gogoanime']);
    const provider = providerRaw && allowed.has(providerRaw.toLowerCase())
      ? providerRaw.toLowerCase()
      : 'zoro';

    const anilist = generateAnilistMeta(provider);

    try {
      const res = await anilist.fetchEpisodeServers(id);
      reply.status(200).send(res);
    } catch (err: any) {
      fastify.log.error({ err: err?.message || err, provider }, 'servers failed');
      reply.status(500).send({ message: 'Provider failed: ' + (err?.message || String(err)) });
    }
  });

  fastify.get('/episodes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const id = (request.params as { id: string }).id;
    const provider = (request.query as { provider?: string }).provider;
    let fetchFiller = (request.query as { fetchFiller?: string | boolean }).fetchFiller;
    let dub = (request.query as { dub?: string | boolean }).dub;
    const locale = (request.query as { locale?: string }).locale;

    let anilist = generateAnilistMeta(provider);

    if (dub === 'true' || dub === '1') dub = true;
    else dub = false;

    if (fetchFiller === 'true' || fetchFiller === '1') fetchFiller = true;
    else fetchFiller = false;

    try {
      redis
        ? reply
          .status(200)
          .send(
            await cache.fetch(
              redis,
              `anilist:episodes;${id};${dub};${fetchFiller};${anilist.provider.name.toLowerCase()}`,
              async () =>
                anilist.fetchEpisodesListById(
                  id,
                  dub as boolean,
                  fetchFiller as boolean,
                ),
              dayOfWeek === 0 || dayOfWeek === 6 ? 60 * 120 : (60 * 60) / 2,
            ),
          )
        : reply
          .status(200)
          .send(await anilist.fetchEpisodesListById(id, dub, fetchFiller as boolean));
    } catch (err) {
      return reply.status(404).send({ message: 'Anime not found' });
    }
  });

  // anilist info without episodes
  fastify.get('/data/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;

    const anilist = generateAnilistMeta();
    const res = await anilist.fetchAnilistInfoById(id);

    reply.status(200).send(res);
  });

  // anilist info with episodes
  fastify.get('/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;
    const today = new Date();
    const dayOfWeek = today.getDay();
    const provider = (request.query as { provider?: string }).provider;
    let fetchFiller = (request.query as { fetchFiller?: string | boolean }).fetchFiller;
    let isDub = (request.query as { dub?: string | boolean }).dub;
    const locale = (request.query as { locale?: string }).locale;

    let anilist = generateAnilistMeta(provider);

    if (isDub === 'true' || isDub === '1') isDub = true;
    else isDub = false;

    if (fetchFiller === 'true' || fetchFiller === '1') fetchFiller = true;
    else fetchFiller = false;

    try {
      redis
        ? reply
          .status(200)
          .send(
            await cache.fetch(
              redis,
              `anilist:info;${id};${isDub};${fetchFiller};${anilist.provider.name.toLowerCase()}`,
              async () =>
                anilist.fetchAnimeInfo(id, isDub as boolean, fetchFiller as boolean),
              dayOfWeek === 0 || dayOfWeek === 6 ? 60 * 120 : (60 * 60) / 2,
            ),
          )
        : reply
          .status(200)
          .send(
            await anilist.fetchAnimeInfo(id, isDub as boolean, fetchFiller as boolean),
          );
    } catch (err: any) {
      reply.status(500).send({ message: err.message });
    }
  });

  // anilist character info
  fastify.get('/character/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;

    const anilist = generateAnilistMeta();
    const res = await anilist.fetchCharacterInfoById(id);

    reply.status(200).send(res);
  });

  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const episodeId = (request.params as { episodeId: string }).episodeId;
      const providerQuery = (request.query as { provider?: string }).provider;
      const server = (request.query as { server?: StreamingServers }).server;
      let isDub = (request.query as { dub?: string | boolean }).dub;

      if (server && !Object.values(StreamingServers).includes(server))
        return reply.status(400).send({ message: 'Invalid server' });

      isDub = isDub === 'true' || isDub === '1' ? true : false;

      // Build provider attempt order, focusing on Zoro then Gogoanime
      const defaultOrder = ['zoro', 'gogoanime'];
      const requested = providerQuery ? [providerQuery.toLowerCase()] : [];
      const providerOrder = Array.from(new Set([...requested, ...defaultOrder]))
        .filter((p) => defaultOrder.includes(p));

      const errors: Array<{ provider: string; error: string }> = [];

      for (const name of providerOrder) {
        try {
          const anilist = generateAnilistMeta(name);
          fastify.log.info({ name, episodeId, server, isDub }, 'Attempting provider');
          const result =
            name === 'zoro'
              ? await anilist.fetchEpisodeSources(
                  episodeId,
                  server,
                  isDub ? SubOrSub.DUB : SubOrSub.SUB,
                )
              : await anilist.fetchEpisodeSources(episodeId, server);

          const sources = (result as any)?.sources || [];
          const hasPlayable = Array.isArray(sources) && sources.some((s: any) => {
            const url = s?.url || '';
            return s?.isM3U8 === true || /\.m3u8(\?|$)/i.test(url) || /\.mp4(\?|$)/i.test(url);
          });

          if (hasPlayable) {
            fastify.log.info({ providerUsed: name }, 'Found playable source');
            return reply.status(200).send({ providerUsed: name, ...result });
          }

          fastify.log.warn({ name }, 'No playable sources found on provider');
          errors.push({ provider: name, error: 'No playable sources' });
        } catch (e: any) {
          const msg = e?.message || String(e);
          fastify.log.error({ err: msg, provider: name }, 'Provider fetch failed');
          errors.push({ provider: name, error: msg });
        }
      }

      return reply.status(404).send({
        message: 'No playable source found from available providers',
        triedProviders: providerOrder,
        errors,
      });
    },
  );

  //anilist staff info from character id (for example: voice actors)
  //http://127.0.0.1:3000/meta/anilist/staff/95095  (gives info of sukuna's voice actor (Junichi Suwabe) )
  fastify.get('/staff/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;

    const anilist = generateAnilistMeta();
    try {
      redis
        ? reply
          .status(200)
          .send(
            await cache.fetch(
              redis,
              `anilist:staff;${id}`,
              async () => await anilist.fetchStaffById(Number(id)),
              60 * 60,
            ),
          )
        : reply.status(200).send(await anilist.fetchStaffById(Number(id)));
    } catch (err: any) {
      reply.status(404).send({ message: err.message });
    }
  });
};

const generateAnilistMeta = (provider: string | undefined = undefined): Anilist => {
  let selected: any;
  const name = provider?.toLowerCase();
  if (name === 'gogoanime') {
    selected = new Gogoanime(process.env.GOGOANIME_URL);
  } else if (name === 'zoro') {
    selected = new Zoro(process.env.ZORO_URL);
  }

  if (!selected) {
    try {
      selected = new Zoro(process.env.ZORO_URL);
    } catch (e) {
      selected = new Gogoanime(process.env.GOGOANIME_URL);
    }
  }

  return new META.Anilist(selected, {
    url: process.env.PROXY as string | string[],
  });
};

export default routes;
