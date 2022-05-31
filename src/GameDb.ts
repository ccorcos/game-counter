import {
	NamedTupleToObject,
	namedTupleToObject,
	ReadOnlyTupleDatabaseClientApi,
	transactionalQuery,
	TupleDatabase,
	TupleDatabaseClient,
	TupleDatabaseClientApi,
} from "tuple-database"
import { BrowserStorage } from "./BrowserStorage"
import { getTimeMs, nowDateTime } from "./helpers/dateHelpers"
import { randomId } from "./helpers/randomId"

// ==========================================================================
// Types / Schema
// ==========================================================================

export type Player = { id: string; name: string; score: number }

type HistoryTuple = [
	"history",
	{ datetime: string },
	{ playerId: string },
	{ delta: number }
]

export type HistoryObj = NamedTupleToObject<HistoryTuple>

export type GameSchema =
	| { key: ["playerList", number, string]; value: null }
	| { key: ["player", string]; value: Player }
	| { key: HistoryTuple; value: null }

// More verbose approach:
// | { key: ["playerList", {index: number}, {id: string}]; value: null }
// | { key: ["player", {id: string}]; value: Player }

// ==========================================================================
// Database.
// ==========================================================================

export type GameDb = TupleDatabaseClientApi<GameSchema>

export function createGameDb(): GameDb {
	return new TupleDatabaseClient(
		new TupleDatabase(new BrowserStorage("gamedb"))
	)
}

// ==========================================================================
// Reads.
// ==========================================================================

export type ReadOnlyGameDb = ReadOnlyTupleDatabaseClientApi<GameSchema>

export type PlayersListItem = { order: number; playerId: string }

export function getPlayersList(db: ReadOnlyGameDb): PlayersListItem[] {
	const items = db.scan({ prefix: ["playerList"] }).map(({ key }) => {
		return { order: key[1], playerId: key[2] }
	})
	return items
}

export function getPlayer(db: ReadOnlyGameDb, playerId: string): Player {
	const player = db.get(["player", playerId])
	if (!player) throw new Error("Missing player: " + playerId)
	return player
}

export function getHistory(db: ReadOnlyGameDb): HistoryObj[] {
	const history = db
		.subspace(["history"])
		.scan()
		.map(({ key }) => key)
		.map(namedTupleToObject)
	return history
}

// ==========================================================================
// Writes.
// ==========================================================================

export const initGameDb = transactionalQuery<GameSchema>()((tx) => {
	if (tx.scan({ limit: 1 }).length === 0) {
		addPlayer(tx)
	}
})

function getNextPlayerIndex(db: ReadOnlyGameDb) {
	const pairs = db.scan({
		prefix: ["playerList"],
		reverse: true,
		limit: 1,
	})

	if (pairs.length === 0) return 0
	const { key } = pairs[0]
	const lastIndex = key[1]
	return lastIndex + 1
}

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

function getLastHistoryTuple(db: ReadOnlyGameDb) {
	const result = db
		.scan({ prefix: ["history"], limit: 1, reverse: true })
		.map(({ key }) => key)

	if (result.length === 1) return result[0]
}

const trackHistory = transactionalQuery<GameSchema>()(
	(tx, playerId: string, delta: number) => {
		const lastTuple = getLastHistoryTuple(tx)

		// Squash last item.
		squash: if (lastTuple) {
			const historyObj = namedTupleToObject(lastTuple)
			if (historyObj.playerId !== playerId) break squash

			const deltaMs = getTimeMs(nowDateTime()) - getTimeMs(historyObj.datetime)
			if (deltaMs > 5_000) break squash

			tx.remove(lastTuple)
			const newDelta = historyObj.delta + delta
			if (newDelta === 0) return

			tx.set(
				[
					"history",
					{ datetime: nowDateTime() },
					{ playerId: playerId },
					{ delta: newDelta },
				],
				null
			)
			return
		}

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
