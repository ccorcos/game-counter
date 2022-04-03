import { TupleDatabaseClientApi } from "tuple-database"
import { GameSchema, resetGame } from "../GameState"

export function maybeResetGame(db: TupleDatabaseClientApi<GameSchema>) {
	const response = window.confirm(`Are you want to reset the game?`)
	if (!response) return
	resetGame(db)
}
