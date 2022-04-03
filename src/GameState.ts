import {
	ReadOnlyTupleDatabaseClientApi,
	transactionalQuery,
} from "tuple-database"
import { nowDateTime } from "./helpers/dateHelpers"
import { mergeKey } from "./helpers/mergeKeys"
import { randomId } from "./helpers/randomId"

// export type Game = { players: Player[] }
export type Player = { id: string; name: string; score: number }

export type GameSchema =
	| { key: ["playerList", number, string]; value: null }
	| { key: ["player", string]; value: Player }
	| {
			key: [
				"history",
				{ datetime: string },
				{ playerId: string },
				{ delta: number }
			]
			value: null
	  }
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

function getLastHistoryItem(db: ReadOnlyTupleDatabaseClientApi<GameSchema>) {
	const result = db.scan({ prefix: ["history"], limit: 1, reverse: true })
	// TODO: mergeKey
	if (result.length === 1) return result[0].key
}

const trackHistory = transactionalQuery<GameSchema>()(
	(tx, playerId: string, delta: number) => {
		const lastItem = getLastHistoryItem(tx)

		// Squash last item.
		if (lastItem && lastItem[2].playerId === playerId) {
			tx.remove(lastItem)
			const newDelta = lastItem[3].delta + delta
			if (newDelta === 0) return

			// TODO: dont merge if you've waited more than 10 seconds
			tx.set(
				[
					"history",
					{ datetime: nowDateTime() },
					{ playerId: playerId },
					{ delta: newDelta },
				],
				null
			)
		} else {
			tx.set(
				[
					"history",
					{ datetime: nowDateTime() },
					{ playerId: playerId },
					{ delta },
				],
				null
			)
		}
	}
)

export const incrementScore = transactionalQuery<GameSchema>()(
	(tx, playerId: string, delta: number) => {
		const player = tx.get(["player", playerId])
		if (!player) throw new Error()
		tx.set(["player", playerId], { ...player, score: player.score + delta })
		trackHistory(tx, playerId, delta)
	}
)

export const resetGame = transactionalQuery<GameSchema>()((tx) => {
	tx.scan().forEach(({ key }) => tx.remove(key))
	addPlayer(tx)
})

export type PlayersListItem = { order: number; playerId: string }

export function getPlayersList(
	db: ReadOnlyTupleDatabaseClientApi<GameSchema>
): PlayersListItem[] {
	const items = db.scan({ prefix: ["playerList"] }).map(({ key }) => {
		return { order: key[1], playerId: key[2] }
	})
	return items
}

export function getPlayer(
	db: ReadOnlyTupleDatabaseClientApi<GameSchema>,
	playerId: string
): Player {
	const player = db.get(["player", playerId])
	if (!player) throw new Error("Missing player: " + playerId)
	return player
}

export function getHistory(db: ReadOnlyTupleDatabaseClientApi<GameSchema>) {
	const history = db
		.subspace(["history"])
		.scan()
		.map(({ key }) => key)
		.map(mergeKey)
	return history
}
