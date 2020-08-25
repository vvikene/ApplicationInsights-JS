import * as angular from 'angular';
import { Injectable, Optional, Injector, HostListener, Host } from '@angular/core';
import AngularPlugin from './AngularPlugin';
import { IEventTelemetry, IMetricTelemetry } from '@microsoft/applicationinsights-common';
import { ICustomProperties } from "@microsoft/applicationinsights-core-js";
@Injectable({
    providedIn: 'root'
})
export class AngularPluginService {
    private _mountTimestamp: number = 0;
    private _firstActiveTimestamp: number = 0;
    private _idleStartTimestamp: number = 0;
    private _lastActiveTimestamp: number = 0;
    private _totalIdleTime: number = 0;
    private _idleCount: number = 0;
    private _idleTimeout: number = 5000;
    private _intervalId?: any;
    private angularPlugin: AngularPlugin;

    constructor() {
        this._mountTimestamp = Date.now();
    }
    
    init(component: any, angularPlugin: AngularPlugin): void {
        console.log(component);
        this.angularPlugin = angularPlugin;
    }

    trackActivity(): void {
        if (this._firstActiveTimestamp === 0) {
            this._firstActiveTimestamp = Date.now();
            this._lastActiveTimestamp = this._firstActiveTimestamp;
        } else {
            this._lastActiveTimestamp = Date.now();
        }
    
        if (this._idleStartTimestamp > 0) {
            const lastIdleTime = this._lastActiveTimestamp - this._idleStartTimestamp;
            this._totalIdleTime += lastIdleTime;
            this._idleStartTimestamp = 0;
        }
    }

    private getEngagementTimeSeconds(): number {
        return (Date.now() - this._firstActiveTimestamp - this._totalIdleTime - this._idleCount * this._idleTimeout) / 1000;
    }

    trackMetric(componentName: string) {
        if (this._mountTimestamp === 0) {
            throw new Error('AngularPluginService: mountTimestamp is not initialized.');
        }
        if (this._intervalId) {
            clearInterval(this._intervalId);
        }

        if (this._firstActiveTimestamp === 0) {
            return;
        }

        const engagementTime = this.getEngagementTimeSeconds();
        const metricData: IMetricTelemetry = {
            average: engagementTime,
            name: 'Angular Component Engaged Time (seconds)',
            sampleCount: 1
        };

        const additionalProperties: { [key: string]: any } = { 'Component Name': componentName };
        this.angularPlugin.trackMetric(metricData, additionalProperties);
    }

    trackEvent(event: IEventTelemetry, customProperties?: ICustomProperties) {
        this.angularPlugin.trackEvent(event, customProperties);
    }
}
