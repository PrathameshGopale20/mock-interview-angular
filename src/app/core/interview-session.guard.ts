import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { InterviewContextService } from './interview-context.service';

export const interviewSessionGuard: CanActivateFn = (route) => {
  const ctx = inject(InterviewContextService).load();
  const id = Number(route.paramMap.get('id'));
  if (ctx && ctx.interviewId === id && !Number.isNaN(id)) {
    return true;
  }
  return inject(Router).createUrlTree(['/interview/setup']);
};
