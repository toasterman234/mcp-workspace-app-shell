// Bump resource URI to force host-side template cache refresh.
export const WIDGET_RESOURCE_URI = 'ui://workspace/widget-v2.html'

export function widgetMeta() {
  return {
    ui: {
      resourceUri: WIDGET_RESOURCE_URI,
      visibility: ['model', 'app'],
      prefersBorder: true,
    },
    // OpenAI Apps host metadata (explicit keys improve interoperability).
    'openai/widgetPrefersBorder': true,
    'openai/outputTemplate': WIDGET_RESOURCE_URI,
    'openai/toolInvocation/invoking': 'Loading workspace…',
    'openai/toolInvocation/invoked': 'Workspace ready',
  } as const
}

export function buildWidgetHtml(widgetJsPath: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MCP Workspace Widget</title>
    <style>
      :root{color-scheme:dark;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
      html,body,#root{height:100%;margin:0;background:#0f1115;color:#e8ecf4}
      body{position:relative}
      #boot-fallback{
        position:absolute;inset:12px;border:1px solid #7f1d1d;background:#1f1111;color:#fecaca;
        border-radius:10px;padding:12px;overflow:auto;font-size:13px;line-height:1.5
      }
      .widget-shell{height:100%;padding:12px;overflow:auto}
      .widget-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
      .badge{font-size:11px;padding:2px 8px;border:1px solid #2a3142;border-radius:999px;color:#9aa3b5}
      .widget-actions{display:flex;gap:8px;margin-bottom:10px}
      .btn{background:#1c2230;border:1px solid #2a3142;color:#e8ecf4;padding:6px 10px;border-radius:8px;cursor:pointer}
      .muted{color:#9aa3b5}
      .state{border:1px solid #2a3142;border-radius:10px;padding:12px}
    </style>
  </head>
  <body>
    <div id="boot-fallback">
      <strong>Widget bootstrap pending...</strong><br/>
      If this message remains visible, the widget script likely failed to load or execute.
      Check app URL reachability, asset path, and ChatGPT app CSP/script restrictions.
      <div style="margin-top:8px;color:#fca5a5;font-family:monospace;word-break:break-all">${widgetJsPath}</div>
    </div>
    <div id="root"></div>
    <script type="module" src="${widgetJsPath}"></script>
  </body>
</html>`
}
