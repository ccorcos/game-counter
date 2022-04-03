import React from "react"
import { maybeDeletePlayer } from "../actions/deletePlayer"
import { maybeResetGame } from "../actions/resetGame"
import { useEnvironment } from "../Environment"
import { addPlayer, editName, incrementScore, Player } from "../GameState"
import { useTupleDb } from "../useTupleDb"

export function App() {
	const { db } = useEnvironment()

	const playerList = useTupleDb(
		db,
		(db) => {
			const items = db
				.subspace(["app"])
				.scan({ prefix: ["playerList"] })
				.map(({ key }) => {
					return { order: key[1], playerId: key[2] }
				})
			return items
		},
		[]
	)

	return (
		<div
			style={{
				maxWidth: "100%",
				width: "24em",
				margin: "0 auto",
			}}
		>
			<h2>Game Score Counter</h2>
			{playerList.map(({ playerId, order }) => (
				<Player playerId={playerId} order={order} key={playerId} />
			))}
			<div style={{ display: "flex", gap: 8 }}>
				<button onClick={() => addPlayer(db.subspace(["app"]))}>
					Add Player
				</button>
				<button onClick={() => maybeResetGame(db.subspace(["app"]))}>
					Reset Game
				</button>
			</div>
		</div>
	)
}

function Player(props: { playerId: string; order: number }) {
	const { playerId, order } = props
	const { db } = useEnvironment()

	const player = useTupleDb(
		db,
		(db) => {
			const player = db.subspace(["app"]).get(["player", playerId])
			if (!player) throw new Error("Missing player: " + playerId)
			return player
		},
		[playerId]
	)

	return (
		<div style={{ display: "flex", paddingBottom: 8 }}>
			<div
				style={{
					marginRight: 8,
					position: "relative",
					flex: 1,
					display: "flex",
				}}
			>
				<input
					style={{
						flex: 1,
						paddingTop: 6,
						paddingBottom: 6,
						textAlign: "left",
						paddingRight: "3em",
						width: "1em",
					}}
					placeholder={`Player ${order + 1}`}
					value={player.name}
					onChange={(event) =>
						editName(db.subspace(["app"]), playerId, event.target!.value)
					}
				/>
				<div
					style={{
						position: "absolute",
						right: 0,
						height: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<button
						style={{
							fontSize: 12,
							border: "none",
							background: "transparent",
							color: "red",
						}}
						onClick={() =>
							maybeDeletePlayer(db.subspace(["app"]), playerId, order)
						}
					>
						Delete
					</button>
				</div>
			</div>
			<div style={{ display: "flex" }}>
				<div>
					<button
						style={{ flex: 1, padding: "6px 16px" }}
						onClick={() => incrementScore(db.subspace(["app"]), playerId, -1)}
					>
						-1
					</button>
				</div>
				<div
					style={{
						padding: "1px 0px",
						minWidth: "2em",
						textAlign: "center",
						lineHeight: "36px",
					}}
				>
					{player.score}
				</div>
				<div>
					<button
						style={{ flex: 1, padding: "6px 16px" }}
						onClick={() => incrementScore(db.subspace(["app"]), playerId, +1)}
					>
						+1
					</button>
				</div>
			</div>
		</div>
	)
}
