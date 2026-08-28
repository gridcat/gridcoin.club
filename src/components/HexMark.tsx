import { useId } from 'react';

// The family hexagon, inlined as React SVG. Same three paths every
// *.gridcoin.club logo has carried since stamp launched — outer hexagon,
// white ring, inner hexagon — with a per-service symbol on top.
//
// Inlined rather than loaded as ten <img> tags because the gradient has to be
// scoped per instance (useId) and the same mark is rendered at more than one
// size on a page. Mirrors the approach stamp already uses in
// src/components/Logo/Logo.tsx.
const HEX_OUTER = 'm24.5901639 0 21.2957067 12.5v25l-21.2957067 12.5-21.29570662-12.5v-25z';
const HEX_RING = 'm24.5901639 1.38888889 20.1126119 11.80555551v23.6111112l-20.1126119 11.8055555-20.1126118-11.8055555v-23.6111112z';
const HEX_INNER = 'm24.5901639 2.77777778 18.9295171 11.11111112v22.2222222l-18.9295171 11.1111111-18.92951699-11.1111111v-22.2222222z';

// Small pointy-top hexagon in the shell's own proportions.
function hex(cx: number, cy: number, w: number): string {
  const a = w / 2;
  const b = (w * 1.1547) / 2;
  return `M${cx} ${cy - b}L${cx + a} ${cy - b / 2}L${cx + a} ${cy + b / 2}`
    + `L${cx} ${cy + b}L${cx - a} ${cy + b / 2}L${cx - a} ${cy - b / 2}Z`;
}

// grcbazaar's own mark, lifted verbatim from its ic-logo-mainnet.svg (64x64
// viewBox, bounding box centred on 32,32) and mapped into the safe box.
// grcbazaar is exempt from family conventions, so its artwork is reused
// rather than redrawn.
const BAZAAR_D = 'M23.41 38.59 21 40 5.67 31 5.67 13 21 4 36.33 13 36.33 22.91 23.41 30.5Z '
  + 'M43 24 58.33 33 58.33 51 43 60 27.67 51 27.67 33Z';

export type MarkId =
  | 'hub' | 'stamp' | 'grcpay' | 'explorer' | 'grcfeed'
  | 'radio' | 'grcfate' | 'grcdraw' | 'faucet' | 'addnodes' | 'grcbazaar';

// Every symbol lives in a 24x24 box centred on (24.59, 25) — the box radio's
// equalizer already occupies. Knockouts take the gradient rather than a flat
// brand colour: a flat fill leaves a visible halo where it sits on the light
// end of the ramp.
const MARKS: Record<MarkId, (gradient: string) => React.ReactNode> = {
  hub: () => (
    <g fill="#fff">
      <path d={hex(18.59, 20, 11)} />
      <path d={hex(30.59, 20, 11)} />
      <path d={hex(24.59, 30, 11)} />
    </g>
  ),
  stamp: (g) => (
    <>
      <path d={hex(24.59, 25, 23)} fill="#fff" />
      <path
        d="M18.2 25.4l4.6 4.6 8.2-9.4"
        fill="none"
        stroke={g}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  grcpay: () => (
    <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 20h17" />
      <path d="M27 16l4 4-4 4" />
      <path d="M35 30H18" />
      <path d="M22 26l-4 4 4 4" />
    </g>
  ),
  explorer: () => (
    <g fill="none" stroke="#fff" strokeLinecap="round">
      <path d="M28.6 28.6L35 35" strokeWidth="5" />
      <path d={hex(22.5, 22, 17)} strokeWidth="4" />
    </g>
  ),
  grcfeed: () => (
    <>
      <circle cx="16" cy="33" r="3.2" fill="#fff" />
      <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round">
        <path d="M16 24a9 9 0 019 9" />
        <path d="M16 16a17 17 0 0117 17" />
      </g>
    </>
  ),
  radio: () => (
    <g stroke="#fff" strokeLinecap="round" strokeWidth="4">
      <path d="m13.6 21.5v7" opacity=".55" />
      <path d="m20.9 16.5v17" />
      <path d="m28.2 19.5v11" opacity=".85" />
      <path d="m35.5 22.5v5" opacity=".45" />
    </g>
  ),
  grcfate: () => (
    <>
      <circle cx="24.59" cy="25" r="11.5" fill="none" stroke="#fff" strokeWidth="3.2" />
      <path d="M24.59 18.5L31.4 30.2H17.78Z" fill="#fff" />
    </>
  ),
  grcdraw: (g) => (
    <>
      <rect x="13.6" y="14" width="22" height="22" rx="5.5" fill="#fff" />
      <g fill={g}>
        <circle cx="19.6" cy="30" r="2.8" />
        <circle cx="24.6" cy="25" r="2.8" />
        <circle cx="29.6" cy="20" r="2.8" />
      </g>
    </>
  ),
  faucet: () => (
    <path d="M24.59 15Q32.59 25 32.59 29a8 8 0 01-16 0Q16.59 25 24.59 15Z" fill="#fff" />
  ),
  addnodes: () => (
    <>
      <g stroke="#fff" strokeWidth="3.2">
        <path d="M24.59 16.5L16.2 32.5M24.59 16.5L33 32.5M16.2 32.5h16.8" />
      </g>
      <g fill="#fff">
        <circle cx="24.59" cy="16.5" r="4.4" />
        <circle cx="16.2" cy="32.5" r="3.8" />
        <circle cx="33" cy="32.5" r="3.8" />
      </g>
    </>
  ),
  grcbazaar: () => (
    <g
      transform="translate(24.59 25) scale(0.42857) translate(-32 -32)"
      fill="#fff"
      fillRule="nonzero"
    >
      <path d={BAZAAR_D} />
    </g>
  ),
};

interface HexMarkProps {
  mark: MarkId;
  // [dark, light] — the mainnet brand pair from the service's own theme.ts.
  gradient: readonly [string, string];
  // A number of pixels, or any CSS length.
  size?: number | string;
  // Drops the hexagon shell and draws the symbol alone — for a surface that
  // is already a solid brand-coloured hexagon, where a second hexagon inside
  // it just reads as a ring.
  bare?: boolean;
}

export function HexMark({
  mark, gradient, size = 52, bare,
}: HexMarkProps) {
  // useId keeps the gradient unique per instance; the same mark is rendered
  // more than once on a page and duplicate ids would cross-wire the fills.
  const gradientId = `mark-grad-${useId()}`;
  const url = `url(#${gradientId})`;
  return (
    <svg
      style={{ width: size, height: size, display: 'block' }}
      viewBox="0 0 50 50"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="20.607143%" x2="98.374093%" y1="14.216759%" y2="100%">
          <stop offset="0" stopColor={gradient[0]} />
          <stop offset="1" stopColor={gradient[1]} />
        </linearGradient>
      </defs>
      <g fill="none" fillRule="evenodd">
        {!bare && (
          <>
            <path d={HEX_OUTER} fill={url} />
            <path d={HEX_RING} fill="#fff" />
            <path d={HEX_INNER} fill={url} />
          </>
        )}
        {MARKS[mark](url)}
      </g>
    </svg>
  );
}
