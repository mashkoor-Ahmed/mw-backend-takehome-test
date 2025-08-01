import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { fetchValuationFromSuperCarValuation } from './super-car-valuation';
import { DependencyUnavailableException } from '@app/errors/dependency-unavailable-exception';
import { VehicleValuation } from '../models/vehicle-valuation';
import { ProviderLogService } from '@app/logging/provider-log-service';

vi.mock('axios');
const mockedAxios = axios as unknown as {
  get: ReturnType<typeof vi.fn>;
};

describe('fetchValuationFromSuperCarValuation', () => {
  const mockProviderLogService = {
    log: vi.fn(),
  } as unknown as ProviderLogService;

  const sampleResponse = {
    data: {
      valuation: {
        lowerValue: 8000,
        upperValue: 10000,
      },
    },
    status: 200,
  };

  const vrm = 'ABC123';
  const mileage = 1000;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a VehicleValuation on success and logs it', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue(sampleResponse);

    const result = await fetchValuationFromSuperCarValuation(vrm, mileage, mockProviderLogService);

    expect(mockedAxios.get).toHaveBeenCalledWith(`valuations/${vrm}?mileage=${mileage}`);
    expect(result).toEqual({
      vrm: 'ABC123',
      lowestValue: 8000,
      highestValue: 10000,
      valuationProvider: 'Super Car Valuations',
    });

    expect(mockProviderLogService.log).toHaveBeenCalledWith(
      'Super Car Valuations',
      `localhost:3003/supercar/valuations/${vrm}?mileage=${mileage}`,
      vrm,
      200,
      expect.any(Number), 
      expect.any(Number),
      undefined
    );
  });

  it('throws DependencyUnavailableException on 5xx error and logs it', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue({
      response: { status: 503 },
      message: 'Service unavailable',
    });

    await expect(
      fetchValuationFromSuperCarValuation(vrm, mileage, mockProviderLogService),
    ).rejects.toThrow(DependencyUnavailableException);

    expect(mockProviderLogService.log).toHaveBeenCalledWith(
      'Super Car Valuations',
      `localhost:3003/supercar/valuations/${vrm}?mileage=${mileage}`,
      vrm,
      503,
      expect.any(Number),
      expect.any(Number),
      expect.any(Object)
    );
  });

  it('rethrows 4xx error and logs it', async () => {
    const err = {
      response: { status: 404 },
      message: 'Not Found',
    };

    mockedAxios.get = vi.fn().mockRejectedValue(err);

    await expect(
      fetchValuationFromSuperCarValuation(vrm, mileage, mockProviderLogService),
    ).rejects.toEqual(err);

    expect(mockProviderLogService.log).toHaveBeenCalledWith(
      'Super Car Valuations',
      `localhost:3003/supercar/valuations/${vrm}?mileage=${mileage}`,
      vrm,
      404,
      expect.any(Number),
      expect.any(Number),
      expect.any(Object)
    );
  });
});
