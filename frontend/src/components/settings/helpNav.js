/** Reihenfolge der Hilfe-Themen in der Settings-Sidebar (API liefert nur Dateinamen). */
export const HELP_NAV_BLUEPRINT = [
  { key: 'getting_started', ids: ['readme', 'quickstart', 'initial-setup'] },
  { key: 'security', ids: ['token-rotation'] },
  { key: 'integrations', ids: ['proxmox', 'spotify', 'ldap'] },
  { key: 'infrastructure', ids: ['deploy', 'https'] },
];

export function buildHelpNavSections(docs) {
  const byId = new Map(docs.map((d) => [d.id, d]));
  const inBlueprint = new Set(HELP_NAV_BLUEPRINT.flatMap((s) => s.ids));
  const sections = HELP_NAV_BLUEPRINT.map(({ key, ids }) => ({
    key,
    items: ids.map((id) => byId.get(id)).filter(Boolean),
  })).filter((s) => s.items.length > 0);
  const orphan = docs.filter((d) => !inBlueprint.has(d.id));
  if (orphan.length) sections.push({ key: 'other', items: orphan });
  return sections;
}

export function helpDocTitleKey(id) {
  return `settings.help.docTitles.${id}`;
}
