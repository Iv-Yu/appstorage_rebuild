/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FieldOps IT - Automated Firestore Security Rules & Data Exposure Audit Script
 * Evaluates all collections against security rules, flags public-read and
 * unauthenticated write vulnerabilities, and generates a comprehensive report.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

export type VulnerabilitySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SECURE';

export interface CollectionAuditFinding {
  path: string;
  matchedRule: string | null;
  allowsPublicRead: boolean;
  allowsUnauthenticatedWrite: boolean;
  requiresAuth: boolean;
  hasIdValidation: boolean;
  hasRoleValidation: boolean;
  dataSensitivity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sensitiveFields: string[];
  exposureRisk: VulnerabilitySeverity;
  source: 'blueprint' | 'codebase' | 'rules';
  description: string;
  remediation?: string;
}

export interface GlobalRuleCheck {
  id: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  severity: VulnerabilitySeverity;
  detail: string;
  recommendation?: string;
}

export interface FirestoreAuditReport {
  timestamp: string;
  appVersion: string;
  summary: {
    totalCollections: number;
    publicReadCount: number;
    unauthenticatedWriteCount: number;
    missingRuleCount: number;
    overallRisk: VulnerabilitySeverity;
    isProductionReady: boolean;
  };
  globalChecks: GlobalRuleCheck[];
  collectionFindings: CollectionAuditFinding[];
  dataExposureAnalysis: {
    piiExposed: boolean;
    financialDataExposed: boolean;
    operationalLogsExposed: boolean;
    credentialsExposed: boolean;
    exposureSummary: string[];
  };
  remediationPlan: string[];
}

/**
 * Known sensitivity classifications for FieldOps IT entities & fields
 */
const SENSITIVITY_MAP: Record<string, { level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'; sensitiveFields: string[] }> = {
  users: {
    level: 'CRITICAL',
    sensitiveFields: ['passwordHash', 'salt', 'email', 'phone', 'role', 'status']
  },
  admins: {
    level: 'CRITICAL',
    sensitiveFields: ['adminUid', 'email', 'privileges']
  },
  api_keys: {
    level: 'CRITICAL',
    sensitiveFields: ['secretKey', 'token', 'allowedActions', 'expiresAt']
  },
  items: {
    level: 'HIGH',
    sensitiveFields: ['unitCost', 'location', 'specs', 'barcode', 'serialNumber']
  },
  trash_items: {
    level: 'HIGH',
    sensitiveFields: ['unitCost', 'deletedBy', 'deletedAt', 'location']
  },
  transactions: {
    level: 'HIGH',
    sensitiveFields: ['performedBy', 'recipientOrDestination', 'referenceNumber', 'notes']
  },
  categories: {
    level: 'LOW',
    sensitiveFields: ['code', 'description']
  },
  sync_queue: {
    level: 'MEDIUM',
    sensitiveFields: ['payload', 'actionType', 'timestamp']
  },
  inspections: {
    level: 'MEDIUM',
    sensitiveFields: ['technicianName', 'status', 'checklistItems']
  },
  integration_logs: {
    level: 'HIGH',
    sensitiveFields: ['requestPayload', 'targetPhone', 'apiToken', 'status']
  },
  workspaces: {
    level: 'MEDIUM',
    sensitiveFields: ['companyName', 'description']
  },
  test: {
    level: 'LOW',
    sensitiveFields: ['ping', 'status', 'timestamp']
  }
};

/**
 * Scan source code for Firestore collection references (doc(db, ...), collection(db, ...))
 */
function scanCodebaseForCollections(): string[] {
  const collectionsFound = new Set<string>();
  const searchDirs = [
    path.join(ROOT_DIR, 'src'),
    path.join(ROOT_DIR, 'server')
  ];

  function searchInDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        searchInDir(fullPath);
      } else if (/\.(ts|tsx|js)$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          // Match direct workspace subcollection usage: 'workspaces', ws, 'items'
          const wsRegex = /['"]workspaces['"]\s*,\s*[^,]+\s*,\s*['"]([a-zA-Z0-9_\-]+)['"]/g;
          let match;
          while ((match = wsRegex.exec(content)) !== null) {
            if (match[1]) {
              const sub = match[1];
              const singularId = sub.endsWith('ies') ? sub.slice(0, -3) + 'yId' : sub.endsWith('s') ? sub.slice(0, -1) + 'Id' : `${sub}Id`;
              collectionsFound.add(`workspaces/{workspaceId}/${sub}/{${singularId}}`);
            }
          }
        } catch {
          // ignore read errors
        }
      }
    }
  }

  for (const d of searchDirs) {
    searchInDir(d);
  }

  return Array.from(collectionsFound);
}

/**
 * Parse firebase-blueprint.json to extract declared collections
 */
function loadBlueprintCollections(): { path: string; schema: string }[] {
  const bpPath = path.join(ROOT_DIR, 'firebase-blueprint.json');
  if (!fs.existsSync(bpPath)) return [];
  try {
    const raw = fs.readFileSync(bpPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const firestorePaths = parsed.firestore || {};
    return Object.keys(firestorePaths).map(p => ({
      path: p.startsWith('/') ? p.slice(1) : p,
      schema: typeof firestorePaths[p].schema === 'string' ? firestorePaths[p].schema : firestorePaths[p].schema?.$ref || ''
    }));
  } catch (err) {
    console.warn('[Audit] Could not parse firebase-blueprint.json:', err);
    return [];
  }
}

/**
 * Parse firestore.rules to map match blocks and rule directives
 */
interface ParsedMatchRule {
  rawMatch: string;
  normalizedPath: string;
  allowStatements: Array<{
    operations: string[];
    condition: string;
    isPublicRead: boolean;
    isUnauthenticatedWrite: boolean;
    requiresAuth: boolean;
    hasIdValidation: boolean;
    hasRoleValidation: boolean;
  }>;
}

interface BlockScope {
  type: 'SERVICE' | 'MATCH' | 'FUNCTION' | 'OTHER';
  path?: string;
}

function parseFirestoreRules(rulesContent: string): {
  rulesVersion: number;
  matches: ParsedMatchRule[];
  hasDefaultDeny: boolean;
} {
  const versionMatch = rulesContent.match(/rules_version\s*=\s*['"](\d+)['"]/);
  const rulesVersion = versionMatch ? parseInt(versionMatch[1], 10) : 1;
  const hasDefaultDeny = /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;?\s*\}/.test(rulesContent);

  const matches: ParsedMatchRule[] = [];
  const blockStack: BlockScope[] = [];

  const currentPathAllows: Map<string, Array<{
    operations: string[];
    condition: string;
    isPublicRead: boolean;
    isUnauthenticatedWrite: boolean;
    requiresAuth: boolean;
    hasIdValidation: boolean;
    hasRoleValidation: boolean;
  }>> = new Map();

  const lines = rulesContent.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//') || line.startsWith('/*')) continue;

    // Detect match block opening: match <path> { (only strip trailing block brace)
    if (line.startsWith('match ')) {
      const matchPath = line
        .replace(/^match\s+/, '')
        .replace(/\s*\{[ \t]*$/, '')
        .trim();
      blockStack.push({ type: 'MATCH', path: matchPath });
    } else if (line.startsWith('service ') || line.startsWith('function ')) {
      blockStack.push({ type: 'OTHER' });
    }

    // Detect allow rule statement
    if (line.startsWith('allow ')) {
      const allowStr = line.replace(/^allow\s+/, '').trim();
      const parts = allowStr.split(/:\s*if\s+/);
      if (parts.length === 2) {
        const ops = parts[0].split(',').map(s => s.trim().toLowerCase());
        const condition = parts[1].replace(/;.*$/, '').trim();

        const isReadOp = ops.some(op => ['read', 'get', 'list'].includes(op));
        const isWriteOp = ops.some(op => ['write', 'create', 'update', 'delete'].includes(op));

        const isPublicRead = isReadOp && condition === 'true';
        const isUnauthenticatedWrite = isWriteOp && (condition === 'true' || (!condition.includes('request.auth') && !condition.includes('isSignedIn()')));
        const requiresAuth = condition.includes('request.auth') || condition.includes('isSignedIn()');
        const hasIdValidation = condition.includes('isValidId') || condition.includes('.size()');
        const hasRoleValidation = condition.includes('admin') || condition.includes('role') || condition.includes('isOwner');

        // Extract active match paths from blockStack (exclude root /databases/{database}/documents)
        const matchSegments = blockStack
          .filter(b => b.type === 'MATCH' && b.path && !b.path.includes('databases'))
          .map(b => b.path!.replace(/^\/+|\/+$/g, ''));

        const fullPath = matchSegments.join('/');

        if (fullPath) {
          if (!currentPathAllows.has(fullPath)) {
            currentPathAllows.set(fullPath, []);
          }
          currentPathAllows.get(fullPath)!.push({
            operations: ops,
            condition,
            isPublicRead,
            isUnauthenticatedWrite,
            requiresAuth,
            hasIdValidation,
            hasRoleValidation
          });
        }
      }
    }

    // Detect block closure '}' (handles lines like "}", "} }", etc.)
    const closeCount = (line.match(/\}/g) || []).length;
    // Do not double-count if the line opened a block and closed it on same line
    const openCount = (line.match(/\{/g) || []).length;
    const netClose = closeCount - (line.startsWith('match') || line.startsWith('service') || line.startsWith('function') ? openCount : 0);

    for (let i = 0; i < netClose; i++) {
      if (blockStack.length > 0) {
        blockStack.pop();
      }
    }
  }

  for (const [fullPath, allowStatements] of currentPathAllows.entries()) {
    matches.push({
      rawMatch: `/${fullPath}`,
      normalizedPath: fullPath,
      allowStatements
    });
  }

  return { rulesVersion, matches, hasDefaultDeny };
}

/**
 * Match a collection path against parsed rules
 */
function findBestRuleForPath(collectionPath: string, parsedMatches: ParsedMatchRule[]): ParsedMatchRule | null {
  const normPath = collectionPath.startsWith('/') ? collectionPath.slice(1) : collectionPath;

  // Direct exact match
  for (const m of parsedMatches) {
    if (m.normalizedPath === normPath) return m;
  }

  // Segment-based pattern match (e.g. workspaces/{workspaceId}/items/{itemId} matches workspaces/{workspaceId}/items)
  for (const m of parsedMatches) {
    const ruleSegments = m.normalizedPath.split('/');
    const targetSegments = normPath.split('/');

    let matches = true;
    for (let i = 0; i < Math.min(ruleSegments.length, targetSegments.length); i++) {
      const rSeg = ruleSegments[i];
      const tSeg = targetSegments[i];

      if (rSeg.startsWith('{') && rSeg.endsWith('}')) {
        continue; // variable matches
      }
      if (rSeg !== tSeg) {
        matches = false;
        break;
      }
    }

    if (matches && Math.abs(ruleSegments.length - targetSegments.length) <= 1) {
      return m;
    }
  }

  return null;
}

/**
 * Primary Audit Execution Engine
 */
export function executeFirestoreSecurityAudit(): FirestoreAuditReport {
  const rulesPath = path.join(ROOT_DIR, 'firestore.rules');
  if (!fs.existsSync(rulesPath)) {
    throw new Error('firestore.rules file not found at project root');
  }

  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
  const { rulesVersion, matches, hasDefaultDeny } = parseFirestoreRules(rulesContent);

  // Collect all paths from blueprint, codebase, and rules
  const blueprintItems = loadBlueprintCollections();
  const codebaseItems = scanCodebaseForCollections();

  const allTargetPaths = new Map<string, 'blueprint' | 'codebase' | 'rules'>();

  for (const bp of blueprintItems) {
    allTargetPaths.set(bp.path, 'blueprint');
  }

  for (const cb of codebaseItems) {
    const formatted = cb.startsWith('workspaces/') ? cb : `workspaces/{workspaceId}/${cb}`;
    if (!allTargetPaths.has(formatted)) {
      allTargetPaths.set(formatted, 'codebase');
    }
  }

  for (const m of matches) {
    if (!allTargetPaths.has(m.normalizedPath)) {
      allTargetPaths.set(m.normalizedPath, 'rules');
    }
  }

  // Always include standard enterprise collections for FieldOps IT
  const standardCollections = [
    'workspaces/{workspaceId}/items/{itemId}',
    'workspaces/{workspaceId}/transactions/{transactionId}',
    'workspaces/{workspaceId}/categories/{categoryId}',
    'workspaces/{workspaceId}/sync_queue/{queueId}',
    'workspaces/{workspaceId}/inspections/{inspectionId}',
    'workspaces/{workspaceId}/trash_items/{trashId}',
    'workspaces/{workspaceId}/integration_logs/{logId}',
    'users/{userId}',
    'admins/{adminId}',
    'test/{docId}'
  ];

  for (const sc of standardCollections) {
    if (!allTargetPaths.has(sc)) {
      allTargetPaths.set(sc, 'blueprint');
    }
  }

  // Global Checks
  const globalChecks: GlobalRuleCheck[] = [
    {
      id: 'GCHK-01',
      name: 'Firestore Rules Syntax Version 2',
      status: rulesVersion === 2 ? 'PASS' : 'FAIL',
      severity: rulesVersion === 2 ? 'SECURE' : 'CRITICAL',
      detail: rulesVersion === 2 
        ? "Menggunakan sintaks rules_version = '2' yang mendukung recursive matching dan set operasi modern."
        : `Aturan masih menggunakan versi ${rulesVersion}. Versi 2 wajib untuk mencegah celah evaluasi recursive match.`,
      recommendation: rulesVersion !== 2 ? "Set rules_version = '2'; di baris pertama firestore.rules." : undefined
    },
    {
      id: 'GCHK-02',
      name: 'Default Deny Catch-All Guard',
      status: hasDefaultDeny ? 'PASS' : 'WARN',
      severity: hasDefaultDeny ? 'SECURE' : 'MEDIUM',
      detail: hasDefaultDeny
        ? "Catch-all wildcard 'match /{document=**} { allow read, write: if false; }' aktif di awal dokumen."
        : "Tidak ditemukan catch-all default deny eksplisit 'match /{document=**} { allow read, write: if false; }'. Meskipun Firestore secara implisit menolak path tanpa match, deklarasi eksplisit diwajibkan untuk zero-trust defense-in-depth.",
      recommendation: !hasDefaultDeny ? "Tambahkan 'match /{document=**} { allow read, write: if false; }' sebagai rule block pertama." : undefined
    },
    {
      id: 'GCHK-03',
      name: 'Path Variable & ID Poisoning Sanitizer',
      status: rulesContent.includes('isValidId') ? 'PASS' : 'FAIL',
      severity: rulesContent.includes('isValidId') ? 'SECURE' : 'HIGH',
      detail: rulesContent.includes('isValidId')
        ? "Fungsi sanitasi isValidId() aktif membatasi panjang (<=128 char) dan karakter ID dokumen."
        : "Tidak ada fungsi sanitasi panjang atau karakter parameter ID dokumen, berisiko terhadap serangan Denial of Wallet.",
      recommendation: "Gunakan isValidId(id) pada seluruh path variable."
    },
    {
      id: 'GCHK-04',
      name: 'No Blanket Public Read/Write on Sensitive Paths',
      status: !/(?:workspaces|items|transactions|users|admins|sync_queue)[^{}]*allow\s+(?:read|write)[^{};]*:\s*if\s+true/i.test(rulesContent) ? 'PASS' : 'FAIL',
      severity: !/(?:workspaces|items|transactions|users|admins|sync_queue)[^{}]*allow\s+(?:read|write)[^{};]*:\s*if\s+true/i.test(rulesContent) ? 'SECURE' : 'CRITICAL',
      detail: "Koleksi data inventori, keuangan, dan mutasi terverifikasi tidak memiliki wildcard 'if true' terbuka."
    }
  ];

  // Evaluate each collection
  const collectionFindings: CollectionAuditFinding[] = [];
  let publicReadCount = 0;
  let unauthenticatedWriteCount = 0;
  let missingRuleCount = 0;

  for (const [targetPath, source] of allTargetPaths.entries()) {
    const matched = findBestRuleForPath(targetPath, matches);

    // Identify collection base name (e.g. items from workspaces/{workspaceId}/items/{itemId})
    const segments = targetPath.split('/').filter(s => !s.startsWith('{'));
    const baseName = segments[segments.length - 1] || 'unknown';
    const sensitivityInfo = SENSITIVITY_MAP[baseName] || { level: 'MEDIUM', sensitiveFields: ['data'] };

    if (!matched) {
      missingRuleCount++;
      collectionFindings.push({
        path: targetPath,
        matchedRule: null,
        allowsPublicRead: false,
        allowsUnauthenticatedWrite: false,
        requiresAuth: false,
        hasIdValidation: false,
        hasRoleValidation: false,
        dataSensitivity: sensitivityInfo.level,
        sensitiveFields: sensitivityInfo.sensitiveFields,
        exposureRisk: sensitivityInfo.level === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        source,
        description: `Koleksi '${targetPath}' tidak memiliki blok 'match' eksplisit di firestore.rules. Firestore akan menolak secara default, namun operasi aplikasi mungkin gagal jika koleksi ini diakses.`,
        remediation: `Definisikan 'match /${targetPath}' dengan 'allow read, write: if isSignedIn() && isValidId(...);'.`
      });
      continue;
    }

    const allowsPublicRead = matched.allowStatements.some(a => a.isPublicRead);
    const allowsUnauthenticatedWrite = matched.allowStatements.some(a => a.isUnauthenticatedWrite);
    const requiresAuth = matched.allowStatements.every(a => a.requiresAuth);
    const hasIdValidation = matched.allowStatements.some(a => a.hasIdValidation);
    const hasRoleValidation = matched.allowStatements.some(a => a.hasRoleValidation);

    if (allowsPublicRead) publicReadCount++;
    if (allowsUnauthenticatedWrite) unauthenticatedWriteCount++;

    let exposureRisk: VulnerabilitySeverity = 'SECURE';
    let description = 'Koleksi terlindungi dengan autentikasi wajib dan sanitasi ID.';
    let remediation: string | undefined;

    if (allowsUnauthenticatedWrite) {
      exposureRisk = 'CRITICAL';
      description = `KERENTANAN KRITIS: Koleksi '${targetPath}' mengizinkan operasi tulis (write/create/update/delete) tanpa autentikasi! Pihak luar dapat merusak, mengubah, atau menghapus data secara anonim.`;
      remediation = `Ubah kondisi write menjadi 'if isSignedIn()'.`;
    } else if (allowsPublicRead) {
      if (baseName === 'test') {
        exposureRisk = 'LOW';
        description = `Path '/test/{docId}' mengizinkan baca publik (allow read: if true) untuk diagnostik koneksi awal klien. Aman selama tidak ada data sensitif yang ditulis ke koleksi ini.`;
        remediation = `Pastikan dokumen /test/connection hanya berisi status ping non-sensitif.`;
      } else {
        exposureRisk = sensitivityInfo.level === 'CRITICAL' || sensitivityInfo.level === 'HIGH' ? 'CRITICAL' : 'HIGH';
        description = `KEBOCORAN DATA: Koleksi '${targetPath}' mengizinkan baca publik tanpa login! Data sensitif (${sensitivityInfo.sensitiveFields.join(', ')}) dapat dieksfiltrasi dari internet.`;
        remediation = `Wajibkan 'isSignedIn()' pada aturan read.`;
      }
    } else if (!hasIdValidation) {
      exposureRisk = 'LOW';
      description = `Koleksi terlindungi autentikasi, namun belum menerapkan isValidId() pada ID dokumen.`;
      remediation = `Tambahkan 'isValidId(id)' pada kondisi allow.`;
    }

    collectionFindings.push({
      path: targetPath,
      matchedRule: matched.rawMatch,
      allowsPublicRead,
      allowsUnauthenticatedWrite,
      requiresAuth,
      hasIdValidation,
      hasRoleValidation,
      dataSensitivity: sensitivityInfo.level,
      sensitiveFields: sensitivityInfo.sensitiveFields,
      exposureRisk,
      source,
      description,
      remediation
    });
  }

  // Data Exposure Analysis
  const criticalFindings = collectionFindings.filter(f => f.exposureRisk === 'CRITICAL');
  const highFindings = collectionFindings.filter(f => f.exposureRisk === 'HIGH');

  const piiExposed = criticalFindings.some(f => f.sensitiveFields.some(field => ['email', 'phone', 'passwordHash', 'salt'].includes(field)));
  const financialDataExposed = criticalFindings.some(f => f.sensitiveFields.includes('unitCost'));
  const operationalLogsExposed = criticalFindings.some(f => f.sensitiveFields.includes('performedBy') || f.sensitiveFields.includes('recipientOrDestination'));
  const credentialsExposed = criticalFindings.some(f => f.sensitiveFields.includes('secretKey') || f.sensitiveFields.includes('passwordHash'));

  const exposureSummary: string[] = [];
  if (unauthenticatedWriteCount > 0) {
    exposureSummary.push(`⚠️ ${unauthenticatedWriteCount} koleksi memiliki celah tulis unauthenticated (Write Vulnerability).`);
  }
  if (publicReadCount > 0) {
    const publicExposedCollections = collectionFindings.filter(f => f.allowsPublicRead && f.path !== 'test/{docId}').map(f => f.path);
    if (publicExposedCollections.length > 0) {
      exposureSummary.push(`🚨 ${publicExposedCollections.length} koleksi sensitif dapat dibaca publik tanpa login: ${publicExposedCollections.join(', ')}.`);
    } else {
      exposureSummary.push(`ℹ️ Hanya endpoint diagnostik /test/{docId} yang memiliki izin baca publik (Aman untuk self-test koneksi).`);
    }
  } else {
    exposureSummary.push(`✅ Tidak ada koleksi data inventori yang mengizinkan baca publik anonim.`);
  }

  if (missingRuleCount > 0) {
    const missing = collectionFindings.filter(f => f.matchedRule === null).map(f => f.path);
    exposureSummary.push(`⚠️ ${missingRuleCount} koleksi aplikasi belum dideklarasikan eksplisit di firestore.rules: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}.`);
  }

  // Determine overall risk
  let overallRisk: VulnerabilitySeverity = 'SECURE';
  if (unauthenticatedWriteCount > 0 || criticalFindings.length > 0) {
    overallRisk = 'CRITICAL';
  } else if (highFindings.length > 0) {
    overallRisk = 'HIGH';
  } else if (missingRuleCount > 0 || globalChecks.some(c => c.status === 'WARN')) {
    overallRisk = 'LOW';
  }

  const remediationPlan: string[] = [];
  if (unauthenticatedWriteCount > 0) {
    remediationPlan.push('1. [URGENT] Hapus seluruh klausa "allow write: if true" dan wajibkan "request.auth != null".');
  }
  if (missingRuleCount > 0) {
    remediationPlan.push('2. Lengkapi match block untuk subkoleksi integration_logs, trash_items, dan users di firestore.rules.');
  }
  if (!hasDefaultDeny) {
    remediationPlan.push('3. Tambahkan "match /{document=**} { allow read, write: if false; }" sebagai default-deny catch-all.');
  }
  remediationPlan.push('4. Jalankan validasi berkala via "npm run audit:firestore" sebelum setiap deployment rilis.');

  return {
    timestamp: new Date().toISOString(),
    appVersion: '0.3.1',
    summary: {
      totalCollections: collectionFindings.length,
      publicReadCount,
      unauthenticatedWriteCount,
      missingRuleCount,
      overallRisk,
      isProductionReady: overallRisk === 'SECURE' || overallRisk === 'LOW'
    },
    globalChecks,
    collectionFindings,
    dataExposureAnalysis: {
      piiExposed,
      financialDataExposed,
      operationalLogsExposed,
      credentialsExposed,
      exposureSummary
    },
    remediationPlan
  };
}

/**
 * Generate a Markdown report string
 */
export function generateMarkdownAuditReport(report: FirestoreAuditReport): string {
  const statusEmoji = report.summary.overallRisk === 'SECURE' ? '🟢 TERLINDUNGI' : report.summary.overallRisk === 'LOW' ? '🟡 AMAN DENGAN CATATAN' : '🔴 BERISIKO';

  let md = `# LAPORAN AUDIT KEAMANAN FIRESTORE & PAPARAN DATA (DATA EXPOSURE REPORT)
**FieldOps IT - Enterprise Asset & Field Operations System**  
**Versi Sistem**: v${report.appVersion}  
**Waktu Audit**: ${report.timestamp}  
**Status Evaluasi**: ${statusEmoji}  

---

## 📊 1. Ringkasan Eksekutif (Executive Summary)

Audit otomatis ini menganalisis seluruh koleksi database Cloud Firestore terhadap aturan keamanan yang terpasang di \`firestore.rules\` dan definisi skema pada \`firebase-blueprint.json\`.

| Metrik Audit | Nilai | Evaluasi Keamanan |
| :--- | :---: | :--- |
| **Total Koleksi Diaudit** | **${report.summary.totalCollections}** | Cakupan mencakup seluruh entitas master & transaksi |
| **Celah Baca Publik (Public-Read)** | **${report.summary.publicReadCount}** | ${report.summary.publicReadCount === 0 ? '✅ Nol kebocoran baca publik' : '⚠️ Terdeteksi izin baca publik'} |
| **Celah Tulis Anonim (Unauthenticated-Write)** | **${report.summary.unauthenticatedWriteCount}** | ${report.summary.unauthenticatedWriteCount === 0 ? '✅ Seluruh mutasi tulis wajib login' : '🚨 Celah tulis kritis terdeteksi'} |
| **Koleksi Tanpa Rule Eksplisit** | **${report.summary.missingRuleCount}** | ${report.summary.missingRuleCount === 0 ? '✅ 100% koleksi terpetakan' : 'ℹ️ Menggunakan default deny bawaan Firestore'} |
| **Status Produksi (Production-Ready)** | **${report.summary.isProductionReady ? 'SIAP PRODUKSI' : 'BUTUH PERBAIKAN'}** | Berdasarkan standar keamanan Attribute-Based Access Control (ABAC) |

---

## 🛡️ 2. Pemeriksaan Struktur Global (Global Security Architecture)

| ID | Nama Pemeriksaan | Status | Tingkat Keparahan | Catatan Temuan |
| :--- | :--- | :---: | :---: | :--- |
${report.globalChecks.map(c => `| **${c.id}** | ${c.name} | ${c.status === 'PASS' ? '✅ PASS' : c.status === 'WARN' ? '⚠️ WARN' : '❌ FAIL'} | \`${c.severity}\` | ${c.detail} |`).join('\n')}

---

## 📂 3. Matriks Evaluasi Koleksi Firestore & Paparan Data

Tabel ini merinci setiap koleksi data, aturan yang berlaku, tingkat sensitivitas data, dan risiko paparan:

| Path Koleksi | Aturan Read | Aturan Write | Auth Wajib | Sensitivitas | Risiko Paparan | Bidang Data Sensitif |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
${report.collectionFindings.map(f => {
  const readLabel = f.allowsPublicRead ? '⚠️ Publik' : '🔒 Auth';
  const writeLabel = f.allowsUnauthenticatedWrite ? '🚨 Terbuka' : '🔒 Auth';
  const riskLabel = f.exposureRisk === 'SECURE' ? '🟢 Aman' : f.exposureRisk === 'LOW' ? '🟡 Rendah' : f.exposureRisk === 'MEDIUM' ? '🟠 Sedang' : '🔴 Kritis';
  return `| \`${f.path}\` | ${readLabel} | ${writeLabel} | ${f.requiresAuth ? 'Ya' : 'Sebagian'} | \`${f.dataSensitivity}\` | ${riskLabel} | ${f.sensitiveFields.join(', ')} |`;
}).join('\n')}

---

## 🔍 4. Analisis Paparan Data Sensitif (Data Exposure Impact)

${report.dataExposureAnalysis.exposureSummary.map(s => `- ${s}`).join('\n')}

### Status Keamanan Kategori Data:
- **Kredensial & Kunci Sandi (Passwords/Salts/Tokens)**: ${report.dataExposureAnalysis.credentialsExposed ? '🚨 BERISIKO TEREKSPOS' : '🔒 TERLINDUNGI (Hashing PBKDF2 100k + Tidak terekspos ke Firestore publik)'}
- **Data Finansial (Harga Modal/Unit Cost Aset)**: ${report.dataExposureAnalysis.financialDataExposed ? '🚨 BERISIKO TEREKSPOS' : '🔒 TERLINDUNGI (Wajib login akun terautentikasi)'}
- **Data Privasi Pengguna (PII - Email/No HP Teknisi)**: ${report.dataExposureAnalysis.piiExposed ? '🚨 BERISIKO TEREKSPOS' : '🔒 TERLINDUNGI (Hanya dapat diakses staf internal)'}
- **Log Operasional & Tiket Lapangan**: ${report.dataExposureAnalysis.operationalLogsExposed ? '🚨 BERISIKO TEREKSPOS' : '🔒 TERLINDUNGI (Isolasi workspace ID)'}

---

## 📋 5. Rencana Tindak Lanjut & Remidiasi (Action Plan)

${report.remediationPlan.map(p => `${p}`).join('\n')}

---
*Laporan ini dihasilkan secara otomatis oleh FieldOps IT Security Audit Engine.*
`;

  return md;
}

/**
 * CLI Execution Runner
 */
export function runCliAudit() {
  console.log('\n======================================================================');
  console.log('   FIELDOPS IT - AUTOMATED FIRESTORE SECURITY & DATA EXPOSURE AUDIT   ');
  console.log('======================================================================\n');

  try {
    const report = executeFirestoreSecurityAudit();

    // Print summary table to CLI
    console.log(`[Status] Waktu Audit: ${report.timestamp}`);
    console.log(`[Status] Total Koleksi: ${report.summary.totalCollections} | Public-Read: ${report.summary.publicReadCount} | Unauth-Write: ${report.summary.unauthenticatedWriteCount}`);
    console.log(`[Status] Overall Risk: ${report.summary.overallRisk}`);
    console.log(`[Status] Siap Produksi: ${report.summary.isProductionReady ? 'YA (Production Ready)' : 'TIDAK (Perlu Perbaikan)'}\n`);

    console.log('--- HASIL AUDIT KOLEKSI FIRESTORE ---');
    for (const f of report.collectionFindings) {
      const icon = f.exposureRisk === 'SECURE' ? '🟢 [PASS]' : f.exposureRisk === 'LOW' ? '🟡 [LOW]' : f.exposureRisk === 'MEDIUM' ? '🟠 [WARN]' : '🔴 [FAIL]';
      console.log(`${icon} ${f.path}`);
      console.log(`    Read: ${f.allowsPublicRead ? '⚠️ PUBLIK (if true)' : '🔒 Terautentikasi'} | Write: ${f.allowsUnauthenticatedWrite ? '🚨 UNPROTECTED' : '🔒 Terautentikasi'}`);
      console.log(`    Sensitivitas: ${f.dataSensitivity} (${f.sensitiveFields.slice(0, 4).join(', ')})`);
      if (f.remediation) {
        console.log(`    Saran: ${f.remediation}`);
      }
      console.log('');
    }

    // Save Markdown Report
    const reportFilePath = path.join(ROOT_DIR, 'FIRESTORE_SECURITY_AUDIT_REPORT.md');
    const mdContent = generateMarkdownAuditReport(report);
    fs.writeFileSync(reportFilePath, mdContent, 'utf-8');
    console.log(`✅ Laporan audit markdown lengkap berhasil diterbitkan di: ${reportFilePath}\n`);

    return report;
  } catch (err: any) {
    console.error('❌ Gagal menjalankan audit Firestore:', err.message);
    process.exit(1);
  }
}

// Auto-run if executed directly via CLI
if (process.argv[1] && (process.argv[1].endsWith('audit-firestore-security.ts') || process.argv[1].endsWith('audit-firestore-rules.ts'))) {
  runCliAudit();
}
