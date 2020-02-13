/**
 * ReactNativePlugin.ts
 * @copyright Microsoft 2019
 */

import {
    ITelemetryPlugin,
    ITelemetryItem,
    IPlugin,
    IConfiguration,
    IAppInsightsCore, 
    ICustomProperties,
    CoreUtils
} from '@microsoft/applicationinsights-core-js';
import { ConfigurationManager, IDevice, IMetricTelemetry, IAppInsights } from '@microsoft/applicationinsights-common';
import DeviceInfo from 'react-native-device-info';
import { setJSExceptionHandler, setNativeExceptionHandler } from 'react-native-exception-handler';

import { INativeDevice, IReactNativePluginConfig } from './Interfaces';

export class ReactNativePlugin implements ITelemetryPlugin {

    identifier: string = 'AppInsightsReactNativePlugin';
    priority: number = 140;
    _nextPlugin?: ITelemetryPlugin;
    private _initialized: boolean = false;
    private _device: INativeDevice;
    private _config: IReactNativePluginConfig;
    private _analyticsPlugin: IAppInsights;

    constructor(config?: IReactNativePluginConfig) {
        this._config = config || this._getDefaultConfig();
        this._device = {};
    }

    public initialize(
        config?: IReactNativePluginConfig | object, // need `| object` to coerce to interface
        core?: IAppInsightsCore,
        extensions?: IPlugin[]
    ) {
        if (!this._initialized) {
            const inConfig = config || {};
            const defaultConfig = this._getDefaultConfig();
            for (const option in defaultConfig) {
                this._config[option] = ConfigurationManager.getConfig(
                    inConfig as any,
                    option,
                    this.identifier,
                    this._config[option]
                );
            }
            if (!this._config.disableDeviceCollection) {
                this._collectDeviceInfo();
            }
            if (!this._config.disableExceptionCollection) {
                setJSExceptionHandler((error, isFatal) => {
                    console.log("an unhandled error - JSExceptionHandler: " + error);
                }, true);
                setNativeExceptionHandler(exceptionString => {
                    console.log("a native exception - NativeExceptionHandler: " + exceptionString);
                }, true);
            }
            if (extensions) {
                CoreUtils.arrForEach(extensions, ext => {
                    const identifier = (ext as ITelemetryPlugin).identifier;
                    if (identifier === 'ApplicationInsightsAnalytics') {
                        this._analyticsPlugin = (ext as any) as IAppInsights;
                    }
                });
            }
        }
        this._initialized = true;
    }

    public processTelemetry(item: ITelemetryItem) {
        this._applyDeviceContext(item);
        if (this._nextPlugin) {
            this._nextPlugin.processTelemetry(item);
        }
    }

    public setNextPlugin(next: ITelemetryPlugin) {
        this._nextPlugin = next;
    }

    public setDeviceId(newId: string) {
        this._device.id = newId;
    }

    public setDeviceModel(newModel: string) {
        this._device.model = newModel;
    }

    public setDeviceType(newType: string) {
        this._device.deviceClass = newType;
    }

    trackMetric(metric: IMetricTelemetry, customProperties: ICustomProperties) {
        if (this._analyticsPlugin) {
            this._analyticsPlugin.trackMetric(metric, customProperties);
        } else {
            console.log("how to use diagnosticlogger here?");
            // this.diagLog().throwInternal(
            //     LoggingSeverity.CRITICAL, _InternalMessageId.TelemetryInitializerFailed, "Analytics plugin is not available, React plugin telemetry will not be sent: ");
        }
    }

    /**
     * Automatically collects native device info for this device
     */
    private _collectDeviceInfo() {
        this._device.deviceClass = DeviceInfo.getDeviceType();
        this._device.id = DeviceInfo.getUniqueId(); // Installation ID
        this._device.model = DeviceInfo.getModel();
    }

    private _applyDeviceContext(item: ITelemetryItem) {
        if (this._device) {
            item.ext = item.ext || {};
            item.ext.device = item.ext.device || ({} as IDevice);
            if (typeof this._device.id === 'string') {
                item.ext.device.localId = this._device.id;
            }
            if (typeof this._device.model === 'string') {
                item.ext.device.model = this._device.model;
            }
            if (typeof this._device.deviceClass === 'string') {
                item.ext.device.deviceClass = this._device.deviceClass;
            }
        }
    }

    private _getDefaultConfig(): IReactNativePluginConfig {
        return {
            // enable autocollection by default
            disableDeviceCollection: false
        };
    }
}
