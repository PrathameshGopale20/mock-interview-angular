/** Workers loaded from CDN so we do not bundle monaco worker chunks. Version must match package.json monaco-editor. */
export function setupMonacoEnvironment(): void {
  const w = window as unknown as {
    MonacoEnvironment?: { getWorkerUrl: (moduleId: string, label: string) => string };
  };
  const ver = '0.52.2';
  const base = `https://cdn.jsdelivr.net/npm/monaco-editor@${ver}/min/vs`;
  w.MonacoEnvironment = {
    getWorkerUrl(_moduleId: string, label: string) {
      if (label === 'json') return `${base}/json.worker.js`;
      if (label === 'css' || label === 'scss' || label === 'less') return `${base}/css.worker.js`;
      if (label === 'html' || label === 'handlebars' || label === 'razor') return `${base}/html.worker.js`;
      if (label === 'typescript' || label === 'javascript') return `${base}/ts.worker.js`;
      return `${base}/editor.worker.js`;
    },
  };
}
