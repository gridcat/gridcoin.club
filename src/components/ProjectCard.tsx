import React from 'react';
import {
  Card, CardContent, Typography, Box, Chip, Button, Avatar,
} from '@mui/material';
import Image from 'next/image';
import { ProjectEntity } from '@/entities/ProjectEntity';
import { linkRel } from '@/lib/externalRel';
import { plausibleClass } from '@/lib/plausible';

interface ProjectCardProps {
  project: ProjectEntity;
}

const LOGO_BOX = 44;

function ProjectLogo({ project }: { project: ProjectEntity }) {
  if (project.logo) {
    return (
      <Box
        sx={{
          width: LOGO_BOX,
          height: LOGO_BOX,
          flexShrink: 0,
          borderRadius: 1.5,
          overflow: 'hidden',
          backgroundColor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Image
          src={project.logo}
          alt={`${project.name} logo`}
          width={LOGO_BOX}
          height={LOGO_BOX}
          // contain so wide wordmarks (e.g. BOINC) aren't cropped to a sliver
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          unoptimized
        />
      </Box>
    );
  }
  // Initial-letter fallback for entries without a vendored logo.
  return (
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
      {project.name.charAt(0).toUpperCase()}
    </Avatar>
  );
}

export function ProjectCard({ project }: ProjectCardProps) {
  const isSoon = project.status === 'soon';
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
          <ProjectLogo project={project} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flexGrow: 1 }}>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
              {project.name}
            </Typography>
            {isSoon && <Chip label="Soon" size="small" color="secondary" />}
            {project.tags?.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', flexGrow: 1 }}>
          {project.blurb}
        </Typography>
        {!isSoon && (
          <Box sx={{ mt: 2 }}>
            <Button
              component="a"
              href={project.url}
              target="_blank"
              rel={linkRel(project.url, '_blank')}
              variant="text"
              color="primary"
              size="small"
              sx={{ pl: 0, fontWeight: 600 }}
              className={plausibleClass('Outbound Project', {
                name: project.name,
                url: project.url,
                category: project.category,
              })}
            >
              Visit →
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
