import './env';
import 'reflect-metadata';

import { fastify as Fastify, FastifyServerOptions } from 'fastify';
import { valuationRoutes } from './routes/valuation';

import databaseConnection from 'typeorm-fastify-plugin';
import { VehicleValuation } from './models/vehicle-valuation';
import { ProviderLog } from './models/provider-log';
import { ProviderLogService } from './logging/provider-log-service';

export const app = (opts?: FastifyServerOptions) => {
  const fastify = Fastify(opts);
  fastify
    .register(databaseConnection, {
      type: 'sqlite',
      database: process.env.DATABASE_PATH!,
      synchronize: process.env.SYNC_DATABASE === 'true',
      logging: false,
      entities: [VehicleValuation, ProviderLog],
      migrations: [],
      subscribers: [],
    })
    .ready();

  fastify.after(() => {
    const providerLogRepository = fastify.orm.getRepository(ProviderLog);
    const providerLogService = new ProviderLogService(providerLogRepository);
    fastify.decorate('providerLogService', providerLogService);

    // Register routes only after service is decorated
    valuationRoutes(fastify);
  });

  fastify.get('/', async () => {
    return { hello: 'world' };
  });

  return fastify;
};
