import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  // Dynamically import and register each provider to prevent eager loading
  try {
    const mod = await import('./flixhq');
    await fastify.register(mod.default, { prefix: '/flixhq' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register flixhq');
  }
  try {
    const mod = await import('./viewasian');
    await fastify.register(mod.default, { prefix: '/viewasian' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register viewasian');
  }
  try {
    const mod = await import('./dramacool');
    await fastify.register(mod.default, { prefix: '/dramacool' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register dramacool');
  }
  try {
    const mod = await import('./fmovies');
    await fastify.register(mod.default, { prefix: '/fmovies' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register fmovies');
  }
  try {
    const mod = await import('./goku');
    await fastify.register(mod.default, { prefix: '/goku' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register goku');
  }
  try {
    const mod = await import('./movieshd');
    await fastify.register(mod.default, { prefix: '/movieshd' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register movieshd');
  }
  try {
    const mod = await import('./sflix');
    await fastify.register(mod.default, { prefix: '/sflix' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register sflix');
  }
  try {
    const mod = await import('./multimovies');
    await fastify.register(mod.default, { prefix: '/multimovies' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register multimovies');
  }

  fastify.get('/', async (request: any, reply: any) => {
    reply.status(200).send('Welcome to Consumet Movies and TV Shows');
  });

  fastify.get('/:movieProvider', async (request: FastifyRequest, reply: FastifyReply) => {
    const queries: { movieProvider: string; page: number } = {
      movieProvider: '',
      page: 1,
    };

    queries.movieProvider = decodeURIComponent(
      (request.params as { movieProvider: string; page: number }).movieProvider,
    );

    queries.page = (request.query as { movieProvider: string; page: number }).page;

    if (queries.page! < 1) queries.page = 1;

    const allowed = new Set([
      'flixhq',
      'viewasian',
      'dramacool',
      'fmovies',
      'goku',
      'movieshd',
      'sflix',
      'multimovies',
    ]);

    try {
      const key = queries.movieProvider.toLowerCase();
      if (allowed.has(key)) {
        reply.redirect(`/movies/${key}`);
      } else {
        reply
          .status(404)
          .send({ message: 'Page not found, please check the providers list.' });
      }
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Please try again later.' });
    }
  });
};

export default routes;
