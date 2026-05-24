import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import '../styles/calendar.css'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildMonthGrid(year, month) {
  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev  = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = 0; i < firstDow; i++)
    cells.push({ day: daysInPrev - firstDow + 1 + i, current: false })

  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, current: true })

  let next = 1
  while (cells.length < 42) cells.push({ day: next++, current: false })

  return cells
}

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function Calendar() {
  const [connected, setConnected] = useState(false)
  const now      = useClock()
  const navigate = useNavigate()

  const today  = new Date()
  const year   = today.getFullYear()
  const month  = today.getMonth()
  const todayD = today.getDate()

  useEffect(() => {
    supabase.from('app_state').select('active_view').eq('id', 1).single()
      .then(({ data }) => {
        if (data?.active_view === 'board')   navigate('/board')
        if (data?.active_view === 'grocery') navigate('/grocery')
      })

    const ch = supabase.channel('app_state_calendar')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_state' }, ({ new: row }) => {
        if (row.active_view === 'board')   navigate('/board')
        if (row.active_view === 'grocery') navigate('/grocery')
      })
      .subscribe(status => setConnected(status === 'SUBSCRIBED'))
    return () => supabase.removeChannel(ch)
  }, [navigate])

  const cells   = buildMonthGrid(year, month)
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="cal">
      <div className="cal-header">

        <div className="cal-clock">
          <div className="cal-clock-time" data-text={timeStr}>{timeStr}</div>
          <div className="cal-clock-date">{dateStr}</div>
        </div>

        <div className="cal-month-title">{MONTH_NAMES[month]} {year}</div>

        <div className="cal-status">
          <div className={`cal-status-dot${connected ? ' cal-status-dot--live' : ''}`} />
          <span className="cal-status-label">{connected ? 'LIVE' : 'CONNECTING'}</span>
        </div>

      </div>

      <div className="cal-body">
        <div className="cal-dow-row">
          {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((cell, i) => (
            <div
              key={i}
              className={[
                'cal-cell',
                cell.current ? '' : 'cal-cell--other',
                cell.current && cell.day === todayD ? 'cal-cell--today' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="cal-cell-num">{cell.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
