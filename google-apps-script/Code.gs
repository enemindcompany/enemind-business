/**
 * Enermind Business Apps Script bridge.
 *
 * Run setupEnermindWorkbooks() from a private Apps Script project as the owner.
 * It creates separate private marketplace, worker, learner, and admin spreadsheets
 * plus a private Google Drive folder structure.
 * Deploy as a Web App (execute as owner) only after setting ENERMIND_API_SECRET
 * in Project Settings > Script properties. The browser must NEVER call this URL
 * with the secret. A trusted Supabase Edge Function calls it after verifying Firebase.
 */
const ENERMIND_SHEETS = {
  Sellers: [
    'listing_id','seller_uid','display_name','country','service_category','title',
    'description','price_amount','currency','whatsapp_phone','whatsapp_group_link',
    'public_contact_consent','availability','verification_status','created_at','updated_at'
  ],
  Buyers: [
    'buyer_uid','email','display_name','country','created_at','updated_at'
  ],
  Buyer_Social_Contacts: [
    'contact_id','buyer_uid','contact_label','country','platform','profile_url',
    'consent_or_public_basis_confirmed','status','created_at','updated_at'
  ],
  Work_Requests: [
    'request_id','buyer_uid','title','work_category','description','required_tools',
    'data_sensitivity','deadline','budget_amount','budget_currency','status','drive_folder_id','created_at','updated_at'
  ],
  Task_Applications: [
    'application_id','request_id','worker_uid','proposal','bid_amount','currency',
    'status','created_at','updated_at'
  ],
  Deliverables: [
    'deliverable_id','request_id','worker_uid','google_doc_url','google_sheet_url',
    'notes','review_status','submitted_at','reviewed_at'
  ],
  Buyer_Activity: [
    'activity_id','buyer_uid','listing_id','request_id','activity_type',
    'completion_status','created_at','updated_at'
  ],
  Learning_Progress: [
    'progress_id','learner_uid','course_id','module_id','status','score','updated_at'
  ],
  Categories: ['category_id','name','description','active'],
  Audit_Log: [
    'log_id','actor_uid','action','record_type','record_id','result','created_at','error_code'
  ]
};

const ENERMIND_BOOK_GROUPS = {
  MARKETPLACE: ['Sellers', 'Buyers', 'Buyer_Social_Contacts', 'Buyer_Activity', 'Categories'],
  WORKERS: ['Work_Requests', 'Task_Applications', 'Deliverables'],
  LEARNERS: ['Learning_Progress'],
  ADMIN: ['Audit_Log']
};

const ENERMIND_DRIVE_FOLDERS = {
  MARKETPLACE: 'Marketplace Records',
  WORKERS: 'Worker Projects',
  LEARNERS: 'Learner Academy',
  HEALTH_FINANCE_SAMPLES: 'Health Finance Sample Data',
  DELIVERABLES: 'Project Deliverables',
  ADMIN: 'Admin Reports and Audit'
};

function setupEnermindWorkbooks() {
  const props = PropertiesService.getScriptProperties();
  const root = getOrCreateFolder_('ENERMIND_ROOT_FOLDER_ID', 'Enermind Business Storage');
  const folderIds = {};
  Object.entries(ENERMIND_DRIVE_FOLDERS).forEach(([key, name]) => {
    folderIds[key] = getOrCreateChildFolder_(root, 'DRIVE_' + key + '_FOLDER_ID', name).getId();
  });

  const workbookIds = {};
  Object.entries(ENERMIND_BOOK_GROUPS).forEach(([group, tabNames]) => {
    const propertyKey = 'ENERMIND_' + group + '_SPREADSHEET_ID';
    let id = props.getProperty(propertyKey);
    let ss;
    if (id) {
      ss = SpreadsheetApp.openById(id);
    } else {
      ss = SpreadsheetApp.create('Enermind ' + ({MARKETPLACE:'Marketplace', WORKERS:'Worker Operations', LEARNERS:'Learner Academy', ADMIN:'Admin Operations'}[group]));
      id = ss.getId();
      props.setProperty(propertyKey, id);
      const destinationFolderKey = ({ MARKETPLACE: 'MARKETPLACE', WORKERS: 'WORKERS', LEARNERS: 'LEARNERS', ADMIN: 'ADMIN' })[group];
      DriveApp.getFileById(id).moveTo(DriveApp.getFolderById(folderIds[destinationFolderKey]));
    }
    workbookIds[group] = { id: id, url: ss.getUrl(), name: ss.getName() };

    tabNames.forEach(name => {
      const headers = ENERMIND_SHEETS[name];
      let sheet = ss.getSheetByName(name);
      if (!sheet) sheet = ss.insertSheet(name);
      const lastColumn = Math.max(sheet.getLastColumn() || 1, headers.length);
      const existing = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      const hasData = sheet.getLastRow() > 1;
      if (!hasData || existing.filter(String).length === 0) {
        sheet.clear();
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      } else {
        const current = existing.slice(0, headers.length);
        if (headers.some((h, i) => current[i] !== h)) {
          throw new Error('Header mismatch in ' + name + '. Back up and reconcile that tab before rerunning setup.');
        }
      }
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setWrap(true);
      sheet.autoResizeColumns(1, Math.min(headers.length, 8));
    });

    // Remove the default empty Sheet1 only when it is not a required tab and has no data.
    const defaultSheet = ss.getSheetByName('Sheet1');
    if (defaultSheet && tabNames.indexOf('Sheet1') < 0 && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
      ss.deleteSheet(defaultSheet);
    }
  });

  setListValidation_('Sellers', 'availability', ['available','unavailable','paused']);
  setListValidation_('Sellers', 'verification_status', ['pending','verified','rejected','suspended']);
  setListValidation_('Work_Requests', 'status', ['draft','open','in_progress','submitted','completed','cancelled','disputed']);
  setListValidation_('Work_Requests', 'data_sensitivity', ['sample','deidentified']);
  setListValidation_('Task_Applications', 'status', ['pending','accepted','rejected','withdrawn']);
  setListValidation_('Deliverables', 'review_status', ['submitted','revision_requested','approved','rejected']);
  setListValidation_('Buyer_Activity', 'completion_status', ['not_started','pending','completed','verified']);
  setListValidation_('Learning_Progress', 'status', ['not_started','in_progress','completed']);

  const categorySheet = getSheet_('Categories');
  if (categorySheet.getLastRow() === 1) {
    categorySheet.getRange(2,1,5,4).setValues([
      [Utilities.getUuid(),'Google Sheets automation','Formulas, dashboards, data validation and permitted workflow automation',true],
      [Utilities.getUuid(),'Google Docs editing','Formatting, proofreading and document structuring',true],
      [Utilities.getUuid(),'Health data support','Authorised data entry using sample or de-identified records',true],
      [Utilities.getUuid(),'Finance data support','Bookkeeping support, data cleaning and reconciliation',true],
      [Utilities.getUuid(),'Data cleaning','Formatting, deduplication and validation of permitted datasets',true]
    ]);
  }

  return { ok: true, workbooks: workbookIds, driveRoot: { id: root.getId(), url: root.getUrl() }, driveFolders: folderIds };
}

function getOrCreateFolder_(propertyKey, name) {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty(propertyKey);
  if (existingId) {
    try { return DriveApp.getFolderById(existingId); } catch (_) {}
  }
  const folder = DriveApp.createFolder(name);
  props.setProperty(propertyKey, folder.getId());
  return folder;
}

function getOrCreateChildFolder_(parent, propertyKey, name) {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty(propertyKey);
  if (existingId) {
    try { return DriveApp.getFolderById(existingId); } catch (_) {}
  }
  const matches = parent.getFoldersByName(name);
  const folder = matches.hasNext() ? matches.next() : parent.createFolder(name);
  props.setProperty(propertyKey, folder.getId());
  return folder;
}

function workbookGroupForSheet_(sheetName) {
  for (const group in ENERMIND_BOOK_GROUPS) {
    if (ENERMIND_BOOK_GROUPS[group].indexOf(sheetName) >= 0) return group;
  }
  throw new Error('Unknown Enermind sheet: ' + sheetName);
}

function getWorkbookForSheet_(sheetName) {
  const group = workbookGroupForSheet_(sheetName);
  const id = PropertiesService.getScriptProperties().getProperty('ENERMIND_' + group + '_SPREADSHEET_ID');
  if (!id) throw new Error('Enermind workbook is not configured. Run setupEnermindWorkbooks() first.');
  return SpreadsheetApp.openById(id);
}

function getSheet_(sheetName) {
  const sheet = getWorkbookForSheet_(sheetName).getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet is missing: ' + sheetName + '. Run setupEnermindWorkbooks() first.');
  return sheet;
}

function getWorkerProjectFolder_() {
  const id = PropertiesService.getScriptProperties().getProperty('DRIVE_WORKERS_FOLDER_ID');
  if (!id) throw new Error('Drive folders are not configured. Run setupEnermindWorkbooks() first.');
  return DriveApp.getFolderById(id);
}

function setListValidation_(sheetName, header, values) {
  const sheet = getSheet_(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = headers.indexOf(header) + 1;
  if (!col) return;
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
  sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(rule);
}

function doPost(e) {
  try {
    const input = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('ENERMIND_API_SECRET');
    if (!expectedSecret || !constantTimeEquals_(String(input.secret || ''), expectedSecret)) {
      return jsonOutput_({ ok: false, error: 'Unauthorized' });
    }
    const actorUid = String(input.actorUid || '').trim();
    if (!actorUid || actorUid.length > 128) return jsonOutput_({ ok: false, error: 'Invalid actor' });

    let result;
    switch (input.action) {
      case 'listSellers':
        result = listSellers_(input.filters || {});
        break;
      case 'listMyListings':
        result = listMyListings_(actorUid);
        break;
      case 'listBuyerActivity':
        result = listBuyerActivity_(actorUid);
        break;
      case 'listBuyerSocialContacts':
        result = listBuyerSocialContacts_(actorUid);
        break;
      case 'submitSeller':
        result = submitSeller_(actorUid, input.record || {});
        break;
      case 'createWorkRequest':
        result = createWorkRequest_(actorUid, input.record || {});
        break;
      case 'listWorkRequests':
        result = listWorkRequests_(input.filters || {});
        break;
      case 'applyToTask':
        result = applyToTask_(actorUid, input.record || {});
        break;
      case 'listMyTasks':
        result = listMyTasks_(actorUid);
        break;
      case 'submitDeliverable':
        result = submitDeliverable_(actorUid, input.record || {});
        break;
      case 'addBuyerSocialContact':
        result = addBuyerSocialContact_(actorUid, input.record || {});
        break;
      case 'recordBuyerActivity':
        result = recordBuyerActivity_(actorUid, input.record || {});
        break;
      case 'health':
        result = { status: 'ok', version: '1.0.0' };
        break;
      default:
        return jsonOutput_({ ok: false, error: 'Unsupported action' });
    }
    return jsonOutput_({ ok: true, data: result });
  } catch (err) {
    safeLog_('system', 'request_failed', 'request', '', 'error', 'SCRIPT_ERROR');
    return jsonOutput_({ ok: false, error: 'Request could not be completed' });
  }
}

function listMyListings_(actorUid) {
  return readObjects_('Sellers').filter(r => String(r.seller_uid) === actorUid).map(r => ({
    listingId: r.listing_id, title: r.title, category: r.service_category,
    country: r.country, availability: r.availability,
    verificationStatus: r.verification_status, updatedAt: r.updated_at
  }));
}

function listBuyerSocialContacts_(actorUid) {
  return readObjects_('Buyer_Social_Contacts').filter(r => String(r.buyer_uid) === actorUid).map(r => ({
    contactId: r.contact_id, title: r.contact_label, country: r.country,
    category: r.platform, description: r.profile_url, status: r.status,
    updatedAt: r.updated_at
  }));
}

function listBuyerActivity_(actorUid) {
  const requests = readObjects_('Work_Requests');
  const listings = readObjects_('Sellers');
  return readObjects_('Buyer_Activity').filter(r => String(r.buyer_uid) === actorUid).map(r => {
    const request = requests.find(x => String(x.request_id) === String(r.request_id));
    const listing = listings.find(x => String(x.listing_id) === String(r.listing_id));
    return {
      activityId: r.activity_id, listingId: r.listing_id, requestId: r.request_id,
      title: request ? request.title : (listing ? listing.title : 'Buyer activity'),
      description: `${r.activity_type || 'activity'} · ${r.completion_status || 'pending'}`,
      activityType: r.activity_type, completionStatus: r.completion_status,
      createdAt: r.created_at, updatedAt: r.updated_at
    };
  });
}

function listSellers_(filters) {
  const rows = readObjects_('Sellers');
  const country = String(filters.country || '').trim().toLowerCase();
  const category = String(filters.category || '').trim().toLowerCase();
  const q = String(filters.query || '').trim().toLowerCase();
  return rows.filter(r =>
    r.verification_status === 'verified' &&
    r.availability === 'available' &&
    String(r.public_contact_consent).toLowerCase() === 'true' &&
    (!country || String(r.country).toLowerCase() === country) &&
    (!category || String(r.service_category).toLowerCase() === category) &&
    (!q || [r.display_name,r.title,r.description,r.country,r.service_category].some(v => String(v || '').toLowerCase().includes(q)))
  ).map(r => ({
    listingId: r.listing_id, displayName: r.display_name, country: r.country,
    category: r.service_category, title: r.title, description: r.description,
    priceAmount: r.price_amount, currency: r.currency,
    whatsappPhone: r.whatsapp_phone, whatsappGroupLink: r.whatsapp_group_link
  }));
}

function submitSeller_(actorUid, r) {
  const required = ['displayName','country','serviceCategory','title','description','whatsappPhone'];
  required.forEach(k => { if (!String(r[k] || '').trim()) throw new Error('Missing required field: ' + k); });
  const phone = String(r.whatsappPhone).replace(/[\s().-]/g, '');
  if (!/^\+[1-9]\d{3,14}$/.test(phone)) throw new Error('Use an international WhatsApp number.');
  if (String(r.publicContactConsent) !== 'true') throw new Error('Seller must consent to public contact display.');
  const now = new Date().toISOString();
  const row = {
    listing_id: Utilities.getUuid(), seller_uid: actorUid,
    display_name: clean_(r.displayName, 120), country: clean_(r.country, 80),
    service_category: clean_(r.serviceCategory, 80), title: clean_(r.title, 160),
    description: clean_(r.description, 2000), price_amount: clean_(r.priceAmount, 40),
    currency: clean_(r.currency, 8), whatsapp_phone: phone,
    whatsapp_group_link: validateWhatsAppGroup_(r.whatsappGroupLink),
    public_contact_consent: true, availability: 'available',
    verification_status: 'pending', created_at: now, updated_at: now
  };
  appendObject_('Sellers', row);
  safeLog_(actorUid, 'submit_seller', 'seller', row.listing_id, 'success', '');
  return { listingId: row.listing_id, verificationStatus: 'pending' };
}

function createWorkRequest_(actorUid, r) {
  if (String(r.safeDataConfirmation) !== 'true') {
    throw new Error('Confirm that the request contains no real patient identifiers, bank credentials, or other restricted data.');
  }
  ['title','workCategory','description','dataSensitivity'].forEach(k => {
    if (!String(r[k] || '').trim()) throw new Error('Missing required field: ' + k);
  });
  const sensitivity = String(r.dataSensitivity);
  if (!['sample','deidentified'].includes(sensitivity)) {
    throw new Error('Only sample or de-identified datasets are accepted until the project passes a separate security and legal review.');
  }
  const now = new Date().toISOString();
  const requestId = Utilities.getUuid();
  const title = clean_(r.title, 160);
  const taskFolder = getWorkerProjectFolder_().createFolder('Request ' + requestId + ' - ' + title.slice(0, 70));
  const row = {
    request_id: requestId, buyer_uid: actorUid,
    title: title, work_category: clean_(r.workCategory, 80),
    description: clean_(r.description, 4000), required_tools: clean_(r.requiredTools, 500),
    data_sensitivity: sensitivity, deadline: clean_(r.deadline, 40),
    budget_amount: clean_(r.budgetAmount, 40), budget_currency: clean_(r.budgetCurrency, 8),
    status: 'open', drive_folder_id: taskFolder.getId(), created_at: now, updated_at: now
  };
  appendObject_('Work_Requests', row);
  appendObject_('Buyer_Activity', {
    activity_id: Utilities.getUuid(), buyer_uid: actorUid, listing_id: '',
    request_id: row.request_id, activity_type: 'work_request_created',
    completion_status: 'pending', created_at: now, updated_at: now
  });
  safeLog_(actorUid, 'create_work_request', 'work_request', row.request_id, 'success', '');
  return { requestId: row.request_id, status: row.status };
}

function listWorkRequests_(filters) {
  const category = String(filters.category || '').trim().toLowerCase();
  const q = String(filters.query || '').trim().toLowerCase();
  return readObjects_('Work_Requests').filter(r =>
    r.status === 'open' &&
    ['sample','deidentified'].includes(String(r.data_sensitivity)) &&
    (!category || String(r.work_category).toLowerCase() === category) &&
    (!q || [r.title,r.description,r.work_category,r.required_tools].some(v => String(v || '').toLowerCase().includes(q)))
  ).map(r => ({
    requestId: r.request_id, title: r.title, category: r.work_category,
    description: r.description, requiredTools: r.required_tools,
    deadline: r.deadline, budgetAmount: r.budget_amount, budgetCurrency: r.budget_currency,
    dataSensitivity: r.data_sensitivity, status: r.status
  }));
}

function listMyTasks_(actorUid) {
  const requests = readObjects_('Work_Requests');
  return readObjects_('Task_Applications').filter(a =>
    String(a.worker_uid) === actorUid && String(a.status) === 'accepted'
  ).map(a => {
    const request = requests.find(r => String(r.request_id) === String(a.request_id));
    if (!request) return null;
    return {
      requestId: request.request_id, title: request.title, category: request.work_category,
      description: request.description, status: request.status,
      applicationId: a.application_id
    };
  }).filter(Boolean);
}

function submitDeliverable_(actorUid, r) {
  const requestId = String(r.requestId || '').trim();
  if (!requestId) throw new Error('Request ID is required.');
  const accepted = readObjects_('Task_Applications').some(a =>
    String(a.request_id) === requestId && String(a.worker_uid) === actorUid && String(a.status) === 'accepted'
  );
  if (!accepted) throw new Error('Only an accepted worker can submit a deliverable for this task.');
  const docUrl = validateGoogleWorkspaceUrl_(r.googleDocUrl, 'docs.google.com/document');
  const sheetUrl = validateGoogleWorkspaceUrl_(r.googleSheetUrl, 'docs.google.com/spreadsheets');
  if (!docUrl && !sheetUrl) throw new Error('Provide a Google Docs or Google Sheets deliverable URL.');
  const now = new Date().toISOString();
  const row = {
    deliverable_id: Utilities.getUuid(), request_id: requestId, worker_uid: actorUid,
    google_doc_url: docUrl, google_sheet_url: sheetUrl,
    notes: clean_(r.notes, 2000), review_status: 'submitted',
    submitted_at: now, reviewed_at: ''
  };
  appendObject_('Deliverables', row);
  safeLog_(actorUid, 'submit_deliverable', 'deliverable', row.deliverable_id, 'success', '');
  return { deliverableId: row.deliverable_id, reviewStatus: row.review_status };
}

function validateGoogleWorkspaceUrl_(value, requiredPrefix) {
  const s = String(value || '').trim();
  if (!s) return '';
  const host = getHttpsHost_(s);
  if (!host || !host.endsWith('docs.google.com')) throw new Error('Use a valid Google Docs or Sheets URL.');
  if (!s.includes(requiredPrefix)) throw new Error('URL does not match the requested Google workspace file type.');
  return s;
}

function applyToTask_(actorUid, r) {
  const requestId = String(r.requestId || '').trim();
  const proposal = clean_(r.proposal, 2000);
  if (!requestId || !proposal) throw new Error('Request ID and proposal are required.');
  const task = readObjects_('Work_Requests').find(x => String(x.request_id) === requestId && x.status === 'open');
  if (!task) throw new Error('Work request is not open.');
  const sheet = getSheet_('Task_Applications');
  const existing = readObjects_('Task_Applications').find(x => String(x.request_id) === requestId && String(x.worker_uid) === actorUid && !['withdrawn','rejected'].includes(String(x.status)));
  if (existing) return { applicationId: existing.application_id, status: existing.status, duplicate: true };
  const now = new Date().toISOString();
  const row = {
    application_id: Utilities.getUuid(), request_id: requestId, worker_uid: actorUid,
    proposal: proposal, bid_amount: clean_(r.bidAmount, 40), currency: clean_(r.currency, 8),
    status: 'pending', created_at: now, updated_at: now
  };
  appendObject_('Task_Applications', row);
  safeLog_(actorUid, 'apply_to_task', 'application', row.application_id, 'success', '');
  return { applicationId: row.application_id, status: row.status };
}

function addBuyerSocialContact_(actorUid, r) {
  const label = clean_(r.contactLabel, 120);
  const country = clean_(r.country, 80);
  const platform = clean_(r.platform, 30).toLowerCase();
  const profileUrl = clean_(r.profileUrl, 2048);
  if (!label || !profileUrl || String(r.consentOrPublicBasisConfirmed) !== 'true') {
    throw new Error('A label, public profile URL, and consent/public-basis confirmation are required.');
  }
  if (!['facebook','instagram','x','wechat','linkedin','tiktok','other'].includes(platform)) {
    throw new Error('Unsupported platform.');
  }
  const host = getHttpsHost_(profileUrl);
  if (!host) throw new Error('Enter a valid HTTPS public profile URL.');
  const platformHosts = {
    facebook: ['facebook.com'], instagram: ['instagram.com'],
    x: ['x.com','twitter.com'], wechat: ['wechat.com','weixin.qq.com'],
    linkedin: ['linkedin.com'], tiktok: ['tiktok.com']
  };
  const expectedHosts = platformHosts[platform];
  if (expectedHosts && !expectedHosts.some(domain => host === domain || host.endsWith('.' + domain))) {
    throw new Error('The profile URL does not match the selected platform.');
  }
  const now = new Date().toISOString();
  const row = {
    contact_id: Utilities.getUuid(), buyer_uid: actorUid, contact_label: label,
    country: country, platform: platform, profile_url: profileUrl,
    consent_or_public_basis_confirmed: true, status: 'active',
    created_at: now, updated_at: now
  };
  appendObject_('Buyer_Social_Contacts', row);
  safeLog_(actorUid, 'add_buyer_social_contact', 'buyer_social_contact', row.contact_id, 'success', '');
  return { contactId: row.contact_id, status: row.status };
}

function recordBuyerActivity_(actorUid, r) {
  if (!r.listingId && !r.requestId) throw new Error('A listing or request ID is required.');
  const now = new Date().toISOString();
  const row = {
    activity_id: Utilities.getUuid(), buyer_uid: actorUid,
    listing_id: clean_(r.listingId, 80), request_id: clean_(r.requestId, 80),
    activity_type: clean_(r.activityType || 'viewed', 40),
    completion_status: clean_(r.completionStatus || 'not_started', 40),
    created_at: now, updated_at: now
  };
  appendObject_('Buyer_Activity', row);
  safeLog_(actorUid, 'record_buyer_activity', 'buyer_activity', row.activity_id, 'success', '');
  return { activityId: row.activity_id };
}

function readObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(String);
  return values.filter(row => row.some(v => v !== '' && v !== null)).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] instanceof Date ? row[i].toISOString() : row[i]);
    return obj;
  });
}

function appendObject_(sheetName, obj) {
  const sheet = getSheet_(sheetName);
  if (!sheet) throw new Error('Workbook not initialised.');
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet.appendRow(headers.map(h => Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : ''));
  } finally {
    lock.releaseLock();
  }
}

function validateWhatsAppGroup_(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  const host = getHttpsHost_(s);
  if (host !== 'chat.whatsapp.com') throw new Error('Invalid WhatsApp group invite URL.');
  return s;
}

function getHttpsHost_(value) {
  const s = String(value || '').trim();
  const match = s.match(/^https:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
  if (!match) return '';
  const authority = match[1];
  if (authority.includes('@')) return '';
  return authority.toLowerCase().replace(/:\d+$/, '');
}

function clean_(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function safeLog_(actorUid, action, recordType, recordId, result, errorCode) {
  try {
    const sheet = getSheet_('Audit_Log');
    if (!sheet) return;
    appendObject_('Audit_Log', {
      log_id: Utilities.getUuid(), actor_uid: clean_(actorUid, 128),
      action: clean_(action, 80), record_type: clean_(recordType, 80),
      record_id: clean_(recordId, 128), result: clean_(result, 40),
      created_at: new Date().toISOString(), error_code: clean_(errorCode, 80)
    });
  } catch (_) {}
}

function constantTimeEquals_(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
