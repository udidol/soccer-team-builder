import Choices from 'choices.js'
import 'choices.js/public/assets/styles/choices.css'
import { countryFlags } from './country-flags'
import type { Player } from './types'

const MIN_SEARCH_LENGTH = 2
const DEFAULT_FLAG = '🏳️'
const STORAGE_KEY = 'soccer-team-builder-selections'

let selectedPlayerIds = new Set<string>()
const slotInstances: Record<string, Choices> = {}
const slotPlayers: Record<string, Player[]> = {}

interface ChoiceItem {
  value: string
  label: string
  disabled?: boolean
  customProperties?: {
    player: Player
    positions: string
  }
}

function getPlayerId(player: Player): string {
  return `${player.country}-${player.firstName}-${player.lastName}`
}

function getFlag(country: string): string {
  return countryFlags[country] || DEFAULT_FLAG
}

function filterPlayersByPosition(players: Player[], allowedPositions: string): Player[] {
  const positionSet = new Set(allowedPositions.split(','))
  return players.filter(player =>
    player.positions.some(pos => positionSet.has(pos))
  )
}

function createChoiceItem(player: Player, disabled: boolean = false): ChoiceItem {
  const flag = getFlag(player.country)
  const positions = player.positions.join('/')
  return {
    value: getPlayerId(player),
    label: `${flag} ${player.lastName}`,
    customProperties: { player, positions },
    disabled
  }
}

function getAvailableChoices(players: Player[], currentSlotId: string): ChoiceItem[] {
  const currentValue = slotInstances[currentSlotId]?.getValue(true) as string | undefined

  return players.map(player => {
    const id = getPlayerId(player)
    const isSelected = selectedPlayerIds.has(id)
    const isCurrentSelection = currentValue === id
    return createChoiceItem(player, isSelected && !isCurrentSelection)
  })
}

function refreshChoices(slotId: string): void {
  const instance = slotInstances[slotId]
  const players = slotPlayers[slotId]
  if (!instance || !players) return

  const currentValue = instance.getValue(true) as string | undefined
  const choices = getAvailableChoices(players, slotId)

  instance.clearChoices()
  instance.setChoices(choices, 'value', 'label', false)

  if (currentValue) {
    instance.setChoiceByValue(currentValue)
  }
}

function updateSelectedPlayers(): void {
  selectedPlayerIds.clear()
  Object.values(slotInstances).forEach(instance => {
    const value = instance.getValue(true) as string
    if (value) {
      selectedPlayerIds.add(value)
    }
  })
}

function refreshAllOtherSlots(exceptSlotId: string): void {
  Object.keys(slotInstances).forEach(slotId => {
    if (slotId !== exceptSlotId) {
      refreshChoices(slotId)
    }
  })
}

function saveToLocalStorage(): void {
  const selections: Record<string, string> = {}
  Object.entries(slotInstances).forEach(([slotId, instance]) => {
    const value = instance.getValue(true) as string
    if (value) {
      selections[slotId] = value
    }
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selections))
}

function loadFromLocalStorage(): Record<string, string> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

function initializeSlot(selectEl: HTMLSelectElement, players: Player[]): void {
  const slotId = selectEl.id
  const slotEl = selectEl.closest('.position-slot') as HTMLElement
  const allowedPositions = slotEl.dataset.positions || ''
  const placeholder = selectEl.getAttribute('placeholder') || 'Select'

  const positionPlayers = filterPlayersByPosition(players, allowedPositions)
  slotPlayers[slotId] = positionPlayers

  const instance = new Choices(selectEl, {
    choices: positionPlayers.map(p => createChoiceItem(p)),
    placeholder: true,
    placeholderValue: placeholder,
    searchEnabled: true,
    searchFloor: MIN_SEARCH_LENGTH,
    searchResultLimit: 50,
    removeItemButton: true,
    allowHTML: true,
    itemSelectText: '',
    noResultsText: 'No players found',
    noChoicesText: 'No players available',
    shouldSort: false,
    searchFields: ['label'],
    maxItemCount: 1
  })

  slotInstances[slotId] = instance

  const lockInput = () => {
    instance.input.element.setAttribute('disabled', 'true')
    instance.input.element.blur()
    instance.containerOuter.element.addEventListener('click', blockDropdown, true)
  }

  const unlockInput = () => {
    instance.input.element.removeAttribute('disabled')
    instance.containerOuter.element.removeEventListener('click', blockDropdown, true)
  }

  const blockDropdown = (e: Event) => {
    const target = e.target as HTMLElement
    if (!target.classList.contains('choices__button')) {
      e.stopPropagation()
    }
  }

  selectEl.addEventListener('change', () => {
    updateSelectedPlayers()
    refreshAllOtherSlots(slotId)
    saveToLocalStorage()
    if (instance.getValue(true)) {
      lockInput()
    }
  })

  selectEl.addEventListener('removeItem', () => {
    updateSelectedPlayers()
    refreshAllOtherSlots(slotId)
    saveToLocalStorage()
    unlockInput()
  })
}

async function loadPlayers(): Promise<Player[]> {
  try {
    const response = await fetch('player-data.json')
    return await response.json()
  } catch (error) {
    console.error('Failed to load player data:', error)
    return []
  }
}

function restoreSelections(): void {
  const saved = loadFromLocalStorage()

  Object.entries(saved).forEach(([slotId, playerId]) => {
    const instance = slotInstances[slotId]
    if (instance) {
      instance.setChoiceByValue(playerId)
      instance.input.element.setAttribute('disabled', 'true')
    }
  })

  updateSelectedPlayers()
  Object.keys(slotInstances).forEach(slotId => {
    refreshChoices(slotId)
  })
}

async function init(): Promise<void> {
  const players = await loadPlayers()

  if (players.length === 0) {
    console.error('No players loaded')
    return
  }

  const selectElements = document.querySelectorAll<HTMLSelectElement>('.position-slot select')
  selectElements.forEach(selectEl => {
    initializeSlot(selectEl, players)
  })

  restoreSelections()
}

init()
