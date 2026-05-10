export interface AuthResponse {
  token: string;
  userId: number;
  name: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LanguageDto {
  id: number;
  name: string;
}

export interface LevelDto {
  id: number;
  name: string;
}

export interface InterviewSetupRequest {
  languageId: number;
  levelId: number;
}

export interface InterviewStartRequest {
  languageId: number;
  levelId: number;
  /** 1–15; server caps by how many theory rows exist in the DB for this language/level. */
  theoryQuestionCount?: number;
}

export interface InterviewSetupResponse {
  interviewId: number;
  languageId: number;
  languageName: string;
  levelId: number;
  levelName: string;
  startedAt: string;
}

export enum QuestionType {
  Text = 0,
  Coding = 1,
}

export interface QuestionDto {
  id: number;
  text: string;
  questionType: QuestionType;
  languageId: number;
  levelId: number;
}

export interface InterviewQuestionItemDto {
  order: number;
  questionId: number;
  text: string;
  questionType: QuestionType;
}

export interface InterviewQuestionsResponseDto {
  interviewId: number;
  totalQuestions: number;
  theoryQuestionsCount: number;
  questions: InterviewQuestionItemDto[];
}

export interface VoiceMetricsDto {
  durationSeconds: number;
  pauseCount: number;
  avgSpeechConfidence: number;
  wordsPerMinute: number;
  wordCount: number;
}

export interface VoiceAnswerSubmitRequest {
  interviewSessionId: number;
  questionId: number;
  transcript: string;
  voiceMetrics: VoiceMetricsDto;
}

export interface VoiceAnswerSubmitResponse {
  answerId: number;
  message: string;
}

/** Response from POST /api/answer/submit */
export interface AnswerSubmitStatusDto {
  success: boolean;
  answerId: number;
  message: string;
}

export interface CodeSubmitRequest {
  interviewSessionId: number;
  questionId: number;
  sourceCode: string;
}

export interface TestCaseResultDto {
  stdin: string | null;
  expectedOutput: string;
  actualOutput: string | null;
  passed: boolean;
}

export interface CodeSubmitResponse {
  answerId: number;
  testCasesPassed: number;
  testCasesTotal: number;
  codeScorePercent: number;
  combinedStdout: string | null;
  combinedStderr: string | null;
  testCaseResults: TestCaseResultDto[];
}

export interface EvaluationResultDto {
  resultId: number;
  interviewSessionId: number;
  /** Semantic / content accuracy (0–100). */
  answerScore: number;
  /** Voice delivery (0–100). */
  voiceScore: number;
  codeScore: number;
  finalScore: number;
  /** Answer-accuracy feedback. */
  feedback: string;
  /** Voice coaching suggestions. */
  improvementSuggestions: string;
}

export interface InterviewHistoryItemDto {
  interviewId: number;
  languageName: string;
  levelName: string;
  startedAt: string;
  answerScore: number | null;
  voiceScore: number | null;
  codeScore: number | null;
  finalScore: number | null;
  feedback: string | null;
  improvementSuggestions: string | null;
}

export interface ApiErrorBody {
  message?: string;
  statusCode?: number;
}
