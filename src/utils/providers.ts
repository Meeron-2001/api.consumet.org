import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';

type ProvidersRequest = FastifyRequest<{
  Querystring: { type: string };
}>;

export default class Providers {
  public getProviders = async (fastify: FastifyInstance, options: RegisterOptions) => {
    fastify.get(
      '/providers',
      {
        preValidation: (request, reply, done) => {
          const { type } = request.query;

          const providerTypes = ['ANIME','MANGA','MOVIES','META','LIGHT_NOVELS','BOOKS','NEWS','COMICS'];

          if (type === undefined) {
            reply.status(400);
            done(
              new Error(
                'Type must not be empty. Available types: ' + providerTypes.toString(),
              ),
            );
          }

          if (!providerTypes.includes(type)) {
            reply.status(400);
            done(new Error('Type must be either: ' + providerTypes.toString()));
          }

          done(undefined);
        },
      },
      async (request: ProvidersRequest, reply: FastifyReply) => {
        const { type } = request.query;
        reply.status(200).send({ type, providers: [] });
      },
    );
  };
}
