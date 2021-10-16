// https://www.prisma.io/docs/concepts/components/prisma-client
import * as t from "data-type-ts"

const UserSchema = t.object({
	required: {
		id: t.string,
		createdAt: t.string, // todo {datetime:}
		email: t.string,
		name: t.string, // todo optional
	},
	optional: {},
})

// const newUser = await prisma.user.create({
//   data: {
//     name: 'Alice',
//     email: 'alice@prisma.io',
//   },
// })

// const users = await prisma.user.findMany()
