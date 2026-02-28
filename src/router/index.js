import { createRouter, createWebHistory } from 'vue-router'
import TasksView from '../views/TasksView.vue'
import KanbanView from '../views/KanbanView.vue'
import PartnersView from '../views/PartnersView.vue'
import DealsView from '../views/DealsView.vue'
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
    path: '/integram-table',
    name: 'IntegramTable',
    component: IntegramTableView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
