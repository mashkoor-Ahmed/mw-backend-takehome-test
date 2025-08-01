import { Repository } from 'typeorm';
import { ProviderLog } from '../models/provider-log';

export class ProviderLogService {
  constructor(private readonly providerLogRepository: Repository<ProviderLog>) {}

  async log(
    valuationProvider: string,
    reqUrl: string,
    vrm: string,
    statusCode: number,
    startTime: number,
    duration: number,
    errorMessage?: string,
  ): Promise<void> {
    const log = new ProviderLog();
    log.valuationProvider = valuationProvider;
    log.reqUrl = reqUrl;
    log.vrm = vrm;
    log.statusCode = statusCode;
    log.errorMessage = errorMessage ?? null;
    log.timestamp = startTime;
    log.durationMilliseconds = duration;

    try {
      await this.providerLogRepository.insert(log);
    } catch (err) {
      // decide what to do with errors saving the log entry?
    }
  }
}
