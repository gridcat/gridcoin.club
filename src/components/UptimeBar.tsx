import { Box, Tooltip } from '@mui/material';

// One cell per hour, oldest on the left. THREE states, not two: a probe
// backoff means some hours were never checked, and drawing "we did not look"
// as an outage would libel every node on a long backoff.
const UP = '1';
const DOWN = '0';

interface UptimeBarProps {
  /** The published series: 168 characters of '1' | '0' | '-'. */
  series: string;
  /** Show only the last N hours; the full week by default. */
  hours?: number;
  height?: number;
  /** Wall-clock of the newest cell, used to label the tooltips. */
  endsAt?: Date;
}

function cellColour(state: string): string {
  if (state === UP) return 'success.main';
  if (state === DOWN) return 'error.main';
  return 'action.disabledBackground';
}

function cellLabel(state: string, when: Date | null): string {
  const what = state === UP ? 'Online' : state === DOWN ? 'No answer' : 'Not checked';
  if (!when) return what;
  return `${what} — ${when.toISOString().slice(0, 13).replace('T', ' ')}:00 UTC`;
}

export function UptimeBar({
  series, hours, height = 22, endsAt,
}: UptimeBarProps) {
  const cells = hours ? series.slice(-hours) : series;
  const total = cells.length;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: '1px',
        alignItems: 'stretch',
        height,
        width: '100%',
        minWidth: 120,
      }}
      role="img"
      aria-label={`Reachability over the last ${total} hours`}
    >
      {cells.split('').map((state, idx) => {
        const when = endsAt
          ? new Date(endsAt.getTime() - (total - 1 - idx) * 3600_000)
          : null;
        return (
          <Tooltip
            // Position is the identity here: there is nothing else to key on,
            // and the array is a fixed-length window that never reorders.
            key={idx}
            title={cellLabel(state, when)}
            disableInteractive
          >
            <Box
              sx={{
                flex: '1 1 0',
                minWidth: 0,
                bgcolor: cellColour(state),
                borderRadius: '1px',
                opacity: state === UP || state === DOWN ? 1 : 0.5,
              }}
            />
          </Tooltip>
        );
      })}
    </Box>
  );
}
