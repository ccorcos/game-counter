import { TupleDatabaseClientApi } from "tuple-database"
import { deletePlayer, GameSchema } from "../GameState"

export function maybeDeletePlayer(
	db: TupleDatabaseClientApi<GameSchema>,
	playerId: string,
	order: number
) {
	const player = db.get(["player", playerId])
	if (!player) return
	const playerName = player.name || `Player ${order + 1}`
	const response = window.confirm(`Are you want to delete ${playerName}?`)
	if (!response) return
	deletePlayer(db, playerId, order)
}
