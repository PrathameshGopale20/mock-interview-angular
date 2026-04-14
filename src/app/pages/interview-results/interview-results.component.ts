import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InterviewContextService } from '../../core/interview-context.service';
import { InterviewApiService } from '../../services/interview-api.service';
import { EvaluationResultDto } from '../../models/api.models';

@Component({
  selector: 'app-interview-results',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './interview-results.component.html',
  styleUrl: './interview-results.component.scss',
})
export class InterviewResultsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(InterviewApiService);
  private readonly ctxService = inject(InterviewContextService);

  evaluation: EvaluationResultDto | null = null;
  busy = true;
  error = '';

  ngOnInit(): void {
    const ctx = this.ctxService.load();
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!ctx || ctx.interviewId !== id || Number.isNaN(id)) {
      this.busy = false;
      this.error = 'Session expired. Start a new interview from setup.';
      return;
    }

    this.api.finalizeInterview(ctx.interviewId).subscribe({
      next: (ev) => {
        this.evaluation = ev;
        this.ctxService.clear();
        this.busy = false;
      },
      error: (err: { error?: { message?: string } }) => {
        this.error = err?.error?.message ?? 'Could not load results.';
        this.busy = false;
      },
    });
  }
}
