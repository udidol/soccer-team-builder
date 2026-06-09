import Choices from 'choices.js'
import 'choices.js/public/assets/styles/choices.css'
import './styles.scss'
import { countryFlags } from './country-flags'
import type { Player } from './types'
import playerData from './player-data.json'
import html2canvas from 'html2canvas'
import screenshotSvg from './screenshot.svg?raw'

const MIN_SEARCH_LENGTH = 2
const DEFAULT_FLAG = '🏳️'
const STORAGE_KEY = 'soccer-team-builder-selections'

let selectedPlayerIds = new Set<string>()
const slotInstances: Record<string, Choices> = {}
const slotPlayers: Record<string, Player[]> = {}
let isRestoring = false
let isRefreshing = false

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
    isRefreshing = true
    instance.setChoiceByValue(currentValue)
    isRefreshing = false
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

function updateTooltip(slotId: string): void {
  const instance = slotInstances[slotId]
  if (!instance) return
  const value = instance.getValue(true) as string
  const player = value ? slotPlayers[slotId]?.find(p => getPlayerId(p) === value) : undefined
  const el = instance.containerOuter.element
  if (player) {
    el.dataset.tooltip = `${player.country}\n${player.firstName} ${player.lastName}`
  } else {
    delete el.dataset.tooltip
  }
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
    searchFields: ['label', 'customProperties.player.firstName'],
  })

  instance.setChoices(positionPlayers.map(p => createChoiceItem(p)), 'value', 'label', false)

  slotInstances[slotId] = instance

  selectEl.addEventListener('change', () => {
    if (isRestoring || isRefreshing) return
    updateSelectedPlayers()
    refreshAllOtherSlots(slotId)
    saveToLocalStorage()
    updateTooltip(slotId)
  })

  selectEl.addEventListener('removeItem', () => {
    if (isRestoring || isRefreshing) return
    updateSelectedPlayers()
    refreshAllOtherSlots(slotId)
    saveToLocalStorage()
    updateTooltip(slotId)
  })
}

function restoreSelections(): void {
  const saved = loadFromLocalStorage()

  isRestoring = true
  Object.entries(saved).forEach(([slotId, playerId]) => {
    slotInstances[slotId]?.setChoiceByValue(playerId)
  })
  isRestoring = false

  updateSelectedPlayers()
  Object.keys(slotInstances).forEach(slotId => {
    refreshChoices(slotId)
    updateTooltip(slotId)
  })
}

async function takeScreenshot(): Promise<void> {
  const field = document.querySelector('.field-container') as HTMLElement
  const canvas = await html2canvas(field, { backgroundColor: null })

  const blob = await new Promise<Blob>(resolve =>
    canvas.toBlob(b => resolve(b!), 'image/png')
  )
  const file = new File([blob], 'team-lineup.png', { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] })
  } else {
    const link = document.createElement('a')
    link.download = 'team-lineup.png'
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }
}

function setupScreenshotButton(): void {
  const btn = document.createElement('button')
  btn.className = 'screenshot-btn'
  btn.innerHTML = screenshotSvg
  btn.addEventListener('click', takeScreenshot)
  document.body.appendChild(btn)
}

function init(): void {
  const players = playerData as Player[]

  const selectElements = document.querySelectorAll<HTMLSelectElement>('.position-slot select')
  selectElements.forEach(selectEl => {
    initializeSlot(selectEl, players)
  })

  restoreSelections()
  setupScreenshotButton()
}

init()
