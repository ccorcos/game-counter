import { InMemoryTupleStorage, TupleStorageApi, Writes } from "tuple-database"

const key = "tupleStorage"
function load() {
	const result = localStorage.getItem(key)
	if (!result) return
	try {
		return JSON.parse(result)
	} catch (error) {}
}

function save(value: any) {
	localStorage.setItem(key, JSON.stringify(value))
}

export class BrowserStorage
	extends InMemoryTupleStorage
	implements TupleStorageApi
{
	constructor() {
		super(load())
	}

	commit(writes: Writes): void {
		super.commit(writes)
		save(this.data)
	}
}
