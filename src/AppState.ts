import * as t from "data-type-ts"
import { useEffect, useMemo, useState } from "react"
import {
	deleteObj,
	OrderedTriplestore,
	proxyObj,
	writeObj,
} from "triple-database/database/OrderedTriplestore"
import { first } from "triple-database/helpers/listHelpers"
import { randomId } from "triple-database/helpers/randomId"
import { transactional } from "tuple-database"
import { useEnvironment } from "./Environment"
import { shallowEqual } from "./helpers/shallowEqual"
import { useRefCurrent } from "./hooks/useRefCurrent"
import { StateMachine } from "./StateMachine"

const db2 = new OrderedTriplestore()

const PlayerSchema = t.object({
	required: {
		id: t.string,
		name: t.string,
		score: t.number,
	},
	optional: {},
})

const GameSchema = t.object({
	required: {
		id: t.string,
		players: t.array(t.string),
	},
	optional: {},
})

export type Player = typeof PlayerSchema.value
export type Game = typeof GameSchema.value

const addPlayer = transactional((tx, gameId: string, player: Player) => {
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
	addPlayer(tx, gameId, { id: randomId(), name: "", score: 0 })
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
