import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ComptrollerProvider } from './contexts/ComptrollerContext'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ComptrollerProvider>
      <App />
    </ComptrollerProvider>
  </React.StrictMode>,
)
