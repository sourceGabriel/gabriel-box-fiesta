import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@party/ui/tokens.css'
import '@party/ui/components.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
