import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
// Use dynamic import to avoid compile-time type resolution and eager loading
import Zoro from '@consumet/extensions/dist/providers/anime/zoro';
import Gogoanime from '@consumet/extensions/dist/providers/anime/gogoanime';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  const createMAL = async (provider?: any) => {
    // @ts-ignore - dynamic import path lacks type declarations in some envs
    const mod: any = await import('@consumet/extensions/dist/providers/meta/myanimelist');
    const Myanimelist = mod.default || mod.Myanimelist || mod;
    return new Myanimelist(provider);
  };

  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro:
        "Welcome to the mal provider: check out the provider's website @ https://mal.co/",
      routes: ['/:query', '/info/:id', '/watch/:episodeId'],
      documentation: 'https://docs.consumet.org/#tag/mal',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;

    const page = (request.query as { page: number }).page;
    const perPage = (request.query as { perPage: number }).perPage;

    const mal = await createMAL();
    const res = await mal.search(query, page);

    reply.status(200).send(res);
  });

  // mal info with episodes
  fastify.get('/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;

    const provider = (request.query as { provider?: string }).provider;
    let fetchFiller = (request.query as { fetchFiller?: string | boolean }).fetchFiller;
    let isDub = (request.query as { dub?: string | boolean }).dub;
    const locale = (request.query as { locale?: string }).locale;

    let mal = await createMAL();
    if (typeof provider !== 'undefined') {
      const name = provider.toLowerCase();
      const selected = name === 'gogoanime'
        ? new Gogoanime(process.env.GOGOANIME_URL)
        : new Zoro(process.env.ZORO_URL);
      mal = await createMAL(selected);
    }

    if (isDub === 'true' || isDub === '1') isDub = true;
    else isDub = false;

    if (fetchFiller === 'true' || fetchFiller === '1') fetchFiller = true;
    else fetchFiller = false;

    try {
      const res = await mal.fetchAnimeInfo(id, isDub as boolean, fetchFiller as boolean);
      reply.status(200).send(res);
    } catch (err: any) {
      reply.status(500).send({ message: err.message });
    }
  });

  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const episodeId = (request.params as { episodeId: string }).episodeId;
      const provider = (request.query as { provider?: string }).provider;
      let mal = await createMAL();
      if (typeof provider !== 'undefined') {
        const name = provider.toLowerCase();
        const selected = name === 'gogoanime'
          ? new Gogoanime(process.env.GOGOANIME_URL)
          : new Zoro(process.env.ZORO_URL);
        mal = await createMAL(selected);
      }
      try {
        const res = await mal
          .fetchEpisodeSources(episodeId)
          .catch((err: any) => reply.status(404).send({ message: err }));
        reply.status(200).send(res);
      } catch (err: any) {
        reply
          .status(500)
          .send({ message: 'Something went wrong. Contact developer for help.' });
      }
    },
  );
};

export default routes;
