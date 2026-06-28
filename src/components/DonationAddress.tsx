import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { plausibleClass } from '@/lib/plausible';

interface DonationAddressProps {
  address: string;
}

// The address is always visible and selectable, so this works without JS.
// The copy button is a progressive enhancement layered on top.
export function DonationAddress({ address }: DonationAddressProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(address).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

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
        sx={{
          flexGrow: 1,
          fontFamily: 'monospace',
          fontSize: { xs: '0.8rem', sm: '0.95rem' },
          wordBreak: 'break-all',
          userSelect: 'all',
        }}
      >
        {address}
      </Box>
      <Tooltip title={copied ? 'Copied' : 'Copy address'}>
        <IconButton
          onClick={handleCopy}
          size="small"
          color="primary"
          aria-label="Copy donation address"
          className={plausibleClass('Donate Copy', { from: 'about' })}
        >
          {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}
