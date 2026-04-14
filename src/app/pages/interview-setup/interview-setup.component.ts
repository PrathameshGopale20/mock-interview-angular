import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InterviewApiService } from '../../services/interview-api.service';
import {
  InterviewContextService,
  JUST_STARTED_INTERVIEW_KEY,
} from '../../core/interview-context.service';
import { LanguageDto, LevelDto } from '../../models/api.models';

@Component({
  selector: 'app-interview-setup',
  standalone: true,
  imports: [FormsModule, MatSnackBarModule],
  templateUrl: './interview-setup.component.html',
  styleUrl: './interview-setup.component.scss',
})
export class InterviewSetupComponent implements OnInit {
  private readonly api = inject(InterviewApiService);
  private readonly ctx = inject(InterviewContextService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  languages: LanguageDto[] = [];
  levels: LevelDto[] = [];
  languageId: number | null = null;
  levelId: number | null = null;
  busy = false;
  generateBusy = false;
  errorMessage = '';

  ngOnInit(): void {
    this.snackBar.dismiss();
    this.api.getLanguages().subscribe({
      next: (l) => (this.languages = l),
      error: () => (this.errorMessage = 'Failed to load languages.'),
    });
    this.api.getLevels().subscribe({
      next: (l) => (this.levels = l),
      error: () => (this.errorMessage = 'Failed to load difficulty levels.'),
    });
  }

  start(): void {
    this.errorMessage = '';
    if (this.languageId == null || this.levelId == null || this.busy) {
      this.errorMessage = 'Select both language and difficulty.';
      return;
    }
    this.busy = true;
    this.api
      .startInterview({ languageId: this.languageId, levelId: this.levelId, theoryQuestionCount: 10 })
      .subscribe({
        next: (res) => {
          this.ctx.save({
            interviewId: res.interviewId,
            languageId: res.languageId,
            levelId: res.levelId,
            languageName: res.languageName,
            levelName: res.levelName,
          });
          sessionStorage.setItem(JUST_STARTED_INTERVIEW_KEY, String(res.interviewId));
          void this.router.navigate(['/interview', res.interviewId]);
        },
        error: (err) => {
          this.busy = false;
          this.errorMessage = err?.error?.message ?? 'Could not start interview.';
        },
      });
  }

  /** Persists new theory questions from OpenAI for the selected language/level (requires OpenAI:ApiKey on API). */
  generateAiQuestions(): void {
    this.errorMessage = '';
    if (this.languageId == null || this.levelId == null || this.generateBusy) {
      this.errorMessage = 'Select both language and difficulty first.';
      return;
    }
    this.generateBusy = true;
    this.api
      .generateQuestions({ languageId: this.languageId, levelId: this.levelId, count: 2 })
      .subscribe({
        next: (rows) => {
          this.generateBusy = false;
          this.snackBar.open(`Added ${rows.length} AI question(s) to the bank.`, 'OK', { duration: 5000 });
        },
        error: (err: { error?: { message?: string } }) => {
          this.generateBusy = false;
          this.snackBar.open(err?.error?.message ?? 'Could not generate questions.', 'Dismiss', {
            duration: 8000,
          });
        },
      });
  }
}
