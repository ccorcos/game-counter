import { transactionalQuery } from "tuple-database"
import { randomId } from "./helpers/randomId"

export type GameSchema =
	| { key: ["playerList", number, string]; value: null }
	| { key: ["player", string]; value: Player }

// export type Game = { players: Player[] }
export type Player = { id: string; name: string; score: number }

export function newPlayer(): Player {
	return { id: randomId(), name: "", score: 0 }
}

// export function newGame(): Game {
// 	return { players: [newPlayer()] }
// }

const addPlayer = transactionalQuery<GameSchema>()((tx) => {
	const player = newPlayer()
	tx.set(["player", player.id], player)

	const playerList = tx.scan({
		prefix: ["playerList"],
		reverse: true,
		limit: 1,
	})

	const nextIndex = (playerList[0]?.key?.[1] || 0) + 1
	tx.set(["playerList", nextIndex, player.id], null)
})

const deletePlayer = transactionalQuery<GameSchema>()(
	(game: Game, index: number) => {
		const { players } = game
		const newPlayers = [...players]
		newPlayers.splice(index, 1)
		return { players: newPlayers }
	}
)
const editName = transactionalQuery<GameSchema>()(
	(game: Game, index: number, newName: string) => {
		const players = game.players.map((player, i) => {
			if (i !== index) return player
			return { ...player, name: newName }
		})
		return { players }
	}
)
const incrementScore = transactionalQuery<GameSchema>()(
	(game: Game, index: number, delta: number) => {
		const players = game.players.map((player, i) => {
			if (i !== index) return player
			return { ...player, score: player.score + delta }
		})
		return { players }
	}
)
const resetGame = transactionalQuery<GameSchema>()((game: Game) => {
	return newGame()
})

// export class AppState extends StateMachine<Game, typeof reducers> {
// 	constructor(initialGame: Game) {
// 		super(initialGame, reducers)
// 	}
// }

// export function useAppState<T>(selector: (state: Game) => T) {
// 	const { app } = useEnvironment()
// 	const initialState = useMemo(() => {
// 		return selector(app.state)
// 	}, [])

// 	const [state, setState] = useState(initialState)
// 	const currentStateRef = useRefCurrent(state)

// 	useEffect(() => {
// 		return app.addListener(() => {
// 			const nextState = selector(app.state)
// 			if (shallowEqual(currentStateRef.current, nextState)) return
// 			setState(nextState)
// 		})
// 	}, [])

// 	return state
// }
