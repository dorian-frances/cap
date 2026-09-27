/** Concatène des classes en ignorant les valeurs falsy. */
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
