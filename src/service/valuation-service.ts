
import { Repository } from 'typeorm';
import { VehicleValuation } from '@app/models/vehicle-valuation';
import { ThirdPartyFailoverService } from './thirdparty-failover-service';
import { fetchValuationFromSuperCarValuation } from '@app/super-car/super-car-valuation';
import { fetchValuationFromPremiumCarValuation } from '@app/premium-car/premium-car-valuation';
import { DependencyUnavailableException } from '@app/errors/dependency-unavailable-exception';

export class ValuationService {
  constructor(private readonly valuationRepository: Repository<VehicleValuation>,
    private readonly thirdPartyFailoverService: ThirdPartyFailoverService
  ) {}

  async createValuation(vrm: string, mileage: number): Promise<VehicleValuation> {
    const useFailover = this.thirdPartyFailoverService.isFailoverEnabled();
    let valuation: VehicleValuation;

    try {
        if (useFailover) {
            valuation = await fetchValuationFromPremiumCarValuation(vrm);
        } else {
            valuation = await fetchValuationFromSuperCarValuation(vrm, mileage);
            this.thirdPartyFailoverService.logSuccessfulRequest();
        }

        try {
            await this.valuationRepository.insert(valuation);
        } catch (err: any) {
            if (err.code !== 'SQLITE_CONSTRAINT') { throw err; }
        }
    } catch (err: any) {
        if (err instanceof DependencyUnavailableException) {
            this.thirdPartyFailoverService.logFailedRequest(Date.now())
        }
        throw err;
    }

    return valuation;
  }

  async getValuation(vrm: string): Promise<VehicleValuation | null> {
    return this.valuationRepository.findOneBy({ vrm });
  }

  logSuccessOrFailure(valuation: VehicleValuation) {
    if (valuation.valuationProvider == null) {
        this.thirdPartyFailoverService.logFailedRequest(Date.now());
    } else {
        this.thirdPartyFailoverService.logSuccessfulRequest();
    }
  }
}
