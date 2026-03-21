export function cn(...classes: Array<any>) {
  return classes.flat(Infinity).filter(Boolean).join(' ')
}
