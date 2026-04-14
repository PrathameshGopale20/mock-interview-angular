import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { InterviewApiService } from '../../services/interview-api.service';
import { ApiErrorBody } from '../../models/api.models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InterviewApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(256)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(128)]],
  });

  busy = false;
  errorMessage = '';

  submit(): void {
    this.errorMessage = '';
    if (this.form.invalid || this.busy) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy = true;
    this.api.register(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.auth.setSession(res);
        void this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.busy = false;
        const body = err?.error as ApiErrorBody | undefined;
        this.errorMessage = body?.message ?? err?.message ?? 'Registration failed.';
      },
    });
  }
}
