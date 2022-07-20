import { formatRelative } from "date-fns"

export function nowDateTime() {
	return new Date().toISOString()
}

export function getTimeMs(isoString: string) {
	return new Date(isoString).getTime()
}

export function formatDatetime(isoString: string) {
	return formatRelative(new Date(isoString), new Date())
}
