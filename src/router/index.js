import { createRouter, createWebHistory } from 'vue-router'

function legacyChildRedirect(target) {
  return (to) => {
    const pathMatch = to.params.pathMatch
    const rest = Array.isArray(pathMatch) ? pathMatch.join('/') : pathMatch
    const suffix = rest ? `/${rest}` : ''

    return {
      path: `/${to.params.database}/${target}${suffix}`,
      query: to.query,
      hash: to.hash
    }
  }
}

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'IntegramLogin',
    component: () => import('../views/integram/IntegramLogin.vue')
  },
  {
    path: '/:database',
    component: () => import('../views/integram/IntegramMain.vue'),
    meta: { requiresAuth: true },
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
        path: 'tables/:pathMatch(.*)*',
        redirect: legacyChildRedirect('table')
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
        path: 'smartq',
        name: 'IntegramSmartQuery',
        component: () => import('../views/integram/IntegramSmartQueryView.vue')
      },
      {
        path: 'report/:reportId?',
        name: 'IntegramReport',
        component: () => import('../views/integram/IntegramReportView.vue')
      },
      {
        path: 'query/:pathMatch(.*)*',
        redirect: legacyChildRedirect('report')
      },
      {
        path: 'form/:formId?',
        name: 'IntegramForm',
        component: () => import('../views/integram/IntegramFormView.vue')
      },
      {
        path: 'forms/:pathMatch(.*)*',
        redirect: legacyChildRedirect('form')
      },
      {
        path: 'myform/:formId?',
        name: 'IntegramMyForm',
        component: () => import('../views/integram/IntegramMyFormView.vue')
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

// Auth guard
router.beforeEach((to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    const token = localStorage.getItem('token')
    const session = localStorage.getItem('integram_session')
    if (!token && !session) {
      next({ path: '/login', query: { redirect: to.fullPath } })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
