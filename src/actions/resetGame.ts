import { Environment } from "../Environment"
import { gameId } from "../schema"

export function resetGame(environment: Environment) {
	const { dispatch } = environment.app
	const response = window.confirm(`Are you want to reset the game?`)
	if (!response) return
	dispatch.resetGame(gameId)
}
