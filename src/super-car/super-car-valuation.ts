import axios from 'axios';

import { VehicleValuation } from '../models/vehicle-valuation';
import { SuperCarValuationResponse } from './types/super-car-valuation-response';
import { DependencyUnavailableException } from '@app/errors/dependency-unavailable-exception';
import { ProviderLogService } from '@app/logging/provider-log-service';

export async function fetchValuationFromSuperCarValuation(
  vrm: string,
  mileage: number,
  providerLogService: ProviderLogService
): Promise<VehicleValuation> {
  axios.defaults.baseURL =
    'localhost:3003/supercar';

  let status: number | undefined;
  let error: any;
  let durationMs = -1;
  let reqUrl = `localhost:3003/supercar/valuations/${vrm}?mileage=${mileage}`;
  const startTime = Date.now();
  
  try {
    const response = await axios.get<SuperCarValuationResponse>(
      `valuations/${vrm}?mileage=${mileage}`,
    );

    status = response.status;
    durationMs = Date.now() - startTime;

    const valuation = new VehicleValuation();

    valuation.vrm = vrm;
    valuation.lowestValue = response.data.valuation.lowerValue;
    valuation.highestValue = response.data.valuation.upperValue;
    valuation.valuationProvider = "Super Car Valuations"

    return valuation;
  } catch (err: any) {
    error = err;
    const status = err?.response?.status;
    durationMs = Date.now() - startTime;

    if (status >= 500) {
      throw new DependencyUnavailableException(
        `SuperCarValuation service failed with status ${status}`,
      );
    }

    // any other types of errors e.g. 4xx errors should lead to InternalServerError
    throw err;
  } finally {
    await providerLogService.log(
      "Super Car Valuations",
      reqUrl,
      vrm,
      status ?? 0,
      startTime,
      durationMs
    )
  }
}
