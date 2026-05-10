import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/auth.service';
import { InterviewApiService } from '../../services/interview-api.service';
import { InterviewHistoryItemDto } from '../../models/api.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(InterviewApiService);
  private readonly snackBar = inject(MatSnackBar);
  readonly auth = inject(AuthService);

  history: InterviewHistoryItemDto[] = [];
  loadError = '';
  loading = true;

  /** First click on delete — show confirm for this row. */
  confirmDeleteId: number | null = null;
  deletingId: number | null = null;

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    this.loadError = '';
    this.api.getDashboardHistory().subscribe({
      next: (rows) => {
        this.history = rows;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Could not load interview history.';
        this.loading = false;
      },
    });
  }

  get completedCount(): number {
    return this.history.filter((h) => h.finalScore != null).length;
  }

  get averageFinal(): number | null {
    const scored = this.history.map((h) => h.finalScore).filter((s): s is number => s != null);
    if (scored.length === 0) {
      return null;
    }
    return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
  }

  requestDelete(row: InterviewHistoryItemDto): void {
    if (this.deletingId != null) {
      return;
    }
    this.confirmDeleteId = this.confirmDeleteId === row.interviewId ? null : row.interviewId;
  }

  cancelDelete(): void {
    this.confirmDeleteId = null;
  }

  executeDelete(row: InterviewHistoryItemDto): void {
    this.deletingId = row.interviewId;
    this.confirmDeleteId = null;
    this.api.deleteInterviewHistory(row.interviewId).subscribe({
      next: () => {
        this.history = this.history.filter((h) => h.interviewId !== row.interviewId);
        this.deletingId = null;
        this.snackBar.open('Interview removed from your history.', 'OK', { duration: 3500 });
      },
      error: () => {
        this.deletingId = null;
        this.snackBar.open('Could not delete this interview.', 'Dismiss', { duration: 6000 });
      },
    });
  }
}
