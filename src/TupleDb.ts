import {
	TupleDatabase,
	TupleDatabaseClient,
	TupleDatabaseClientApi,
} from "tuple-database"
import { BrowserStorage } from "./BrowserStorage"

export type Schema = { key: ["version"]; value: number }

export type TupleDb = TupleDatabaseClientApi<Schema>

export function createTupleDb(): TupleDb {
	return new TupleDatabaseClient(new TupleDatabase(new BrowserStorage()))
}
