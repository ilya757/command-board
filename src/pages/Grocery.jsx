import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import '../styles/grocery.css'

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function Grocery() {
  const [items, setItems]       = useState([])
  const [connected, setConnected] = useState(false)
  const navigate = useNavigate()
  const now = useClock()

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('grocery_items')
      .select('*')
      .order('category', { ascending: true })
      .order('created_at',  { ascending: true })
    if (data) setItems(data)
  }, [])

  useEffect(() => {
    fetchItems()

    // Realtime — grocery items
    const itemsCh = supabase.channel('grocery_items_display')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_items' }, () => fetchItems())
      .subscribe(status => setConnected(status === 'SUBSCRIBED'))

    // Realtime — app_state: switch back to board when toggled
    supabase.from('app_state').select('active_view').eq('id', 1).single()
      .then(({ data }) => { if (data?.active_view === 'board') navigate('/board') })

    const stateCh = supabase.channel('app_state_grocery')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_state' }, ({ new: row }) => {
        if (row.active_view === 'board') navigate('/board')
      })
      .subscribe()

    return () => {
      supabase.removeChannel(itemsCh)
      supabase.removeChannel(stateCh)
    }
  }, [fetchItems, navigate])

  // Group items by category
  const grouped = items.reduce((acc, item) => {
    const cat = item.category?.trim() || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const total = items.length
  const done  = items.filter(i => i.done).length
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="grocery">

      <div className="grocery-header">
        <div className="grocery-title-area">
          <h1 className="grocery-title">Grocery List</h1>
          <div className="grocery-subtitle">{done} of {total} picked up</div>
        </div>

        <div className="grocery-clock">
          <div className="grocery-clock-time" data-text={timeStr}>{timeStr}</div>
          <div className="grocery-clock-date">{dateStr}</div>
        </div>

        <div className="grocery-status">
          <div className={`grocery-status-dot${connected ? ' grocery-status-dot--live' : ''}`} />
          <span className="grocery-status-label">{connected ? 'LIVE' : 'CONNECTING'}</span>
        </div>
      </div>

      <div className="grocery-content">
        {Object.keys(grouped).length === 0 ? (
          <div className="grocery-empty">No items — add some from the control page</div>
        ) : (
          Object.entries(grouped).map(([category, catItems]) => (
            <div key={category} className="grocery-group">
              <div className="grocery-group-header">{category}</div>
              {catItems.map(item => (
                <div key={item.id} className={`grocery-item${item.done ? ' grocery-item--done' : ''}`}>
                  <div className={`grocery-item-check${item.done ? ' grocery-item-check--done' : ''}`}>
                    {item.done && (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="grocery-item-name">{item.name}</span>
                  {item.quantity && <span className="grocery-item-qty">{item.quantity}</span>}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

    </div>
  )
}
