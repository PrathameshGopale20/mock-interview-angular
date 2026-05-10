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
import {
  InterviewQuestionItemDto,
  InterviewSetupResponse,
  QuestionType,
} from '../../models/api.models';

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
  /** Locked plan for this interview (language + level filtered on the server). */
  questions: InterviewQuestionItemDto[] = [];
  stepIndex = 0;
  loading = true;
  loadError = '';

  codeDraft: Record<number, string> = {};
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
      this.loadLockedQuestions(id);
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
        this.loadLockedQuestions(id);
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

  private loadLockedQuestions(interviewId: number): void {
    this.api.getInterviewQuestions(interviewId).subscribe({
      next: (res) => {
        this.questions = [...res.questions].sort((a, b) => a.order - b.order);
        for (const q of this.questions) {
          if (q.questionType === QuestionType.Coding) {
            this.codeDraft[q.questionId] = '';
          }
        }
        this.stepIndex = 0;
        this.loading = false;
      },
      error: () => {
        this.loadError =
          'Could not load locked questions for this interview. Start a new interview using “Start interview” on setup (uses the locked-question flow).';
        this.loading = false;
      },
    });
  }

  get currentQuestion(): InterviewQuestionItemDto | null {
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

  submitCode(q: InterviewQuestionItemDto): void {
    if (!this.ctx || this.codeSubmittingId != null) {
      return;
    }
    const code = (this.codeDraft[q.questionId] ?? '').trim();
    if (!code) {
      this.snackBar.open('Enter your code before submitting.', 'Dismiss', { duration: 4000 });
      return;
    }
    this.codeSubmittingId = q.questionId;
    this.api
      .submitCode({
        interviewSessionId: this.ctx.interviewId,
        questionId: q.questionId,
        sourceCode: code,
      })
      .subscribe({
        next: () => {
          this.codeSubmittingId = null;
          this.goToNextOrResults();
        },
        error: (err: { error?: { message?: string } }) => {
          this.codeSubmittingId = null;
          this.snackBar.open(err?.error?.message ?? 'Code submit failed.', 'Dismiss', { duration: 8000 });
        },
      });
  }
}
