import { describe, expect, it } from 'vitest';
import {
  HELP_OVERVIEW_DOC_ID,
  prepareHelpMarkdown,
  resolveHelpDocIdFromHref,
  slugifyHeading,
} from './helpMarkdown';

describe('helpMarkdown', () => {
  it('uses readme as overview doc id', () => {
    expect(HELP_OVERVIEW_DOC_ID).toBe('readme');
  });

  it('strips HTML hero and images', () => {
    const raw =
      '<h1><img src="x.png" /><span>Servicedock</span></h1>\n\n![shot](docs/images/a.png)\n\n**Hello**';
    const out = prepareHelpMarkdown(raw);
    expect(out).toMatch(/^# Servicedock/);
    expect(out).toContain('**Hello**');
    expect(out).not.toContain('<h1');
    expect(out).not.toContain('![');
  });

  it('strips dev sections for token-rotation', () => {
    const raw = '## Step\n\nDo this.\n\n## Backend verification\n\nSecret curl stuff.\n\n## Troubleshooting\n\nHelp.';
    const out = prepareHelpMarkdown(raw, 'token-rotation');
    expect(out).toContain('## Step');
    expect(out).toContain('## Troubleshooting');
    expect(out).not.toContain('Backend verification');
    expect(out).not.toContain('Secret curl');
  });

  it('maps docs links to help doc ids', () => {
    expect(resolveHelpDocIdFromHref('docs/QUICKSTART.md')).toBe('quickstart');
    expect(resolveHelpDocIdFromHref('QUICKSTART.md')).toBe('quickstart');
    expect(resolveHelpDocIdFromHref('../README.md')).toBe('readme');
    expect(resolveHelpDocIdFromHref('https://example.com')).toBeNull();
    expect(resolveHelpDocIdFromHref('#section')).toBeNull();
    expect(resolveHelpDocIdFromHref('ENCRYPTION.md')).toBeNull();
  });

  it('slugifies headings for anchors', () => {
    expect(slugifyHeading('Why rotate tokens?')).toBe('why-rotate-tokens');
  });
});
