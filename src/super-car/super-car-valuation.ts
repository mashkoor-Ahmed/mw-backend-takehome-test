import axios from 'axios';

import { VehicleValuation } from '../models/vehicle-valuation';
import { SuperCarValuationResponse } from './types/super-car-valuation-response';
import { DependencyUnavailableException } from '@app/errors/dependency-unavailable-exception';

export async function fetchValuationFromSuperCarValuation(
  vrm: string,
  mileage: number,
): Promise<VehicleValuation> {
  axios.defaults.baseURL =
    'localhost:3003/supercar';
  
  try {
    const response = await axios.get<SuperCarValuationResponse>(
      `valuations/${vrm}?mileage=${mileage}`,
    );

    const valuation = new VehicleValuation();

    valuation.vrm = vrm;
    valuation.lowestValue = response.data.valuation.lowerValue;
    valuation.highestValue = response.data.valuation.upperValue;
    valuation.valuationProvider = "Super Car Valuations"

    return valuation;
  } catch (err: any) {
    const status = err.response?.status;

    if (status >= 500) {
      throw new DependencyUnavailableException(
        `SuperCarValuation service failed with status ${status}`,
      );
    }

    // any other types of errors e.g. 4xx errors should lead to InternalServerError
    throw err;
  }
}
