import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { setupMonacoEnvironment } from './app/monaco-env';

setupMonacoEnvironment();

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
