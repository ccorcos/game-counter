import React from "react"
import ReactDOM from "react-dom"
import { App } from "./components/App"
import { Environment, EnvironmentProvider } from "./Environment"
import "./index.css"
import { createTupleDb } from "./TupleDb"

// Build the environment.
const db = createTupleDb()
// TODO: if no game, create a new game.
newGame()

const environment: Environment = { db }

// For debugging from the Console.
;(window as any)["environment"] = environment
Object.assign(window as any, environment)

// Render the app.
const root = document.createElement("div")
document.body.appendChild(root)

ReactDOM.render(
	<EnvironmentProvider value={environment}>
		<App />
	</EnvironmentProvider>,
	root
)
