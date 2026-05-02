import React from 'react';
import {
  HardDrives,
  Desktop,
  Package,
  Question,
  FloppyDisk,
  StackSimple,
  Globe,
  Diamond,
  TreeStructure,
  Disc,
} from 'phosphor-react';

/** Icons für Zeilen in Top CPU / Memory / Disk (Ressourcentyp). */
export function TopListResourceIcon({ type, size = 22, className = 'shrink-0 text-gray-600 dark:text-gray-400' }) {
  const common = { size, weight: 'duotone', className };
  switch (type) {
    case 'node':
      return <HardDrives {...common} />;
    case 'qemu':
      return <Desktop {...common} />;
    case 'lxc':
      return <Package {...common} />;
    default:
      return <Question {...common} />;
  }
}

/** Icons für Storage-Backend-Typ (local, lvm, nfs, ceph, zfs, …). */
export function StorageBackendTypeIcon({ storageType, size = 20, className = 'shrink-0 text-gray-600 dark:text-gray-400' }) {
  const lower = (storageType || '').toLowerCase();
  const common = { size, weight: 'duotone', className };
  if (lower.includes('local')) return <FloppyDisk {...common} />;
  if (lower.includes('lvm')) return <StackSimple {...common} />;
  if (lower.includes('nfs')) return <Globe {...common} />;
  if (lower.includes('ceph')) return <Diamond {...common} />;
  if (lower.includes('zfs')) return <TreeStructure {...common} />;
  return <Disc {...common} />;
}
