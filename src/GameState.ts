import { transactionalQuery, TupleDatabaseClientApi } from "tuple-database"
import { randomId } from "./helpers/randomId"

// export type Game = { players: Player[] }
export type Player = { id: string; name: string; score: number }

export type GameSchema =
	| { key: ["playerList", number, string]; value: null }
	| { key: ["player", string]; value: Player }
// More verbose approach:
// | { key: ["playerList", {index: number}, {id: string}]; value: null }
// | { key: ["player", {id: string}]; value: Player }

const getNextPlayerIndex = transactionalQuery<GameSchema>()((tx) => {
	const pairs = tx.scan({
		prefix: ["playerList"],
		reverse: true,
		limit: 1,
	})

	if (pairs.length === 0) return 0
	const { key } = pairs[0]
	const lastIndex = key[1]
	return lastIndex + 1
})

export const initGame = transactionalQuery<GameSchema>()((tx) => {
	if (tx.scan({ limit: 1 }).length === 0) {
		addPlayer(tx)
	}
})

export const addPlayer = transactionalQuery<GameSchema>()((tx) => {
	const player = { id: randomId(), name: "", score: 0 }
	tx.set(["player", player.id], player)

	const nextIndex = getNextPlayerIndex(tx)
	tx.set(["playerList", nextIndex, player.id], null)
})

export const deletePlayer = transactionalQuery<GameSchema>()(
	(tx, id: string, order: number) => {
		tx.remove(["player", id])
		tx.remove(["playerList", order, id])

		// Delete from list by scanning through the whole list.
		// tx.scan({ prefix: ["playerList"] })
		// 	.filter(({ key }) => key[2] === id)
		// 	.map(({ key }) => key)
		// 	.forEach((key) => tx.remove(key))
	}
)

export const editName = transactionalQuery<GameSchema>()(
	(tx, id: string, newName: string) => {
		const player = tx.get(["player", id])
		if (!player) throw new Error()
		tx.set(["player", id], { ...player, name: newName })
	}
)

export const incrementScore = transactionalQuery<GameSchema>()(
	(tx, id: string, delta: number) => {
		const player = tx.get(["player", id])
		if (!player) throw new Error()
		tx.set(["player", id], { ...player, score: player.score + delta })
	}
)

export const resetGame = transactionalQuery<GameSchema>()((tx) => {
	tx.scan().forEach(({ key }) => tx.remove(key))
	addPlayer(tx)
})

export type PlayersListItem = { order: number; playerId: string }

export function getPlayersList(
	db: TupleDatabaseClientApi<GameSchema>
): PlayersListItem[] {
	const items = db.scan({ prefix: ["playerList"] }).map(({ key }) => {
		return { order: key[1], playerId: key[2] }
	})
	return items
}

export function getPlayer(
	db: TupleDatabaseClientApi<GameSchema>,
	playerId: string
): Player {
	const player = db.get(["player", playerId])
	if (!player) throw new Error("Missing player: " + playerId)
	return player
}
