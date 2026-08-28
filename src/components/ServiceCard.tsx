import React from 'react';
import {
  Card, CardContent, Typography, Box, Button,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ServiceEntity } from '@/entities/ServiceEntity';
import type { LiveStats } from '@/lib/sources';
import { isExternal, linkRel } from '@/lib/externalRel';
import { plausibleClass } from '@/lib/plausible';
import { ServiceLiveStat } from './LiveStat';
import { NextMuiLink } from './NextMuiLink';
import { HexMark } from './HexMark';

// The brand pair from the service's own theme.ts, as a bar across the card.
export const serviceFill = (service: ServiceEntity): string => (
  `linear-gradient(90deg, ${service.gradient[0]}, ${service.gradient[1]})`
);

// A wash of the service's colour pouring in from the top-right, as if the
// card were lit from that side. The middle stop is what stops it falling off
// to nothing halfway down — without it the colour reads as a corner smudge
// rather than something the whole card is sitting in.
export const serviceWash = (service: ServiceEntity, strength = 0.42): string => (
  'radial-gradient(125% 105% at 100% 0%, '
  + `${alpha(service.color, strength)} 0%, `
  + `${alpha(service.color, strength * 0.42)} 40%, `
  + `${alpha(service.color, strength * 0.12)} 68%, `
  + 'transparent 88%)'
);

interface ServiceCardProps {
  service: ServiceEntity;
  liveStats: LiveStats;
}

export function ServiceCard({ service, liveStats }: ServiceCardProps) {
  // Most services live on their own subdomain and open in a new tab. Some
  // are pages on this site, and those should route in place: a new tab for
  // a same-host link costs a full page load and strands the reader with a
  // back button that goes nowhere.
  const external = isExternal(service.url);
  const linkProps = external
    ? { component: 'a' as const, target: '_blank', rel: linkRel(service.url, '_blank') }
    : { component: NextMuiLink };

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        transition: '0.2s ease-out',
        ':hover': { boxShadow: 4, transform: 'translateY(-2px)' },
        ':hover::after': { opacity: 1 },
        '::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: serviceWash(service),
          opacity: 0.88,
          transition: 'opacity 0.2s ease-out',
        },
      }}
    >
      <Box sx={{ height: 6, backgroundImage: serviceFill(service) }} />
      <CardContent
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1.5 }}>
          <HexMark mark={service.mark} gradient={service.gradient} size={40} />
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            {service.name}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', pb: 2 }}>
          {service.tagline}
        </Typography>
        <Box sx={{ pb: 2, minHeight: 40 }}>
          <ServiceLiveStat service={service} stats={liveStats} />
        </Box>
        <Box sx={{ mt: 'auto' }}>
          <Button
            {...linkProps}
            href={service.url}
            variant="text"
            color="primary"
            sx={{ pl: 0, fontWeight: 600 }}
            className={plausibleClass(
              external ? 'Outbound Service' : 'Internal Service',
              { service: service.slug, from: 'home-card' },
            )}
          >
            Open
            {' '}
            {service.name}
            {' →'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
