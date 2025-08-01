import { FastifyInstance } from 'fastify';
import { VehicleValuationRequest } from './types/vehicle-valuation-request';
import { VehicleValuation } from '@app/models/vehicle-valuation';
import { validateVrm, validateMileage } from './request-validation-helpers';
import { ValuationService } from '@app/service/valuation-service';
import { ThirdPartyFailoverService } from '@app/service/thirdparty-failover-service';

export function valuationRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Params: {
      vrm: string;
    };
  }>('/valuations/:vrm', async (request, reply) => {
    const { vrm } = request.params;

    if (!validateVrm(vrm, reply)) return;

    const valuationRepository = fastify.orm.getRepository(VehicleValuation);
    const failoverService = new ThirdPartyFailoverService();
    const service = new ValuationService(valuationRepository, failoverService);

    const result = await service.getValuation(vrm);

    if (result == null) {
      return reply
        .code(404)
        .send({
          message: `Valuation for VRM ${vrm} not found`,
          statusCode: 404,
        });
    }

    return result;
  });

  fastify.put<{
    Body: VehicleValuationRequest;
    Params: {
      vrm: string;
    };
  }>('/valuations/:vrm', async (request, reply) => {
    const { vrm } = request.params;
    const { mileage } = request.body;

    if (!validateVrm(vrm, reply)) return;
    if (!validateMileage(mileage, reply)) return;

    const valuationRepository = fastify.orm.getRepository(VehicleValuation);
    const failoverService = new ThirdPartyFailoverService();
    const valuationService = new ValuationService(valuationRepository, failoverService);

    const valuation = valuationService.createValuation(vrm, mileage);

    fastify.log.info('Valuation created: ', valuation);

    return valuation;
  });

}
