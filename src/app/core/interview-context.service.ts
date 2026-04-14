import { Injectable } from '@angular/core';

const KEY = 'mit_interview_ctx';

/** After POST setup, skip GET /interviews/{id} once (same tab) so a cold API without that route still works. */
export const JUST_STARTED_INTERVIEW_KEY = 'mit_just_started_interview_id';

export interface InterviewContext {
  interviewId: number;
  languageId: number;
  levelId: number;
  languageName: string;
  levelName: string;
}

@Injectable({ providedIn: 'root' })
export class InterviewContextService {
  save(ctx: InterviewContext): void {
    sessionStorage.setItem(KEY, JSON.stringify(ctx));
  }

  load(): InterviewContext | null {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as InterviewContext;
    } catch {
      sessionStorage.removeItem(KEY);
      return null;
    }
  }

  clear(): void {
    sessionStorage.removeItem(KEY);
  }
}
