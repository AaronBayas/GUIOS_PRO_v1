interface StepBarProps {
  currentStep: number
}

const steps = [
  { number: 1, label: 'Importancia de Factores' },
  { number: 2, label: 'Ponderación de Subfactores' },
  { number: 3, label: 'Resultados FODA' },
]

export function StepBar({ currentStep }: StepBarProps) {
  return (
    <div className="stepbar">
      {steps.map((step, idx) => {
        const state = currentStep > step.number ? 'done' : currentStep === step.number ? 'active' : 'pending'
        return (
          <div key={step.number} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div className="step-item">
              <div className={`step-circle ${state}`}>
                {state === 'done' ? '✓' : step.number}
              </div>
              <span className={`step-label ${state}`}>{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`step-connector ${state === 'done' ? 'done' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
