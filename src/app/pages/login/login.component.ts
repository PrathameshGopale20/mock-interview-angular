import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { InterviewApiService } from '../../services/interview-api.service';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InterviewApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
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
    this.api.login(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.auth.setSession(res);
        void this.router.navigate(['/dashboard']);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.busy = false;
        this.errorMessage = err?.error?.message ?? err?.message ?? 'Login failed.';
      },
    });
  }
}
