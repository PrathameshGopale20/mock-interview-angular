import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { VoiceAnswerComponent } from '../../components/voice-answer/voice-answer.component';
import {
  InterviewContext,
  InterviewContextService,
  JUST_STARTED_INTERVIEW_KEY,
} from '../../core/interview-context.service';
import { InterviewApiService } from '../../services/interview-api.service';
import { InterviewSetupResponse, QuestionDto, QuestionType } from '../../models/api.models';

@Component({
  selector: 'app-interview-session',
  standalone: true,
  imports: [FormsModule, RouterLink, VoiceAnswerComponent, MatSnackBarModule],
  templateUrl: './interview-session.component.html',
  styleUrl: './interview-session.component.scss',
})
export class InterviewSessionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(InterviewApiService);
  private readonly ctxService = inject(InterviewContextService);
  private readonly snackBar = inject(MatSnackBar);

  readonly QuestionType = QuestionType;

  ctx: InterviewContext | null = this.ctxService.load();
  questions: QuestionDto[] = [];
  /** Index of the question currently shown (one at a time). */
  stepIndex = 0;
  loading = true;
  loadError = '';

  codeDraft: Record<number, string> = {};
  lastMsg: Record<number, string> = {};
  codeSubmittingId: number | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.ctx || this.ctx.interviewId !== id || Number.isNaN(id)) {
      void this.router.navigate(['/interview/setup']);
      return;
    }

    const justStartedRaw = sessionStorage.getItem(JUST_STARTED_INTERVIEW_KEY);
    const skipSessionGet =
      justStartedRaw != null && justStartedRaw === String(id) && this.ctx.interviewId === id;
    if (skipSessionGet) {
      sessionStorage.removeItem(JUST_STARTED_INTERVIEW_KEY);
      this.applySessionFromContextAndLoadQuestions();
      return;
    }

    this.api.getInterviewSession(id).subscribe({
      next: (session: InterviewSetupResponse) => {
        this.ctxService.save({
          interviewId: session.interviewId,
          languageId: session.languageId,
          levelId: session.levelId,
          languageName: session.languageName,
          levelName: session.levelName,
        });
        this.ctx = this.ctxService.load();
        this.loadQuestionsForSession(session.languageId, session.levelId);
      },
      error: () => {
        this.ctxService.clear();
        this.ctx = null;
        this.snackBar.dismiss();
        this.snackBar.open(
          'This interview session is missing or no longer available. Start a new interview from setup.',
          'Dismiss',
          { duration: 10000 },
        );
        void this.router.navigate(['/interview/setup']);
        this.loading = false;
      },
    });
  }

  /** When we just created this session via setup, context already matches the DB row. */
  private applySessionFromContextAndLoadQuestions(): void {
    if (!this.ctx) {
      return;
    }
    this.loadQuestionsForSession(this.ctx.languageId, this.ctx.levelId);
  }

  private loadQuestionsForSession(languageId: number, levelId: number): void {
    this.api.getQuestions(languageId, levelId).subscribe({
      next: (q) => {
        this.questions = q;
        for (const x of q) {
          this.codeDraft[x.id] = '';
        }
        this.stepIndex = 0;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Failed to load questions.';
        this.loading = false;
      },
    });
  }

  get currentQuestion(): QuestionDto | null {
    return this.questions[this.stepIndex] ?? null;
  }

  get progressLabel(): string {
    if (this.questions.length === 0) {
      return '';
    }
    return `Question ${this.stepIndex + 1} of ${this.questions.length}`;
  }

  private goToNextOrResults(): void {
    if (!this.ctx) {
      return;
    }
    if (this.stepIndex < this.questions.length - 1) {
      this.stepIndex++;
    } else {
      void this.router.navigate(['/interview', this.ctx.interviewId, 'results']);
    }
  }

  onVoiceSubmitted(): void {
    this.goToNextOrResults();
  }

  submitCode(q: QuestionDto): void {
    if (!this.ctx || this.codeSubmittingId != null) {
      return;
    }
    const code = (this.codeDraft[q.id] ?? '').trim();
    if (!code) {
      this.lastMsg[q.id] = 'Paste your code.';
      return;
    }
    this.codeSubmittingId = q.id;
    this.lastMsg[q.id] = '';
    this.api
      .submitCode({
        interviewSessionId: this.ctx.interviewId,
        questionId: q.id,
        sourceCode: code,
      })
      .subscribe({
        next: (res) => {
          this.codeSubmittingId = null;
          this.lastMsg[q.id] = `Tests: ${res.testCasesPassed}/${res.testCasesTotal} (${res.codeScorePercent}%)`;
          this.snackBar.open('Code submitted.', 'OK', { duration: 2500 });
          this.goToNextOrResults();
        },
        error: (err: { error?: { message?: string } }) => {
          this.codeSubmittingId = null;
          const msg = err?.error?.message ?? 'Code run failed.';
          this.lastMsg[q.id] = msg;
          this.snackBar.open(msg, 'Dismiss', { duration: 8000 });
        },
      });
  }
}
