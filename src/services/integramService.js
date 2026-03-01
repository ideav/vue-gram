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

  async deleteObject(objectId) {
    return integramApiClient.deleteObject(objectId);
  }

  async executeReport(reportId, params = {}) {
    return integramApiClient.executeReport(reportId, params);
  }

  async createObject(typeId, value, requisites = {}, parentId = null) {
    return integramApiClient.createObject(typeId, value, requisites, parentId);
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
    return integramApiClient.saveObject(objectId, formData);
  }
}

const integramService = new IntegramService();
export default integramService;
