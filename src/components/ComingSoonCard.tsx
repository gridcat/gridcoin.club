import React from 'react';
import {
  Card, CardContent, Typography, Box, Chip,
} from '@mui/material';
import { ServiceEntity } from '@/entities/ServiceEntity';
import { HexMark } from './HexMark';
import { serviceFill, serviceWash } from './ServiceCard';

interface ComingSoonCardProps {
  service: ServiceEntity;
}

export function ComingSoonCard({ service }: ComingSoonCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        opacity: 0.72,
        borderStyle: 'dashed',
        // Half the wash of a live card, so the row reads as two tiers at a
        // glance rather than only on the "Soon" chip.
        '::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: serviceWash(service, 0.2),
        },
      }}
    >
      <Box sx={{ height: 6, backgroundImage: serviceFill(service), opacity: 0.6 }} />
      <CardContent sx={{ flexGrow: 1, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Box sx={{ opacity: 0.75, lineHeight: 0 }}>
            <HexMark mark={service.mark} gradient={service.gradient} size={40} />
          </Box>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            {service.name}
          </Typography>
          <Chip label="Soon" size="small" color="secondary" sx={{ ml: 'auto' }} />
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {service.tagline}
        </Typography>
      </CardContent>
    </Card>
  );
}
