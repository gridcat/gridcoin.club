// The single mailbox for the whole gridcoin.club family: general, abuse,
// legal and delisting all land in the same inbox, because the same person
// reads them all.
//
// One constant rather than a literal per page. The address appears on three
// node pages and in the header of every published node list, and a delisting
// promise pointing at a stale address is worse than no promise at all.
export const CONTACT_EMAIL = 'gridcat@proton.me';

/** `mailto:` target, optionally with a prefilled subject. */
export function mailto(subject?: string): string {
  return subject
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
    : `mailto:${CONTACT_EMAIL}`;
}
