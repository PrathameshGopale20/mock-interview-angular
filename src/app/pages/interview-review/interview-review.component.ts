import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InterviewContextService } from '../../core/interview-context.service';
import { InterviewApiService } from '../../services/interview-api.service';
import { InterviewReviewResponseDto } from '../../models/api.models';

@Component({
  selector: 'app-interview-review',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatExpansionModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './interview-review.component.html',
  styleUrl: './interview-review.component.scss',
})
export class InterviewReviewComponent implements OnInit {
  private readonly api = inject(InterviewApiService);
  private readonly ctxService = inject(InterviewContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  ctx = this.ctxService.load();
  interviewId = 0;
  loading = true;
  review: InterviewReviewResponseDto | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.interviewId = id;
    if (!this.ctx || this.ctx.interviewId !== id || Number.isNaN(id)) {
      void this.router.navigate(['/dashboard']);
      return;
    }

    this.api.getInterviewReview(id).subscribe({
      next: (r) => {
        this.review = r;
        this.loading = false;
      },
      error: (err: { error?: { message?: string } }) => {
        this.loading = false;
        this.snackBar.open(err?.error?.message ?? 'Failed to load review.', 'Dismiss', {
          duration: 8000,
        });
      },
    });
  }
}

