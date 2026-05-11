import { useState, useRef, useEffect } from 'react'
import { AIRPORTS } from '../data/airports'

const search = (query) => {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase()
  return AIRPORTS.filter(
    (a) =>
      a.iata.toLowerCase().startsWith(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q),
  ).slice(0, 7)
}

export default function AirportSearch({ id, value, onSelect, required, placeholder }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(0)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    const found = search(val)
    setResults(found)
    setOpen(found.length > 0)
    setFocused(0)
    onSelect(val, val)
  }

  const handleSelect = (airport) => {
    const display = `${airport.city} (${airport.iata})`
    setQuery(display)
    setResults([])
    setOpen(false)
    onSelect(airport.iata, display)
  }

  const handleKeyDown = (e) => {
    if (!open || !results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocused((f) => Math.min(f + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocused((f) => Math.max(f - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(results[focused])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="airport-search" ref={containerRef}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        className="form-input"
        value={query}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && results.length > 0 && (
        <ul className="airport-dropdown" role="listbox">
          {results.map((airport, i) => (
            <li
              key={airport.iata}
              role="option"
              aria-selected={i === focused}
              className={`airport-option${i === focused ? ' airport-option--focused' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(airport) }}
              onMouseEnter={() => setFocused(i)}
            >
              <span className="airport-iata">{airport.iata}</span>
              <span className="airport-city">{airport.city}</span>
              <span className="airport-country">{airport.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
