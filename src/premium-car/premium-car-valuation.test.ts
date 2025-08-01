import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { fetchValuationFromPremiumCarValuation } from '../premium-car/premium-car-valuation';
import { DependencyUnavailableException } from '@app/errors/dependency-unavailable-exception';
import { ProviderLogService } from '@app/logging/provider-log-service';

vi.mock('axios');
const mockedAxios = axios as unknown as { get: ReturnType<typeof vi.fn> };

describe('fetchValuationFromPremiumCarValuation', () => {
  let mockLog: ReturnType<typeof vi.fn>;
  let providerLogService: ProviderLogService;

  const mockXMLResponse = `
    <PremiumCarValuationResponse>
      <registrationDate>2021-01-01</registrationDate>
      <registrationYear>2021</registrationYear>
      <registrationMonth>01</registrationMonth>
      <valuationPrivateSaleMinimum>5000</valuationPrivateSaleMinimum>
      <valuationPrivateSaleMaximum>6000</valuationPrivateSaleMaximum>
      <valuationDealershipMinimum>5500</valuationDealershipMinimum>
      <valuationDealershipMaximum>6500</valuationDealershipMaximum>
    </PremiumCarValuationResponse>
  `;

  beforeEach(() => {
    mockLog = vi.fn();
    providerLogService = { log: mockLog } as unknown as ProviderLogService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should parse XML and return VehicleValuation, logging successful request', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: mockXMLResponse,
    });

    const result = await fetchValuationFromPremiumCarValuation('ABC123', providerLogService);

    expect(result).toEqual({
      vrm: 'ABC123',
      lowestValue: 5500,
      highestValue: 6500,
      valuationProvider: 'Premium Car Valuations',
    });

    expect(mockLog).toHaveBeenCalledWith(
      "Premium Car Valuations",
      "localhost:3003/premiumcar/valueCar?vrm=ABC123",
      "ABC123",
      200,
      expect.any(Number),
      expect.any(Number),
      undefined
    );
  });

  it('should throw DependencyUnavailableException for 5xx errors and log', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue({
      response: { status: 503 },
      message: 'Service Unavailable'
    });

    await expect(fetchValuationFromPremiumCarValuation('XYZ999', providerLogService))
      .rejects.toThrow(DependencyUnavailableException);

    expect(mockLog).toHaveBeenCalledWith(
      "Premium Car Valuations",
      "localhost:3003/premiumcar/valueCar?vrm=XYZ999",
      "XYZ999",
      503,
      expect.any(Number),
      expect.any(Number),
      expect.any(Object)
    );
  });

  it('should rethrow non-5xx errors', async () => {
    const clientError = {
      response: { status: 404 },
      message: 'Not Found',
    };
    mockedAxios.get = vi.fn().mockRejectedValue(clientError);

    await expect(fetchValuationFromPremiumCarValuation('ABC123', providerLogService))
      .rejects.toEqual(clientError);

    expect(mockLog).toHaveBeenCalledWith(
      "Premium Car Valuations",
      "localhost:3003/premiumcar/valueCar?vrm=ABC123",
      "ABC123",
      404,
      expect.any(Number),
      expect.any(Number),
      expect.any(Object)
    );
  });
});
