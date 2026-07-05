// `<input type="datetime-local">` values are timezone-naive local time.
// Filling one with `date.toISOString().slice(0, 16)` shows UTC instead, so each
// edit round-trip (fill → save parses the string as local) shifts the stored
// time by the timezone offset. Always fill via this helper.

/** Format a date as a local-time `datetime-local` value (YYYY-MM-DDTHH:mm). */
export function toDatetimeLocal(date) {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return ''
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
}
