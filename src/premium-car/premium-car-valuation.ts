import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { VehicleValuation } from '../models/vehicle-valuation';
import { PremiumCarValuationResponse } from './types/premium-car-valuation-response';
import { DependencyUnavailableException } from '@app/errors/dependency-unavailable-exception';
import { ProviderLogService } from '@app/logging/provider-log-service';

export async function fetchValuationFromPremiumCarValuation(
  vrm: string,
  providerLogService: ProviderLogService
): Promise<VehicleValuation> {
  axios.defaults.baseURL =
    'localhost:3003/premiumcar';

  let status: number | undefined;
  let error: any;
  let durationMs = -1;
  let reqUrl = `localhost:3003/premiumcar/valueCar?vrm=${vrm}`;
  const startTime = Date.now();

  try {
    const response = await axios.get<string>(`valueCar?vrm=${vrm}`, {
      headers: { Accept: 'application/xml' },
      responseType: 'text',
    });

    status = response.status;
    durationMs = Date.now() - startTime;

    const parsedResponse = new XMLParser().parse(response.data);
    const result = parsedResponse.PremiumCarValuationResponse;
    const mappedResult: PremiumCarValuationResponse = {
      registrationDate: result.registrationDate,
      registrationYear: result.registrationYear,
      registrationMonth: result.registrationMonth,
      valuationPrivateSaleMinimum: result.valuationPrivateSaleMinimum,
      valuationPrivateSaleMaximum: result.valuationPrivateSaleMaximum,
      valuationDealershipMinimum: result.valuationDealershipMinimum,
      valuationDealershipMaximum: result.valuationDealershipMaximum
    };

    const valuation = new VehicleValuation();

    valuation.vrm = vrm;
    valuation.lowestValue = mappedResult.valuationDealershipMinimum;
    valuation.highestValue = mappedResult.valuationDealershipMaximum;
    valuation.valuationProvider = "Premium Car Valuations"

    return valuation;
  } catch (err: any) {
    error = err;
    const status = err?.response?.status;
    durationMs = Date.now() - startTime;

    if (status >= 500) {
      throw new DependencyUnavailableException(
        `PremiumCarValuation service failed with status ${status}`,
      );
    }

    // any other types of errors e.g. 4xx errors should lead to InternalServerError
    throw err;
  } finally {
    await providerLogService.log(
      "Premium Car Valuations",
      reqUrl,
      vrm,
      status ?? 0,
      startTime,
      durationMs
    )
  }
}