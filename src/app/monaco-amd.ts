/** Load Monaco via AMD loader (avoids bundling .ttf / worker assets in Angular esbuild). */
const MONACO_VER = '0.52.2';
const VS_ROOT = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VER}/min/vs`;

declare global {
  interface Window {
    monaco?: typeof import('monaco-editor');
    require?: { config: (c: object) => void; (deps: string[], cb: () => void, err?: (e: Error) => void): void };
    ___monacoAmdLoading?: Promise<void>;
  }
}

export function loadMonacoAmd(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }
  if (window.monaco) {
    return Promise.resolve();
  }
  if (window.___monacoAmdLoading) {
    return window.___monacoAmdLoading;
  }
  window.___monacoAmdLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-mit-monaco-loader]');
    if (existing) {
      existing.addEventListener('load', () => configureAndLoad(resolve, reject));
      existing.addEventListener('error', () => reject(new Error('Monaco loader script failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = `${VS_ROOT}/loader.js`;
    s.async = true;
    s.setAttribute('data-mit-monaco-loader', '1');
    s.onload = () => configureAndLoad(resolve, reject);
    s.onerror = () => reject(new Error('Could not load Monaco loader.js'));
    document.head.appendChild(s);
  });
  return window.___monacoAmdLoading;
}

function configureAndLoad(resolve: () => void, reject: (e: Error) => void): void {
  const req = window.require;
  if (!req || typeof req.config !== 'function') {
    reject(new Error('Monaco require not available'));
    return;
  }
  req.config({ paths: { vs: VS_ROOT } });
  req(
    ['vs/editor/editor.main'],
    () => resolve(),
    (err: Error) => reject(err ?? new Error('Monaco editor.main failed')),
  );
}
