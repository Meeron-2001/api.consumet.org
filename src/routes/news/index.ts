import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  // register news routes dynamically to avoid eager imports
  try {
    const mod = await import('./ann');
    await fastify.register(mod.default, { prefix: '/ann' });
  } catch (e: any) {
    fastify.log.error({ err: e?.message || e }, 'Failed to register news/ann');
  }

  //default route message
  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.status(200).send('Welcome to Consumet News');
  });
};

export default routes;
