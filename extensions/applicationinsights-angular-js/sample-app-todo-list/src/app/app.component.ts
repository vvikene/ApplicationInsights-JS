import { Component, OnInit, Inject, HostListener, OnDestroy } from '@angular/core';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { AngularPlugin, AngularPluginService } from '@microsoft/applicationinsights-angular-js';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Todo List';
  angularPluginService: AngularPluginService;

  constructor(
    private router: Router,
    @Inject(AngularPluginService) angularPluginService: AngularPluginService){
      this.angularPluginService = angularPluginService;
  }

  ngOnInit() {
    var angularPlugin = new AngularPlugin();
    this.angularPluginService.init(this, angularPlugin);
    const appInsights = new ApplicationInsights({ config: {
      instrumentationKey: '7d203bc1-b5bc-4c18-bbee-86d7f71d9afb',
      extensions: [angularPlugin],
      extensionConfig: {
        [angularPlugin.identifier]: { router: this.router }
      }
    } });
    appInsights.loadAppInsights();
  }

  @HostListener('mousemove', ['$event'])
  @HostListener('mousedown', ['$event'])
  @HostListener('mouseup', ['$event'])
  @HostListener('keypress', ['$event'])
  @HostListener('wheel', ['$event'])
  @HostListener('touchstart', ['$event'])
  @HostListener('scroll', ['$event'])
  trackActivity() {
      this.angularPluginService.trackActivity();
  }

  @HostListener('window:beforeunload')
  ngOnDestroy() {
    this.angularPluginService.trackMetric("AppComponent");
  }
}
