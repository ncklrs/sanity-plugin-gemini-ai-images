import type {ReactNode} from 'react'
// Keep native, accessible controls visually consistent with Studio in both UI 3/4.
const styles = `
.sanity-ai-media {font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size:14px; line-height:1.5; color:var(--card-fg-color,inherit)}
.sanity-ai-media p {margin:8px 0; color:var(--card-fg-color,inherit)}
.sanity-ai-media label {display:block; font-size:13px; font-weight:500}
.sanity-ai-media label:has(input[type="checkbox"]) {display:flex; gap:8px; align-items:center}
.sanity-ai-media input:not([type="checkbox"]):not([type="range"]):not([type="file"]):not([data-ui]),
.sanity-ai-media textarea:not([data-ui]), .sanity-ai-media select:not([data-ui]) {font:inherit; color:inherit; background:var(--card-bg-color,transparent); border:1px solid var(--card-border-color,#c7cbd1); border-radius:4px; padding:8px 10px; box-sizing:border-box; max-width:100%}
.sanity-ai-media label > input:not([type="checkbox"]), .sanity-ai-media label > textarea, .sanity-ai-media label > select {display:block; width:100%; margin-top:6px}
.sanity-ai-media button:not([data-ui]) {font:inherit; color:inherit; background:var(--card-muted-bg-color,transparent); border:1px solid var(--card-border-color,#c7cbd1); border-radius:4px; padding:7px 12px; cursor:pointer; line-height:1.25}
.sanity-ai-media button:not([data-ui]):hover {background:var(--card-bg2-color,rgba(127,127,127,.08))}
.sanity-ai-media button:disabled {opacity:.5; cursor:default}
.sanity-ai-media :is(button,input,select,textarea):focus-visible {outline:2px solid #2276fc; outline-offset:2px}
.sanity-ai-media article {border-top:1px solid var(--card-border-color,#ddd); padding:16px 0}
.sanity-ai-media article img, .sanity-ai-media article video {border-radius:4px}
.sanity-ai-media progress {width:100%; accent-color:#2276fc}
.sanity-ai-media pre {white-space:pre-wrap; overflow-wrap:anywhere}
.sanity-ai-media summary {cursor:pointer; padding:8px 0}
`
export function MediaSurface({children}: {children: ReactNode}) {
  return (
    <div className="sanity-ai-media">
      <style>{styles}</style>
      {children}
    </div>
  )
}
