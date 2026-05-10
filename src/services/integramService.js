/**
 * Integram Service
 *
 * Additional service layer for Integram operations
 * Complements integramApiClient with higher-level operations
 */

import integramApiClient from './integramApiClient';
import {
  DASHBOARD_PANEL_SETTINGS_REQ_ID,
  dateToDashboardYmd,
  serializeDashboardPanelSettings
} from '@/utils/dashboard';

class IntegramService {
  constructor() {
    this.authToken = null
    this.xsrfToken = null
    this.userId = null
    this.userName = null
    this.userRole = null
    this.authDatabase = null
  }

  setServer(serverURL) {
    integramApiClient.setServer(serverURL)
  }

  setDatabase(database) {
    integramApiClient.setDatabase(database)
  }

  saveSession() {
    integramApiClient.saveSession()
  }

  loadSession() {
    return integramApiClient.loadSession()
  }

  isAuthenticated() {
    return integramApiClient.isAuthenticated()
  }

  async getObjects(typeId, filters = {}) {
    return integramApiClient.getObjectList(typeId, filters);
  }

  async get(endpoint, params = {}) {
    return integramApiClient.get(endpoint, params);
  }

  async post(endpoint, data = {}, options = {}) {
    return integramApiClient.post(endpoint, data, options);
  }

  async getMetadataRoot(params = {}) {
    return integramApiClient.getMetadata(params);
  }

  async getTerms(params = {}) {
    return integramApiClient.getTerms(params);
  }

  async deleteObject(objectId) {
    return integramApiClient.deleteObject(objectId);
  }

  async moveObjectUp(objectId) {
    return integramApiClient.moveObjectUp(objectId);
  }

  async executeReport(reportId, params = {}) {
    return integramApiClient.executeReport(reportId, params);
  }

  async getDashboardRecord(dashboardId) {
    return integramApiClient.get(`object/${dashboardId}`, {}, { jsonMode: 'JSON_OBJ' });
  }

  async getDashboardModel(dashboardId, period = '') {
    const params = { FR_modelID: dashboardId };
    if (period) params.period = period;
    return integramApiClient.get('report/Дэшборд', params, { jsonMode: 'JSON_KV' });
  }

  async getDashboardValues(from, to) {
    return integramApiClient.get('report/Дэшборд.ЗначенияЗаПериод', {
      Fr: dateToDashboardYmd(from),
      To: dateToDashboardYmd(to)
    }, { jsonMode: 'JSON_KV' });
  }

  async getDashboardPeriods(periodName, from, to) {
    return integramApiClient.get(`object/${periodName}`, {
      LIMIT: 10000,
      'FR_С': `>=${from}`,
      'FR_По': `<=${to}`
    }, { jsonMode: 'JSON_DATA' });
  }

  async getDashboardReport(reportId, from, to, params = {}) {
    return integramApiClient.executeReport(reportId, {
      FR_Date: from,
      TO_Date: to,
      ...params,
      _jsonFormat: 'JSON'
    });
  }

  async saveDashboardPanelSettings(panelId, settings) {
    return integramApiClient.setObjectRequisites(panelId, {
      [DASHBOARD_PANEL_SETTINGS_REQ_ID]: serializeDashboardPanelSettings(settings)
    });
  }

  async sendAiChatMessage({ message, history = [], reportId = null, database = null } = {}) {
    const payload = {
      message,
      history: JSON.stringify(history)
    }

    if (reportId !== null && reportId !== undefined) {
      payload.report_id = reportId
    }

    if (database) {
      payload.database = database
    }

    return integramApiClient.sendAiChatMessage(payload);
  }

  async createObject(typeId, value, requisites = {}, parentId = null) {
    return integramApiClient.createObject(typeId, value, requisites, parentId);
  }

  async createReport(name, requisites = {}) {
    return integramApiClient.createObject(22, name, requisites, 1);
  }

  async addReportColumn(reportId, { fieldId, nameInReport, formula, set } = {}) {
    const requisites = {};
    if (nameInReport !== undefined) requisites[100] = nameInReport;
    if (formula !== undefined) requisites[101] = formula;
    if (set !== undefined) requisites[132] = set;
    return integramApiClient.createObject(28, fieldId || 0, requisites, reportId);
  }

  async addReportFrom(reportId, tableId, alias, condition = null) {
    const requisites = {};
    if (alias !== undefined) requisites[265] = alias;
    if (condition !== null && condition !== undefined) requisites[266] = condition;
    return integramApiClient.createObject(44, tableId, requisites, reportId);
  }

  async updateObject(objectId, typeId, value, requisites = {}) {
    return integramApiClient.saveObject(objectId, typeId, value, requisites);
  }

  setSession(sessionData) {
    if (sessionData.token) {
      this.authToken = sessionData.token
      integramApiClient.token = sessionData.token
    }
    if (sessionData.xsrf) {
      this.xsrfToken = sessionData.xsrf
      integramApiClient.xsrfToken = sessionData.xsrf
    }
    if (sessionData.database) {
      this.authDatabase = sessionData.database
      integramApiClient.setDatabase(sessionData.database)
    }
  }

  async getEditObject(objectId) {
    return integramApiClient.getObjectEditData(objectId);
  }

  async getObjectRecord(objectId, params = {}) {
    return integramApiClient.getObjectRecord(objectId, params);
  }

  async getMetadata(typeId = null) {
    return typeId ? integramApiClient.getTypeMetadata(typeId) : integramApiClient.getMetadata();
  }

  async getReferenceOptions(requisiteId, objectId, restrict = null, query = null) {
    return integramApiClient.getReferenceOptions(requisiteId, objectId, restrict, query);
  }

  async setRequisites(objectId, requisites = {}) {
    return integramApiClient.setObjectRequisites(objectId, requisites);
  }

  async saveObject(objectId, formData) {
    return integramApiClient.setObjectRequisites(objectId, formData);
  }
}

const integramService = new IntegramService();
export default integramService;
