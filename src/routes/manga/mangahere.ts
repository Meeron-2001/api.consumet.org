import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
// Avoid aggregated imports to prevent eager loading of unrelated providers

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  const createMangaHere = async () => {
    // @ts-ignore: dynamic import path, types may not be present in env
    const mod: any = await import('@consumet/extensions/dist/providers/manga/mangahere');
    const MangaHere = mod.default || mod.MangaHere || mod;
    return new MangaHere();
  };
  const mangahere = await createMangaHere();

  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro: `Welcome to the MangaHere provider: check out the provider's website @ ${mangahere.toString.baseUrl}`,
      routes: ['/:query', '/info', '/read'],
      documentation: 'https://docs.consumet.org/#tag/mangahere',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;

    const page = (request.query as { page: number }).page;

    const res = await mangahere.search(query, page);

    reply.status(200).send(res);
  });

  fastify.get('/info', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.query as { id: string }).id;

    if (typeof id === 'undefined')
      return reply.status(400).send({ message: 'id is required' });

    try {
      const res = await mangahere
        .fetchMangaInfo(id)
        .catch((err: any) => reply.status(404).send({ message: err }));

      reply.status(200).send(res);
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Please try again later.' });
    }
  });

  fastify.get('/read', async (request: FastifyRequest, reply: FastifyReply) => {
    const chapterId = (request.query as { chapterId: string }).chapterId;

    if (typeof chapterId === 'undefined')
      return reply.status(400).send({ message: 'chapterId is required' });

    try {
      const res = await mangahere
        .fetchChapterPages(chapterId)
        .catch((err: Error) => reply.status(404).send({ message: err.message }));

      reply.status(200).send(res);
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Please try again later.' });
    }
  });
};

export default routes;
