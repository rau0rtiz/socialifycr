/**
 * Documentos (propuestas / reportes / planes) pueden guardarse como HTML puro
 * o como código JSX/React. Si es JSX, lo envolvemos en un documento HTML que
 * compila el código en el navegador con Babel standalone + React + Tailwind CDN.
 */

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

export const isJsxDocument = (source: string): boolean => {
  const src = stripComments(source).trim();
  if (!src) return false;
  // HTML completo → no es JSX
  if (/^<!doctype/i.test(src) || /^<html[\s>]/i.test(src)) return false;
  return (
    /\bexport\s+default\b/.test(src) ||
    /\bimport\s+[\s\S]*?\bfrom\s+['"]react['"]/.test(src) ||
    /\bfunction\s+App\s*\(/.test(src) ||
    /\bconst\s+App\s*=/.test(src) ||
    /\bReact\.(createElement|useState)\b/.test(src) ||
    (/=>\s*\(?\s*</.test(src) && /\bclassName=/.test(src))
  );
};

/**
 * Convierte el código del usuario en un módulo ejecutable por Babel:
 * quita imports (React y hooks quedan globales) y normaliza el export default.
 */
const normalizeJsx = (source: string): string => {
  let code = source;

  // Quitar imports (los paquetes no existen en el iframe).
  // Soporta imports multilínea, con o sin punto y coma.
  code = code.replace(
    /^[ \t]*import\b[\s\S]*?\bfrom[ \t]*['"][^'"]*['"][ \t]*;?/gm,
    ''
  );
  // import 'estilos.css';  /  import "x"
  code = code.replace(/^[ \t]*import[ \t]*['"][^'"]+['"][ \t]*;?/gm, '');
  // require(...) sueltos
  code = code.replace(/^[ \t]*(?:const|let|var)\s+[\s\S]*?=\s*require\([^)]*\)[ \t]*;?/gm, '');
  // export * from '...' / export { x } from '...'
  code = code.replace(/^[ \t]*export\s+[\s\S]*?\bfrom[ \t]*['"][^'"]*['"][ \t]*;?/gm, '');

  // export default function Foo() {}  → function Foo(){}; __setRoot(Foo)
  const namedFn = code.match(/export\s+default\s+function\s+([A-Za-z0-9_$]+)/);
  if (namedFn) {
    code = code.replace(/export\s+default\s+function/, 'function');
    code += `\n__setRoot(${namedFn[1]});`;
  } else if (/export\s+default\s+function/.test(code)) {
    // función anónima
    code = code.replace(/export\s+default\s+function/, 'const __Root = function');
    code += '\n__setRoot(__Root);';
  } else if (/export\s+default\s+/.test(code)) {
    code = code.replace(/export\s+default\s+/, 'const __Root = ');
    code += '\n__setRoot(__Root);';
  } else {
    // sin export: buscar un componente conocido
    const candidate =
      code.match(/function\s+(App|Report|Proposal|Document|Page|Root)\s*\(/)?.[1] ||
      code.match(/const\s+(App|Report|Proposal|Document|Page|Root)\s*=/)?.[1];
    if (candidate) code += `\n__setRoot(${candidate});`;
  }

  // Quitar named exports sueltos
  code = code.replace(/export\s+(const|let|var|function|class)\s/g, '$1 ');
  code = code.replace(/^[ \t]*export\s*\{[^}]*\}[ \t]*;?/gm, '');

  // Red de seguridad: cualquier import residual rompería el script del iframe
  code = code
    .split('\n')
    .filter((line) => !/^\s*import\s/.test(line))
    .join('\n');

  return code;
};

export const buildJsxHtmlDocument = (source: string, title = 'Documento'): string => {
  const code = normalizeJsx(source);
  // No interpolar JSX directamente dentro de un <script>: además de ser frágil
  // con </script>, Babel Standalone intenta ejecutar los tags text/babel mediante
  // appendChild y puede confundir @import dentro de templates CSS con un import JS.
  const serializedCode = JSON.stringify(code).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title.replace(/[<>&]/g, '')}</title>
<script src="https://cdn.tailwindcss.com"></script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>
  body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  #jsx-error { display:none; margin:0; padding:16px; white-space:pre-wrap; font:12px/1.5 ui-monospace,Menlo,monospace; color:#b91c1c; background:#fef2f2; border-bottom:1px solid #fecaca; }
</style>
</head>
<body>
<pre id="jsx-error"></pre>
<div id="root"></div>
<script>
  window.__showError = function (msg) {
    var el = document.getElementById('jsx-error');
    el.style.display = 'block';
    el.textContent = String(msg);
  };
  window.onerror = function (m) { window.__showError(m); };
</script>
<script>
try {
  var __source = ${serializedCode};
  var __compiled = Babel.transform(__source, {
    presets: [['react', { runtime: 'classic' }]],
    sourceType: 'script',
    filename: 'documento.jsx'
  }).code;
  var __runner = new Function(
    'React',
    'ReactDOM',
    'mountNode',
    'var __root = null; function __setRoot(c) { __root = c; }' +
    'const { useState, useEffect, useMemo, useRef, useCallback, Fragment } = React;\\n' +
    __compiled +
    '\\nif (!__root) throw new Error(\\'No se encontró un componente para renderizar. Usá "export default function App() { ... }".\\');' +
    '\\nReactDOM.createRoot(mountNode).render(React.createElement(__root));'
  );
  __runner(React, ReactDOM, document.getElementById('root'));
} catch (err) {
  window.__showError(err && err.message ? err.message : err);
}
</script>
</body>
</html>`;
};

/** Devuelve el HTML final listo para un iframe srcDoc. */
export const renderDocumentSource = (source: string, title = 'Documento'): string =>
  isJsxDocument(source) ? buildJsxHtmlDocument(source, title) : source;
