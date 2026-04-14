import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { guestGuard } from './core/guest.guard';
import { interviewSessionGuard } from './core/interview-session.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'interview/setup',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/interview-setup/interview-setup.component').then(
        (m) => m.InterviewSetupComponent,
      ),
  },
  {
    path: 'interview/:id',
    canActivate: [authGuard, interviewSessionGuard],
    loadComponent: () =>
      import('./pages/interview-session/interview-session.component').then(
        (m) => m.InterviewSessionComponent,
      ),
  },
  {
    path: 'interview/:id/coding',
    canActivate: [authGuard, interviewSessionGuard],
    loadComponent: () =>
      import('./pages/coding-round/coding-round.component').then((m) => m.CodingRoundComponent),
  },
  {
    path: 'interview/:id/review',
    canActivate: [authGuard, interviewSessionGuard],
    loadComponent: () =>
      import('./pages/interview-review/interview-review.component').then(
        (m) => m.InterviewReviewComponent,
      ),
  },
  {
    path: 'interview/:id/results',
    canActivate: [authGuard, interviewSessionGuard],
    loadComponent: () =>
      import('./pages/interview-results/interview-results.component').then(
        (m) => m.InterviewResultsComponent,
      ),
  },
  { path: '**', redirectTo: 'dashboard' },
];
