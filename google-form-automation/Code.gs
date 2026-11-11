const CONFIG = Object.freeze({
  SPREADSHEET_ID: '1bEEamPPwvWs-4uLC3xGIUcNriHGPKS0yVAwvQphbzIc',
  RESPONSE_SHEET_GID: 1020088048,
  FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSfDa7ZUTfKq11ugldHEyMecekmdRTIOsJ74oK_QvZlM-i-6LQ/viewform?usp=header',
  ADMIN_EMAIL: 'cpgramsingh@gmail.com',
  REQUEST_PREFIX: 'NRGST',
  MAX_FILE_BYTES: 5 * 1024 * 1024,
  ANSWERED_STATUSES: ['answered', 'closed', 'resolved']
});

const MANAGED_HEADERS = [
  'Request Number',
  'Status',
  'Assigned To',
  'Clarification / Answer',
  'Answered On',
  'Notification Sent',
  'Attachment Check'
];

const HEADER_ALIASES = Object.freeze({
  email: ['email address', 'email', 'e-mail', 'requester email'],
  name: ['name', 'requester name', 'employee name'],
  division: ['division', 'unit', 'railway division'],
  queryType: ['query type', 'type of query', 'request type'],
  hsn: ['hsn/sac', 'hsn / sac', 'hsn or sac', 'hsn', 'sac'],
  description: ['description of query', 'query description', 'description', 'query', 'clarification required'],
  attachment: ['supporting pdf', 'upload pdf', 'attachment', 'invoice/loa/agreement', 'invoice / loa / agreement', 'supporting document'],
  requestNumber: ['request number'],
  status: ['status'],
  assignedTo: ['assigned to'],
  answer: ['clarification / answer', 'clarification/answer', 'answer', 'reply'],
  answeredOn: ['answered on'],
  notificationSent: ['notification sent'],
  attachmentCheck: ['attachment check']
});

function setup() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getResponseSheet_(spreadsheet);
  ensureManagedColumns_(sheet);

  const ownedHandlers = ['handleFormSubmit', 'handleSheetEdit', 'notifyAnsweredQueries'];
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (ownedHandlers.indexOf(trigger.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('handleFormSubmit').forSpreadsheet(spreadsheet).onFormSubmit().create();
  ScriptApp.newTrigger('handleSheetEdit').forSpreadsheet(spreadsheet).onEdit().create();
  ScriptApp.newTrigger('notifyAnsweredQueries').timeBased().everyMinutes(15).create();

  spreadsheet.toast('Query automation installed: acknowledgement, edit and 15-minute fallback triggers are active.', 'NR GST Query Desk', 8);
}

function handleFormSubmit(event) {
  if (!event || !event.range) {
    throw new Error('This function must run from the installed spreadsheet form-submit trigger. Run setup() once.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = event.range.getSheet();
    if (sheet.getSheetId() !== CONFIG.RESPONSE_SHEET_GID) return;

    const row = event.range.getRow();
    const map = ensureManagedColumns_(sheet);
    const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    const requestNumber = createRequestNumber_(sheet.getParent());
    const attachmentResult = checkAttachments_(valueAt_(values, findColumn_(map, 'attachment')));
    const initialStatus = attachmentResult.ok ? 'Open' : 'Attachment Review';

    setByAlias_(sheet, row, map, 'requestNumber', requestNumber);
    setByAlias_(sheet, row, map, 'status', initialStatus, true);
    setByAlias_(sheet, row, map, 'attachmentCheck', attachmentResult.message);

    const requester = rowDetails_(sheet, row);
    requester.requestNumber = requestNumber;
    requester.status = initialStatus;

    if (requester.email) {
      MailApp.sendEmail({
        to: requester.email,
        subject: requestNumber + ' - Railway GST query received',
        name: 'Railway GST Query Desk',
        body: acknowledgementBody_(requester, attachmentResult)
      });
    }

    MailApp.sendEmail({
      to: CONFIG.ADMIN_EMAIL,
      replyTo: requester.email || CONFIG.ADMIN_EMAIL,
      subject: requestNumber + ' - New Railway GST query',
      name: 'Railway GST Query Desk',
      body: adminBody_(requester, attachmentResult, sheet, row)
    });
  } finally {
    lock.releaseLock();
  }
}

function handleSheetEdit(event) {
  if (!event || !event.range || event.range.getRow() < 2) return;
  const sheet = event.range.getSheet();
  if (sheet.getSheetId() !== CONFIG.RESPONSE_SHEET_GID) return;

  const map = ensureManagedColumns_(sheet);
  const editedColumn = event.range.getColumn();
  const statusColumn = findColumn_(map, 'status');
  const answerColumn = findColumn_(map, 'answer');
  if (editedColumn !== statusColumn && editedColumn !== answerColumn) return;

  notifyRowIfReady_(sheet, event.range.getRow(), map);
}

function notifyAnsweredQueries() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getResponseSheet_(spreadsheet);
  const map = ensureManagedColumns_(sheet);
  for (let row = 2; row <= sheet.getLastRow(); row += 1) {
    notifyRowIfReady_(sheet, row, map);
  }
}

function notifyRowIfReady_(sheet, row, map) {
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const status = valueAt_(values, findColumn_(map, 'status')).trim().toLowerCase();
  const answer = valueAt_(values, findColumn_(map, 'answer')).trim();
  const alreadySent = valueAt_(values, findColumn_(map, 'notificationSent')).trim().toLowerCase();
  if (CONFIG.ANSWERED_STATUSES.indexOf(status) === -1 || !answer || alreadySent === 'yes') return;

  const details = rowDetails_(sheet, row);
  if (!details.email) {
    setByAlias_(sheet, row, map, 'notificationSent', 'Email missing');
    return;
  }

  MailApp.sendEmail({
    to: details.email,
    cc: CONFIG.ADMIN_EMAIL,
    subject: details.requestNumber + ' - Railway GST clarification available',
    name: 'Railway GST Query Desk',
    body: answerBody_(details)
  });

  setByAlias_(sheet, row, map, 'answeredOn', new Date());
  setByAlias_(sheet, row, map, 'notificationSent', 'Yes');
}

function getResponseSheet_(spreadsheet) {
  const sheet = spreadsheet.getSheetById(CONFIG.RESPONSE_SHEET_GID);
  if (!sheet) throw new Error('Response sheet GID ' + CONFIG.RESPONSE_SHEET_GID + ' was not found.');
  return sheet;
}

function ensureManagedColumns_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  let headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const normalized = headers.map(normalize_);
  const missing = MANAGED_HEADERS.filter(function(header) {
    return normalized.indexOf(normalize_(header)) === -1;
  });

  if (missing.length) {
    const start = headers.length + 1;
    sheet.getRange(1, start, 1, missing.length).setValues([missing]);
    sheet.getRange(1, start, 1, missing.length).setFontWeight('bold').setBackground('#0b4f79').setFontColor('#ffffff');
    headers = headers.concat(missing);
  }

  const map = {};
  headers.forEach(function(header, index) {
    map[normalize_(header)] = index + 1;
  });
  return map;
}

function findColumn_(map, aliasKey) {
  const aliases = HEADER_ALIASES[aliasKey] || [];
  for (let i = 0; i < aliases.length; i += 1) {
    const column = map[normalize_(aliases[i])];
    if (column) return column;
  }
  return 0;
}

function setByAlias_(sheet, row, map, aliasKey, value, onlyIfBlank) {
  const column = findColumn_(map, aliasKey);
  if (!column) throw new Error('Required managed column is missing: ' + aliasKey);
  const cell = sheet.getRange(row, column);
  if (!onlyIfBlank || !cell.getDisplayValue().trim()) cell.setValue(value);
}

function rowDetails_(sheet, row) {
  const map = ensureManagedColumns_(sheet);
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  return {
    email: valueAt_(values, findColumn_(map, 'email')).trim(),
    name: valueAt_(values, findColumn_(map, 'name')).trim() || 'Requester',
    division: valueAt_(values, findColumn_(map, 'division')).trim() || 'Not stated',
    queryType: valueAt_(values, findColumn_(map, 'queryType')).trim() || 'GST clarification',
    hsn: valueAt_(values, findColumn_(map, 'hsn')).trim() || 'Not stated',
    description: valueAt_(values, findColumn_(map, 'description')).trim() || 'Not stated',
    requestNumber: valueAt_(values, findColumn_(map, 'requestNumber')).trim() || 'Request pending',
    status: valueAt_(values, findColumn_(map, 'status')).trim() || 'Open',
    answer: valueAt_(values, findColumn_(map, 'answer')).trim(),
    assignedTo: valueAt_(values, findColumn_(map, 'assignedTo')).trim() || 'Railway GST reviewer'
  };
}

function createRequestNumber_(spreadsheet) {
  const timeZone = spreadsheet.getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  const datePart = Utilities.formatDate(new Date(), timeZone, 'yyyyMMdd');
  const propertyKey = 'COUNTER_' + datePart;
  const properties = PropertiesService.getScriptProperties();
  const next = Number(properties.getProperty(propertyKey) || 0) + 1;
  properties.setProperty(propertyKey, String(next));
  return CONFIG.REQUEST_PREFIX + '-' + datePart + '-' + String(next).padStart(4, '0');
}

function checkAttachments_(rawValue) {
  if (!rawValue || !String(rawValue).trim()) {
    return {ok: false, message: 'Missing PDF attachment'};
  }

  const ids = String(rawValue).match(/[-\w]{25,}/g) || [];
  if (!ids.length) return {ok: false, message: 'Attachment link could not be validated'};

  const messages = [];
  let ok = true;
  ids.forEach(function(id) {
    try {
      const file = DriveApp.getFileById(id);
      const isPdf = file.getMimeType() === MimeType.PDF || /\.pdf$/i.test(file.getName());
      const withinLimit = file.getSize() <= CONFIG.MAX_FILE_BYTES;
      if (!isPdf || !withinLimit) ok = false;
      messages.push(file.getName() + ': ' + (isPdf ? 'PDF' : 'not PDF') + ', ' + formatBytes_(file.getSize()) + (withinLimit ? '' : ' (over 5 MB)'));
    } catch (error) {
      ok = false;
      messages.push('Attachment access check failed');
    }
  });
  return {ok: ok, message: messages.join('; ')};
}

function acknowledgementBody_(details, attachmentResult) {
  return [
    'Dear ' + details.name + ',',
    '',
    'Your Railway GST query has been received.',
    'Request number: ' + details.requestNumber,
    'Division: ' + details.division,
    'Query type: ' + details.queryType,
    'HSN/SAC: ' + details.hsn,
    'Status: ' + details.status,
    'Attachment check: ' + attachmentResult.message,
    '',
    'Please retain the request number for follow-up. A clarification will be emailed after review.',
    '',
    'This acknowledgement is not an ITC approval or tax determination.',
    'Railway GST Query Desk'
  ].join('\n');
}

function adminBody_(details, attachmentResult, sheet, row) {
  return [
    'A new Railway GST query requires review.',
    '',
    'Request number: ' + details.requestNumber,
    'Requester: ' + details.name + ' <' + (details.email || 'email not captured') + '>',
    'Division: ' + details.division,
    'Query type: ' + details.queryType,
    'HSN/SAC: ' + details.hsn,
    'Description: ' + details.description,
    'Attachment check: ' + attachmentResult.message,
    '',
    'Response Sheet row: ' + row,
    'Sheet: ' + sheet.getParent().getUrl(),
    '',
    'Enter the answer in "Clarification / Answer" and set Status to Answered, Closed or Resolved. The requester will then be emailed automatically.'
  ].join('\n');
}

function answerBody_(details) {
  return [
    'Dear ' + details.name + ',',
    '',
    'A clarification has been recorded for your Railway GST query.',
    'Request number: ' + details.requestNumber,
    'Division: ' + details.division,
    'HSN/SAC: ' + details.hsn,
    'Reviewed by: ' + details.assignedTo,
    '',
    'Clarification / Answer:',
    details.answer,
    '',
    'This clarification supports review and does not replace verification of invoice facts, end-use, current GST law or competent approval.',
    '',
    'Railway GST Query Desk'
  ].join('\n');
}

function valueAt_(values, oneBasedColumn) {
  return oneBasedColumn ? String(values[oneBasedColumn - 1] || '') : '';
}

function normalize_(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function formatBytes_(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
