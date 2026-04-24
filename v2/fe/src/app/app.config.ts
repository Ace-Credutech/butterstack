import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { auth_interceptor } from './interceptors/auth.interceptor';
import { GlobalService } from './services/global.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([auth_interceptor])),
    provideAppInitializer(() => inject(GlobalService).bootstrap()),
  ],
};
