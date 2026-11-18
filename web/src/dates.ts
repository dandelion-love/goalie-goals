// One short date format for the whole app (story 101 AC1).
//
// `toLocaleDateString` builds an Intl formatter on every call, and the first one loads the
// locale's data: at the rubric's 4x CPU the History's dates made a panel's render a 250 ms long
// task, and even one shared Intl formatter cost about 100 ms to make. The app's copy is English,
// so the date is written the same way, from a fixed list of month names, at no cost.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Nov 18": the month's short name and the day of the month, in the device's time zone. */
export function shortDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
