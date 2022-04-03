import { Value } from "tuple-database"

type NamedTuple = { [key: string | number]: Value }[]

type NameTupleToObject<T extends NamedTuple> = CleanUnionToIntersection<
	T[number]
>

export function mergeKey<T extends NamedTuple>(key: T) {
	return key.reduce(
		(obj, item) => Object.assign(obj, item),
		{}
	) as NameTupleToObject<T>
}

// https://stackoverflow.com/questions/63542526/merge-discriminated-union-of-object-types-in-typescript
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
	k: infer I
) => void
	? I
	: never

type CleanUnionToIntersection<U> = UnionToIntersection<U> extends infer O
	? { [K in keyof O]: O[K] }
	: never
