/// <reference path="./TestFramework/Common.ts" />
import { ApplicationInsights } from 'applicationinsights-analytics-js';
import { Envelope } from 'applicationinsights-common';
import { IApplicationInsights, Initialization } from '../Initialization';

export class SnippetTests extends TestClass {
    private aiName = "appInsights";
    private originalAppInsights;
    private queueSpy;

    // PostBuildScript adds an extra code to the snippet to push 100 tests events to the queue.
    // Those events will be drained during AppInsights Init().
    private senderMocks;

    private loadSnippet(path, resetWindow = true) {
        // load ai via the snippet
        if (resetWindow) {
            window[this.aiName] = undefined;
        }
        var key = "AISKU";
        var snippetPath = window.location.href.split(key)[0] + key + path;
        var scriptElement = document.createElement("script");
        scriptElement.onload = function() {
            console.log("loaded snippet!");
        }
        scriptElement.src = snippetPath;
        scriptElement.id = "testSnippet";
        document.getElementsByTagName("script")[0].parentNode.appendChild(scriptElement);
    }

    /** Method called before the start of each test method */
    public testInitialize() {
        var timingEnabled = typeof window != "undefined" && window.performance && window.performance.timing;

        this.originalAppInsights = window[this.aiName];
        window[this.aiName] = undefined;
        try {
            delete window[this.aiName];
        } catch (e) {
        }

        window['queueTest'] = () => null;

        // used to observe if events stored in the queue are executed when the AI is loaded
        this.queueSpy = this.sandbox.spy(window, "queueTest");
        this.useFakeTimers = false;
        this.clock.restore();
        this.useFakeServer = false;
        sinon.fakeServer["restore"]();
    }

    /** Method called after each test method has completed */
    public testCleanup() {
        this.useFakeServer = true;
        this.useFakeTimers = true;
        window[this.aiName] = this.originalAppInsights;
    }

    public registerTests() {
        var snippet_Latest = "/dist/snippet.min.js";

        // snippet version 0.0.17
        var snippet_0_0_17 = "/snippet/snippet.js";

        this.testSnippet(snippet_0_0_17);
        // this.testSnippet(snippet_Latest);

        var trackPageSpy: SinonSpy;

        this.testCaseAsync({
            name: "SnippetTests: it's safe to initialize the snippet twice, but it should report only one pageView",
            stepDelay: 250,
            steps: [
                () => {
                    this.loadSnippet(snippet_Latest);
                },
                () => {
                    trackPageSpy = this.sandbox.spy(window["appInsights"], "trackPageView");
                    this.loadSnippet(snippet_Latest, false);
                },
                () => {
                    Assert.equal(trackPageSpy.callCount, 0);
                }]
        });
    }

    private testSnippet(snippetPath) {
        var delay = 2000;

        this.testCaseAsync({
            name: "SnippetTests: " + snippetPath + " is loaded",
            stepDelay: 50,
            steps: [
                () => {
                    this.loadSnippet(snippetPath);
                },
                () => {
                    Assert.ok(window[this.aiName], this.aiName + " is loaded");
                }
            ]
        });

        this.testCaseAsync({
            name: "SnippetTests: " + snippetPath + " drains the queue",
            stepDelay: 1000,
            steps: [
                () => {
                    this.loadSnippet(snippetPath);
                }]
                .concat(<any>PollingAssert.createPollingAssert(() => {
                    return (window[this.aiName].queue.length !== undefined)
                }, "waiting for AI Init() to finish" + new Date().toISOString(), 5, 200))
                .concat(() => {
                    Assert.ok(window[this.aiName].queue.length === 1, "queue was removed during the init");
                })
        });

        this.testCaseAsync({
            name: "SnippetTests: " + snippetPath + " configuration is read dynamically",
            stepDelay: delay,
            steps: [
                () => {
                    this.loadSnippet(snippetPath);
                },
                () => {
                    this.checkConfig();
                }
            ]
        });

        this.testCaseAsync({
            name: "SnippetTests: " + snippetPath + " can send to v2 endpoint with V2 API",
            stepDelay: delay,
            steps: [
                () => {
                    this.loadSnippet(snippetPath);
                },
                () => {
                    this.senderMocks = this.setAppInsights();
                    window[this.aiName].trackTrace({message: "test"});
                }]
                .concat(this.waitForResponse())
                .concat(() => {
                    Assert.equal(1, this.senderMocks.sender.callCount, "send called 1 time");
                    this.boilerPlateAsserts(this.senderMocks);
                })
        });
    }

    private waitForResponse() {
        return <any>PollingAssert.createPollingAssert(() => {
            return (this.senderMocks.successSpy.called || this.senderMocks.errorSpy.called);
        }, "Wait for response" + new Date().toISOString(), 5, 1000)
    }

    private checkConfig() {
        var initial = window[this.aiName];
        var test = (expected, identifier, memberName, readFunction) => {
            var appIn = <Initialization>window[this.aiName];
            if (identifier) {
                // is extension config
                appIn.config.extensionConfig[identifier][memberName] = expected;
            } else {
                // is core config
                appIn.config[memberName] = expected;
            }
            var actual = readFunction();
            Assert.equal(expected, actual, memberName + ": value is read dynamically");
        };

        var testSenderValues = (expected, memberName) => {
            var identifier = "AppInsightsChannelPlugin";
            var appIn = <Initialization>window[this.aiName];
            try {
                test(expected, memberName, identifier, appIn['core']['_channelController'].channelQueue[0][0]._config);
            } catch (e) {
                console.warn('channel controller error', e);
            }
            
        };

        var testContextValues = (expected, memberName) => {
            var identifier = "AppInsightsPropertiesPlugin";
            var appIn = <Initialization>window[this.aiName];
            test(expected, memberName, identifier, appIn['properties'][memberName]);
        };

        // sender values
        testSenderValues(10, "maxBatchInterval");
        testSenderValues(10, "maxBatchSizeInBytes");
        testSenderValues(10, "endpointUrl");
        testSenderValues(false, "disableTelemetry");

        // context values
        testContextValues("instrumentationKey", "instrumentationKey");
        testContextValues("accountId", "accountId");

        // logging
        test(true, "enableDebugExceptions", undefined, initial.appInsights.core.logger.enableDebugExceptions);
    }

    private setAppInsights() {
        window["appInsights"].endpointUrl = "https://dc.services.visualstudio.com/v2/track";
        window["appInsights"].maxBatchInterval = 1;
        var appIn = <Initialization>window[this.aiName];
        try {
            var senderRef = appIn['core']['_channelController'].channelQueue[0][0]
            var sender = this.sandbox.spy(senderRef, "send");
        } catch (e) {
            console.warn('setAppInsights channelController error', e);
        }
        var errorSpy = this.sandbox.spy(senderRef, "_onError");
        var successSpy = this.sandbox.spy(senderRef, "_onSuccess");
        var loggingSpy = this.sandbox.spy(appIn.appInsights.core.logger, "throwInternal");

        return {
            sender: sender,
            errorSpy: errorSpy,
            successSpy: successSpy,
            loggingSpy: loggingSpy,
            restore: () => {
            }
        };
    }

    private boilerPlateAsserts(spies) {
        Assert.ok(spies.successSpy.called, "success handler was called");
        Assert.ok(!spies.errorSpy.called, "no error sending");
        var isValidCallCount = spies.loggingSpy.callCount === 0;
        Assert.ok(isValidCallCount, "logging spy was called 0 time(s)");
        if (!isValidCallCount) {
            while (spies.loggingSpy.args.length) {
                Assert.ok(false, "[warning thrown]: " + spies.loggingSpy.args.pop());
            }
        }
    }
}
