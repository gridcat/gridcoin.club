import { Box, Chip, Tooltip } from '@mui/material';
import type { NodeStatus } from '@/lib/sources/addnodes';

interface Meaning {
  label: string;
  help: string;
  chipColor: 'success' | 'warning' | 'default' | 'info';
  /** Theme palette path for the dot, which cannot use chip colour names. */
  dotColor: string;
}

// One definition of what each status means, shared by both presentations.
// Status is decided by our own connection attempts and nothing else, so the
// wording says what we observed rather than what anyone reported.
export const STATUS_MEANING: Record<NodeStatus, Meaning> = {
  online: {
    label: 'Online',
    help: 'Answered a connection on its last check.',
    chipColor: 'success',
    dotColor: 'success.main',
  },
  unreachable: {
    label: 'Unreachable',
    help: 'Did not answer its last check, but answered within the past week. It may be offline or already at its connection limit.',
    chipColor: 'warning',
    dotColor: 'warning.main',
  },
  dead: {
    label: 'Dead',
    help: 'Has not answered a check in over a week. Still checked daily, so it will reappear if it comes back.',
    chipColor: 'default',
    dotColor: 'error.main',
  },
  new: {
    label: 'New',
    help: 'Discovered but not yet checked.',
    chipColor: 'info',
    dotColor: 'info.main',
  },
};

export function NodeStatusChip({ status }: { status: NodeStatus }) {
  const meaning = STATUS_MEANING[status] ?? STATUS_MEANING.new;
  return (
    <Tooltip title={meaning.help}>
      <Chip
        size="small"
        label={meaning.label}
        color={meaning.chipColor}
        variant={status === 'online' ? 'filled' : 'outlined'}
        sx={{ fontWeight: 600, minWidth: 96 }}
      />
    </Tooltip>
  );
}

/**
 * Compact form for dense tables.
 *
 * The dot carries a text label for screen readers and a tooltip for everyone
 * else, because colour on its own is not something every reader can use.
 */
export function NodeStatusDot({ status }: { status: NodeStatus }) {
  const meaning = STATUS_MEANING[status] ?? STATUS_MEANING.new;
  return (
    <Tooltip title={`${meaning.label}. ${meaning.help}`}>
      <Box
        component="span"
        role="img"
        aria-label={meaning.label}
        sx={{
          display: 'inline-block',
          flexShrink: 0,
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: meaning.dotColor,
        }}
      />
    </Tooltip>
  );
}
