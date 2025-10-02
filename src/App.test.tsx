import { render, screen } from '@testing-library/react'
import App from './App'

test('renders heading', () => {
  render(<App />)
  expect(screen.getByText(/CopilotKit ADK Agent Demo/i)).toBeInTheDocument()
})
