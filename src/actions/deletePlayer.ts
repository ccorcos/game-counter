import { proxyObj } from "triple-database/database/OrderedTriplestore"
import { Environment } from "../Environment"

export function deletePlayer(environment: Environment, playerId: string) {
	// Add this to the AppSTate object...
	proxyObj(environment.app.db)

	const playerName = player.name || `Player ${index + 1}`
	const response = window.confirm(`Are you want to delete ${playerName}?`)
	if (!response) return
	environment.dispatch.deletePlayer(index)
}
