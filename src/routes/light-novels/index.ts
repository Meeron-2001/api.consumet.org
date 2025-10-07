import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';

import readlightnovels from './readlightnovels';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  await fastify.register(readlightnovels, { prefix: '/readlightnovels' });

  fastify.get('/', async (request: any, reply: any) => {
    reply.status(200).send('Welcome to Consumet Light Novels');
  });

  fastify.get(
    '/:lightNovelProvider',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queries: { lightNovelProvider: string; page: number } = {
        lightNovelProvider: '',
        page: 1,
      };

      queries.lightNovelProvider = decodeURIComponent(
        (request.params as { lightNovelProvider: string; page: number })
          .lightNovelProvider,
      );

      queries.page = (request.query as { lightNovelProvider: string; page: number }).page;

      if (queries.page! < 1) queries.page = 1;

      const allowed = new Set(['readlightnovels']);

      try {
        const key = queries.lightNovelProvider.toLowerCase();
        if (allowed.has(key)) {
          reply.redirect(`/light-novels/${key}`);
        } else {
          reply
            .status(404)
            .send({ message: 'Page not found, please check the providers list.' });
        }
      } catch (err) {
        reply.status(500).send('Something went wrong. Please try again later.');
      }
    },
  );
};

export default routes;
