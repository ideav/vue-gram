/**
 * Integram Service
 *
 * Additional service layer for Integram operations
 * Complements integramApiClient with higher-level operations
 */

import integramApiClient from './integramApiClient';

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

  async getObjects(typeId, filters = {}) {
    return integramApiClient.getObjectList(typeId, filters);
  }

  async get(endpoint, params = {}) {
    return integramApiClient.get(endpoint, params);
  }

  async post(endpoint, data = {}, options = {}) {
    return integramApiClient.post(endpoint, data, options);
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

  async getMetadata(typeId) {
    return integramApiClient.getTypeMetadata(typeId);
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
