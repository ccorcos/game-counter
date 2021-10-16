import { proxyObj } from "triple-database/database/OrderedTriplestore"
import { Environment } from "../Environment"
import { gameId, GameSchema, PlayerSchema } from "../schema"

export function deletePlayer(environment: Environment, playerId: string) {
	const player = proxyObj(environment.app.db, playerId, PlayerSchema)
	const playerName =
		player.name ||
		`Player ${
			[...proxyObj(environment.app.db, gameId, GameSchema).players].indexOf(
				playerId
			) + 1
		}`
	const response = window.confirm(`Are you want to delete ${playerName}?`)
	if (!response) return
	environment.app.deletePlayer(gameId, playerId)
}
