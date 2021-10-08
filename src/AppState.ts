import { useEffect, useMemo, useState } from "react"
import * as s from "superstruct"
import { Subspace, transactional } from "tuple-database"
import { InMemoryStorage } from "tuple-database/storage/InMemoryStorage"
import { useEnvironment } from "./Environment"
import { shallowEqual } from "./helpers/shallowEqual"
import { useRefCurrent } from "./hooks/useRefCurrent"
import { StateMachine } from "./StateMachine"

const db = new InMemoryStorage()

export type Player = { id: number; name: string; score: number }
export type Game = { players: Player[] }

const app = new Subspace("app")
const playersList = app.subspace("playersList") // {[number, id]: null}
const playersById = app.subspace("playersById") // {[id]: {name, score}}

const addPlayer = transactional((tx, player: Player) => {
	const result = tx.scan({ ...playersList.range(), limit: 1, reverse: true })
	let nextIndex = 0
	if (result.length) {
		const index = playersList.unpack(result[0])[0] as number
		nextIndex = index + 1
	}
	tx.set(playersList.pack([nextIndex, player.id]), null)
	tx.set(playersById.pack([player.id]), player)
})

// addPlayer(game: Game) {
// 	const { players } = game
// 	return { players: [...players, newPlayer()] }
// }

const deletePlayer = transactional((tx, index: number) => {
	const result = tx.scan({
		...playersList.range([index]),
		limit: 1,
		reverse: true,
	})
	if (result.length === 0) throw new Error("Missing player at index.")
	tx.remove(result[0])
	const playerId = playersList.unpack(result[0])[1] as string
	tx.remove(playersById.pack([playerId]))
})

// deletePlayer(game: Game, index: number) {
// 	const { players } = game
// 	const newPlayers = [...players]
// 	newPlayers.splice(index, 1)
// 	return { players: newPlayers }
// }

// editName(game: Game, index: number, newName: string) {
// 	const players = game.players.map((player, i) => {
// 		if (i !== index) return player
// 		return { ...player, name: newName }
// 	})
// 	return { players }
// },
// incrementScore(game: Game, index: number, delta: number) {
// 	const players = game.players.map((player, i) => {
// 		if (i !== index) return player
// 		return { ...player, score: player.score + delta }
// 	})
// 	return { players }
// },
// resetGame(game: Game) {
// 	return newGame()
// },

// ============================================================================
// Object wrappers
// ============================================================================

const Uuid = s.object({ id: s.string() })

class ListNode {
	constructor(public id: string) {}

	value() {
		const results = query([[this.id, "value", $("value")]])
		if (results.length === 0) throw new Error("ListNode has no value.")
		if (results.length > 1) throw new Error("ListNode has more than one value.")
		const value = results[0].value
		return value as any
	}

	next() {
		const results = query([[this.id, "next", $("next")]])
		if (results.length === 0) return
		if (results.length > 1)
			throw new Error("ListNode has more than one next node.")
		const value = results[0].next
		s.assert(value, Uuid)
		return new ListNode(value.id)
	}
}

class Game2 {
	constructor(public id: string) {}
	players() {
		const results = query([[this.id, "players", $("head")]])
		if (results.length === 0) return []
		if (results.length > 1)
			throw new Error("ListNode has more than one start node.")

		const head = results[0].head
		s.assert(head, Uuid)

		let cursor: ListNode | undefined = new ListNode(head.id)
		const list: any[] = []

		while (cursor) {
			list.push(cursor.value())
			cursor = cursor.next()
		}

		return list.map((playerId) => new Player2(playerId))

		// store as linked list -- lots of individual listeners.
		//   reording is performant. changing the value is performant too.
		// store as a vector -- need an index. [list, item, $item], [$item, sort, $sort]. a single listener.
		//   reorder an item, need to recursively check a bunhc of vectors... could optimize here though,
		//   find all the listeners with the same shape and fetch the list type. this has a risk though, if the
		//   same item is in way more lists than are being listened to...
		// store as a vector with dynamic attributes -- seems like a bad idea because it liters the data model.
		//   single listener, no index: [list, $order, $value], performant write-reactivity too...
	}
}

class Player2 {
	constructor(public id: string) {}
	name() {
		const result = query([[this.id, "name", $("name")]])
		if (result.length === 0) return ""
		if (result.length > 1) throw new Error("Player has more than one name.")
		const name = result[0].name
		s.assert(name, s.string())
		return name
	}
	score() {
		const result = query([[this.id, "score", $("score")]])
		if (result.length === 0) return 0
		if (result.length > 1) throw new Error("Player has more than one score.")
		const score = result[0].score
		s.assert(score, s.number())
		return score
	}

	setName(newName: string) {
		// Read the name, delete the value, write a new name.
	}
}

// This feels like something we could generate from typescript types...
// Can we do this somehow with typescript magic instead?

// TODO
// - how can we generate these objects from a more compact schema?
//   data-type-ts or superstruct?
// - how can we make them reactive? can we use reactive magic somehow?
// - look at how automerge and mobx work for mutations on the list...

export function newPlayer(): Player {
	return { name: "", score: 0 }
}

export function newGame(): Game {
	return { players: [newPlayer()] }
}

const reducers = {
	addPlayer(game: Game) {
		const { players } = game
		return { players: [...players, newPlayer()] }
	},
	deletePlayer(game: Game, index: number) {
		const { players } = game
		const newPlayers = [...players]
		newPlayers.splice(index, 1)
		return { players: newPlayers }
	},
	editName(game: Game, index: number, newName: string) {
		const players = game.players.map((player, i) => {
			if (i !== index) return player
			return { ...player, name: newName }
		})
		return { players }
	},
	incrementScore(game: Game, index: number, delta: number) {
		const players = game.players.map((player, i) => {
			if (i !== index) return player
			return { ...player, score: player.score + delta }
		})
		return { players }
	},
	resetGame(game: Game) {
		return newGame()
	},
}

export class AppState extends StateMachine<Game, typeof reducers> {
	constructor(initialGame: Game) {
		super(initialGame, reducers)
	}
}

export function useAppState<T>(selector: (state: Game) => T) {
	const { app } = useEnvironment()
	const initialState = useMemo(() => {
		return selector(app.state)
	}, [])

	const [state, setState] = useState(initialState)
	const currentStateRef = useRefCurrent(state)

	useEffect(() => {
		return app.addListener(() => {
			const nextState = selector(app.state)
			if (shallowEqual(currentStateRef.current, nextState)) return
			setState(nextState)
		})
	}, [])

	return state
}
