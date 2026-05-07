import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      if (isRegister) {
        // REGISTRO: crear cuenta nueva
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        })
        if (error) throw error
        setError('✅ Revisa tu correo para confirmar tu cuenta.')
      } else {
        // LOGIN: iniciar sesión
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (onLogin) onLogin({ name: data.user.user_metadata?.full_name || name, email })
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="login-page">
      <section className="login-card">
        <h1 className="login-title">{isRegister ? 'Crear cuenta' : 'Iniciar sesión'}</h1>
        <p className="login-subtitle">
          {isRegister ? 'Regístrate para acceder a TravelOS.' : 'Accede a TravelOS con tus datos.'}
        </p>

        <form className="login-form" onSubmit={handleSubmit}>

          {/* Campo nombre: solo en registro */}
          {isRegister && (
            <div className="form-field">
              <label className="form-label" htmlFor="login-name">Nombre</label>
              <input
                id="login-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tu nombre"
                required
              />
            </div>
          )}

          <div className="form-field">
            <label className="form-label" htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu-correo@ejemplo.com"
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              required
            />
          </div>

          {/* Mensaje de error o éxito */}
          {error && (
            <p style={{ color: isRegister && error.startsWith('✅') ? 'green' : 'red', fontSize: '0.85rem' }}>
              {error}
            </p>
          )}

          <button type="submit" className="primary-button login-submit">
            {isRegister ? 'Registrarse' : 'Entrar'}
          </button>

          {/* Toggle entre login y registro */}
          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
            {isRegister ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
            <button
              type="button"
              className="link-button"
              onClick={() => { setIsRegister(!isRegister); setError('') }}
            >
              {isRegister ? 'Inicia sesión' : 'Regístrate'}
            </button>
          </p>

        </form>
      </section>
    </div>
  )
}
