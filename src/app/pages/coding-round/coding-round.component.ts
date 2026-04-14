import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CodeEditorComponent } from '../../components/code-editor/code-editor.component';
import { InterviewContextService } from '../../core/interview-context.service';
import { InterviewApiService } from '../../services/interview-api.service';
import { InterviewQuestionItemDto, QuestionType } from '../../models/api.models';

@Component({
  selector: 'app-coding-round',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatSnackBarModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    CodeEditorComponent,
  ],
  templateUrl: './coding-round.component.html',
  styleUrl: './coding-round.component.scss',
})
export class CodingRoundComponent implements OnInit {
  private readonly api = inject(InterviewApiService);
  private readonly ctxService = inject(InterviewContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  interviewId = 0;
  ctx = this.ctxService.load();
  codingQuestion: InterviewQuestionItemDto | null = null;

  code = '';
  stdin = '';
  runOutput = '';
  runError = '';

  busy = true;
  running = false;
  submitting = false;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.interviewId = id;
    if (!this.ctx || this.ctx.interviewId !== id || Number.isNaN(id)) {
      void this.router.navigate(['/interview/setup']);
      return;
    }

    this.api.getInterviewQuestions(id).subscribe({
      next: (res) => {
        this.codingQuestion = res.questions.find((q) => q.questionType === QuestionType.Coding) ?? null;
        this.busy = false;
        if (!this.codingQuestion) {
          this.snackBar.open('Coding question not found for this interview.', 'Dismiss', { duration: 6000 });
        }
      },
      error: () => {
        this.busy = false;
        this.snackBar.open('Failed to load coding round.', 'Dismiss', { duration: 6000 });
      },
    });
  }

  runCode(): void {
    if (!this.ctx || !this.codingQuestion || this.running || this.submitting) return;
    if (!this.code.trim()) {
      this.snackBar.open('Write your code first.', 'Dismiss', { duration: 3000 });
      return;
    }
    this.running = true;
    this.runOutput = '';
    this.runError = '';
    this.api
      .runCode({
        interviewSessionId: this.ctx.interviewId,
        questionId: this.codingQuestion.questionId,
        sourceCode: this.code,
        stdin: this.stdin || null,
      })
      .subscribe({
        next: (res) => {
          this.running = false;
          this.runOutput = res.stdout ?? '';
          this.runError = [res.stderr, res.compileOutput].filter(Boolean).join('\n') || '';
        },
        error: (err: { error?: { message?: string } }) => {
          this.running = false;
          this.runError = err?.error?.message ?? 'Run failed.';
        },
      });
  }

  submitCode(): void {
    if (!this.ctx || !this.codingQuestion || this.submitting) return;
    if (!this.code.trim()) {
      this.snackBar.open('Write your code first.', 'Dismiss', { duration: 3000 });
      return;
    }
    this.submitting = true;
    this.api
      .submitCode({
        interviewSessionId: this.ctx.interviewId,
        questionId: this.codingQuestion.questionId,
        sourceCode: this.code,
      })
      .subscribe({
        next: (res) => {
          this.snackBar.open(`Submitted. Tests: ${res.testCasesPassed}/${res.testCasesTotal}`, 'OK', {
            duration: 5000,
          });
          this.api.finalizeInterview(this.ctx!.interviewId).subscribe({
            next: () => {
              this.submitting = false;
              void this.router.navigate(['/interview', this.ctx!.interviewId, 'review']);
            },
            error: () => {
              this.submitting = false;
              this.snackBar.open('Finalization failed. Try again.', 'Dismiss', { duration: 6000 });
            },
          });
        },
        error: (err: { error?: { message?: string } }) => {
          this.submitting = false;
          this.snackBar.open(err?.error?.message ?? 'Submit failed.', 'Dismiss', { duration: 8000 });
        },
      });
  }
}

