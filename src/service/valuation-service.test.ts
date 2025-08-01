import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValuationService } from './valuation-service';
import { ThirdPartyFailoverService } from './thirdparty-failover-service';

import { VehicleValuation } from '@app/models/vehicle-valuation';
import { Repository } from 'typeorm';

import * as SuperCarModule from '@app/super-car/super-car-valuation';
import * as PremiumCarModule from '@app/premium-car/premium-car-valuation';
import { DependencyUnavailableException } from '@app/errors/dependency-unavailable-exception';
import { ProviderLogService } from '@app/logging/provider-log-service';

describe('ValuationService', () => {
  let mockValuationRepository: Partial<Repository<VehicleValuation>>;
  let mockFailoverService: ThirdPartyFailoverService;
  let mockProviderLogService: ProviderLogService; 
  let service: ValuationService;

  const someValuation: VehicleValuation = {
      vrm: 'ABC123',
      highestValue: 10000,
      lowestValue: 8000,
      valuationProvider: 'TestProvider',
      midpointValue: 9000
  };

  beforeEach(() => {
    mockValuationRepository = {
      insert: vi.fn().mockResolvedValue(someValuation),
      findOneBy: vi.fn().mockResolvedValue(null),
    };

    mockFailoverService = {
      isFailoverEnabled: vi.fn(),
      logFailedRequest: vi.fn(),
      logSuccessfulRequest: vi.fn(),
    } as unknown as ThirdPartyFailoverService;

    mockProviderLogService = {
      log: vi.fn(), 
    } as unknown as ProviderLogService;

    service = new ValuationService(
      mockValuationRepository as Repository<VehicleValuation>, 
      mockFailoverService,
      mockProviderLogService
    );
  });

  afterEach(() => {
        vi.restoreAllMocks();
  });

  it('should call SuperCar valuation when failover is disabled', async () => {
    vi.spyOn(mockFailoverService, 'isFailoverEnabled').mockReturnValue(false);
    const spy = vi.spyOn(SuperCarModule, 'fetchValuationFromSuperCarValuation')
      .mockResolvedValue(someValuation);

    const result = await service.createValuation('ABC345', 1000);

    expect(spy).toHaveBeenCalledWith('ABC345', 1000, mockProviderLogService);
    expect(result).toBe(someValuation);
    expect(mockValuationRepository.insert).toHaveBeenCalledWith(someValuation);
    expect(mockFailoverService.logSuccessfulRequest).toHaveBeenCalled();
  });

  it('should log failed request to SuperCar valuation and throw exception', async () => {
    vi.spyOn(mockFailoverService, 'isFailoverEnabled').mockReturnValue(false);
    const exceptionThrown = new DependencyUnavailableException('Error from Super Car Valuation');
    const spy = vi.spyOn(SuperCarModule, 'fetchValuationFromSuperCarValuation')
      .mockRejectedValueOnce(exceptionThrown);
    await expect(service.createValuation('ABC345', 1000)).rejects.toThrow(exceptionThrown);

    expect(spy).toHaveBeenCalledWith('ABC345', 1000, mockProviderLogService);
    expect(mockValuationRepository.insert).toHaveBeenCalledTimes(0);
    expect(mockFailoverService.logFailedRequest).toHaveBeenCalled();
  });

  it('should call PremiumCar valuation when failover is enabled', async () => {
    vi.spyOn(mockFailoverService, 'isFailoverEnabled').mockReturnValue(true);
    const spy = vi.spyOn(PremiumCarModule, 'fetchValuationFromPremiumCarValuation')
      .mockResolvedValue(someValuation);

    const result = await service.createValuation('ABC123', 5000);

    expect(spy).toHaveBeenCalledWith('ABC123', mockProviderLogService);
    expect(result).toBe(someValuation);
    expect(mockValuationRepository.insert).toHaveBeenCalledWith(someValuation);
    expect(mockFailoverService.logFailedRequest).toHaveBeenCalledTimes(0);
    expect(mockFailoverService.logSuccessfulRequest).toHaveBeenCalledTimes(0);
  });

  it('should throw exception on failed request to PremiuimCarValuation', async () => {
    vi.spyOn(mockFailoverService, 'isFailoverEnabled').mockReturnValue(true);
    const exceptionThrown = new DependencyUnavailableException('Error from Premium Car Valuation');
    const spy = vi.spyOn(PremiumCarModule, 'fetchValuationFromPremiumCarValuation')
      .mockRejectedValueOnce(exceptionThrown);
    await expect(service.createValuation('ABC345', 1000)).rejects.toThrow(exceptionThrown);

    expect(spy).toHaveBeenCalledWith('ABC345', mockProviderLogService);
    expect(mockValuationRepository.insert).toHaveBeenCalledTimes(0);
    expect(mockFailoverService.logFailedRequest).toHaveBeenCalledTimes(0);
  });

  it('should return result even if SQLITE_CONSTRAINT error during insert', async () => {
    vi.spyOn(mockFailoverService, 'isFailoverEnabled').mockReturnValue(false);
    vi.spyOn(SuperCarModule, 'fetchValuationFromSuperCarValuation')
      .mockResolvedValue(someValuation);

    (mockValuationRepository.insert as any).mockRejectedValue({ code: 'SQLITE_CONSTRAINT' });

    await expect(service.createValuation('ABC123', 10000)).resolves.toBe(someValuation);
  });

  it('should rethrow non-SQLITE_CONSTRAINT errors', async () => {
    vi.spyOn(mockFailoverService, 'isFailoverEnabled').mockReturnValue(false);
    vi.spyOn(SuperCarModule, 'fetchValuationFromSuperCarValuation')
      .mockResolvedValue(someValuation);

    const error = { code: 'OTHER_SQL_EXCEPTION' };
    (mockValuationRepository.insert as any).mockRejectedValue(error);

    await expect(service.createValuation('ABC123', 10000)).rejects.toEqual(error);
  });

  it('should retrieve valuation by vrm', async () => {
    vi.spyOn(mockValuationRepository, 'findOneBy').mockResolvedValueOnce(someValuation);

    const result = await service.getValuation('ABC123');

    expect(mockValuationRepository.findOneBy).toHaveBeenCalledWith({ vrm: 'ABC123' });
    expect(result).toEqual(someValuation);
  });

  it('should return null if no valuation exists in DB', async () => {
    (mockValuationRepository.findOneBy as any).mockReturnValue(null);

    const result = await service.getValuation('ABC123');

    expect(mockValuationRepository.findOneBy).toHaveBeenCalledWith({ vrm: 'ABC123' });
    expect(result).toEqual(null);
  });

  it('should return correct result even if valuationProvider not present in DB', async () => {
    const valuationEntity: VehicleValuation = {
      vrm: 'ABC123',
      highestValue: 10000,
      lowestValue: 8000,
      midpointValue: 9000
    };
    vi.spyOn(mockValuationRepository, 'findOneBy').mockResolvedValueOnce(valuationEntity)
    const result = await service.getValuation('ABC123');

    expect(mockValuationRepository.findOneBy).toHaveBeenCalledWith({ vrm: 'ABC123' });
    expect(result).toEqual(valuationEntity);
  });

  it('createValuation should not call third parties when valuation already exists in DB', async () => {
    vi.spyOn(mockFailoverService, 'isFailoverEnabled').mockReturnValue(false);
    vi.spyOn(mockValuationRepository, 'findOneBy').mockResolvedValueOnce(someValuation);
    
    const spy = vi.spyOn(SuperCarModule, 'fetchValuationFromSuperCarValuation')
      .mockResolvedValue(someValuation);

    const result = await service.createValuation('ABC345', 1000);

    expect(spy).toHaveBeenCalledTimes(0);
    expect(result).toBe(someValuation);
    expect(mockValuationRepository.insert).toHaveBeenCalledTimes(0);
    expect(mockFailoverService.logSuccessfulRequest).toHaveBeenCalledTimes(0);    
  });
});
