import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/Layout/AppLayout'

const AGENT_STEPS = [
  {
    id: 'coordinator',
    name: 'Coordinator',
    detail: 'Analyzing request and orchestrating specialist agents.',
  },
  {
    id: 'researcher',
    name: 'Researcher',
    detail: 'Searching flights, hotels, and destination activities.',
  },
  {
    id: 'itinerary',
    name: 'Itinerary',
    detail: 'Building route alternatives and daily recommendations.',
  },
  {
    id: 'financial',
    name: 'Financial',
    detail: 'Calculating package pricing and budget optimization.',
  },
  {
    id: 'compliance',
    name: 'Compliance',
    detail: 'Validating policies and travel restrictions.',
  },
  {
    id: 'presenter',
    name: 'Presenter',
    detail: 'Formatting final package options for review.',
  },
]

export default function TravelRequestProcessingPage({ onNavigate }) {
  const [progress, setProgress] = useState(15)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((current) => Math.min(96, current + Math.random() * 9))
    }, 900)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!onNavigate) {
      return
    }

    if (progress < 96) {
      return
    }

    const completeTimeout = window.setTimeout(() => {
      onNavigate('request-review')
    }, 1200)

    return () => window.clearTimeout(completeTimeout)
  }, [progress, onNavigate])

  const activeStepIndex = useMemo(() => {
    const ratio = progress / 100
    return Math.min(AGENT_STEPS.length - 1, Math.floor(ratio * AGENT_STEPS.length))
  }, [progress])

  return (
    <AppLayout pageTitle="Travel Requests" activeItem="travel-requests" onNavigate={onNavigate}>
      <section className="processing-shell">
        <div className="processing-header">
          <span className="processing-spinner" />
          <h2 className="processing-title">AI Agents Processing Your Request</h2>
          <p className="processing-subtitle">
            Our AI agents are working together to create the best travel package.
          </p>
        </div>

        <article className="card processing-progress-card">
          <div className="processing-progress-head">
            <strong>Overall Progress</strong>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="processing-progress-track" aria-hidden="true">
            <span className="processing-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="processing-progress-label">
            Currently working: {AGENT_STEPS[activeStepIndex].name}
          </p>
          <p className="processing-progress-label">Tiempo de carga: {elapsedSeconds}s</p>
        </article>

        <article className="card processing-timeline-card">
          <h3 className="card-title">Agent Timeline</h3>
          <div className="processing-timeline">
            {AGENT_STEPS.map((step, index) => {
              const state =
                index < activeStepIndex ? 'completed' : index === activeStepIndex ? 'active' : 'waiting'

              return (
                <div className="processing-step" key={step.id}>
                  <span className={`processing-step-dot processing-step-dot--${state}`} />
                  <div>
                    <p className="processing-step-name">{step.name}</p>
                    <p className="processing-step-detail">{step.detail}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        <div className="form-actions-row">
          <button className="secondary-button" onClick={() => onNavigate && onNavigate('travel-requests')}>
            Back to Requests
          </button>
          <button className="primary-button" onClick={() => onNavigate && onNavigate('request-review')}>
            View Generated Packages
          </button>
        </div>
      </section>
    </AppLayout>
  )
}
