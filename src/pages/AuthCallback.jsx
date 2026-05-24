import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function AuthCallback() {
  const [status, setStatus] = useState('Connecting your calendar…')
  const navigate = useNavigate()

  useEffect(() => {
    const run = async () => {
      const params   = new URLSearchParams(window.location.search)
      const code     = params.get('code')
      const userName = params.get('state')

      if (!code || !userName) {
        setStatus('Something went wrong — missing parameters.')
        return
      }

      const res = await fetch('/api/google-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          redirect_uri: `${window.location.origin}/auth/callback`,
        }),
      })

      const data = await res.json()

      if (data.error) {
        setStatus(`Error: ${data.error}`)
        return
      }

      const { error } = await supabase.from('calendar_tokens').upsert({
        user_name:    userName,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at:   data.expires_at,
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'user_name' })

      if (error) {
        setStatus(`Failed to save tokens: ${error.message}`)
        return
      }

      setStatus('Connected! Taking you back…')
      setTimeout(() => navigate('/control'), 1200)
    }

    run()
  }, [navigate])

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f9fafb',
      fontFamily: 'system-ui, sans-serif',
      gap: 12,
    }}>
      <div style={{ fontSize: '2rem' }}>📅</div>
      <div style={{ fontSize: '1rem', color: '#374151' }}>{status}</div>
    </div>
  )
}
