import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InterviewApiService } from '../../services/interview-api.service';
import { VoiceMetricsDto } from '../../models/api.models';

type VoiceUiState = 'idle' | 'recording' | 'ready_to_submit' | 'submitting';

const NUM_BARS = 24;
const MIN_RECORDING_SEC = 3;

@Component({
  selector: 'app-voice-answer',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './voice-answer.component.html',
  styleUrl: './voice-answer.component.scss',
})
export class VoiceAnswerComponent implements OnDestroy, OnChanges {
  private readonly api = inject(InterviewApiService);
  private readonly snackBar = inject(MatSnackBar);

  @Input({ required: true }) interviewSessionId!: number;
  @Input({ required: true }) questionId!: number;

  @Output() readonly submittedSuccess = new EventEmitter<void>();

  state: VoiceUiState = 'idle';
  elapsedSeconds = 0;
  barHeights: number[] = Array(NUM_BARS).fill(8);

  private recognition: SpeechRecognition | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
  private startedAt = 0;
  private transcriptParts: string[] = [];
  private confidences: number[] = [];
  private lastFinalAt = 0;
  private pauseCount = 0;
  private manualStop = false;

  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private rafId: number | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  /** Prevents duplicate finalize when `recognition.stop()` and fallbacks both run. */
  private stopFinalizeDone = false;

  private pendingTranscript = '';
  private pendingMetrics: VoiceMetricsDto | null = null;

  readonly maxSeconds = 60;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questionId'] && !changes['questionId'].firstChange) {
      this.hardReset();
    }
  }

  get browserSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }

  get formattedTimer(): string {
    const m = Math.floor(this.elapsedSeconds / 60);
    const s = this.elapsedSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  get progressFraction(): number {
    return Math.min(1, this.elapsedSeconds / this.maxSeconds);
  }

  get statusLine(): string {
    switch (this.state) {
      case 'recording':
        return 'Listening…';
      case 'ready_to_submit':
        return 'Review is hidden — tap Submit answer to send your response.';
      case 'submitting':
        return 'Sending answer…';
      default:
        return 'Tap Start recording, speak your answer, then Stop recording.';
    }
  }

  async startRecording(): Promise<void> {
    if (this.state === 'recording' || this.state === 'submitting') {
      return;
    }
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      this.snackBar.open('Speech recognition is not supported in this browser.', 'Dismiss', {
        duration: 6000,
      });
      return;
    }

    this.stopFinalizeDone = false;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch {
      this.snackBar.open('Microphone permission denied or unavailable.', 'Dismiss', { duration: 6000 });
      this.state = 'idle';
      return;
    }

    this.manualStop = false;
    this.transcriptParts = [];
    this.confidences = [];
    this.lastFinalAt = 0;
    this.pauseCount = 0;
    this.elapsedSeconds = 0;
    this.startedAt = Date.now();
    this.pendingTranscript = '';
    this.pendingMetrics = null;
    this.barHeights = Array(NUM_BARS).fill(8);

    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.65;
    source.connect(this.analyser);
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const mime =
      MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ?
        'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
      : '';
    try {
      this.mediaRecorder = mime ? new MediaRecorder(this.mediaStream, { mimeType: mime }) : new MediaRecorder(this.mediaStream);
      this.mediaRecorder.start(250);
    } catch {
      this.teardownMedia();
      this.snackBar.open('Could not start MediaRecorder.', 'Dismiss', { duration: 5000 });
      return;
    }

    this.recognition = new Ctor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const now = Date.now();
          if (this.lastFinalAt > 0 && now - this.lastFinalAt > 1500) {
            this.pauseCount++;
          }
          this.lastFinalAt = now;
          const alt = result[0];
          this.transcriptParts.push(alt.transcript);
          if (typeof alt.confidence === 'number' && !Number.isNaN(alt.confidence)) {
            this.confidences.push(alt.confidence);
          }
        }
      }
    };

    this.recognition.onerror = (ev: SpeechRecognitionErrorEvent) => {
      if (ev.error === 'aborted') {
        return;
      }
      this.cleanupTimers();
      this.teardownMedia();
      this.tryAbortRecognition();
      this.snackBar.open(ev.message || ev.error || 'Speech error', 'Dismiss', { duration: 6000 });
      this.state = 'idle';
    };

    this.recognition.onend = () => {
      if (this.state !== 'recording') {
        return;
      }
      if (!this.manualStop) {
        this.cleanupTimers();
        this.teardownMedia();
        this.state = 'idle';
        return;
      }
      this.afterRecordingStopped();
    };

    this.state = 'recording';
    try {
      this.recognition.start();
    } catch {
      this.teardownMedia();
      this.snackBar.open('Could not start speech recognition.', 'Dismiss', { duration: 5000 });
      this.state = 'idle';
      return;
    }

    this.startVisualizerLoop();

    this.tickInterval = setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
    }, 250);

    this.maxDurationTimer = setTimeout(() => this.stopRecording(), this.maxSeconds * 1000);
  }

  stopRecording(): void {
    if (this.state !== 'recording') {
      return;
    }
    this.manualStop = true;
    this.cleanupTimers();

    try {
      this.mediaRecorder?.stop();
    } catch {
      /* ignore */
    }
    this.mediaRecorder = null;

    this.stopVisualizerLoop();
    this.teardownMedia();

    try {
      this.recognition?.stop();
    } catch {
      this.afterRecordingStopped();
    }
  }

  private afterRecordingStopped(): void {
    if (this.stopFinalizeDone) {
      return;
    }
    this.stopFinalizeDone = true;

    this.tryAbortRecognition();

    const durationSec = (Date.now() - this.startedAt) / 1000;
    if (durationSec < MIN_RECORDING_SEC) {
      this.snackBar.open(
        `Recording too short — speak for at least ${MIN_RECORDING_SEC} seconds.`,
        'Dismiss',
        { duration: 6000 },
      );
      this.stopFinalizeDone = false;
      this.state = 'idle';
      return;
    }

    const transcript = this.transcriptParts.join(' ').replace(/\s+/g, ' ').trim();
    if (!transcript) {
      this.snackBar.open('No speech detected. Try again.', 'Dismiss', { duration: 6000 });
      this.stopFinalizeDone = false;
      this.state = 'idle';
      return;
    }

    const wordCount = transcript.split(/\s+/).filter(Boolean).length;
    const wpm = wordCount > 0 ? (wordCount / Math.max(durationSec, 0.5)) * 60 : 0;
    const avgConf =
      this.confidences.length > 0 ?
        this.confidences.reduce((a, b) => a + b, 0) / this.confidences.length
      : 0.5;

    this.pendingTranscript = transcript;
    this.pendingMetrics = {
      durationSeconds: durationSec,
      pauseCount: this.pauseCount,
      avgSpeechConfidence: avgConf,
      wordsPerMinute: wpm,
      wordCount,
    };
    this.state = 'ready_to_submit';
  }

  submitAnswer(): void {
    if (this.state !== 'ready_to_submit' || !this.pendingMetrics) {
      return;
    }
    this.state = 'submitting';
    this.api
      .submitAnswer({
        interviewSessionId: this.interviewSessionId,
        questionId: this.questionId,
        transcript: this.pendingTranscript,
        voiceMetrics: this.pendingMetrics,
      })
      .subscribe({
        next: (res) => {
          if (!res?.success) {
            this.snackBar.open(res?.message ?? 'Submit failed.', 'Dismiss', { duration: 8000 });
            this.state = 'ready_to_submit';
            return;
          }
          this.snackBar.open('Answer submitted.', 'OK', { duration: 2500 });
          this.hardReset();
          this.submittedSuccess.emit();
        },
        error: (err: { error?: { message?: string } }) => {
          const msg = err?.error?.message ?? 'Could not submit answer.';
          this.snackBar.open(msg, 'Dismiss', { duration: 8000 });
          this.state = 'ready_to_submit';
        },
      });
  }

  private startVisualizerLoop(): void {
    const tick = () => {
      if (this.state !== 'recording' || !this.analyser || !this.dataArray) {
        return;
      }
      this.analyser.getByteFrequencyData(this.dataArray);
      this.barHeights = this.computeBarHeights(this.dataArray);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopVisualizerLoop(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.analyser = null;
    this.dataArray = null;
    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close();
    }
    this.audioContext = null;
    this.barHeights = Array(NUM_BARS).fill(8);
  }

  private computeBarHeights(data: Uint8Array): number[] {
    const out: number[] = [];
    const chunk = Math.max(1, Math.floor(data.length / NUM_BARS));
    for (let i = 0; i < NUM_BARS; i++) {
      let sum = 0;
      for (let j = 0; j < chunk; j++) {
        sum += data[i * chunk + j] ?? 0;
      }
      const avg = sum / chunk;
      const pct = Math.min(100, Math.max(6, (avg / 255) * 100 * 1.4));
      out.push(pct);
    }
    return out;
  }

  private teardownMedia(): void {
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;
  }

  private cleanupTimers(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
  }

  private tryAbortRecognition(): void {
    try {
      this.recognition?.abort();
    } catch {
      /* ignore */
    }
    this.recognition = null;
  }

  private hardReset(): void {
    this.cleanupTimers();
    this.stopVisualizerLoop();
    this.teardownMedia();
    this.tryAbortRecognition();
    this.stopFinalizeDone = false;
    this.state = 'idle';
    this.elapsedSeconds = 0;
    this.pendingTranscript = '';
    this.pendingMetrics = null;
    this.barHeights = Array(NUM_BARS).fill(8);
  }

  ngOnDestroy(): void {
    this.hardReset();
  }
}
