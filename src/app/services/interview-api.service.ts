import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AuthResponse,
  CodeSubmitRequest,
  CodeSubmitResponse,
  EvaluationResultDto,
  InterviewHistoryItemDto,
  InterviewQuestionsResponseDto,
  InterviewSetupRequest,
  InterviewSetupResponse,
  InterviewStartRequest,
  LanguageDto,
  LevelDto,
  LoginRequest,
  QuestionDto,
  RegisterRequest,
  VoiceAnswerSubmitRequest,
  VoiceAnswerSubmitResponse,
  AnswerSubmitStatusDto,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class InterviewApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/login`, body);
  }

  register(body: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/register`, body);
  }

  getLanguages(): Observable<LanguageDto[]> {
    return this.http.get<LanguageDto[]>(`${this.base}/languages`);
  }

  getLevels(): Observable<LevelDto[]> {
    return this.http.get<LevelDto[]>(`${this.base}/levels`);
  }

  setupInterview(body: InterviewSetupRequest): Observable<InterviewSetupResponse> {
    return this.http.post<InterviewSetupResponse>(`${this.base}/interviews/setup`, body);
  }

  /**
   * Starts an interview with a locked question set (theory + coding) for the chosen language/difficulty.
   * Prefer this over setupInterview for the main candidate flow.
   */
  startInterview(body: InterviewStartRequest): Observable<InterviewSetupResponse> {
    return this.http.post<InterviewSetupResponse>(`${this.base}/interviews/start`, body);
  }

  /** Confirms interview session exists for the logged-in user. */
  getInterviewSession(interviewSessionId: number): Observable<InterviewSetupResponse> {
    return this.http.get<InterviewSetupResponse>(`${this.base}/interviews/${interviewSessionId}`);
  }

  getInterviewQuestions(interviewSessionId: number): Observable<InterviewQuestionsResponseDto> {
    return this.http.get<InterviewQuestionsResponseDto>(
      `${this.base}/interviews/${interviewSessionId}/questions`,
    );
  }

  getQuestions(languageId: number, levelId: number): Observable<QuestionDto[]> {
    return this.http.get<QuestionDto[]>(`${this.base}/questions`, {
      params: { languageId: String(languageId), levelId: String(levelId) },
    });
  }

  submitVoiceAnswer(body: VoiceAnswerSubmitRequest): Observable<VoiceAnswerSubmitResponse> {
    return this.http.post<VoiceAnswerSubmitResponse>(`${this.base}/answers/voice`, body);
  }

  /**
   * Voice answer submit (same contract as POST /api/answers/voice).
   * Uses `/api/answers/voice` so older API builds without `/api/answer/submit` still work.
   */
  submitAnswer(body: VoiceAnswerSubmitRequest): Observable<AnswerSubmitStatusDto> {
    return this.http
      .post<VoiceAnswerSubmitResponse>(`${this.base}/answers/voice`, body)
      .pipe(
        map((r) => ({
          success: true,
          answerId: r.answerId,
          message: r.message ?? '',
        })),
      );
  }

  submitCode(body: CodeSubmitRequest): Observable<CodeSubmitResponse> {
    return this.http.post<CodeSubmitResponse>(`${this.base}/coding/submit`, body);
  }

  finalizeInterview(interviewSessionId: number): Observable<EvaluationResultDto> {
    return this.http.post<EvaluationResultDto>(
      `${this.base}/evaluation/finalize/${interviewSessionId}`,
      {},
    );
  }

  getDashboardHistory(): Observable<InterviewHistoryItemDto[]> {
    return this.http.get<InterviewHistoryItemDto[]>(`${this.base}/dashboard/history`);
  }

  deleteInterviewHistory(interviewId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/dashboard/history/${interviewId}`);
  }
}
