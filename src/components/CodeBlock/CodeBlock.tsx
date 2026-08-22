import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tooltip,
  IconButton,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { styled, useTheme } from '@mui/material/styles';
import { Highlight, themes } from 'prism-react-renderer';

// prism-react-renderer bundles a base language set (bash, json, yaml, tsx,
// python, go, …), which covers every snippet on this site. If a page ever
// needs a language outside that set, attach Prism to the global scope and
// `require` the grammar from prismjs/components/* here — `import` would be
// hoisted above the assignment and the grammar would fail to register.
// Pattern: https://github.com/FormidableLabs/prism-react-renderer#adding-more-languages

interface CodeBlockProps {
  code: string;
  language?: string;
  caption?: string;
}

const Wrapper = styled(Paper)(({ theme }) => ({
  padding: 0,
  overflow: 'hidden',
  borderColor: theme.palette.divider,
  marginBottom: theme.spacing(2),
  position: 'relative',
}));

const CaptionBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(0.5, 1, 0.5, 2),
  minHeight: 36,
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(0, 0, 0, 0.02)',
}));

const Pre = styled('pre')(({ theme }) => ({
  margin: 0,
  padding: theme.spacing(2),
  fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  fontSize: '0.85rem',
  lineHeight: 1.55,
  overflowX: 'auto',
  whiteSpace: 'pre',
}));

const FloatingCopy = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(0.5),
  right: theme.spacing(0.5),
  zIndex: 1,
}));

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable (insecure context, denied permission)
    }
  }, [code]);

  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy'} placement="left">
      <IconButton
        size="small"
        onClick={handleCopy}
        aria-label="Copy code to clipboard"
        sx={{
          color: copied ? 'success.main' : 'text.secondary',
          '&:hover': { color: 'primary.main' },
        }}
      >
        {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}

function CodeBlockInner({
  code,
  language = 'text',
  caption,
}: CodeBlockProps) {
  const theme = useTheme();
  const prismTheme = theme.palette.mode === 'dark' ? themes.vsDark : themes.github;
  const trimmed = useMemo(() => code.replace(/^\n+|\n+$/g, ''), [code]);

  return (
    <Wrapper variant="outlined" elevation={0}>
      {caption ? (
        <CaptionBar>
          <Typography
            variant="caption"
            sx={{
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              color: 'text.secondary',
            }}
          >
            {caption}
          </Typography>
          <CopyButton code={trimmed} />
        </CaptionBar>
      ) : (
        <FloatingCopy>
          <CopyButton code={trimmed} />
        </FloatingCopy>
      )}
      <Highlight theme={prismTheme} code={trimmed} language={language}>
        {({
          style,
          tokens,
          getLineProps,
          getTokenProps,
        }) => (
          <Pre style={{ ...style, backgroundColor: 'transparent' }}>
            {tokens.map((line, i) => {
              const lineProps = getLineProps({ line });
              return (
                <div key={i} {...lineProps}>
                  {line.map((token, j) => {
                    const tokenProps = getTokenProps({ token });
                    return <span key={j} {...tokenProps} />;
                  })}
                </div>
              );
            })}
          </Pre>
        )}
      </Highlight>
    </Wrapper>
  );
}

export const CodeBlock = React.memo(CodeBlockInner);
