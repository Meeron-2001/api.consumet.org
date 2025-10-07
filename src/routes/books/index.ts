import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {

  fastify.get('/', async (request: any, reply: any) => {
    reply.status(200).send('Welcome to Consumet Books 📚');
  });

  try {
    const mod = await import('./libgen');
    await fastify.register(mod.default, { prefix: '/libgen' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register books/libgen');
  }
};

export default routes;
