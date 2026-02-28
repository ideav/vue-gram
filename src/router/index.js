import { createRouter, createWebHistory } from 'vue-router'
import TasksView from '../views/TasksView.vue'
import KanbanView from '../views/KanbanView.vue'
import PartnersView from '../views/PartnersView.vue'
import DealsView from '../views/DealsView.vue'
import SqlQueryView from '../views/SqlQueryView.vue'
import IntegramTableView from '../views/IntegramTableView.vue'

const routes = [
  {
    path: '/',
    redirect: '/tasks'
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: TasksView
  },
  {
    path: '/kanban',
    name: 'Kanban',
    component: KanbanView
  },
  {
    path: '/partners',
    name: 'Partners',
    component: PartnersView
  },
  {
    path: '/deals',
    name: 'Deals',
    component: DealsView
  },
  {
    path: '/sql-query',
    name: 'SqlQuery',
    component: SqlQueryView
  },
  {
    path: '/integram-table',
    name: 'IntegramTable',
    component: IntegramTableView
  },

  // Integram routes
  {
    path: '/integram/login',
    name: 'IntegramLogin',
    component: () => import('../views/integram/IntegramLogin.vue'),
    meta: { integram: true }
  },
  {
    path: '/integram/:database',
    component: () => import('../views/integram/IntegramMain.vue'),
    meta: { integram: true },
    children: [
      {
        path: '',
        name: 'IntegramLanding',
        component: () => import('../views/integram/IntegramLanding.vue')
      },
      {
        path: 'dict',
        name: 'IntegramDictionary',
        component: () => import('../views/integram/IntegramDictionary.vue')
      },
      {
        path: 'object/:typeId',
        name: 'IntegramObjectView',
        component: () => import('../views/integram/IntegramObjectView.vue')
      },
      {
        path: 'table',
        name: 'IntegramTableList',
        component: () => import('../views/integram/IntegramTableList.vue')
      },
      {
        path: 'table/:typeId',
        name: 'IntegramDataTableView',
        component: () => import('../views/integram/IntegramDataTableView.vue')
      },
      {
        path: 'edit_obj/:objectId',
        name: 'IntegramObjectEdit',
        component: () => import('../views/integram/IntegramObjectEdit.vue')
      },
      {
        path: 'edit_types',
        name: 'IntegramTypeEditor',
        component: () => import('../views/integram/IntegramTypeEditor.vue')
      },
      {
        path: 'sql',
        name: 'IntegramSql',
        component: () => import('../views/integram/IntegramSqlView.vue')
      },
      {
        path: 'report/:reportId?',
        name: 'IntegramReport',
        component: () => import('../views/integram/IntegramReportView.vue')
      },
      {
        path: 'form/:formId?',
        name: 'IntegramForm',
        component: () => import('../views/integram/IntegramFormView.vue')
      },
      {
        path: 'upload',
        name: 'IntegramUpload',
        component: () => import('../views/integram/IntegramUploadView.vue')
      },
      {
        path: 'dir_admin',
        name: 'IntegramDirAdmin',
        component: () => import('../views/integram/IntegramDirAdmin.vue')
      },
      {
        path: 'info',
        name: 'IntegramInfo',
        component: () => import('../views/integram/IntegramInfoView.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
