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

  describe('GET /valuations/', () => {
    it('should return 200 when valuation found in DB', async () => {
      const res = await fastify.inject({
        url: '/valuations/XY1234',
        method: 'GET'
      });

      expect(res.statusCode).toStrictEqual(200);
    });

    it('should return 404 when valuation not found in DB', async () => {
      // TODO tried to declare vi.spyOn(fastify.orm, 'getRepository') as a variable in the beforeEach block
      // couldn't quite get it working yet 
      (fastify.orm.getRepository as Mock).mockImplementationOnce(() => {
        return {
          findOneBy: () => Promise.resolve(null),
        } as unknown as Repository<ObjectLiteral>;
      });

      const res = await fastify.inject({
        url: '/valuations/XY1234',
        method: 'GET'
      });

      expect(res.statusCode).toStrictEqual(404);
    });

    it('should return 400 if VRM is 8 characters or more', async () => {
      const res = await fastify.inject({
        url: '/valuations/12345678',
        method: 'GET'
      });

      expect(res.statusCode).toStrictEqual(400);
    });

    it('should return 404 if VRM is missing from path', async () => {
      const res = await fastify.inject({
        url: '/valuations',
        method: 'GET'
      });

      expect(res.statusCode).toStrictEqual(404);
    });
  
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
