import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

interface CopyableValueProps {
  value: string;
  /** Accessible name for the copy button, e.g. "Copy donation address". */
  copyLabel: string;
  /** Optional Plausible class for the copy button. */
  trackingClass?: string;
}

type CopyState = 'idle' | 'copied' | 'failed';

// A value the reader can always read and select, with copying layered on top
// as an enhancement. That ordering matters: the value itself must never
// depend on JavaScript, a clipboard permission, or an OS handler being
// registered, because the reader has no way to recover if it silently fails.
export function CopyableValue({ value, copyLabel, trackingClass }: CopyableValueProps) {
  const [state, setState] = React.useState<CopyState>('idle');
  const valueRef = React.useRef<HTMLElement | null>(null);

  const handleCopy = async () => {
    try {
      // navigator.clipboard is absent outside a secure context, and the write
      // can still be refused by permissions policy or a browser wanting a
      // fresher user gesture. Both end up here.
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      // Never leave the button looking inert. Select the text so the reader
      // can finish the job with a keystroke, and say so in the tooltip.
      const node = valueRef.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setState('failed');
    }
    window.setTimeout(() => setState('idle'), 2500);
  };

  const tooltip = state === 'copied'
    ? 'Copied'
    : state === 'failed'
      ? 'Selected. Press Ctrl+C to copy.'
      : copyLabel;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}
    >
      <Box
        component="code"
        ref={valueRef}
        sx={{
          flexGrow: 1,
          fontFamily: 'monospace',
          fontSize: { xs: '0.8rem', sm: '0.95rem' },
          wordBreak: 'break-all',
          userSelect: 'all',
        }}
      >
        {value}
      </Box>
      <Tooltip title={tooltip} open={state === 'idle' ? undefined : true}>
        <IconButton
          onClick={handleCopy}
          size="small"
          color={state === 'failed' ? 'warning' : 'primary'}
          aria-label={copyLabel}
          className={trackingClass}
        >
          {state === 'copied' ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}
