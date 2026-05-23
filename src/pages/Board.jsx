import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'

const COLUMNS = [
  { key: 'objectives', label: 'Objectives', accent: '#7b88ff' },
  { key: 'tasks',      label: 'Tasks',      accent: '#4fd8a4' },
  { key: 'goals',      label: 'Goals',      accent: '#f9a84d' },
]

const PRIORITY_COLORS = {
  high: { bg: 'rgba(239,68,68,0.18)', text: '#f87171' },
  med:  { bg: 'rgba(245,158,11,0.18)', text: '#fbbf24' },
  low:  { bg: 'rgba(74,222,128,0.18)', text: '#4ade80' },
  none: { bg: 'transparent', text: 'transparent' },
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
  const { bg, text } = PRIORITY_COLORS[priority] || PRIORITY_COLORS.none
  return (
    <span style={{
      background: bg,
      color: text,
      fontSize: '0.7em',
      fontWeight: 700,
      letterSpacing: '0.06em',
      padding: '2px 10px',
      borderRadius: 99,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {priority}
    </span>
  )
}

function BoardItem({ item }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 0',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      opacity: item.done ? 0.38 : 1,
      transition: 'opacity 0.4s',
    }}>
      <div style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        border: '2px solid rgba(255,255,255,0.3)',
        background: item.done ? 'rgba(255,255,255,0.18)' : 'transparent',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {item.done && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l4 4 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span style={{
        flex: 1,
        fontSize: '1.15rem',
        color: '#e8eaf0',
        textDecoration: item.done ? 'line-through' : 'none',
        lineHeight: 1.4,
      }}>
        {item.text}
      </span>
      <PriorityBadge priority={item.priority} />
    </div>
  )
}

function Column({ col, items }) {
  const done = items.filter(i => i.done).length
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      padding: '0 12px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 18,
        paddingBottom: 14,
        borderBottom: `2px solid ${col.accent}`,
      }}>
        <span style={{
          fontSize: '1.45rem',
          fontWeight: 700,
          color: col.accent,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}>
          {col.label}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: '0.95rem',
          color: 'rgba(255,255,255,0.45)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {done}/{items.length}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '1rem', paddingTop: 8 }}>
            No items yet
          </div>
        ) : (
          items.map(item => <BoardItem key={item.id} item={item} />)
        )}
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
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchItems])

  const total = items.length
  const done = items.filter(i => i.done).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f1117',
      color: '#e8eaf0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      padding: '28px 32px 24px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        marginBottom: 32,
        gap: 24,
      }}>
        {/* Clock */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '3rem', fontWeight: 200, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums', color: '#fff' }}>
            {timeStr}
          </div>
          <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
            {dateStr}
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 200 }}>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Progress — {done} of {total}
          </div>
          <div style={{ width: 200, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #7b88ff, #4fd8a4)',
              borderRadius: 99,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
            {pct}% complete
          </div>
        </div>

        {/* Realtime dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6 }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: connected ? '#4ade80' : '#6b7280',
            boxShadow: connected ? '0 0 0 0 rgba(74,222,128,0.6)' : 'none',
            animation: connected ? 'pulse 2s infinite' : 'none',
          }} />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
            {connected ? 'LIVE' : 'CONNECTING'}
          </span>
        </div>
      </div>

      {/* Columns */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: 0,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingTop: 24,
      }}>
        {COLUMNS.map((col, i) => (
          <React.Fragment key={col.key}>
            {i > 0 && (
              <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
            )}
            <Column
              col={col}
              items={items.filter(item => item.column === col.key)}
            />
          </React.Fragment>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0   rgba(74,222,128,0.6); }
          70%  { box-shadow: 0 0 0 8px rgba(74,222,128,0); }
          100% { box-shadow: 0 0 0 0   rgba(74,222,128,0); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px; }
      `}</style>
    </div>
  )
}
