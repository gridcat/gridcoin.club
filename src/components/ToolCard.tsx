import React from 'react';
import {
  Card, CardContent, Typography, Box, Chip, Button, Avatar,
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import { ToolEntity } from '@/entities/ToolEntity';
import { linkRel } from '@/lib/externalRel';
import { plausibleClass } from '@/lib/plausible';

interface ToolCardProps {
  tool: ToolEntity;
}

const LOGO_BOX = 44;

export function ToolCard({ tool }: ToolCardProps) {
  const isSoon = tool.status === 'soon';
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        opacity: isSoon ? 0.7 : 1,
        borderStyle: isSoon ? 'dashed' : 'solid',
        transition: '0.2s ease-out',
        ':hover': isSoon ? undefined : { boxShadow: 3, transform: 'translateY(-2px)' },
      }}
    >
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
          <Avatar
            variant="rounded"
            sx={{
              width: LOGO_BOX,
              height: LOGO_BOX,
              flexShrink: 0,
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              fontWeight: 700,
              fontSize: '1.1rem',
            }}
          >
            {tool.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flexGrow: 1 }}>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
              {tool.name}
            </Typography>
            {isSoon && <Chip label="Soon" size="small" color="secondary" />}
            {tool.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', flexGrow: 1 }}>
          {tool.blurb}
        </Typography>
        {!isSoon && (
          <Box sx={{ mt: 2 }}>
            <Button
              component="a"
              href={tool.repo}
              target="_blank"
              rel={linkRel(tool.repo, '_blank')}
              variant="text"
              color="primary"
              size="small"
              startIcon={<GitHubIcon />}
              sx={{ pl: 0, fontWeight: 600 }}
              className={plausibleClass('Outbound Tool', {
                name: tool.name,
                url: tool.repo,
              })}
            >
              View on GitHub
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
