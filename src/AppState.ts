import * as t from "data-type-ts"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
	deleteObj,
	Obj,
	OrderedTriplestore,
	proxyObj,
	subscribeObj,
	writeObj,
} from "triple-database/database/OrderedTriplestore"
import { first } from "triple-database/helpers/listHelpers"
import { randomId } from "triple-database/helpers/randomId"
import { Transaction, transactional, TupleStorage } from "tuple-database"
import { useEnvironment } from "./Environment"
import { gameId, GameSchema, Player, PlayerSchema } from "./schema"

function newPlayer(): Player {
	return { id: randomId(), name: "", score: 0 }
}

const addPlayer = transactional((tx, gameId: string) => {
	const player = newPlayer()
	writeObj(tx, player, PlayerSchema)
	// Using a proxy to create a typed interface.
	const game = proxyObj(tx, gameId, GameSchema)
	game.players.push(player.id)
	return player.id
})

const setName = transactional((tx, playerId: string, newName: string) => {
	const player = proxyObj(tx, playerId, PlayerSchema)
	player.name = newName
})

const incrementScore = transactional((tx, playerId: string, delta: number) => {
	const player = proxyObj(tx, playerId, PlayerSchema)
	player.score += delta
})

const newGame = transactional((tx) => {
	// A little tricky here because an empty game with no players doesn't even appear
	// in the database. If we wanted there to be such thing as an empty game, we would
	// just create a type: "Game" property. But for now, we'll just create an new player.
	const gameId = randomId()
	addPlayer(tx, gameId)
	return gameId
})

const deleteGame = transactional((tx, gameId: string) => {
	// Tricky question: can players belong to more than one game?
	// As an example of something non-trivial, lets delete a player if they no longer
	// belong to any games.
	const game = proxyObj(tx, gameId, GameSchema)
	for (const playerId of game.players) {
		const result = tx.scan({ prefix: ["vaeo", playerId] }).map(first)
		if (result.length === 1) deleteObj(tx, playerId, PlayerSchema)
	}

	deleteObj(tx, gameId, GameSchema)
})

const deletePlayer = transactional((tx, gameId: string, playerId: string) => {
	// The quick and dirty way of doing it, deleting the whole object
	// along with any links to the object.
	// hardDeleteObj(tx, playerId)

	// The clean and explicit way of doing it, only deleting the given
	// properties, but not deleting backlinks or any properties this schema
	// does not know of.
	deleteObj(tx, playerId, PlayerSchema)
	// Remove from the players list.
	const game = proxyObj(tx, gameId, GameSchema)

	// Without passing the index, this will delete all instances of the player
	// from this list.
	game.players.delete(playerId)
})

const resetGame = transactional((tx, gameId: string) => {
	deleteGame(tx, gameId)
	addPlayer(tx, gameId)
})

const actions = {
	addPlayer,
	setName,
	incrementScore,
	newGame,
	deleteGame,
	deletePlayer,
	resetGame,
}

export class AppState {
	public db = new OrderedTriplestore()

	constructor() {
		addPlayer(this.db, gameId)
		window["app"] = this
	}

	wrap<Args extends any[], O>(
		fn: (tx: TupleStorage | Transaction, ...args: Args) => O
	) {
		return (...args: Args) => {
			return fn(this.db, ...args)
		}
	}

	// Seems like its still a good idea to use dispatch.
	addPlayer = this.wrap(addPlayer)
	setName = this.wrap(setName)
	incrementScore = this.wrap(incrementScore)
	newGame = this.wrap(newGame)
	deleteGame = this.wrap(deleteGame)
	deletePlayer = this.wrap(deletePlayer)
	resetGame = this.wrap(resetGame)
}

export function useObj<T extends Obj>(
	db: OrderedTriplestore,
	id: string,
	schema: t.RuntimeDataType<T>
) {
	const objRef = useRef<T>()
	const rerender = useRerender()

	const unsubscribe = useMemo(() => {
		const [initialObj, unsubscribe] = subscribeObj(db, id, schema, (newObj) => {
			objRef.current = newObj
			rerender()
		})
		objRef.current = initialObj
		return unsubscribe
	}, [db, id, schema])

	useEffect(() => unsubscribe, [unsubscribe])

	return objRef.current as T
}

function useRerender() {
	const [state, setState] = useState(0)
	const rerender = useCallback(() => setState((state) => state + 1), [])
	return rerender
}

export function useAppState() {
	const { app } = useEnvironment()
	return app
}

export function usePlayer(id: string) {
	const {
		app: { db },
	} = useEnvironment()
	console.log("usePlayer", id)
	return useObj(db, id, PlayerSchema)
}

export function useGame(id: string) {
	const {
		app: { db },
	} = useEnvironment()
	console.log("useGame", id)
	return useObj(db, id, GameSchema)
}
