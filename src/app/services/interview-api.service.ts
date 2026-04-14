import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AuthResponse,
  CodeRunRequest,
  CodeRunResponse,
  CodeSubmitRequest,
  CodeSubmitResponse,
  EvaluationResultDto,
  InterviewHistoryItemDto,
  InterviewQuestionsResponseDto,
  InterviewReviewResponseDto,
  InterviewStartRequest,
  ScoreTrendPointDto,
  GenerateQuestionsRequest,
  InterviewSetupRequest,
  InterviewSetupResponse,
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

  startInterview(body: InterviewStartRequest): Observable<InterviewSetupResponse> {
    return this.http.post<InterviewSetupResponse>(`${this.base}/interview/start`, body);
  }

  /** Confirms interview session exists for the logged-in user. */
  getInterviewSession(interviewSessionId: number): Observable<InterviewSetupResponse> {
    return this.http.get<InterviewSetupResponse>(`${this.base}/interviews/${interviewSessionId}`);
  }

  getInterviewQuestions(interviewSessionId: number): Observable<InterviewQuestionsResponseDto> {
    return this.http.get<InterviewQuestionsResponseDto>(
      `${this.base}/interview/${interviewSessionId}/questions`,
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

  runCode(body: CodeRunRequest): Observable<CodeRunResponse> {
    return this.http.post<CodeRunResponse>(`${this.base}/coding/run`, body);
  }

  finalizeInterview(interviewSessionId: number): Observable<EvaluationResultDto> {
    return this.http.post<EvaluationResultDto>(`${this.base}/interview/finalize/${interviewSessionId}`, {});
  }

  getInterviewReview(interviewSessionId: number): Observable<InterviewReviewResponseDto> {
    return this.http.get<InterviewReviewResponseDto>(
      `${this.base}/interview/${interviewSessionId}/review`,
    );
  }

  getDashboardHistory(): Observable<InterviewHistoryItemDto[]> {
    return this.http.get<InterviewHistoryItemDto[]>(`${this.base}/dashboard/history`);
  }

  getScoreTrends(): Observable<ScoreTrendPointDto[]> {
    return this.http.get<ScoreTrendPointDto[]>(`${this.base}/dashboard/trends`);
  }

  generateQuestions(body: GenerateQuestionsRequest): Observable<QuestionDto[]> {
    return this.http.post<QuestionDto[]>(`${this.base}/questions/generate`, body);
  }
}
