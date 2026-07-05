import { useEvaluacionStore } from '../../store/evaluacion.store'
import { formatRelativeTime } from '../../utils/guiosad.utils'
import { useEffect, useState } from 'react'

export function AutosaveBadge() {
  const { guardandoState, ultimoGuardado } = useEvaluacionStore()
  const [timeText, setTimeText] = useState('')

  useEffect(() => {
    const update = () => {
      if (ultimoGuardado) setTimeText(formatRelativeTime(ultimoGuardado))
    }
    update()
    const i = setInterval(update, 15000)
    return () => clearInterval(i)
  }, [ultimoGuardado])

  if (guardandoState === 'saving') {
    return (
      <div className="autosave-badge saving">
        <div className="autosave-dot pulse" />
        Guardando...
      </div>
    )
  }

  if (guardandoState === 'error') {
    return (
      <div className="autosave-badge error">
        <div className="autosave-dot" />
        Error al guardar
      </div>
    )
  }

  if (ultimoGuardado) {
    return (
      <div className="autosave-badge saved">
        <div className="autosave-dot" />
        {timeText}
      </div>
    )
  }

  return (
    <div className="autosave-badge">
      <div className="autosave-dot" />
      Sin guardar
    </div>
  )
}
