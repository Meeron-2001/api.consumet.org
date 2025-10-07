import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { PROVIDERS_LIST } from '@consumet/extensions';

import gogoanime from './gogoanime';
import zoro from './zoro';
// The following providers are disabled by default for stability on Render.
// Uncomment any you wish to enable.
// import animepahe from './animepahe';
// import nineanime from './9anime';
// import animefox from './animefox';
// import anify from './anify';
// import crunchyroll from './crunchyroll';
// import bilibili from './bilibili';
// import marin from './marin';
// import anix from './anix';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  try {
    await fastify.register(gogoanime, { prefix: '/gogoanime' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register gogoanime routes');
  }
  try {
    await fastify.register(zoro, { prefix: '/zoro' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register zoro routes');
  }
  // await fastify.register(animepahe, { prefix: '/animepahe' });
  // await fastify.register(nineanime, { prefix: '/9anime' });
  // await fastify.register(animefox, { prefix: '/animefox' });
  // await fastify.register(anify, { prefix: '/anify' });
  // await fastify.register(crunchyroll, { prefix: '/crunchyroll' });
  // await fastify.register(bilibili, { prefix: '/bilibili' });
  // await fastify.register(marin, { prefix: '/marin' });
  // await fastify.register(anix, { prefix: '/anix' });

  fastify.get('/', async (request: any, reply: any) => {
    reply.status(200).send('Welcome to Consumet Anime 🗾');
  });
  // Anime providers root

  fastify.get('/:animeProvider', async (request: FastifyRequest, reply: FastifyReply) => {
    const providerName = decodeURIComponent(
      (request.params as { animeProvider: string }).animeProvider,
    ).toLowerCase();

    const registered = new Set(['gogoanime', 'zoro']);
    const provider = PROVIDERS_LIST.ANIME.find(
      (p: any) =>
        p.toString.name &&
        registered.has(p.toString.name.toLowerCase()) &&
        p.toString.name.toLowerCase() === providerName,
    );

    try {
      if (provider) {
        reply.redirect(`/anime/${provider.toString.name}`);
      } else {
        reply
          .status(404)
          .send({ message: 'Provider not found, please check the providers list.' });
      }
    } catch (err) {
      reply.status(500).send('Something went wrong. Please try again later.');
    }
  });
};

export default routes;
