import * as t from "data-type-ts"
import React from "react"
import { OrderedTriplestore } from "triple-database/database/OrderedTriplestore"
import { createOrm } from "triple-database/database/ORM"

export const CounterSchema = t.object({
	required: {
		id: t.string,
		count: t.number,
		delta: t.number,
	},
	optional: {},
})

export type Counter = typeof CounterSchema.value

const db = new OrderedTriplestore()

// Prisma, TypeORM
const orm = createOrm(db, { counter: CounterSchema })

// orm.counter.get(1)
// orm.counter.proxy(1)
// orm.counter.user(1)
// orm.counter.find({count: 10}) - requires triplestore query stuff.

const tx = orm.transact()
tx.counter.create({
	id: "counter1",
	count: 0,
	delta: 1,
})
tx.counter.create({
	id: "counter2",
	count: 0,
	delta: 1,
})
tx.counter.proxy("counter2").delta += 1
tx.commit()

export function CounterApp(props: { id: string }) {
	const { id } = props

	const counter = orm.counter.use(id)

	const increment = () => {
		const tx = orm.transact()
		const counter = tx.counter.proxy(id)
		counter.count += counter.delta
		tx.commit()
	}

	const decrement = () => {
		const tx = orm.transact()
		const counter = tx.counter.proxy(id)
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
