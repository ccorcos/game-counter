import { useEffect, useMemo, useRef, useState } from "react"
import {
	KeyValuePair,
	subscribeQuery,
	TupleDatabaseClientApi,
} from "tuple-database"

function useRerender() {
	const [state, setState] = useState(0)
	return () => setState((x) => x + 1)
}

export function useTupleDb<S extends KeyValuePair, T, A extends any[]>(
	db: TupleDatabaseClientApi<S>,
	fn: (db: TupleDatabaseClientApi<S>, ...A) => T,
	args: A
) {
	const rerender = useRerender()
	const resultRef = useRef<T>({} as any)

	const destroy = useMemo(() => {
		const { result, destroy } = subscribeQuery(
			db,
			(db) => fn(db, ...args),
			(result) => {
				resultRef.current = result
				rerender()
			}
		)
		resultRef.current = result
		return destroy
	}, [db, fn, ...args])

	useEffect(() => {
		return destroy
	}, [destroy])

	return resultRef.current
}
