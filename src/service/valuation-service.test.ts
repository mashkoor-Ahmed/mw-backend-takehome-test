import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValuationService } from './valuation-service';
import { ThirdPartyFailoverService } from './thirdparty-failover-service';
import { VehicleValuation } from '@app/models/vehicle-valuation';
import { Repository } from 'typeorm';

import * as SuperCarModule from '@app/super-car/super-car-valuation';
import * as PremiumCarModule from '@app/premium-car/premium-car-valuation';

describe('ValuationService', () => {
  let mockRepository: Partial<Repository<VehicleValuation>>;
  let mockFailoverService: ThirdPartyFailoverService;
  let service: ValuationService;

  const someValuation: VehicleValuation = {
      vrm: 'ABC123',
      highestValue: 10000,
      lowestValue: 8000,
      valuationProvider: 'TestProvider',
      midpointValue: 9000
  };

  beforeEach(() => {
    mockRepository = {
      insert: vi.fn().mockResolvedValue(someValuation),
      findOneBy: vi.fn().mockResolvedValue(someValuation),
    };

    mockFailoverService = {
      isFailoverEnabled: vi.fn(),
      logFailedRequest: vi.fn(),
      logSuccessfulRequest: vi.fn(),
    } as unknown as ThirdPartyFailoverService;

    service = new ValuationService(mockRepository as Repository<VehicleValuation>, mockFailoverService);
  });

  afterEach(() => {
        vi.restoreAllMocks();
  });

  it('should call SuperCar valuation when failover is disabled', async () => {
    vi.spyOn(mockFailoverService, 'isFailoverEnabled').mockReturnValue(false);
    const spy = vi.spyOn(SuperCarModule, 'fetchValuationFromSuperCarValuation')
      .mockResolvedValue(someValuation);

    const result = await service.createValuation('ABC345', 1000);

    expect(spy).toHaveBeenCalledWith('ABC345', 1000);
    expect(result).toBe(someValuation);
    expect(mockRepository.insert).toHaveBeenCalledWith(someValuation);
    expect(mockFailoverService.logSuccessfulRequest).toHaveBeenCalled();
  });

  it('should log failed request to SuperCar valuation', async () => {
    vi.spyOn(mockFailoverService, 'isFailoverEnabled').mockReturnValue(false);
    const spy = vi.spyOn(SuperCarModule, 'fetchValuationFromSuperCarValuation')
      .mockResolvedValue(new VehicleValuation()); // no values set

    const result = await service.createValuation('ABC345', 1000);

    expect(spy).toHaveBeenCalledWith('ABC345', 1000);
    expect(result).toStrictEqual(new VehicleValuation());
    expect(mockRepository.insert).toHaveBeenCalledTimes(0);
    expect(mockFailoverService.logFailedRequest).toHaveBeenCalled();
  });

  it('should call PremiumCar valuation when failover is enabled', async () => {
    vi.spyOn(mockFailoverService, 'isFailoverEnabled').mockReturnValue(true);
    const spy = vi.spyOn(PremiumCarModule, 'fetchValuationFromPremiumCarValuation')
      .mockResolvedValue(someValuation);

    const result = await service.createValuation('ABC123', 5000);

    expect(spy).toHaveBeenCalledWith('ABC123');
    expect(result).toBe(someValuation);
    expect(mockRepository.insert).toHaveBeenCalledWith(someValuation);
    expect(mockFailoverService.logFailedRequest).toHaveBeenCalledTimes(0);
    expect(mockFailoverService.logSuccessfulRequest).toHaveBeenCalledTimes(0);
  });

  it('should return result even if SQLITE_CONSTRAINT error during insert', async () => {
    vi.spyOn(mockFailoverService, 'isFailoverEnabled').mockReturnValue(false);
    vi.spyOn(SuperCarModule, 'fetchValuationFromSuperCarValuation')
      .mockResolvedValue(someValuation);

    (mockRepository.insert as any).mockRejectedValue({ code: 'SQLITE_CONSTRAINT' });

    await expect(service.createValuation('ABC123', 10000)).resolves.toBe(someValuation);
  });

  it('should rethrow non-SQLITE_CONSTRAINT errors', async () => {
    vi.spyOn(mockFailoverService, 'isFailoverEnabled').mockReturnValue(false);
    vi.spyOn(SuperCarModule, 'fetchValuationFromSuperCarValuation')
      .mockResolvedValue(someValuation);

    const error = { code: 'OTHER_SQL_EXCEPTION' };
    (mockRepository.insert as any).mockRejectedValue(error);

    await expect(service.createValuation('ABC123', 10000)).rejects.toEqual(error);
  });

  it('should retrieve valuation by vrm', async () => {
    const result = await service.getValuation('ABC123');

    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ vrm: 'ABC123' });
    expect(result).toEqual(someValuation);
  });
});
