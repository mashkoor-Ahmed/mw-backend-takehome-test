export class ThirdPartyFailoverService {
    private numberOfFailures: number;
    private numberOfSuccesses: number;
    private failureTimeWindowInMilliseconds: number = 10 * 60 * 1000; // 10 mins
    private earliestFailureTimeEpoch: number;
    private failedRequestsMinThreshold: number;
    private failedRequestsPercentageThreshold: number;
    private failoverEnabled: boolean;
    private failoverEnabledAtEpoch: number;
    private failoverResetWindowInMilliseconds: number = 5 * 60 * 100; // 5 mins

    constructor() {
        this.numberOfFailures = 0;
        this.numberOfSuccesses = 0;
        this.earliestFailureTimeEpoch = -1;
        this.failedRequestsMinThreshold = 5; // very arbitrary, easy to test
        this.failoverEnabled = false;
        this.failoverEnabledAtEpoch = -1;
        this.failedRequestsPercentageThreshold = 50;
    }

    logFailedRequest(requestTimeEpoch: number): void {
        this.numberOfFailures += 1;
        if (this.earliestFailureTimeEpoch == -1 
            || (requestTimeEpoch - this.earliestFailureTimeEpoch) > this.failureTimeWindowInMilliseconds) {
                this.earliestFailureTimeEpoch = requestTimeEpoch;
            }
    }

    logSuccessfulRequest(): void {
        this.numberOfSuccesses += 1;
    }

    getFailurePercentage(): number {
        return (this.numberOfFailures / (this.numberOfFailures + this.numberOfSuccesses))*100;
    }

    isFailoverEnabled(): boolean {
        const currentTimeEpoch = Date.now();

        // see if we can disable the failover option 5m after it was enabled, and start capturing metrics again
        if (this.failoverEnabled 
            && (currentTimeEpoch - this.failoverEnabledAtEpoch) > this.failoverResetWindowInMilliseconds) {
                this.failoverEnabledAtEpoch = -1;
                this.failoverEnabled = false;
                this.numberOfFailures = 0;
                this.numberOfSuccesses = 0;
                this.earliestFailureTimeEpoch = -1;
                return false;
            }
        
        // see if we've hit the failure threshold in past 10m, minimum 10 requests, and set failover enabled
        if (!this.failoverEnabled 
            && this.numberOfFailures >= this.failedRequestsMinThreshold 
            && currentTimeEpoch - this.earliestFailureTimeEpoch > this.failureTimeWindowInMilliseconds
            && this.getFailurePercentage() >= this.failedRequestsPercentageThreshold) {
                this.failoverEnabled = true;
                this.failoverEnabledAtEpoch = currentTimeEpoch;
                return true;
            }
        
        return this.failoverEnabled;
    }
}