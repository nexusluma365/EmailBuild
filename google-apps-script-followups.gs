const SHEET_NAME = '2026 Data';

const COMMAND_CENTER_WEBHOOK_URL = 'https://syrus-api-production.up.railway.app/api/leads/ingest';
const COMMAND_CENTER_OFFER = 'Credit Repair';

const HEADERS = [
  'First Seen Date',
  'First Seen Time',
  'First Seen Timestamp',
  'Last Seen Date',
  'Last Seen Time',
  'Last Seen Timestamp',
  'Session ID',
  'User Key',
  'Current Event',
  'Current Step',
  'Funnel Status',
  'Left Off At',
  'Lead Converted',
  'Lead Converted At',
  'Sales Converted',
  'Sales Converted At',
  'Purchase Converted',
  'Purchase Converted At',
  'Name',
  'Email',
  'Phone',
  'Product',
  'Product Key',
  'Amount',
  'Currency',
  'Payment Status',
  'Payment Intent ID',
  'Customer ID',
  'Order Bump',
  'Download Type',
  'Source',
  'Page URL',
  'UTM Source',
  'UTM Medium',
  'UTM Campaign',
  'User Agent',
  'Checkout View At',
  'Lead Submit At',
  'Sales View At',
  'Payment Started At',
  'Payment Succeeded At',
  'Download At',
  'Event Count',
  'Event History',
  'Notes',
  'Raw JSON'
];

function setupCreditProjectSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(ss);

  ensureHeaders_(sheet);
  formatSheet_(sheet);
}

function resetCreditProjectSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(ss);

  sheet.clear();
  ensureHeaders_(sheet);
  formatSheet_(sheet);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = parsePayload_(e);
    const now = new Date();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet_(ss);

    ensureHeaders_(sheet);

    const existing = findSessionRow_(sheet, payload);
    const rowNumber = existing.rowNumber || sheet.getLastRow() + 1;
    const row = existing.values || blankRow_();
    const updatedRow = buildUpdatedSessionRow_(row, payload, now);

    sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([updatedRow]);

    const commandCenterResult = sendToCommandCenter_(sheet, rowNumber, updatedRow, payload);

    return json_({
      ok: true,
      message: existing.rowNumber ? 'Session updated' : 'Session created',
      rowNumber: rowNumber,
      sessionId: valueFromRow_(updatedRow, 'Session ID'),
      currentStep: valueFromRow_(updatedRow, 'Current Step'),
      currentEvent: valueFromRow_(updatedRow, 'Current Event'),
      funnelStatus: valueFromRow_(updatedRow, 'Funnel Status'),
      leftOffAt: valueFromRow_(updatedRow, 'Left Off At'),
      leadConverted: valueFromRow_(updatedRow, 'Lead Converted'),
      salesConverted: valueFromRow_(updatedRow, 'Sales Converted'),
      purchaseConverted: valueFromRow_(updatedRow, 'Purchase Converted'),
      commandCenter: commandCenterResult
    });
  } catch (error) {
    return json_({
      ok: false,
      error: error.message
    });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    if (e.parameter && e.parameter.action === 'followups') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = getOrCreateSheet_(ss);

      ensureHeaders_(sheet);

      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return json_({
          ok: true,
          followups: []
        });
      }

      const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
      const followups = values
        .map(function(row) {
          return {
            Name: valueFromRow_(row, 'Name'),
            Email: valueFromRow_(row, 'Email')
          };
        })
        .filter(function(row) {
          return row.Email;
        });

      return json_({
        ok: true,
        followups: followups
      });
    }

    return json_({
      ok: true,
      message: 'Credit Repair single-session tracking webhook is running.',
      sheetName: SHEET_NAME,
      commandCenter: 'enabled'
    });
  } catch (error) {
    return json_({
      ok: false,
      error: error.message
    });
  }
}

function buildUpdatedSessionRow_(row, payload, now) {
  const tz = Session.getScriptTimeZone();
  const eventType = normalizeEventType_(payload.eventType);
  const step = getStep_(payload);
  const highestStep = getHigherStep_(valueFromRow_(row, 'Current Step'), step);
  const sessionId = getSessionId_(payload);
  const userKey = getUserKey_(payload, sessionId);
  const history = appendHistory_(valueFromRow_(row, 'Event History'), payload, now, step);
  const leadConverted = isLeadConversion_(eventType) || valueFromRow_(row, 'Lead Converted') === 'Yes';
  const salesConverted = isSalesConversion_(eventType) || valueFromRow_(row, 'Sales Converted') === 'Yes';
  const purchaseConverted = isPurchaseConversion_(payload, eventType) || valueFromRow_(row, 'Purchase Converted') === 'Yes';
  const status = getHighestFunnelStatus_(highestStep, leadConverted, salesConverted, purchaseConverted);

  setIfBlank_(row, 'First Seen Date', Utilities.formatDate(now, tz, 'EEEE, MMMM d, yyyy'));
  setIfBlank_(row, 'First Seen Time', Utilities.formatDate(now, tz, 'h:mm:ss a'));
  setIfBlank_(row, 'First Seen Timestamp', now);

  setValue_(row, 'Last Seen Date', Utilities.formatDate(now, tz, 'EEEE, MMMM d, yyyy'));
  setValue_(row, 'Last Seen Time', Utilities.formatDate(now, tz, 'h:mm:ss a'));
  setValue_(row, 'Last Seen Timestamp', now);

  setIfBlank_(row, 'Session ID', sessionId);
  setIfBlank_(row, 'User Key', userKey);

  setValue_(row, 'Current Event', eventType);
  setValue_(row, 'Current Step', highestStep);
  setValue_(row, 'Funnel Status', status);
  setValue_(row, 'Left Off At', getLeftOffAt_(highestStep, status));

  setValue_(row, 'Lead Converted', leadConverted ? 'Yes' : 'No');
  if (isLeadConversion_(eventType)) setIfBlank_(row, 'Lead Converted At', now);

  setValue_(row, 'Sales Converted', salesConverted ? 'Yes' : 'No');
  if (isSalesConversion_(eventType)) setIfBlank_(row, 'Sales Converted At', now);

  setValue_(row, 'Purchase Converted', purchaseConverted ? 'Yes' : 'No');
  if (isPurchaseConversion_(payload, eventType)) setIfBlank_(row, 'Purchase Converted At', now);

  setIfPresent_(row, 'Name', payload.name || payload.leadName || payload.fullName);
  setIfPresent_(row, 'Email', payload.email || payload.leadEmail);
  setIfPresent_(row, 'Phone', payload.phone || payload.leadPhone);
  setIfPresent_(row, 'Product', payload.product);
  setIfPresent_(row, 'Product Key', payload.productKey);
  setIfPresent_(row, 'Amount', money_(payload.amount));
  setIfPresent_(row, 'Currency', value_(payload.currency || 'usd').toUpperCase());
  setIfPresent_(row, 'Payment Status', payload.paymentStatus || payload.status);
  setIfPresent_(row, 'Payment Intent ID', payload.paymentIntentId);
  setIfPresent_(row, 'Customer ID', payload.customerId);
  setIfPresent_(row, 'Order Bump', boolText_(payload.bump || payload.orderBump));
  setIfPresent_(row, 'Download Type', payload.downloadType);
  setIfPresent_(row, 'Source', payload.source || 'credit-repair-toolkit');
  setIfPresent_(row, 'Page URL', payload.pageUrl);
  setIfPresent_(row, 'UTM Source', payload.utmSource);
  setIfPresent_(row, 'UTM Medium', payload.utmMedium);
  setIfPresent_(row, 'UTM Campaign', payload.utmCampaign);
  setIfPresent_(row, 'User Agent', payload.userAgent);
  setIfPresent_(row, 'Notes', payload.notes);

  updateEventTimestamp_(row, eventType, now);
  setValue_(row, 'Event Count', Number(valueFromRow_(row, 'Event Count') || 0) + 1);
  setValue_(row, 'Event History', history);
  setValue_(row, 'Raw JSON', JSON.stringify(payload));

  return row;
}

function findSessionRow_(sheet, payload) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { rowNumber: 0, values: null };

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const keys = getLookupKeys_(payload);
  const columnNames = ['Session ID', 'Payment Intent ID', 'Customer ID', 'Email', 'Phone', 'User Key'];

  for (let i = 0; i < values.length; i++) {
    for (let c = 0; c < columnNames.length; c++) {
      const rowValue = normalizeLookup_(valueFromRow_(values[i], columnNames[c]));
      if (rowValue && keys.indexOf(rowValue) !== -1) {
        return {
          rowNumber: i + 2,
          values: values[i]
        };
      }
    }
  }

  return { rowNumber: 0, values: null };
}

function getLookupKeys_(payload) {
  return [
    payload.sessionId,
    payload.checkoutSessionId,
    payload.paymentIntentId,
    payload.customerId,
    payload.email,
    payload.leadEmail,
    payload.phone,
    payload.leadPhone,
    getUserKey_(payload, getSessionId_(payload))
  ].map(normalizeLookup_).filter(Boolean);
}

function getSessionId_(payload) {
  return value_(
    payload.sessionId ||
    payload.checkoutSessionId ||
    payload.clientSessionId ||
    payload.paymentIntentId ||
    payload.customerId ||
    payload.email ||
    payload.leadEmail ||
    payload.phone ||
    payload.leadPhone
  );
}

function getUserKey_(payload, sessionId) {
  return value_(
    payload.userKey ||
    payload.fingerprint ||
    payload.visitorId ||
    payload.clientId ||
    sessionId
  );
}

function normalizeEventType_(eventType) {
  return String(eventType || '').trim().toLowerCase();
}

function getStep_(payload) {
  if (payload.step) return value_(payload.step);

  const eventType = normalizeEventType_(payload.eventType);
  const stepMap = {
    checkout_view: 'Step 1',
    lead_submit: 'Step 1',
    sales_view: 'Step 2',
    checkout_start: 'Step 3',
    payment_started: 'Step 3',
    payment_intent_created: 'Step 3',
    purchase: 'Step 4',
    sale: 'Step 4',
    order_submit: 'Step 4',
    payment_succeeded: 'Step 4',
    payment_success: 'Step 4',
    download: 'Step 5',
    product_download: 'Step 5'
  };

  return stepMap[eventType] || 'Step Unknown';
}

function getHigherStep_(currentStep, incomingStep) {
  return getStepRank_(incomingStep) >= getStepRank_(currentStep) ? incomingStep : currentStep;
}

function getStepRank_(step) {
  const match = String(step || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function getHighestFunnelStatus_(highestStep, leadConverted, salesConverted, purchaseConverted) {
  const rank = getStepRank_(highestStep);

  if (rank >= 5) return 'Product Downloaded';
  if (purchaseConverted || rank >= 4) return 'Sale Converted';
  if (rank >= 3) return 'Payment Started';
  if (salesConverted || rank >= 2) return 'Sales Page Viewed';
  if (leadConverted) return 'Lead Captured';
  if (rank >= 1) return 'Checkout Viewed';
  return 'In Progress';
}

function getLeftOffAt_(step, status) {
  if (status === 'Sale Converted' || status === 'Product Downloaded') return 'Completed';
  return step + ' - ' + status;
}

function isLeadConversion_(eventType) {
  return eventType === 'lead_submit';
}

function isSalesConversion_(eventType) {
  return ['sales_view', 'checkout_start', 'payment_started', 'payment_intent_created', 'purchase', 'sale', 'order_submit', 'payment_succeeded', 'payment_success'].indexOf(eventType) !== -1;
}

function isPurchaseConversion_(payload, eventType) {
  return ['purchase', 'sale', 'order_submit', 'payment_succeeded', 'payment_success'].indexOf(eventType) !== -1 ||
    isPurchasedStatus_(payload.paymentStatus || payload.status);
}

function updateEventTimestamp_(row, eventType, now) {
  if (eventType === 'checkout_view') setValue_(row, 'Checkout View At', now);
  if (eventType === 'lead_submit') setValue_(row, 'Lead Submit At', now);
  if (eventType === 'sales_view') setValue_(row, 'Sales View At', now);
  if (['checkout_start', 'payment_started', 'payment_intent_created'].indexOf(eventType) !== -1) setValue_(row, 'Payment Started At', now);
  if (['purchase', 'sale', 'order_submit', 'payment_succeeded', 'payment_success'].indexOf(eventType) !== -1) setValue_(row, 'Payment Succeeded At', now);
  if (['download', 'product_download'].indexOf(eventType) !== -1) setValue_(row, 'Download At', now);
}

function appendHistory_(existingHistory, payload, now, step) {
  const item = {
    at: now.toISOString(),
    eventType: normalizeEventType_(payload.eventType),
    step: step,
    email: payload.email || payload.leadEmail || '',
    amount: payload.amount || '',
    paymentStatus: payload.paymentStatus || payload.status || '',
    pageUrl: payload.pageUrl || ''
  };

  const history = existingHistory ? String(existingHistory) + '\n' : '';
  return history + JSON.stringify(item);
}

function sendToCommandCenter_(sheet, rowNumber, row, payload) {
  const token = PropertiesService.getScriptProperties().getProperty('COMMAND_CENTER_INGEST_TOKEN');
  if (!token) {
    return {
      ok: false,
      skipped: true,
      error: 'Missing COMMAND_CENTER_INGEST_TOKEN script property.'
    };
  }

  try {
    const lead = rowToCommandCenterLead_(row, rowNumber, payload);

    const response = UrlFetchApp.fetch(COMMAND_CENTER_WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      headers: {
        'x-syrus-ingest-token': token
      },
      payload: JSON.stringify({
        offer: COMMAND_CENTER_OFFER,
        sheetName: SHEET_NAME,
        spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
        lead: lead
      })
    });

    return {
      ok: response.getResponseCode() >= 200 && response.getResponseCode() < 300,
      status: response.getResponseCode()
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || 'Command Center sync failed.'
    };
  }
}

function rowToCommandCenterLead_(row, rowNumber, payload) {
  const status = valueFromRow_(row, 'Funnel Status') || valueFromRow_(row, 'Current Event') || 'New';

  return {
    rowNumber: rowNumber,
    sourceRowNumber: rowNumber,
    sessionId: valueFromRow_(row, 'Session ID'),
    userKey: valueFromRow_(row, 'User Key'),
    submittedAt: valueFromRow_(row, 'First Seen Timestamp'),
    updatedAt: new Date().toISOString(),

    offer: COMMAND_CENTER_OFFER,
    product: valueFromRow_(row, 'Product') || 'Credit Repair',
    productKey: valueFromRow_(row, 'Product Key'),

    name: valueFromRow_(row, 'Name'),
    fullName: valueFromRow_(row, 'Name'),
    email: valueFromRow_(row, 'Email'),
    phone: valueFromRow_(row, 'Phone'),

    status: status,
    currentStatus: status,
    currentStep: valueFromRow_(row, 'Current Step'),
    currentEvent: valueFromRow_(row, 'Current Event'),
    leftOffAt: valueFromRow_(row, 'Left Off At'),
    leadConverted: valueFromRow_(row, 'Lead Converted') === 'Yes',
    salesConverted: valueFromRow_(row, 'Sales Converted') === 'Yes',
    purchased: valueFromRow_(row, 'Purchase Converted') === 'Yes',

    leadConvertedAt: valueFromRow_(row, 'Lead Converted At'),
    salesConvertedAt: valueFromRow_(row, 'Sales Converted At'),
    purchaseConvertedAt: valueFromRow_(row, 'Purchase Converted At'),
    paymentAmount: valueFromRow_(row, 'Amount'),
    paymentStatus: valueFromRow_(row, 'Payment Status'),
    paymentIntentId: valueFromRow_(row, 'Payment Intent ID'),
    customerId: valueFromRow_(row, 'Customer ID'),

    source: valueFromRow_(row, 'Source') || 'Credit Repair Toolkit',
    pageUrl: valueFromRow_(row, 'Page URL'),
    website: valueFromRow_(row, 'Page URL'),
    utmSource: valueFromRow_(row, 'UTM Source'),
    utmMedium: valueFromRow_(row, 'UTM Medium'),
    campaign: valueFromRow_(row, 'UTM Campaign'),
    utmCampaign: valueFromRow_(row, 'UTM Campaign'),
    userAgent: valueFromRow_(row, 'User Agent'),

    orderBump: valueFromRow_(row, 'Order Bump'),
    downloadType: valueFromRow_(row, 'Download Type'),
    currency: valueFromRow_(row, 'Currency'),
    eventCount: valueFromRow_(row, 'Event Count'),
    eventHistory: valueFromRow_(row, 'Event History'),

    notes: buildCommandCenterNotes_(row),
    raw: payload
  };
}

function buildCommandCenterNotes_(row) {
  return [
    'Current Step: ' + (valueFromRow_(row, 'Current Step') || 'Not Available yet'),
    'Left Off At: ' + (valueFromRow_(row, 'Left Off At') || 'Not Available yet'),
    'Lead Converted: ' + (valueFromRow_(row, 'Lead Converted') || 'No'),
    'Sales Converted: ' + (valueFromRow_(row, 'Sales Converted') || 'No'),
    'Purchase Converted: ' + (valueFromRow_(row, 'Purchase Converted') || 'No'),
    'Product: ' + (valueFromRow_(row, 'Product') || 'Not Available yet'),
    'Product Key: ' + (valueFromRow_(row, 'Product Key') || 'Not Available yet'),
    'Amount: ' + (valueFromRow_(row, 'Amount') || 'Not Available yet'),
    'Currency: ' + (valueFromRow_(row, 'Currency') || 'Not Available yet'),
    'Order Bump: ' + (valueFromRow_(row, 'Order Bump') || 'Not Available yet'),
    'Download Type: ' + (valueFromRow_(row, 'Download Type') || 'Not Available yet'),
    'Original Notes: ' + (valueFromRow_(row, 'Notes') || 'Not Available yet')
  ].join('\n');
}

function getOrCreateSheet_(ss) {
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function ensureHeaders_(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
}

function formatSheet_(sheet) {
  sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .setFontWeight('bold')
    .setBackground('#2563EB')
    .setFontColor('#FFFFFF');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, sheet.getLastColumn());
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing request body.');
  }

  const payload = JSON.parse(e.postData.contents);

  if (!payload.eventType) {
    throw new Error('Missing eventType.');
  }

  return payload;
}

function blankRow_() {
  return HEADERS.map(function() {
    return '';
  });
}

function valueFromRow_(row, header) {
  const index = HEADERS.indexOf(header);
  if (index === -1) return '';
  return row[index] || '';
}

function setValue_(row, header, value) {
  const index = HEADERS.indexOf(header);
  if (index !== -1) row[index] = value === undefined || value === null ? '' : value;
}

function setIfBlank_(row, header, value) {
  if (!valueFromRow_(row, header)) setValue_(row, header, value);
}

function setIfPresent_(row, header, value) {
  if (value !== undefined && value !== null && value !== '') setValue_(row, header, value);
}

function normalizeLookup_(value) {
  return String(value || '').trim().toLowerCase();
}

function isPurchasedStatus_(value) {
  const normalized = normalizeLookup_(value);
  return ['paid', 'purchased', 'succeeded', 'success', 'completed', 'complete'].indexOf(normalized) !== -1;
}

function value_(value) {
  return value === undefined || value === null ? '' : String(value);
}

function boolText_(value) {
  if (value === undefined || value === null || value === '') return '';
  return value === true || value === 'true' || value === 'yes' ? 'Yes' : 'No';
}

function money_(amount) {
  if (amount === undefined || amount === null || amount === '') return '';
  const n = Number(amount || 0);
  if (!n) return '';
  return n > 999 ? (n / 100).toFixed(2) : n.toFixed(2);
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
