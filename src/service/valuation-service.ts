
import { Repository } from 'typeorm';
import { VehicleValuation } from '@app/models/vehicle-valuation';
import { fetchValuationFromSuperCarValuation } from '@app/super-car/super-car-valuation';

export class ValuationService {
  constructor(private readonly valuationRepository: Repository<VehicleValuation>) {}

  async createValuation(vrm: string, mileage: number): Promise<VehicleValuation> {
    const valuation = await fetchValuationFromSuperCarValuation(vrm, mileage);

    try {
      await this.valuationRepository.insert(valuation);
    } catch (err: any) {
      if (err.code !== 'SQLITE_CONSTRAINT') {
        throw err;
      }
    }

    return valuation;
  }

  async getValuation(vrm: string): Promise<VehicleValuation | null> {
    return this.valuationRepository.findOneBy({ vrm });
  }
}
