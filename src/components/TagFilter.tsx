'use client';

import React from 'react';
import {
  Box, Chip, Button, Typography,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { plausibleClass } from '@/lib/plausible';

interface TagFilterProps {
  tags: string[];                    // all available tags, deduped + sorted
  active: ReadonlySet<string>;       // currently selected
  onToggle: (tag: string) => void;
  onClear: () => void;
  visibleCount: number;
  totalCount: number;
  // Singular noun for what's being filtered ('project', 'tool', ...). Used
  // in the count line; auto-pluralized with a trailing 's' for the
  // English-only copy here.
  noun?: string;
}

export function TagFilter({
  tags, active, onToggle, onClear, visibleCount, totalCount, noun = 'project',
}: TagFilterProps) {
  const plural = `${noun}s`;
  const hasActive = active.size > 0;

  return (
    <Box sx={{ pb: 4 }}>
      <Typography
        variant="overline"
        component="div"
        sx={{
          color: 'text.secondary',
          letterSpacing: '0.12em',
          pb: 1,
          display: 'block',
        }}
      >
        Filter by tag
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        {tags.map((tag) => {
          const isOn = active.has(tag);
          return (
            <Chip
              key={tag}
              label={tag}
              clickable
              size="small"
              color={isOn ? 'primary' : 'default'}
              variant={isOn ? 'filled' : 'outlined'}
              onClick={() => onToggle(tag)}
              className={plausibleClass('Tag Toggle', {
                tag,
                state: isOn ? 'off' : 'on',
              })}
              sx={{
                fontWeight: isOn ? 700 : 500,
                transition: 'transform 180ms ease-out, box-shadow 180ms ease-out',
                ':hover': { transform: 'translateY(-1px)' },
                ...(isOn && {
                  boxShadow: 1,
                }),
              }}
            />
          );
        })}
        {hasActive && (
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={onClear}
            sx={{ ml: 0.5, textTransform: 'none' }}
            className={plausibleClass('Tag Clear All')}
          >
            Clear
          </Button>
        )}
      </Box>
      <Typography
        variant="caption"
        sx={{
          color: 'text.disabled',
          display: 'block',
          pt: 1.5,
          minHeight: 20,
          transition: 'opacity 180ms ease-out',
        }}
        aria-live="polite"
      >
        {hasActive
          ? `Showing ${visibleCount} of ${totalCount} ${plural}`
          : `${totalCount} ${plural}`}
      </Typography>
    </Box>
  );
}
