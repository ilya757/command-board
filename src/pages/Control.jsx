import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'

const COLUMNS = ['objectives', 'tasks', 'goals']
const COLUMN_LABELS = { objectives: 'Objectives', tasks: 'Tasks', goals: 'Goals' }
const PRIORITY_OPTS = ['none', 'low', 'med', 'high']

const PRIORITY_STYLE = {
  high: { bg: '#fee2e2', color: '#dc2626' },
  med:  { bg: '#fef3c7', color: '#d97706' },
  low:  { bg: '#dcfce7', color: '#16a34a' },
  none: { bg: '#f3f4f6', color: '#6b7280' },
}

const COL_ACCENT = { objectives: '#7b88ff', tasks: '#4fd8a4', goals: '#f9a84d' }

function PriorityBadge({ priority }) {
  const s = PRIORITY_STYLE[priority] || PRIORITY_STYLE.none
  if (priority === 'none') return null
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
      padding: '2px 10px',
      borderRadius: 99,
      textTransform: 'uppercase',
    }}>
      {priority}
    </span>
  )
}

function ChipButton({ label, active, onClick, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 44,
        padding: '0 16px',
        borderRadius: 99,
        border: active ? `2px solid ${color || '#3b82f6'}` : '2px solid #e5e7eb',
        background: active ? (color ? color + '18' : '#eff6ff') : '#fff',
        color: active ? (color || '#3b82f6') : '#374151',
        fontWeight: active ? 700 : 500,
        fontSize: '0.9rem',
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function ItemRow({ item, onToggle, onDelete }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      background: '#fff',
      borderRadius: 10,
      border: '1px solid #e5e7eb',
      marginBottom: 8,
      minHeight: 56,
    }}>
      <input
        type="checkbox"
        checked={item.done}
        onChange={() => onToggle(item)}
        style={{ width: 20, height: 20, cursor: 'pointer', accentColor: COL_ACCENT[item.column], flexShrink: 0 }}
      />
      <span style={{
        flex: 1,
        fontSize: '0.97rem',
        color: item.done ? '#9ca3af' : '#111827',
        textDecoration: item.done ? 'line-through' : 'none',
        lineHeight: 1.4,
      }}>
        {item.text}
      </span>
      <PriorityBadge priority={item.priority} />
      <button
        onClick={() => onDelete(item.id)}
        aria-label="Delete"
        style={{
          minWidth: 36,
          minHeight: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#d1d5db',
          borderRadius: 8,
          padding: 4,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zm-3 6a1 1 0 012 0v5a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v5a1 1 0 11-2 0V8z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}

export default function Control() {
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('all')
  const [text, setText] = useState('')
  const [col, setCol] = useState('tasks')
  const [priority, setPriority] = useState('none')
  const [adding, setAdding] = useState(false)

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
      .channel('control_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_items' }, () => {
        fetchItems()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchItems])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setAdding(true)
    await supabase.from('board_items').insert({ text: text.trim(), column: col, priority })
    setText('')
    setAdding(false)
  }

  const handleToggle = async (item) => {
    await supabase.from('board_items').update({ done: !item.done }).eq('id', item.id)
  }

  const handleDelete = async (id) => {
    await supabase.from('board_items').delete().eq('id', id)
  }

  const total = items.length
  const done = items.filter(i => i.done).length

  const visibleCols = tab === 'all' ? COLUMNS : [tab]
  const filtered = tab === 'all' ? items : items.filter(i => i.column === tab)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#111827',
    }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '14px 20px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>Command Board</span>
          <span style={{ fontSize: '0.85rem', color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
            {done}/{total} complete
          </span>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
          {['all', ...COLUMNS].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderBottom: tab === t ? `2px solid ${t === 'all' ? '#111827' : COL_ACCENT[t]}` : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                fontWeight: tab === t ? 700 : 500,
                fontSize: '0.9rem',
                color: tab === t ? (t === 'all' ? '#111827' : COL_ACCENT[t]) : '#6b7280',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {t === 'all' ? 'All' : COLUMN_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto' }}>
        {/* Quick-add panel */}
        <form onSubmit={handleAdd} style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 14,
          padding: '16px',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Add Item
          </div>
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="What needs to happen?"
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              outline: 'none',
              marginBottom: 12,
              background: '#f9fafb',
              color: '#111827',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Column</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLUMNS.map(c => (
                <ChipButton key={c} label={COLUMN_LABELS[c]} active={col === c} onClick={() => setCol(c)} color={COL_ACCENT[c]} />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRIORITY_OPTS.map(p => (
                <ChipButton key={p} label={p === 'none' ? 'None' : p.charAt(0).toUpperCase() + p.slice(1)} active={priority === p} onClick={() => setPriority(p)} color={p !== 'none' ? PRIORITY_STYLE[p].color : '#6b7280'} />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={adding || !text.trim()}
            style={{
              width: '100%',
              minHeight: 48,
              background: adding || !text.trim() ? '#e5e7eb' : '#111827',
              color: adding || !text.trim() ? '#9ca3af' : '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: '1rem',
              fontWeight: 700,
              cursor: adding || !text.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {adding ? 'Adding…' : 'Add Item'}
          </button>
        </form>

        {/* Item list */}
        {visibleCols.map(colKey => {
          const colItems = items.filter(i => i.column === colKey)
          if (tab !== 'all' && colItems.length === 0) return null
          return (
            <div key={colKey} style={{ marginBottom: 24 }}>
              {tab === 'all' && (
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: COL_ACCENT[colKey],
                  marginBottom: 10,
                  paddingLeft: 4,
                }}>
                  {COLUMN_LABELS[colKey]} · {colItems.filter(i => i.done).length}/{colItems.length}
                </div>
              )}
              {colItems.length === 0 ? (
                <div style={{ color: '#d1d5db', fontSize: '0.9rem', padding: '12px 16px' }}>No items</div>
              ) : (
                colItems.map(item => (
                  <ItemRow key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
                ))
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#d1d5db', padding: '48px 0', fontSize: '0.95rem' }}>
            No items yet — add one above
          </div>
        )}
      </div>

      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
    </div>
  )
}
