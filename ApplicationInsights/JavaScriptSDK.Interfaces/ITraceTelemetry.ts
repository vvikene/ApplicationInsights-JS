import { SeverityLevel } from 'applicationinsights-common';

export interface ITraceTelemetry {
    message: string;
    severityLevel?: SeverityLevel;
}
