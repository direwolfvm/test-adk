import React, { useState } from 'react'

type AgentResponse = {
  status?: string
  data?: any
}

export default function App() {
  const [prompt, setPrompt] = useState('Hello from CopilotKit')
  const [response, setResponse] = useState<AgentResponse | null>(null)
  const [assistantText, setAssistantText] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<any[]>([])

  async function callAgent() {
    setLoading(true)
    setError(null)
    setResponse(null)
    setAssistantText('')
    try {
  // Use the local proxy in both dev and production so the browser calls our server
  // which then forwards requests to the ADK agent. If you need to force a direct
  // remote call, set VITE_AGENT_URL_FORCE at build time.
  const defaultProxy = '/agent'
  const url = import.meta.env.VITE_AGENT_URL_FORCE || defaultProxy
      // The ADK agent expects a specific JSON body. The 422 response indicates
      // our previous body (just { prompt }) had extra/incorrect fields.
      // Construct a minimal valid payload that includes the required fields.
      const payload = {
        threadId: generateId(),
        runId: generateId(),
        state: {},
        messages: [
          {
            id: generateId(),
            role: 'user',
            content: prompt,
          },
        ],
        tools: [],
        // 'context' must be an array of { description, value }
        context: [],
        forwardedProps: {},
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      })

      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('event-stream') && res.body) {
        // Parse SSE-style streaming response from body
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        const handleParsed = (obj: any) => {
          // Log event for inspection
          setEvents((ev) => [...ev, obj])
          const t = obj.type

          if (t === 'TEXT_MESSAGE_CONTENT' && obj.delta) {
            setAssistantText((s) => s + String(obj.delta))
          } else if (t === 'TEXT_MESSAGE_START') {
            // could reset or track message id
          } else if (t === 'TEXT_MESSAGE_END') {
            // message finished
          } else if (t === 'RUN_FINISHED') {
            setResponse((r) => ({ ...(r || {}), status: String(res.status), data: { ...(r?.data || {}), finished: true } }))
            setLoading(false)
          } else if (t === 'RUN_STARTED') {
            setResponse((r) => ({ ...(r || {}), status: String(res.status), data: { ...(r?.data || {}), started: true } }))
          } else if (t === 'TOOL_CALL_START') {
            // start of a tool call (e.g., RAG query)
            // record toolCallId/name
          } else if (t === 'TOOL_CALL_ARGS') {
            // args may come as a JSON string in delta
            try {
              const parsedArgs = JSON.parse(obj.delta)
              setEvents((ev) => [...ev, { kind: 'tool_args_parsed', toolCallId: obj.toolCallId, args: parsedArgs }])
            } catch (e) {
              // keep raw
            }
          } else if (t === 'TOOL_CALL_END') {
            // tool finished
          } else if (t === 'RUN_ERROR') {
            // important: surface the error to the user
            const msg = obj.message || JSON.stringify(obj)
            setError(msg)
            setResponse((r) => ({ ...(r || {}), status: String(res.status), data: { ...(r?.data || {}), lastError: obj } }))
            setLoading(false)
          }
        }

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // SSE events are separated by double-newline
          const parts = buffer.split(/\r?\n\r?\n/)
          buffer = parts.pop() || ''
          for (const part of parts) {
            const lines = part.split(/\r?\n/).map((l) => l.trim())
            const dataLines = lines.filter((l) => l.startsWith('data:'))
            if (dataLines.length === 0) continue
            const raw = dataLines.map((l) => l.replace(/^data:\s?/, '')).join('\n')
            try {
              const parsed = JSON.parse(raw)
              handleParsed(parsed)
            } catch (e) {
              // ignore JSON parse errors for partial data
            }
          }
        }

        // process any remaining buffer
        if (buffer.trim()) {
          const lines = buffer.split(/\r?\n/).map((l) => l.trim())
          const dataLines = lines.filter((l) => l.startsWith('data:'))
          if (dataLines.length) {
            const raw = dataLines.map((l) => l.replace(/^data:\s?/, '')).join('\n')
            try {
              const parsed = JSON.parse(raw)
              handleParsed(parsed)
            } catch (e) {}
          }
        }

      } else {
        // Non-streaming JSON response
        const json = await res.json()
        setResponse({ status: res.status.toString(), data: json })
      }
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const PROXY_PATH = '/agent'

  return (
    <div className="container">
      <h1>CopilotKit ADK Agent Demo</h1>
      <p>Agent endpoint: <code>{PROXY_PATH} (proxied)</code></p>

      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} />
      <div className="actions">
        <button onClick={callAgent} disabled={loading}>{loading ? 'Calling...' : 'Call Agent'}</button>
      </div>

      {error && <div className="error">Error: {error}</div>}

      {response && (
        <div className="response">
          <h2>Response (status: {response.status})</h2>
          <div className="assistant-stream">
            <h3>Assistant</h3>
            <pre>{assistantText || '—'}</pre>
          </div>
          <h3>Raw/Meta</h3>
          <pre>{JSON.stringify(response.data, null, 2)}</pre>
        </div>
      )}

      {events.length > 0 && (
        <div className="events">
          <h3>Stream events</h3>
          <pre style={{ maxHeight: 300, overflow: 'auto' }}>{JSON.stringify(events, null, 2)}</pre>
        </div>
      )}

      <footer>
        <small>Demo sends a JSON POST with {`{ prompt }`} to the ADK agent endpoint.</small>
      </footer>
    </div>
  )
}

// Simple id generator to avoid adding dependencies
function generateId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9)
}
