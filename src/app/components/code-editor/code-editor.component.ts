import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  output,
} from '@angular/core';
import type { editor as MonacoEditor } from 'monaco-editor';
import { loadMonacoAmd } from '../../monaco-amd';

function monacoLanguage(stackName: string): string {
  const n = stackName.toLowerCase();
  if (n.includes('python')) return 'python';
  if (n.includes('java')) return 'java';
  if (n.includes('.net') || n.includes('csharp') || n.includes('c#')) return 'csharp';
  if (n.includes('angular') || n.includes('typescript') || n.includes('javascript'))
    return 'typescript';
  if (n.includes('sql')) return 'sql';
  return 'plaintext';
}

@Component({
  selector: 'app-code-editor',
  standalone: true,
  template: '<div class="monaco-host" #host></div>',
  styleUrl: './code-editor.component.scss',
})
export class CodeEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  readonly value = input('');
  readonly languageName = input('plaintext');
  readonly disabled = input(false);
  readonly valueChange = output<string>();

  private editor: MonacoEditor.IStandaloneCodeEditor | null = null;
  private monacoApi: typeof import('monaco-editor') | null = null;
  private syncing = false;

  constructor() {
    effect(() => {
      const v = this.value();
      const ro = this.disabled();
      if (!this.editor) {
        return;
      }
      this.syncing = true;
      try {
        if (this.editor.getValue() !== v) {
          this.editor.setValue(v);
        }
        this.editor.updateOptions({ readOnly: ro });
      } finally {
        this.syncing = false;
      }
    });

    effect(() => {
      const name = this.languageName();
      if (!this.editor || !this.monacoApi) {
        return;
      }
      const model = this.editor.getModel();
      if (model) {
        this.monacoApi.editor.setModelLanguage(model, monacoLanguage(name));
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    await loadMonacoAmd();
    const monaco = window.monaco;
    if (!monaco) {
      console.error('Monaco failed to load');
      return;
    }
    this.monacoApi = monaco;
    this.editor = monaco.editor.create(this.hostRef.nativeElement, {
      value: this.value(),
      language: monacoLanguage(this.languageName()),
      theme: 'vs-dark',
      automaticLayout: true,
      readOnly: this.disabled(),
      minimap: { enabled: false },
      fontSize: 14,
      scrollBeyondLastLine: false,
    });
    this.editor.onDidChangeModelContent(() => {
      if (this.syncing) {
        return;
      }
      this.valueChange.emit(this.editor?.getValue() ?? '');
    });
  }

  ngOnDestroy(): void {
    this.editor?.dispose();
    this.editor = null;
    this.monacoApi = null;
  }
}
