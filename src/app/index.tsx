import React from "react"
import ReactDOM from "react-dom"
import { Game } from "./components/Game"
import { createGameDb, initGameDb } from "./GameDb"

// Build the environment.
const gameDb = createGameDb()
initGameDb(gameDb)

// For debugging from the Console.
;(window as any)["gameDb"] = gameDb

// Render the app.
const root = document.createElement("div")
document.body.appendChild(root)

ReactDOM.render(<Game gameDb={gameDb} />, root)

/*

- keyboard
- commands
- focus

- command prompt
- modules, initialization.
- some other modoule that lets you list out different games
- fresh module with something else entirely.

*/
