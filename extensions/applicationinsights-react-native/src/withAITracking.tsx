// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { IMetricTelemetry } from '@microsoft/applicationinsights-common';
import * as React from 'react';
import { Keyboard, keyboardEventListener, TouchableWithoutFeedback } from 'react-native';
import { ReactNativePlugin } from './ReactNativePlugin';
import { EventRegister } from 'react-native-event-listeners';

/**
 * Higher-order component function to hook Application Insights tracking 
 * in a React component's lifecycle.
 * 
 * @param reactNativePlugin ReactNativePlugin instance
 * @param Component the React component to be instrumented 
 * @param componentName (optional) component name
 * @param className (optional) className of the HOC div
 */
export default function withAITracking<P>(reactNativePlugin: ReactNativePlugin, Component: React.ComponentType<P>, componentName?: string, className?: string): React.ComponentClass<P> {

  if (componentName === undefined || componentName === null || typeof componentName !== 'string') {
    componentName = Component.prototype.constructor.name;
  }

  if (className === undefined || className === null || typeof className !== 'string') {
    className = '';
  }

  return class extends React.Component<P> {
    private _firstActiveTimestamp: number = 0;
    private _idleStartTimestamp: number = 0;
    private _lastActiveTimestamp: number = 0;
    private _totalIdleTime: number = 0;
    private _idleCount: number = 0;
    private _idleTimeout: number = 5000;
    private keyboardDidShowListener: keyboardEventListener;
    private keyboardDidHideListener: keyboardEventListener;
    private listener;

    public componentDidMount() {
      this._firstActiveTimestamp = 0;
      this._totalIdleTime = 0;
      this._lastActiveTimestamp = 0;
      this._idleStartTimestamp = 0;
      this._idleCount = 0;
      this.keyboardDidShowListener = Keyboard.addListener(
        'keyboardDidShow',
        this.trackActivity,
      );
      this.keyboardDidHideListener = Keyboard.addListener(
        'keyboardDidHide',
        this.trackActivity,
      );
      this.listener = EventRegister.addEventListener(
        'onPress',
        () => console.log("onPress is called")
      );
    }

    public componentWillUnmount() {
      if (this._firstActiveTimestamp === 0) {
        return;
      }

      const engagementTime = this.getEngagementTimeSeconds();
      const metricData: IMetricTelemetry = {
        average: engagementTime,
        name: 'React Component Engaged Time (seconds)',
        sampleCount: 1
      };

      const additionalProperties: { [key: string]: any } = { 'Component Name': componentName };
      reactNativePlugin.trackMetric(metricData, additionalProperties);

      this.keyboardDidShowListener.remove();
      this.keyboardDidHideListener.remove();
      EventRegister.removeEventListener(this.listener);
    }

    public render() {
      return (
          <Component {...this.props}/>
      );
    }

    private trackActivity = (e: React.SyntheticEvent<any>): void => {
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

      console.log("aaaaaaaaaaaaa");
    }

    private getEngagementTimeSeconds(): number {
      return (Date.now() - this._firstActiveTimestamp - this._totalIdleTime - this._idleCount * this._idleTimeout) / 1000;
    }
  }
}
