import React, { useMemo } from "react"
import { maybeDeletePlayer } from "../actions/maybeDeletePlayer"
import { maybeResetGame } from "../actions/maybeResetGame"
import { useEnvironment } from "../Environment"
import {
	addPlayer,
	editName,
	getHistory,
	getPlayer,
	getPlayersList,
	HistoryObj,
	incrementScore,
	Player,
	PlayersListItem,
} from "../GameState"
import { formatDatetime } from "../helpers/dateHelpers"
import { useTupleDb } from "../useTupleDb"

export function App() {
	const { db } = useEnvironment()
	const gameDb = useMemo(() => db.subspace(["app"]), [db])
	const playerList = useTupleDb(gameDb, getPlayersList, [])

	return (
		<div
			style={{
				maxWidth: "100%",
				width: "24em",
				margin: "0 auto",
			}}
		>
			<h2>Game Score Counter</h2>
			{playerList.map((playerItem) => (
				<Player {...playerItem} key={playerItem.playerId} />
			))}
			<div style={{ display: "flex", gap: 8 }}>
				<button onClick={() => addPlayer(gameDb)}>Add Player</button>
				<button onClick={() => maybeResetGame(gameDb)}>Reset Game</button>
			</div>
			<History />
		</div>
	)
}

function Player(props: PlayersListItem) {
	const { playerId, order } = props
	const { db } = useEnvironment()
	const gameDb = useMemo(() => db.subspace(["app"]), [db])
	const player = useTupleDb(gameDb, getPlayer, [playerId])

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
					onChange={(event) => editName(gameDb, playerId, event.target!.value)}
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
						onClick={() => maybeDeletePlayer(gameDb, playerId, order)}
					>
						Delete
					</button>
				</div>
			</div>
			<div style={{ display: "flex" }}>
				<div>
					<button
						style={{ flex: 1, padding: "6px 16px" }}
						onClick={() => incrementScore(gameDb, playerId, -1)}
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
						onClick={() => incrementScore(gameDb, playerId, +1)}
					>
						+1
					</button>
				</div>
			</div>
		</div>
	)
}

function History() {
	const { db } = useEnvironment()
	const gameDb = useMemo(() => db.subspace(["app"]), [db])
	const history = useTupleDb(gameDb, getHistory, [])

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column-reverse",
				marginTop: "2em",
			}}
		>
			{history.map((historyItem, i) => {
				return <HistoryItem {...historyItem} key={i} />
			})}
		</div>
	)
}

function HistoryItem(props: HistoryObj) {
	const { db } = useEnvironment()
	const gameDb = useMemo(() => db.subspace(["app"]), [db])
	const player = useTupleDb(gameDb, getPlayer, [props.playerId])

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				marginBottom: "0.4em",
			}}
		>
			<span style={{ fontSize: "0.7em" }}>
				{formatDatetime(props.datetime)}
			</span>
			<div style={{ display: "flex" }}>
				<div style={{ flex: 1 }}>
					<span>{player.name}</span>
				</div>
				<div style={{ textAlign: "right" }}>
					{props.delta > 0 && "+"}
					{props.delta}
				</div>
			</div>
		</div>
	)
}
