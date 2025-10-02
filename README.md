# CopilotKit ADK Demo

This small Vite + React + TypeScript app demos calling the ADK AG-UI agent endpoint.

Defaults
- Agent URL: `VITE_AGENT_URL` in `.env` (defaults to https://permitting-adk-650621702399.us-east4.run.app/agent)

Quickstart (macOS / zsh)

1. Install dependencies

```bash
cd copilotkit-adk
npm install
```

2. Run dev server

```bash
npm run dev
```

3. Open the app at the printed localhost URL. Edit the textarea and click "Call Agent" to send a JSON POST to the agent.

Tests

```bash
npm run test
```

Notes

- The demo sends a POST { prompt } to the ADK agent URL and displays the JSON response.
- If you need to use an API key or different host, edit the `.env` file and restart the dev server.
