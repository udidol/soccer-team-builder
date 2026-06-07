export interface Player {
  country: string
  firstName: string
  lastName: string
  positions: string[]
}

export interface PlayerOption {
  value: string
  text: string
  searchText: string
  player: Player
}
