import { useState } from 'react'

export default function LoginPage({ onLogin }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!name.trim() || !email.trim() || !password.trim()) {
      return
    }

    if (onLogin) {
      onLogin({
        name: name.trim(),
        email: email.trim(),
      })
    }
  }

  return (
    <div className="login-page">
      <section className="login-card">
        <h1 className="login-title">Iniciar sesion</h1>
        <p className="login-subtitle">Accede a TravelOS con tus datos.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label" htmlFor="login-name">
              Nombre
            </label>
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

          <div className="form-field">
            <label className="form-label" htmlFor="login-email">
              Correo electronico
            </label>
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
            <label className="form-label" htmlFor="login-password">
              Contrasena
            </label>
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

          <button type="submit" className="primary-button login-submit">
            Entrar
          </button>
        </form>
      </section>
    </div>
  )
}
