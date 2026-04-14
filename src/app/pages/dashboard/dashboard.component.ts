import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { InterviewApiService } from '../../services/interview-api.service';
import { InterviewHistoryItemDto } from '../../models/api.models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(InterviewApiService);
  readonly auth = inject(AuthService);

  history: InterviewHistoryItemDto[] = [];
  loadError = '';
  loading = true;

  ngOnInit(): void {
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
}
