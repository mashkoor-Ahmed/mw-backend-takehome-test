import { fastify } from '~root/test/fastify';
import { VehicleValuationRequest } from '../types/vehicle-valuation-request';
import * as superCarValuation from '@app/super-car/super-car-valuation';
import { vi, Mock } from 'vitest';
import { VehicleValuation } from '@app/models/vehicle-valuation';
import { ObjectLiteral, Repository } from 'typeorm';

describe('ValuationController (e2e)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const returnedValuation = new VehicleValuation();
    returnedValuation.vrm = "ABC789";
    returnedValuation.lowestValue = 1000;
    returnedValuation.highestValue = 2000;

    vi.spyOn(superCarValuation, 'fetchValuationFromSuperCarValuation').mockReturnValue(
      Promise.resolve(returnedValuation)
    );

    vi.spyOn(fastify.orm, 'getRepository').mockImplementation(() => {
      return {
        insert: () =>
          Promise.resolve(vitest.fn().mockReturnValue(returnedValuation)),
        findOneBy: () =>
          Promise.resolve(vitest.fn().mockReturnValue([returnedValuation])),
      } as unknown as Repository<ObjectLiteral>;
    });

  })

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PUT /valuations/', () => {
    it('should return 404 if VRM is missing', async () => {
      const requestBody: VehicleValuationRequest = {
        mileage: 10000,
      };

      const res = await fastify.inject({
        url: '/valuations',
        method: 'PUT',
        body: requestBody,
      });

      expect(res.statusCode).toStrictEqual(404);
    });

    it('should return 400 if VRM is 8 characters or more', async () => {
      const requestBody: VehicleValuationRequest = {
        mileage: 10000,
      };

      const res = await fastify.inject({
        url: '/valuations/12345678',
        body: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(400);
    });

    it('should return 400 if mileage is missing', async () => {
      const requestBody: VehicleValuationRequest = {
        // @ts-expect-error intentionally malformed payload
        mileage: null,
      };

      const res = await fastify.inject({
        url: '/valuations/ABC123',
        body: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(400);
    });

    it('should return 400 if mileage is negative', async () => {
      const requestBody: VehicleValuationRequest = {
        mileage: -1,
      };

      const res = await fastify.inject({
        url: '/valuations/ABC123',
        body: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(400);
    });

    it('should return 200 with valid request', async () => {
      const requestBody: VehicleValuationRequest = {
        mileage: 10000,
      };

      const res = await fastify.inject({
        url: '/valuations/ABC123',
        body: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(200);
    });
  });
});
