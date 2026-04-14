import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthResponse } from '../models/api.models';

const STORAGE_KEY = 'mit_auth';

interface StoredAuth {
  token: string;
  userId: number;
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  readonly token = signal<string | null>(null);
  readonly user = signal<{ userId: number; name: string; email: string } | null>(null);
  readonly isLoggedIn = computed(() => !!this.token());

  constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const data = JSON.parse(raw) as StoredAuth;
      this.token.set(data.token);
      this.user.set({ userId: data.userId, name: data.name, email: data.email });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  setSession(dto: AuthResponse): void {
    this.token.set(dto.token);
    this.user.set({ userId: dto.userId, name: dto.name, email: dto.email });
    const payload: StoredAuth = {
      token: dto.token,
      userId: dto.userId,
      name: dto.name,
      email: dto.email,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  logout(): void {
    this.token.set(null);
    this.user.set(null);
    localStorage.removeItem(STORAGE_KEY);
    void this.router.navigate(['/login']);
  }
}
