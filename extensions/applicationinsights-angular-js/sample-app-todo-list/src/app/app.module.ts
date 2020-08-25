import { NgModule }       from '@angular/core';
import { BrowserModule }  from '@angular/platform-browser';
import { FormsModule }    from '@angular/forms';
import { HttpClientModule }     from '@angular/common/http';
import { DashboardComponent }   from './dashboard/dashboard.component';
import { TodoDetailComponent }  from './todo-detail/todo-detail.component';
import { TodosComponent }      from './todos/todos.component';
import { MessagesComponent }    from './messages/messages.component';
import { HttpClientInMemoryWebApiModule } from 'angular-in-memory-web-api';
import { InMemoryDataService }  from './in-memory-data.service';
import { AppRoutingModule }     from './app-routing.module';
import { TodoSearchComponent }  from './todo-search/todo-search.component';
import { AngularPluginService } from '@microsoft/applicationinsights-angular-js';
import { AppComponent }         from './app.component';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule,
    // The HttpClientInMemoryWebApiModule module intercepts HTTP requests
    // and returns simulated server responses.
    // Remove it when a real server is ready to receive requests.
    HttpClientInMemoryWebApiModule.forRoot(
      InMemoryDataService, { dataEncapsulation: false }
    )
  ],
  declarations: [
    AppComponent,
    DashboardComponent,
    TodosComponent,
    TodoDetailComponent,
    MessagesComponent,
    TodoSearchComponent
  ],
  bootstrap: [ AppComponent ],
  providers: [ AngularPluginService ],
})
export class AppModule { }