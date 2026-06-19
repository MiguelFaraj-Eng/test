// ══════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════
const S = {
  // Alarm database — loaded from data/Alarms/ on GitHub
  importedSheets: {},   // {sheetName: [{mainCategory, subCategory, subSubCategory, tag, alarmName, description, severity, alarmId, sheet}]}
  importedFile: null,

  // Project info
  projectStatus: 'draft',

  // Settings
  settingsSort: { field: 'alarmName', dir: 1 },
  settingsPage: 1,
  settingsPageSize: 30,

  // Nav unlock
  unlocked: new Set(['project'])
};

// Embedded DB placeholder (for offline/baked-in mode)
const EMBEDDED_DB = null; // <<<EMBEDDED_DB_PLACEHOLDER>>>
