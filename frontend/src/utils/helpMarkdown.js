/** Default overview document in Settings → Help */
export const HELP_OVERVIEW_DOC_ID = 'readme';

/** Map markdown filenames (and paths) to API doc ids — keep in sync with backend HELP_DOCS */
const FILE_TO_DOC_ID = {
  'README.md': 'readme',
  'QUICKSTART.md': 'quickstart',
  'TOKEN_ROTATION_GUIDE.md': 'token-rotation',
  'PROXMOX_SETUP.md': 'proxmox',
  'SPOTIFY_ADDON.md': 'spotify',
  'LDAP_INTEGRATION.md': 'ldap',
  'HTTPS_SETUP.md': 'https',
};

/**
 * Dev/operator sections stripped in Settings Help (full text stays in repo/GitHub).
 * Matched by heading title substring (emoji prefixes optional).
 */
const IN_APP_STRIP_HEADINGS = {
  'token-rotation': [
    'Backend verification',
    'ADMIN_PASSWORD change',
    'Further reading',
    'Support',
    'Manual check',
    'Option B: Via API',
    'Manual test (optional)',
  ],
  ldap: [
    'Login flow',
    'Database',
    'API endpoints',
    'Related files',
    'Implementation',
  ],
};

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripDevSections(markdown, docId) {
  const titles = IN_APP_STRIP_HEADINGS[docId];
  if (!titles?.length) return markdown;

  let md = markdown;
  for (const title of titles) {
    const re = new RegExp(
      `\\n#{2,4}\\s*[^\\n]*${escapeRegex(title)}[^\\n]*\\n[\\s\\S]*?(?=\\n#{2,4}\\s|$)`,
      'i'
    );
    md = md.replace(re, '\n');
  }
  return md.replace(/\n{3,}/g, '\n\n');
}

/**
 * Light normalization for in-app help markdown (no images — docs/images is GitHub-only).
 */
export function prepareHelpMarkdown(markdown, docId) {
  if (!markdown) return '';

  let md = markdown;

  md = md.replace(/<h1[\s\S]*?<\/h1>\s*/i, '# Servicedock\n\n');
  md = md.replace(/<img\b[^>]*\/?>/gi, '');
  md = md.replace(/!\[[^\]]*]\([^)]+\)/g, '');

  if (docId) {
    md = stripDevSections(md, docId);
  }

  return md.trimStart();
}

function flattenReactChildren(children) {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenReactChildren).join('');
  if (children.props?.children) return flattenReactChildren(children.props.children);
  return '';
}

/** Slug for in-page anchors (matches common GFM TOC links). */
export function slugifyHeading(children) {
  const text = flattenReactChildren(children)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[^\w\s-]/g, '')
    .trim();
  return text.toLowerCase().replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
}

export function normalizeHelpHrefPath(href) {
  if (!href) return '';
  let path = href.split('#')[0].trim();
  path = path.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
  if (path.startsWith('docs/')) path = path.slice(5);
  if (path.endsWith('/')) path = path.slice(0, -1);
  return path;
}

export function isExternalHelpHref(href) {
  return Boolean(href && /^https?:\/\//i.test(href.trim()));
}

/**
 * Map in-repo doc links to Settings help doc ids for in-app navigation.
 * Returns null for anchors, external URLs, and non-whitelisted markdown files.
 */
export function resolveHelpDocIdFromHref(href) {
  if (!href || href.startsWith('#') || isExternalHelpHref(href)) return null;

  const path = normalizeHelpHrefPath(href);
  if (!path || path === '.' || path === 'docs') return null;

  const filename = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path;
  if (!filename.toLowerCase().endsWith('.md')) return null;

  if (FILE_TO_DOC_ID[filename]) return FILE_TO_DOC_ID[filename];

  const lower = filename.toLowerCase();
  for (const [file, id] of Object.entries(FILE_TO_DOC_ID)) {
    if (file.toLowerCase() === lower) return id;
  }

  return null;
}
