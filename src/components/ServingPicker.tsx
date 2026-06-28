import { useMemo, useState } from 'react'
import { calculateServingNetCarbs } from '../services/foodLookup/netCarbCalculator'
import type { NetCarbCalculation, NormalizedFoodDetail, ServingOption } from '../services/foodLookup/types'
import { normalizeCarbGrams } from '../utils/carbs'

export interface ServingPickerSubmission {
  detail: NormalizedFoodDetail
  calculation: NetCarbCalculation
  netCarbs: number
  overrideUsed: boolean
  servingLabel: string
  servingGrams?: number
  quantity: number
}

interface ServingPickerProps {
  detail: NormalizedFoodDetail
  mealLabel: string
  subtractSugarAlcoholsWhenAvailable: boolean
  onAdd: (submission: ServingPickerSubmission) => void
  onSavePreset: (submission: ServingPickerSubmission) => void
  onCancel: () => void
}

const numberOrZero = (value: number) => (Number.isFinite(value) ? value : 0)

const displayGrams = (value?: number) => {
  if (!Number.isFinite(value ?? NaN)) {
    return undefined
  }
  return `${Math.round(Number(value))}g`
}

const optionLabel = (option: ServingOption) => {
  const grams = displayGrams(option.grams)
  return grams && !option.label.includes(grams) ? `${option.label} · ${grams}` : option.label
}

export function ServingPicker({
  detail,
  mealLabel,
  subtractSugarAlcoholsWhenAvailable,
  onAdd,
  onSavePreset,
  onCancel,
}: ServingPickerProps) {
  const defaultOption = useMemo(
    () => detail.servingOptions.find((option) => option.isDefault) ?? detail.servingOptions[0],
    [detail.servingOptions],
  )
  const [selectedServingId, setSelectedServingId] = useState(defaultOption?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [customGrams, setCustomGrams] = useState(100)
  const [manualOverride, setManualOverride] = useState('')

  const selectedServing = useMemo(() => {
    const selected = detail.servingOptions.find((option) => option.id === selectedServingId) ?? defaultOption
    if (!selected) {
      return undefined
    }
    if (selected.source !== 'custom') {
      return selected
    }

    return {
      ...selected,
      label: `Custom ${Math.max(0, customGrams)}g`,
      quantity: Math.max(0, customGrams),
      unit: 'g',
      grams: Math.max(0, customGrams),
      multiplierFromBase: detail.baseServing.grams ? Math.max(0, customGrams) / detail.baseServing.grams : undefined,
    }
  }, [customGrams, defaultOption, detail.baseServing.grams, detail.servingOptions, selectedServingId])

  const calculation = useMemo(() => {
    if (!selectedServing) {
      return undefined
    }
    return calculateServingNetCarbs({
      detail,
      selectedServing,
      quantity,
      subtractSugarAlcoholsWhenAvailable,
    })
  }, [detail, quantity, selectedServing, subtractSugarAlcoholsWhenAvailable])

  const overrideNumber = manualOverride.trim() ? normalizeCarbGrams(Number(manualOverride)) : undefined
  const finalNetCarbs = overrideNumber ?? calculation?.netCarbsRounded ?? 0

  const submission = (): ServingPickerSubmission | undefined => {
    if (!calculation || !selectedServing) {
      return undefined
    }
    return {
      detail,
      calculation,
      netCarbs: finalNetCarbs,
      overrideUsed: overrideNumber !== undefined,
      servingLabel: selectedServing.label,
      servingGrams: selectedServing.grams,
      quantity,
    }
  }

  const adjustQuantity = (delta: number) => {
    setQuantity((value) => Math.max(0, Math.round((numberOrZero(value) + delta) * 10) / 10))
  }

  return (
    <div className="serving-picker" role="dialog" aria-label="Serving picker">
      <div className="section-title">
        <div>
          <p className="eyebrow">{detail.attributionText}</p>
          <h2>{detail.candidate.name}</h2>
          <p>
            {detail.candidate.brandName ? `${detail.candidate.brandName} · ` : ''}
            {detail.candidate.dataType ?? 'Food lookup'}
          </p>
        </div>
      </div>

      <div className="serving-option-grid" aria-label="Serving options">
        {detail.servingOptions.map((option) => (
          <button
            className={selectedServingId === option.id ? 'active' : ''}
            key={option.id}
            type="button"
            onClick={() => setSelectedServingId(option.id)}
          >
            <span>{optionLabel(option)}</span>
            <small>{option.source === 'custom' ? 'enter grams' : option.source}</small>
          </button>
        ))}
      </div>

      {selectedServing?.source === 'custom' && (
        <label className="serving-input">
          Custom grams
          <input
            inputMode="decimal"
            min={0}
            type="number"
            value={customGrams}
            onChange={(event) => setCustomGrams(Math.max(0, Number(event.target.value)))}
          />
        </label>
      )}

      <div className="quantity-picker" aria-label="Quantity picker">
        <button type="button" onClick={() => adjustQuantity(-1)}>-1</button>
        <button type="button" onClick={() => adjustQuantity(-0.5)}>-0.5</button>
        <label>
          <span>Quantity</span>
          <input
            inputMode="decimal"
            min={0}
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(Math.max(0, Number(event.target.value)))}
          />
        </label>
        <button type="button" onClick={() => adjustQuantity(0.5)}>+0.5</button>
        <button type="button" onClick={() => adjustQuantity(1)}>+1</button>
      </div>

      {calculation && (
        <div className="formula-card">
          <p>{calculation.formulaLabel}</p>
          <strong>Add {finalNetCarbs}g net carbs</strong>
          {calculation.warnings.map((warning) => (
            <p className="notice" key={warning}>{warning}</p>
          ))}
        </div>
      )}

      <label className="serving-input">
        Manual override
        <input
          inputMode="numeric"
          min={0}
          placeholder={`${calculation?.netCarbsRounded ?? 0}`}
          type="number"
          value={manualOverride}
          onChange={(event) => setManualOverride(event.target.value)}
        />
      </label>

      <div className="button-grid">
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            const next = submission()
            if (next) {
              onAdd(next)
            }
          }}
        >
          Add to {mealLabel}
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={() => {
            const next = submission()
            if (next) {
              onSavePreset(next)
            }
          }}
        >
          Save as preset
        </button>
        <button className="ghost-button" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
