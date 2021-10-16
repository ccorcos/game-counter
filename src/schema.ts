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

const orm: any = {}

// const player1 = orm.player("player1")
// orm.game("game1")
