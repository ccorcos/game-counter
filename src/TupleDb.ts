import {
	SchemaSubspace,
	TupleDatabase,
	TupleDatabaseClient,
	TupleDatabaseClientApi,
} from "tuple-database"
import { BrowserStorage } from "./BrowserStorage"
import { GameSchema } from "./GameState"

type AppSchema = SchemaSubspace<["app"], GameSchema>
export type Schema = { key: ["version"]; value: number } | AppSchema

export type TupleDb = TupleDatabaseClientApi<Schema>

export function createTupleDb(): TupleDb {
	return new TupleDatabaseClient(new TupleDatabase(new BrowserStorage()))
}
