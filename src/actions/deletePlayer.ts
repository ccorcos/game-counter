import { Environment } from "../Environment"
import { gameId } from "../schema"

export function deletePlayer(environment: Environment, playerId: string) {
	const { orm, dispatch } = environment.app

	const player = orm.player.get(playerId)

	let playerName = player.name
	if (!playerName) {
		const game = orm.game.get(gameId)
		const index = game.players.indexOf(player.id)
		playerName = `Player ${index + 1}`
	}

	const response = window.confirm(`Are you want to delete ${playerName}?`)
	if (!response) return

	dispatch.deletePlayer(gameId, playerId)
}
