import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import '../styles/board.css'

const COLUMNS = [
  { key: 'objectives', label: 'Objectives', accent: '#7b88ff',
    neon: ['#7b88ff', '#a78bfa', '#3b82f6', '#6d28d9'] },
  { key: 'tasks',      label: 'Tasks',      accent: '#4fd8a4',
    neon: ['#4fd8a4', '#34d399', '#06b6d4', '#10b981'] },
  { key: 'goals',      label: 'Goals',      accent: '#f9a84d',
    neon: ['#f9a84d', '#f59e0b', '#ef4444', '#f97316'] },
]

const randomInterval = () => `${Math.floor(Math.random() * 2000 + 2000)}ms`

// Dynamic — these are colors derived from data, so they stay inline
const PRIORITY_COLORS = {
  high: { bg: 'rgba(239,68,68,0.18)',   text: '#f87171' },
  med:  { bg: 'rgba(245,158,11,0.18)',  text: '#fbbf24' },
  low:  { bg: 'rgba(74,222,128,0.18)',  text: '#4ade80' },
}

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function PriorityBadge({ priority }) {
  if (!priority || priority === 'none') return null
  const c = PRIORITY_COLORS[priority]
  if (!c) return null
  return (
    <span className="board-priority-badge" style={{ background: c.bg, color: c.text }}>
      {priority}
    </span>
  )
}

function BoardItem({ item }) {
  return (
    <div className={`board-item${item.done ? ' board-item--done' : ''}`}>
      <div className={`board-item-checkbox${item.done ? ' board-item-checkbox--checked' : ''}`}>
        {item.done && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l4 4 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span className="board-item-text">{item.text}</span>
      <PriorityBadge priority={item.priority} />
    </div>
  )
}

function Column({ col, items }) {
  const done = items.filter(i => i.done).length
  const [flickerInterval, setFlickerInterval] = useState(randomInterval)

  return (
    <div className="board-column" style={{ '--col-accent': col.accent }}>
      <div className="board-column-header">
        <span
          className="board-column-title"
          style={{
            '--neon-interval': flickerInterval,
            '--neon-1': col.neon[0],
            '--neon-2': col.neon[1],
            '--neon-3': col.neon[2],
            '--neon-4': col.neon[3],
          }}
          onAnimationIteration={() => setFlickerInterval(randomInterval())}
        >
          {col.label}
        </span>
        <span className="board-column-count">{done}/{items.length}</span>
      </div>
      <div className="board-column-body">
        {items.length === 0
          ? <div className="board-empty">No items yet</div>
          : items.map(item => <BoardItem key={item.id} item={item} />)
        }
      </div>
    </div>
  )
}

export default function Board() {
  const [items, setItems] = useState([])
  const [connected, setConnected] = useState(false)
  const now = useClock()

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('board_items')
      .select('*')
      .order('created_at', { ascending: true })
    if (data) setItems(data)
  }, [])

  useEffect(() => {
    fetchItems()
    const channel = supabase
      .channel('board_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_items' }, () => {
        fetchItems()
      })
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))
    return () => supabase.removeChannel(channel)
  }, [fetchItems])

  const total = items.length
  const done  = items.filter(i => i.done).length
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100)

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="board">
      <div className="board-header">

        <div className="board-clock">
          <div className="board-clock-time" data-text={timeStr}>{timeStr}</div>
          <div className="board-clock-date">{dateStr}</div>
        </div>

        <div className="board-progress">
          <div className="board-progress-label">Progress — {done} of {total}</div>
          <div className="board-progress-track">
            <div className="board-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="board-progress-pct">{pct}% complete</div>
        </div>

        <div className="board-status">
          <div className={`board-status-dot${connected ? ' board-status-dot--live' : ''}`} />
          <span className="board-status-label">{connected ? 'LIVE' : 'CONNECTING'}</span>
        </div>

      </div>

      <div className="board-columns">
        {COLUMNS.map((col, i) => (
          <React.Fragment key={col.key}>
            {i > 0 && <div className="board-divider" />}
            <Column col={col} items={items.filter(item => item.column === col.key)} />
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
