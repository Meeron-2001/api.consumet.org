import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  const createReadLightNovels = async () => {
    // @ts-ignore: dynamic import path, types may not be present in env
    const mod: any = await import('@consumet/extensions/dist/providers/light-novels/readlightnovels');
    const ReadLightNovels = mod.default || mod.ReadLightNovels || mod;
    return new ReadLightNovels();
  };
  const readlightnovels = await createReadLightNovels();

  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro:
        "Welcome to the readlightnovels provider: check out the provider's website @ https://readlightnovels.net/",
      routes: ['/:query', '/info', '/read'],
      documentation: 'https://docs.consumet.org/#tag/readlightnovels',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;

    const res = await readlightnovels.search(query);

    reply.status(200).send(res);
  });

  fastify.get('/info', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.query as { id: string }).id;
    const chapterPage = (request.query as { chapterPage: number }).chapterPage;

    if (typeof id === 'undefined') {
      return reply.status(400).send({
        message: 'id is required',
      });
    }

    try {
      const res = await readlightnovels
        .fetchLightNovelInfo(id, chapterPage)
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

    if (typeof chapterId === 'undefined') {
      return reply.status(400).send({
        message: 'chapterId is required',
      });
    }

    try {
      const res = await readlightnovels
        .fetchChapterContent(chapterId)
        .catch((err: any) => reply.status(404).send(err));

      reply.status(200).send(res);
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Please try again later.' });
    }
  });
};

export default routes;
