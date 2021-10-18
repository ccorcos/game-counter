import * as t from "data-type-ts"

export const gameId = "theGame"

export const PlayerSchema = t.object({
	required: {
		id: t.string,
		name: t.string,
		score: t.number,
	},
	optional: {},
})

export const GameSchema = t.object({
	required: {
		id: t.string,
		players: t.array(t.string),
	},
	optional: {},
})

export type Player = typeof PlayerSchema.value
export type Game = typeof GameSchema.value

export type Schema = {
	player: Player
	game: Game
}

export const schema = {
	player: PlayerSchema,
	game: GameSchema,
}
