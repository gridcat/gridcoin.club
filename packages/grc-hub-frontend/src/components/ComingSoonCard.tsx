import React from 'react';
import {
  Card, CardContent, Typography, Box, Chip,
} from '@mui/material';
import { ServiceEntity } from '@/entities/ServiceEntity';

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
        opacity: 0.7,
        borderStyle: 'dashed',
      }}
    >
      <Box sx={{ height: 4, backgroundColor: service.color, opacity: 0.5 }} />
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            {service.name}
          </Typography>
          <Chip label="Soon" size="small" color="secondary" />
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {service.tagline}
        </Typography>
      </CardContent>
    </Card>
  );
}
