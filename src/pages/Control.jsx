import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import '../styles/control.css'

const COLUMNS = ['objectives', 'tasks', 'goals']
const COLUMN_LABELS = { objectives: 'Objectives', tasks: 'Tasks', goals: 'Goals' }
const PRIORITY_OPTS = ['none', 'low', 'med', 'high']

// Dynamic — colors driven by data, stay inline
const PRIORITY_STYLE = {
  high: { bg: '#fee2e2', color: '#dc2626' },
  med:  { bg: '#fef3c7', color: '#d97706' },
  low:  { bg: '#dcfce7', color: '#16a34a' },
  none: { bg: '#f3f4f6', color: '#6b7280' },
}
const COL_ACCENT = { objectives: '#7b88ff', tasks: '#4fd8a4', goals: '#f9a84d' }

function PriorityBadge({ priority }) {
  if (!priority || priority === 'none') return null
  const s = PRIORITY_STYLE[priority]
  return (
    <span className="priority-badge" style={{ background: s.bg, color: s.color }}>
      {priority}
    </span>
  )
}

function ChipButton({ label, active, onClick, color }) {
  // Active state border/bg/color are dynamic (per-column or per-priority color)
  const activeStyle = active ? {
    border: `2px solid ${color}`,
    background: color + '18',
    color: color,
    fontWeight: 700,
  } : {}
  return (
    <button type="button" className="chip-btn" onClick={onClick} style={activeStyle}>
      {label}
    </button>
  )
}

function ItemRow({ item, onToggle, onDelete, expanded, onExpand, onChangePriority }) {
  return (
    <div className={`item-row${expanded ? ' item-row--expanded' : ''}`}>

      {/* Main row */}
      <div className="item-row-main">
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => onToggle(item)}
          style={{ width: 20, height: 20, cursor: 'pointer', accentColor: COL_ACCENT[item.column], flexShrink: 0 }}
        />
        <div className="item-row-body" onClick={onExpand}>
          <span className={`item-row-text${item.done ? ' item-row-text--done' : ''}`}>
            {item.text}
          </span>
          <PriorityBadge priority={item.priority} />
          <svg
            className={`item-row-chevron${expanded ? ' item-row-chevron--open' : ''}`}
            width="14" height="14" viewBox="0 0 20 20" fill="none"
          >
            <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <button
          type="button"
          className="item-row-delete"
          aria-label="Delete"
          onClick={() => onDelete(item.id)}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zm-3 6a1 1 0 012 0v5a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v5a1 1 0 11-2 0V8z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Inline priority tray */}
      {expanded && (
        <div className="priority-tray">
          <span className="priority-tray-label">Priority:</span>
          {PRIORITY_OPTS.map(p => {
            const s = PRIORITY_STYLE[p]
            const isActive = item.priority === p
            const activeStyle = isActive ? {
              border: `2px solid ${s.color}`,
              background: s.bg,
              color: s.color,
              fontWeight: 700,
            } : {}
            return (
              <button
                key={p}
                type="button"
                className="priority-chip"
                style={activeStyle}
                onClick={() => onChangePriority(item.id, p)}
              >
                {p === 'none' ? 'None' : p}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Control() {
  const [items, setItems]         = useState([])
  const [tab, setTab]             = useState('all')
  const [text, setText]           = useState('')
  const [col, setCol]             = useState('tasks')
  const [priority, setPriority]   = useState('none')
  const [adding, setAdding]       = useState(false)
  const [expandedId, setExpandedId] = useState(null)

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
    setExpandedId(null)
  }

  const handleChangePriority = async (id, newPriority) => {
    await supabase.from('board_items').update({ priority: newPriority }).eq('id', id)
    setExpandedId(null)
  }

  const total    = items.length
  const done     = items.filter(i => i.done).length
  const visibleCols = tab === 'all' ? COLUMNS : [tab]
  const filtered    = tab === 'all' ? items : items.filter(i => i.column === tab)

  return (
    <div className="control">

      {/* Sticky header */}
      <div className="ctrl-header">
        <div className="ctrl-header-top">
          <span className="ctrl-header-title">Command Board</span>
          <span className="ctrl-header-count">{done}/{total} complete</span>
        </div>

        {/* Tab bar */}
        <div className="tab-bar">
          {['all', ...COLUMNS].map(t => {
            const isActive = tab === t
            const activeColor = t === 'all' ? '#111827' : COL_ACCENT[t]
            return (
              <button
                key={t}
                className="tab-btn"
                onClick={() => setTab(t)}
                style={isActive ? {
                  fontWeight: 700,
                  color: activeColor,
                  borderBottomColor: activeColor,
                } : {}}
              >
                {t === 'all' ? 'All' : COLUMN_LABELS[t]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="ctrl-body">

        {/* Quick-add form */}
        <form className="add-form" onSubmit={handleAdd}>
          <div className="add-form-heading">Add Item</div>

          <input
            className="add-input"
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="What needs to happen?"
          />

          <div className="chip-group">
            <div className="chip-group-label">Column</div>
            <div className="chip-row">
              {COLUMNS.map(c => (
                <ChipButton
                  key={c}
                  label={COLUMN_LABELS[c]}
                  active={col === c}
                  onClick={() => setCol(c)}
                  color={COL_ACCENT[c]}
                />
              ))}
            </div>
          </div>

          <div className="chip-group">
            <div className="chip-group-label">Priority</div>
            <div className="chip-row">
              {PRIORITY_OPTS.map(p => (
                <ChipButton
                  key={p}
                  label={p === 'none' ? 'None' : p.charAt(0).toUpperCase() + p.slice(1)}
                  active={priority === p}
                  onClick={() => setPriority(p)}
                  color={PRIORITY_STYLE[p].color}
                />
              ))}
            </div>
          </div>

          <button className="submit-btn" type="submit" disabled={adding || !text.trim()}>
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
                <div className="section-label" style={{ color: COL_ACCENT[colKey] }}>
                  {COLUMN_LABELS[colKey]} · {colItems.filter(i => i.done).length}/{colItems.length}
                </div>
              )}
              {colItems.length === 0
                ? <div className="ctrl-col-empty">No items</div>
                : colItems.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      expanded={expandedId === item.id}
                      onExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      onChangePriority={handleChangePriority}
                    />
                  ))
              }
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="ctrl-empty">No items yet — add one above</div>
        )}
      </div>
    </div>
  )
}
