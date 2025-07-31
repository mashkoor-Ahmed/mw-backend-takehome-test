import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThirdPartyFailoverService } from './thirdparty-failover-service';

describe('ThirdPartyFailoverService', () => {
  let service: ThirdPartyFailoverService;

  beforeEach(() => {
    service = new ThirdPartyFailoverService();
    vi.useFakeTimers(); 
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should log failures and successes correctly', () => {
    const fiveMinsAgo = Date.now() - (5 * 60 * 100);
    service.logFailedRequest(fiveMinsAgo);
    service.logFailedRequest(fiveMinsAgo + 5);
    service.logFailedRequest(fiveMinsAgo + 10);
    service.logSuccessfulRequest();
    expect(service.getFailurePercentage()).toEqual(75.0);
  });

  it('should not enable failover if not enough failures', () => {
    const aMomentAgo = Date.now() - 5000;
    for (let i = 0; i < 4; i++) {
      service.logFailedRequest(aMomentAgo + i);
      service.logSuccessfulRequest();
    }
    expect(service.getFailurePercentage()).toEqual(50);
    expect(service.isFailoverEnabled()).toBe(false);
  });

  it('should enable failover after threshold conditions are met', () => {
    const now = Date.now() - 10;
    for (let i = 0; i < 6; i++) {
      service.logFailedRequest(now + i);
      service.logSuccessfulRequest();
    }
    vi.setSystemTime(now + 11 * 60 * 1000); // move time past 10m window
    expect(service.isFailoverEnabled()).toBe(true);
  });

  it('should disable failover after reset window passes', () => {
    const now = Date.now() - 10;

    // Set up enough failures to trigger failover
    for (let i = 0; i < 5; i++) {
      service.logFailedRequest(now);
    }

    vi.setSystemTime(now + 20 + (10 * 60 * 1000)); // check failover is triggered
    expect(service.isFailoverEnabled()).toBe(true);

    vi.setSystemTime(now + 20 + (15 * 60 * 1000)); // after reset window (5 min)
    expect(service.isFailoverEnabled()).toBe(false);
  });

  it('should not enable failover if failure percentage is too low', () => {
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      service.logFailedRequest(now);
    }
    for (let i = 0; i < 6; i++) {
      service.logSuccessfulRequest();
    }
    vi.setSystemTime(now + 10 + (10 * 60 * 1000));
    expect(service.isFailoverEnabled()).toBe(false);
  });
});