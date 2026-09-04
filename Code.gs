// ============================================================
// PAPD Off-Duty Employment Report — Google Apps Script Backend
// ============================================================
// Paste this entire file into the Google Apps Script editor
// (Extensions > Apps Script) bound to your Google Sheet.
//
// Before deploying, change SECRET_KEY to a random string.
// ============================================================

const SECRET_KEY = 'CHANGE_ME_TO_A_RANDOM_STRING';
const SHEET_NAME = 'Submissions';
const AUDIT_SHEET_NAME = 'AuditLog';

// Admin credentials: display name -> PIN
// Add more admins here as needed.
const ADMINS = {
  'Admin': '0911'
};

// Column headers — must match the sheet's row 1
const HEADERS = [
  'Timestamp', 'Officer', 'Rank', 'Division', 'Month', 'Year',
  'ReportID', 'Page', 'DateWorked', 'Day', 'Employer', 'Vehicle',
  'Type', 'Start', 'End', 'Hours', 'OfficerSignature', 'CommanderSignature',
  'HasOfficerSig', 'HasCommanderSig'
];

// ---------- OPTIONS: Handle CORS preflight ----------
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ---------- POST: Receive a submitted report ----------
function doPost(e) {
  try {
    // 1. Parse JSON body
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return jsonResponse(400, { success: false, error: 'Invalid JSON' });
    }

    // 2. Login action: verify name + PIN against ADMINS, log the attempt
    if (data.action === 'login') {
      var name = data.adminName || '';
      var pin = String(data.pin || '');
      if (ADMINS.hasOwnProperty(name) && String(ADMINS[name]) === pin) {
        logAudit(name, 'login', 'Successful login');
        return jsonResponse(200, { success: true, adminName: name });
      } else {
        logAudit(name || 'unknown', 'login_failed', 'Failed login attempt');
        return jsonResponse(200, { success: false, error: 'Invalid name or PIN' });
      }
    }

    // 3. All other actions require the secret key
    if (data.secretKey !== SECRET_KEY) {
      return jsonResponse(403, { success: false, error: 'Unauthorized' });
    }

    // 3a. Delete action: remove all rows for a given reportId
    if (data.action === 'delete') {
      if (!data.reportId) {
        return jsonResponse(400, { success: false, error: 'Missing reportId' });
      }
      var delResult = deleteReportById(data.reportId);
      logAudit(data.adminName || 'unknown', 'delete',
        'Deleted report ' + data.reportId + ' (' + delResult.deleted + ' rows)');
      return jsonResponse(200, delResult);
    }

    // 3b. View action: log that a report was viewed
    if (data.action === 'view') {
      logAudit(data.adminName || 'unknown', 'view', 'Viewed report ' + (data.reportId || ''));
      return jsonResponse(200, { success: true });
    }

    // 3c. Audit log action: fetch the audit entries
    if (data.action === 'get_audit') {
      return jsonResponse(200, getAuditEntries());
    }

    // 4. Validate payload structure
    if (!data.header || !data.pages || !Array.isArray(data.pages) || data.pages.length === 0) {
      return jsonResponse(400, { success: false, error: 'Missing header or pages data' });
    }

    const header = data.header;
    if (!header.officer || !header.rank || !header.division || !header.month || !header.year) {
      return jsonResponse(400, { success: false, error: 'All header fields are required' });
    }

    // 4. Generate a unique report ID
    const reportId = Utilities.getUuid();
    const now = new Date();

    // 5. Open sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    }

    // 6. Check for duplicate reportId (safety net)
    if (reportIdExists(sheet, reportId)) {
      return jsonResponse(200, { success: true, duplicate: true, reportId: reportId });
    }

    // 7. Flatten rows
    const rowsToWrite = [];
    data.pages.forEach(function (page, pageIdx) {
      if (!page.rows) return;
      page.rows.forEach(function (row) {
        if (!row.date) return; // skip empty rows

        var hours = computeHours(row.start, row.end);
        var hasOfficerSig = !!(page.sigOfficer && page.sigOfficer.length > 10);
        var hasCommanderSig = !!(page.sigCommander && page.sigCommander.length > 10);

        rowsToWrite.push([
          now,                    // Timestamp
          header.officer,         // Officer
          header.rank,            // Rank
          header.division,        // Division
          header.month,           // Month
          header.year,            // Year
          reportId,               // ReportID
          pageIdx + 1,            // Page
          row.date,               // DateWorked
          row.day,                // Day
          row.employer,           // Employer
          row.vehicle,            // Vehicle
          row.type,               // Type
          row.start,              // Start
          row.end,                // End
          hours,                  // Hours
          page.sigOfficer || '',  // OfficerSignature
          page.sigCommander || '',// CommanderSignature
          hasOfficerSig,          // HasOfficerSig
          hasCommanderSig         // HasCommanderSig
        ]);
      });
    });

    if (rowsToWrite.length === 0) {
      return jsonResponse(400, { success: false, error: 'No work entries to submit' });
    }

    // 8. Append all rows in one batch
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToWrite.length, HEADERS.length)
      .setValues(rowsToWrite);

    return jsonResponse(200, {
      success: true,
      reportId: reportId,
      entriesAdded: rowsToWrite.length
    });

  } catch (err) {
    return jsonResponse(500, { success: false, error: err.message });
  }
}

// ---------- GET: Return data for the admin portal ----------
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  // If sheet doesn't exist or is empty, return empty array
  if (!sheet || sheet.getLastRow() <= 1) {
    return jsonResponse(200, []);
  }

  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var dataRows = allData.slice(1);

  // If a specific reportId is requested, return full detail
  var reportId = e && e.parameter && e.parameter.reportId;
  if (reportId) {
    return jsonResponse(200, getReportDetail(dataRows, headers, reportId));
  }

  // Otherwise, return summaries grouped by ReportID
  return jsonResponse(200, getSummaries(dataRows, headers));
}

// ---------- Helper: Build summaries ----------
function getSummaries(dataRows, headers) {
  var groups = {};

  dataRows.forEach(function (row) {
    var reportId = row[6]; // ReportID column
    if (!reportId) return;

    if (!groups[reportId]) {
      groups[reportId] = {
        reportId: reportId,
        officer: row[1],
        rank: row[2],
        division: row[3],
        month: row[4],
        year: row[5],
        submissionTimestamp: row[0],
        entryCount: 0,
        hasOfficerSig: false,
        hasCommanderSig: false
      };
    }

    groups[reportId].entryCount++;
    if (row[18]) groups[reportId].hasOfficerSig = true;   // HasOfficerSig
    if (row[19]) groups[reportId].hasCommanderSig = true;  // HasCommanderSig
  });

  // Convert to array, sort by timestamp descending (newest first)
  var summaries = Object.keys(groups).map(function (k) { return groups[k]; });
  summaries.sort(function (a, b) {
    return new Date(b.submissionTimestamp) - new Date(a.submissionTimestamp);
  });

  return summaries;
}

// ---------- Helper: Build full detail for one report ----------
function getReportDetail(dataRows, headers, reportId) {
  var entries = [];
  var sigOfficer = '';
  var sigCommander = '';
  var headerInfo = null;

  dataRows.forEach(function (row) {
    if (row[6] !== reportId) return;

    if (!headerInfo) {
      headerInfo = {
        officer: row[1],
        rank: row[2],
        division: row[3],
        month: row[4],
        year: row[5],
        submissionTimestamp: row[0]
      };
    }

    // Take the last non-empty signatures (they're the same for all rows in a page)
    if (row[16]) sigOfficer = row[16];
    if (row[17]) sigCommander = row[17];

    entries.push({
      page: row[7],
      dateWorked: row[8],
      day: row[9],
      employer: row[10],
      vehicle: row[11],
      type: row[12],
      start: row[13],
      end: row[14],
      hours: row[15]
    });
  });

  // Group entries by page, collecting per-page signatures
  var pageMap = {};
  entries.forEach(function (entry) {
    var p = entry.page;
    if (!pageMap[p]) pageMap[p] = { entries: [], sigOfficer: '', sigCommander: '' };
    pageMap[p].entries.push(entry);
  });

  // Re-scan to assign per-page signatures
  dataRows.forEach(function (row) {
    if (row[6] !== reportId) return;
    var p = row[7];
    if (pageMap[p]) {
      if (row[16]) pageMap[p].sigOfficer = row[16];
      if (row[17]) pageMap[p].sigCommander = row[17];
    }
  });

  var pages = [];
  Object.keys(pageMap).sort(function (a, b) { return a - b; }).forEach(function (p) {
    pages.push({
      page: parseInt(p),
      entries: pageMap[p].entries,
      sigOfficer: pageMap[p].sigOfficer,
      sigCommander: pageMap[p].sigCommander
    });
  });

  return {
    reportId: reportId,
    header: headerInfo,
    pages: pages,
    entryCount: entries.length
  };
}

// ---------- Helper: Compute hours from start/end (minutes) ----------
function computeHours(start, end) {
  if (!start || !end) return '';
  var s = parseInt(start, 10);
  var e = parseInt(end, 10);
  if (isNaN(s) || isNaN(e)) return '';
  var diff = e - s;
  if (diff <= 0) diff += 24 * 60;
  return (diff / 60).toFixed(2);
}

// ---------- Helper: Append an audit log entry ----------
function logAudit(adminName, action, detail) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(AUDIT_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(AUDIT_SHEET_NAME);
      sheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'AdminName', 'Action', 'Detail']]);
    }
    sheet.appendRow([new Date(), adminName, action, detail]);
  } catch (err) {
    // Never let audit logging break the main action
  }
}

// ---------- Helper: Fetch recent audit entries (newest first) ----------
function getAuditEntries() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(AUDIT_SHEET_NAME);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var rows = values.slice(1).reverse(); // newest first
  return rows.map(function (row) {
    return {
      timestamp: row[0],
      adminName: row[1],
      action: row[2],
      detail: row[3]
    };
  });
}

// ---------- Helper: Delete all rows for a reportId ----------
function deleteReportById(reportId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, deleted: 0 };
  }
  var reportIds = sheet.getRange(2, 7, sheet.getLastRow() - 1, 1).getValues(); // Column G = ReportID
  var rowsToDelete = [];
  for (var i = 0; i < reportIds.length; i++) {
    if (reportIds[i][0] === reportId) {
      rowsToDelete.push(i + 2); // +2 because row 1 is header, i is 0-indexed from row 2
    }
  }
  // Delete from bottom to top to preserve row indices
  rowsToDelete.sort(function (a, b) { return b - a; });
  rowsToDelete.forEach(function (rowNum) {
    sheet.deleteRow(rowNum);
  });
  return { success: true, deleted: rowsToDelete.length };
}

// ---------- Helper: Check if reportId already exists ----------
function reportIdExists(sheet, reportId) {
  if (sheet.getLastRow() <= 1) return false;
  var ids = sheet.getRange(2, 7, sheet.getLastRow() - 1, 1).getValues(); // Column G = ReportID
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === reportId) return true;
  }
  return false;
}

// ---------- Helper: Return JSON with CORS support ----------
function jsonResponse(statusCode, data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
