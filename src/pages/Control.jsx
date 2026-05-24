import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import '../styles/control.css'

/* ── Constants ────────────────────────────────────────────── */
const BOARD_COLS   = ['objectives', 'tasks', 'goals']
const COL_LABELS   = { objectives: 'Objectives', tasks: 'Tasks', goals: 'Goals' }
const PRIORITY_OPTS = ['none', 'low', 'med', 'high']

const PRIORITY_STYLE = {
  high: { bg: '#fee2e2', color: '#dc2626' },
  med:  { bg: '#fef3c7', color: '#d97706' },
  low:  { bg: '#dcfce7', color: '#16a34a' },
  none: { bg: '#f3f4f6', color: '#6b7280' },
}
const COL_ACCENT = { objectives: '#7b88ff', tasks: '#4fd8a4', goals: '#f9a84d' }

const ASSIGNEE_OPTS = ['unassigned', 'ilya', 'casey', 'both']
const ASSIGNEE_STYLE = {
  unassigned: { bg: '#f3f4f6', color: '#6b7280', label: 'None' },
  ilya:       { bg: '#ede9fe', color: '#7b88ff', label: 'Ilya' },
  casey:      { bg: '#fef3c7', color: '#d97706', label: 'Casey' },
  both:       { bg: '#dcfce7', color: '#16a34a', label: 'Both' },
}

/* ── Small components ─────────────────────────────────────── */
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
  const activeStyle = active ? {
    border: `2px solid ${color}`,
    background: color + '18',
    color,
    fontWeight: 700,
  } : {}
  return (
    <button type="button" className="chip-btn" onClick={onClick} style={activeStyle}>
      {label}
    </button>
  )
}

function BoardItemRow({ item, onToggle, onDelete, expanded, onExpand, onChangePriority, onChangeAssignee }) {
  return (
    <div className={`item-row${expanded ? ' item-row--expanded' : ''}`}>
      <div className="item-row-main">
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => onToggle(item)}
          style={{ width: 20, height: 20, cursor: 'pointer', accentColor: COL_ACCENT[item.column], flexShrink: 0 }}
        />
        <div className="item-row-body" onClick={onExpand}>
          <span className={`item-row-text${item.done ? ' item-row-text--done' : ''}`}>{item.text}</span>
          <PriorityBadge priority={item.priority} />
          <svg className={`item-row-chevron${expanded ? ' item-row-chevron--open' : ''}`}
            width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <button type="button" className="item-row-delete" onClick={() => onDelete(item.id)} aria-label="Delete">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zm-3 6a1 1 0 012 0v5a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v5a1 1 0 11-2 0V8z" clipRule="evenodd"/>
          </svg>
        </button>
      </div>
      {expanded && (
        <div className="priority-tray">
          {/* Priority row */}
          <div className="tray-row">
            <span className="priority-tray-label">Priority:</span>
            {PRIORITY_OPTS.map(p => {
              const s = PRIORITY_STYLE[p]
              const isActive = item.priority === p
              return (
                <button key={p} type="button" className="priority-chip"
                  style={isActive ? { border: `2px solid ${s.color}`, background: s.bg, color: s.color, fontWeight: 700 } : {}}
                  onClick={() => onChangePriority(item.id, p)}>
                  {p === 'none' ? 'None' : p}
                </button>
              )
            })}
          </div>
          {/* Assignee row */}
          <div className="tray-row">
            <span className="priority-tray-label">Assign:</span>
            {ASSIGNEE_OPTS.map(a => {
              const s = ASSIGNEE_STYLE[a]
              const isActive = (item.assignee || 'unassigned') === a
              return (
                <button key={a} type="button" className="priority-chip"
                  style={isActive ? { border: `2px solid ${s.color}`, background: s.bg, color: s.color, fontWeight: 700 } : {}}
                  onClick={() => onChangeAssignee(item.id, a)}>
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function GroceryItemRow({ item, onToggle, onDelete }) {
  return (
    <div className="item-row">
      <div className="item-row-main">
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => onToggle(item)}
          style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#4ade80', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className={`item-row-text${item.done ? ' item-row-text--done' : ''}`}>{item.name}</span>
          {item.quantity && (
            <span style={{ fontSize: '0.8rem', color: '#9ca3af', marginLeft: 8 }}>{item.quantity}</span>
          )}
        </div>
        {item.category && (
          <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#16a34a', padding: '2px 10px', borderRadius: 99, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            {item.category}
          </span>
        )}
        <button type="button" className="item-row-delete" onClick={() => onDelete(item.id)} aria-label="Delete">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zm-3 6a1 1 0 012 0v5a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v5a1 1 0 11-2 0V8z" clipRule="evenodd"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

/* ── Main page ────────────────────────────────────────────── */
export default function Control() {
  // Board state
  const [items, setItems]           = useState([])
  const [tab, setTab]               = useState('all')
  const [text, setText]             = useState('')
  const [col, setCol]               = useState('tasks')
  const [priority, setPriority]     = useState('none')
  const [adding, setAdding]         = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [assignee, setAssignee]     = useState('unassigned')

  // Grocery state
  const [groceryItems, setGroceryItems]     = useState([])
  const [groceryName, setGroceryName]       = useState('')
  const [groceryQty, setGroceryQty]         = useState('')
  const [groceryCat, setGroceryCat]         = useState('')
  const [addingGrocery, setAddingGrocery]   = useState(false)

  // TV display state
  const [activeView, setActiveView] = useState('board')

  /* ── Fetch functions ────────────────────────────────────── */
  const fetchItems = useCallback(async () => {
    const { data } = await supabase.from('board_items').select('*').order('created_at', { ascending: true })
    if (data) setItems(data)
  }, [])

  const fetchGrocery = useCallback(async () => {
    const { data } = await supabase.from('grocery_items').select('*')
      .order('category', { ascending: true }).order('created_at', { ascending: true })
    if (data) setGroceryItems(data)
  }, [])

  /* ── Subscriptions ──────────────────────────────────────── */
  useEffect(() => {
    fetchItems()
    fetchGrocery()

    // Initial app_state
    supabase.from('app_state').select('active_view').eq('id', 1).single()
      .then(({ data }) => { if (data) setActiveView(data.active_view) })

    const boardCh = supabase.channel('ctrl_board_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_items' }, fetchItems)
      .subscribe()

    const groceryCh = supabase.channel('ctrl_grocery_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_items' }, fetchGrocery)
      .subscribe()

    const stateCh = supabase.channel('ctrl_app_state')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_state' }, ({ new: row }) => {
        setActiveView(row.active_view)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(boardCh)
      supabase.removeChannel(groceryCh)
      supabase.removeChannel(stateCh)
    }
  }, [fetchItems, fetchGrocery])

  /* ── Board handlers ─────────────────────────────────────── */
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setAdding(true)
    await supabase.from('board_items').insert({ text: text.trim(), column: col, priority, assignee })
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
  const handleChangeAssignee = async (id, newAssignee) => {
    await supabase.from('board_items').update({ assignee: newAssignee }).eq('id', id)
    setExpandedId(null)
  }

  /* ── Grocery handlers ───────────────────────────────────── */
  const handleAddGrocery = async (e) => {
    e.preventDefault()
    if (!groceryName.trim()) return
    setAddingGrocery(true)
    await supabase.from('grocery_items').insert({
      name: groceryName.trim(),
      quantity: groceryQty.trim(),
      category: groceryCat.trim(),
    })
    setGroceryName('')
    setGroceryQty('')
    setGroceryCat('')
    setAddingGrocery(false)
  }
  const handleToggleGrocery = async (item) => {
    await supabase.from('grocery_items').update({ done: !item.done }).eq('id', item.id)
  }
  const handleDeleteGrocery = async (id) => {
    await supabase.from('grocery_items').delete().eq('id', id)
  }

  /* ── TV switcher ────────────────────────────────────────── */
  const switchView = async (view) => {
    setActiveView(view)
    const { error } = await supabase.from('app_state').update({ active_view: view }).eq('id', 1)
    if (error) console.error('switchView failed:', error)
  }

  /* ── Derived ────────────────────────────────────────────── */
  const total       = items.length
  const done        = items.filter(i => i.done).length
  const visibleCols = tab === 'all' ? BOARD_COLS : [tab]
  const filtered    = tab === 'all' ? items : items.filter(i => i.column === tab)

  const groceryDone  = groceryItems.filter(i => i.done).length
  const groceryTotal = groceryItems.length

  return (
    <div className="control">

      {/* ── Sticky header ──────────────────────────────────── */}
      <div className="ctrl-header">
        <div className="ctrl-header-top">
          <span className="ctrl-header-title">Command Board</span>

          {/* TV Display toggle */}
          <div className="tv-toggle">
            <span className="tv-toggle-label">TV</span>
            <div className="tv-toggle-btns">
              <button
                type="button"
                className={`tv-toggle-btn${activeView === 'board' ? ' tv-toggle-btn--active' : ''}`}
                onClick={() => switchView('board')}
              >
                Board
              </button>
              <button
                type="button"
                className={`tv-toggle-btn${activeView === 'grocery' ? ' tv-toggle-btn--active tv-toggle-btn--grocery' : ''}`}
                onClick={() => switchView('grocery')}
              >
                🛒 Grocery
              </button>
              <button
                type="button"
                className={`tv-toggle-btn${activeView === 'calendar' ? ' tv-toggle-btn--active tv-toggle-btn--calendar' : ''}`}
                onClick={() => switchView('calendar')}
              >
                📅 Calendar
              </button>
            </div>
          </div>

          <span className="ctrl-header-count">
            {tab !== 'calendar' && `${tab === 'grocery' ? `${groceryDone}/${groceryTotal}` : `${done}/${total}`} done`}
          </span>
        </div>

        {/* Tab bar */}
        <div className="tab-bar">
          {['all', ...BOARD_COLS, 'grocery', 'calendar'].map(t => {
            const isActive = tab === t
            const color = t === 'all' ? '#111827'
              : t === 'grocery'  ? '#16a34a'
              : t === 'calendar' ? '#7c3aed'
              : COL_ACCENT[t]
            return (
              <button key={t} className="tab-btn" onClick={() => setTab(t)}
                style={isActive ? { fontWeight: 700, color, borderBottomColor: color } : {}}>
                {t === 'all' ? 'All'
                  : t === 'grocery'  ? '🛒 Grocery'
                  : t === 'calendar' ? '📅 Calendar'
                  : COL_LABELS[t]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="ctrl-body">

        {/* ── CALENDAR TAB ─────────────────────────────────── */}
        {tab === 'calendar' ? (
          <div className="add-form" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📅</div>
            <div className="add-form-heading" style={{ marginBottom: 8 }}>No events synced yet</div>
            <p style={{ color: 'var(--ctrl-text-sec)', fontSize: '0.9rem', lineHeight: 1.55, margin: 0 }}>
              Google Calendar integration coming soon. Once connected, you'll be able to pick
              which events show up on the TV display.
            </p>
          </div>

        ) : tab === 'grocery' ? (
        /* ── GROCERY TAB ──────────────────────────────────── */
          <>
            <form className="add-form" onSubmit={handleAddGrocery}>
              <div className="add-form-heading">Add Grocery Item</div>
              <input
                className="add-input"
                type="text"
                value={groceryName}
                onChange={e => setGroceryName(e.target.value)}
                placeholder="Item name"
              />
              <div style={{ display: 'flex', gap: 8, marginBottom: 0 }}>
                <input
                  className="add-input"
                  type="text"
                  value={groceryQty}
                  onChange={e => setGroceryQty(e.target.value)}
                  placeholder="Quantity (e.g. 2 lbs)"
                  style={{ marginBottom: 0 }}
                />
                <input
                  className="add-input"
                  type="text"
                  value={groceryCat}
                  onChange={e => setGroceryCat(e.target.value)}
                  placeholder="Category (e.g. Produce)"
                  style={{ marginBottom: 0 }}
                />
              </div>
              <button className="submit-btn" type="submit" disabled={addingGrocery || !groceryName.trim()}
                style={{ marginTop: 12 }}>
                {addingGrocery ? 'Adding…' : 'Add to List'}
              </button>
            </form>

            {groceryItems.length === 0 ? (
              <div className="ctrl-empty">No grocery items yet</div>
            ) : (
              groceryItems.map(item => (
                <GroceryItemRow key={item.id} item={item}
                  onToggle={handleToggleGrocery} onDelete={handleDeleteGrocery} />
              ))
            )}
          </>

        ) : (
          /* ── BOARD TABS ──────────────────────────────────── */
          <>
            <form className="add-form" onSubmit={handleAdd}>
              <div className="add-form-heading">Add Item</div>
              <input className="add-input" type="text" value={text}
                onChange={e => setText(e.target.value)} placeholder="What needs to happen?" />

              <div className="chip-group">
                <div className="chip-group-label">Column</div>
                <div className="chip-row">
                  {BOARD_COLS.map(c => (
                    <ChipButton key={c} label={COL_LABELS[c]} active={col === c}
                      onClick={() => setCol(c)} color={COL_ACCENT[c]} />
                  ))}
                </div>
              </div>

              <div className="chip-group">
                <div className="chip-group-label">Priority</div>
                <div className="chip-row">
                  {PRIORITY_OPTS.map(p => (
                    <ChipButton key={p}
                      label={p === 'none' ? 'None' : p.charAt(0).toUpperCase() + p.slice(1)}
                      active={priority === p} onClick={() => setPriority(p)}
                      color={PRIORITY_STYLE[p].color} />
                  ))}
                </div>
              </div>

              <div className="chip-group">
                <div className="chip-group-label">Assign to</div>
                <div className="chip-row">
                  {ASSIGNEE_OPTS.map(a => (
                    <ChipButton key={a}
                      label={ASSIGNEE_STYLE[a].label}
                      active={assignee === a} onClick={() => setAssignee(a)}
                      color={ASSIGNEE_STYLE[a].color} />
                  ))}
                </div>
              </div>

              <button className="submit-btn" type="submit" disabled={adding || !text.trim()}>
                {adding ? 'Adding…' : 'Add Item'}
              </button>
            </form>

            {visibleCols.map(colKey => {
              const colItems = items.filter(i => i.column === colKey)
              if (tab !== 'all' && colItems.length === 0) return null
              return (
                <div key={colKey} style={{ marginBottom: 24 }}>
                  {tab === 'all' && (
                    <div className="section-label" style={{ color: COL_ACCENT[colKey] }}>
                      {COL_LABELS[colKey]} · {colItems.filter(i => i.done).length}/{colItems.length}
                    </div>
                  )}
                  {colItems.length === 0
                    ? <div className="ctrl-col-empty">No items</div>
                    : colItems.map(item => (
                        <BoardItemRow key={item.id} item={item}
                          onToggle={handleToggle} onDelete={handleDelete}
                          expanded={expandedId === item.id}
                          onExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                          onChangePriority={handleChangePriority}
                          onChangeAssignee={handleChangeAssignee} />
                      ))
                  }
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="ctrl-empty">No items yet — add one above</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
