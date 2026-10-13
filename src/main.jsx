import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Manutenzione, { inManutenzione } from './Manutenzione.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {inManutenzione() ? <Manutenzione /> : <App />}
  </React.StrictMode>
)
