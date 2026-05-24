import React from 'react'
import './styles/theme.css'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Board from './pages/Board'
import Control from './pages/Control'
import Grocery from './pages/Grocery'
import Calendar from './pages/Calendar'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/board"    element={<Board />} />
        <Route path="/grocery"  element={<Grocery />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/control"  element={<Control />} />
        <Route path="*"         element={<Navigate to="/board" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
