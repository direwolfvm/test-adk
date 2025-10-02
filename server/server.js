const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const path = require('path')

const app = express()
const AGENT_TARGET = process.env.AGENT_TARGET || process.env.VITE_AGENT_URL || 'https://permitting-adk-650621702399.us-east4.run.app/agent'
const PORT = process.env.PORT || 8080

// Serve static files from dist
app.use(express.static(path.join(__dirname, '..', 'dist')))

// CORS and JSON parsing for incoming requests
app.use(express.json())
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// Proxy /agent to the ADK agent endpoint
app.use('/agent', createProxyMiddleware({
  target: AGENT_TARGET.replace(/\/agent$/, ''),
  changeOrigin: true,
  secure: true,
  logLevel: 'info',
  pathRewrite: {
    '^/agent': '/agent'
  },
  onProxyReq: (proxyReq, req, res) => {
    // ensure content-type is application/json
    if (req.body && Object.keys(req.body).length) {
      const bodyData = JSON.stringify(req.body)
      proxyReq.setHeader('Content-Type', 'application/json')
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData))
      proxyReq.write(bodyData)
    }
  }
}))

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})

app.listen(PORT, () => console.log(`Server listening on port ${PORT}, proxying /agent -> ${AGENT_TARGET}`))
