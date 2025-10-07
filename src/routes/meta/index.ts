import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  try {
    const mod = await import('./anilist');
    await fastify.register(mod.default, { prefix: '/anilist' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register meta/anilist');
  }
  try {
    const mod = await import('./anilist-manga');
    await fastify.register(mod.default, { prefix: '/anilist-manga' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register meta/anilist-manga');
  }
  try {
    const mod = await import('./mal');
    await fastify.register(mod.default, { prefix: '/mal' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register meta/mal');
  }
  try {
    const mod = await import('./tmdb');
    await fastify.register(mod.default, { prefix: '/tmdb' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register meta/tmdb');
  }

  fastify.get('/', async (request: any, reply: any) => {
    reply.status(200).send('Welcome to Consumet Meta');
  });

  fastify.get('/:metaProvider', async (request: FastifyRequest, reply: FastifyReply) => {
    const metaProvider = decodeURIComponent(
      (request.params as { metaProvider: string }).metaProvider,
    ).toLowerCase();

    const allowed = new Set(['anilist', 'anilist-manga', 'mal', 'tmdb']);

    try {
      if (allowed.has(metaProvider)) {
        // redirect to known route
        reply.redirect(`/meta/${metaProvider}`);
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
