import * as t from "data-type-ts"
import { capitalize } from "lodash"
import React from "react"
import {
	Obj,
	OrderedTriplestore,
	proxyObj,
	ProxyObj,
	writeObj,
} from "triple-database/database/OrderedTriplestore"
import { useObj } from "../AppState"

export const CounterSchema = t.object({
	required: {
		id: t.string,
		count: t.number,
		delta: t.number,
	},
	optional: {},
})

export type Counter = typeof CounterSchema.value

type AnySchema = { [schema: string]: Obj }

type OrmProxy<T extends AnySchema> = {
	[K in keyof T]: (id: string) => ProxyObj<T[K]>
}

// https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#key-remapping-via-as
type OrmHook<T extends AnySchema> = {
	[K in keyof T as `use${Capitalize<string & K>}`]: (id: string) => T[K]
}

type OrmCreate<T extends AnySchema> = {
	[K in keyof T as `create${Capitalize<string & K>}`]: (obj: T[K]) => void
}

type OrmTx<T extends AnySchema> = OrmProxy<T> &
	OrmCreate<T> & { commit(): void }

type Orm<T extends AnySchema> = OrmHook<T> & {
	transact(): OrmTx<T>
}

type RuntimeSchema<T extends AnySchema> = {
	[K in keyof T]: t.RuntimeDataType<T[K]>
}

function createOrm<T extends AnySchema>(
	db: OrderedTriplestore,
	schema: RuntimeSchema<T>
): Orm<T> {
	const orm: any = {}

	for (const key in schema) {
		orm["use" + capitalize(key)] = (id: string) => useObj(db, id, schema[key])
	}

	orm.transact = () => {
		const ormTx: any = {}

		const tx = db.transact()
		for (const key in schema) {
			ormTx[key] = (id: string) => proxyObj(tx, id, schema[key])

			ormTx["create" + capitalize(key)] = (obj: Obj) =>
				writeObj(tx, obj, schema[key])
		}

		ormTx.commit = () => tx.commit()
		return ormTx
	}

	return orm
}

const db = new OrderedTriplestore()

// Prisma, TypeORM
const orm = createOrm(db, { counter: CounterSchema })

const tx = orm.transact()
tx.createCounter({
	id: "counter1",
	count: 0,
	delta: 1,
})
tx.createCounter({
	id: "counter2",
	count: 0,
	delta: 1,
})
tx.counter("counter2").delta += 1
tx.commit()

// Inter-dependent counters...
// Should be able to do this with rules.
db.index((tx, op) => {
	const [eaov, e, a, o, v] = op.tuple
	if (e !== "counter2") return
	if (a !== "count") return
	if (typeof v !== "number") return
	if (op.type !== "set") return
	proxyObj(tx, "counter1", CounterSchema).delta = v
})

// Should be able to efficiently query based on a single property.

export function CounterApp(props: { id: string }) {
	const { id } = props

	const counter = orm.useCounter(id)

	const increment = () => {
		const tx = orm.transact()
		const counter = tx.counter(id)
		counter.count += counter.delta
		tx.commit()
	}

	const decrement = () => {
		const tx = orm.transact()
		const counter = tx.counter(id)
		counter.count -= counter.delta
		tx.commit()
	}

	return (
		<div>
			<button onClick={decrement}>{"-"}</button>
			<span>{counter.count}</span>
			<button onClick={increment}>{"+"}</button>
		</div>
	)
}

/*
What are the requirements?
- read an object
- read a list
- set an object property as part of a transaction
- append or remove from a list as part of a transaction

- query objects
- query lists
- create indexes

- defaults and optional properties, also union types?

slightly later:
- read a nested object and subscribe to a nested object
- map between flat and unflat schemas
- dynamically fetch a bunch of objects in one hook (so we don't need to dance around react).

*/
