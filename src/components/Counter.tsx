import * as t from "data-type-ts"
import React from "react"
import { OrderedTriplestore } from "triple-database/database/OrderedTriplestore"
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

const db = new OrderedTriplestore()
const orm = {
	useCounter(id: string) {
		return useObj(db, id, CounterSchema)
	},
	// counter(id: string) {
	// return proxyObj(db, id, CounterSchema)
	// },
	counter: {} as any,
}

// The real reason for the orm is the list methods. otherwise if could
// be as simple as useState.

// Reactivity with ReactiveMagic would be pretty dope right about now.

const id = orm.counter.create({ count: 0, delta: 0 })
const counter = orm.counter.get(id)

// Basically a mongoose syntax.
// https://www.prisma.io/docs/concepts/components/prisma-client/select-fields
// orm.counter.update({
// 	where: {
// 		id: 22,
// 	},
// 	select: {
// 		email: true,
// 		name: true,
// 	},
// })

// https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#scalar-list-methods

// await prisma.post.update({
//   where: {
//     id: 9
//   },
//   data: {
//       tags: {
//         set: ["computing", "books"]
//       }
//     }
//   })
// }

// equals?: Enumerable<string> | null
// has?: string | null
// hasEvery?: Enumerable<string>
// hasSome?: Enumerable<string>
// isEmpty?: boolean

// TypeORM
// const repository = connection.getRepository(User);

// const user = new User();
// user.firstName = "Timber";
// user.lastName = "Saw";
// user.age = 25;
// await repository.save(user);

// const allUsers = await repository.find();
// const firstUser = await repository.findOne(1); // find by id
// const timber = await repository.findOne({ firstName: "Timber", lastName: "Saw" });

// await repository.remove(timber);

function CounterApp(props: { id: string }) {
	const { id } = props

	const counter = orm.counter(id)
	const increment = () => (counter.count += counter.delta)
	const decrement = () => (counter.count -= counter.delta)

	return (
		<div>
			<button onClick={decrement}>{"-"}</button>
			<span>{counter.count}</span>
			<button onClick={increment}>{"+"}</button>
		</div>
	)
}

// const player1 = orm.player("player1")
// orm.game("game1")
