export function cloneTuple<T extends any[]>(tuple: T): T {
	return [...tuple] as T
}
