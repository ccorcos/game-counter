import { OrderedTriplestore } from "triple-database/database/OrderedTriplestore"
import { createOrm, Orm, OrmTx } from "triple-database/database/ORM"
import { first } from "triple-database/helpers/listHelpers"
import { randomId } from "triple-database/helpers/randomId"
import { useEnvironment } from "./Environment"
import { Player, schema, Schema } from "./schema"

function newPlayer(): Player {
	return { id: randomId(), name: "", score: 0 }
}

function addPlayer(tx: OrmTx<Schema>, gameId: string) {
	const player = newPlayer()
	tx.player.create(player)

	// Using a proxy to create a typed interface.
	const game = tx.game.proxy(gameId)
	game.players.push(player.id)
	return player.id
}

function setName(tx: OrmTx<Schema>, playerId: string, newName: string) {
	const player = tx.player.proxy(playerId)
	player.name = newName
}

function incrementScore(tx: OrmTx<Schema>, playerId: string, delta: number) {
	const player = tx.player.proxy(playerId)
	player.score += delta
}

function deleteGame(tx: OrmTx<Schema>, gameId: string) {
	// Tricky question: can players belong to more than one game?
	// As an example of something non-trivial, lets delete a player if they no longer
	// belong to any games.
	const game = tx.game.proxy(gameId)
	for (const playerId of game.players) {
		const result = tx.db.scan({ prefix: ["vaeo", playerId] }).map(first)
		if (result.length === 1) tx.player.delete(playerId)
	}

	tx.game.delete(gameId)
}

function deletePlayer(tx: OrmTx<Schema>, gameId: string, playerId: string) {
	// The quick and dirty way of doing it, deleting the whole object
	// along with any links to the object.
	// hardDeleteObj(tx, playerId)

	// The clean and explicit way of doing it, only deleting the given
	// properties, but not deleting backlinks or any properties this schema
	// does not know of.
	tx.player.delete(playerId)
	// Remove from the players list.
	const game = tx.game.proxy(gameId)

	// Without passing the index, this will delete all instances of the player
	// from this list.
	game.players.delete(playerId)
}

function resetGame(tx: OrmTx<Schema>, gameId: string) {
	deleteGame(tx, gameId)
	addPlayer(tx, gameId)
}

/**
 * Removes the first element from a tuple.
 * TupleRest<[1,2,3> = [2,3]
 */
type TupleRest<T extends unknown[]> = T extends [any, ...infer U] ? U : never

type AnyActions = {
	[fn: string]: (tx: OrmTx<Schema>, ...args: any[]) => any
}

type BindActions<A extends AnyActions> = {
	[K in keyof A]: (...args: TupleRest<Parameters<A[K]>>) => ReturnType<A[K]>
}

export function bindActions<A extends AnyActions>(
	orm: Orm<Schema>,
	actions: A
): BindActions<A> {
	const boundActions: BindActions<A> = {} as any
	for (const key in actions) {
		boundActions[key] = (...args: any[]) => {
			console.log("DISPATCH", { fn: key, args })
			const tx = orm.transact()
			const result = actions[key](tx, ...args)
			tx.commit()
			return result
		}
	}
	return boundActions
}

const actions = {
	addPlayer,
	setName,
	incrementScore,
	deleteGame,
	deletePlayer,
	resetGame,
}

export class AppState {
	db = new OrderedTriplestore()
	orm = createOrm(this.db, schema)
	dispatch = bindActions(this.orm, actions)
}

export function usePlayer(id: string) {
	const { app } = useEnvironment()
	return app.orm.player.use(id)
}

export function useGame(id: string) {
	const { app } = useEnvironment()
	return app.orm.game.use(id)
}
