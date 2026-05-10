<template>
  <div v-if="node" class="org-node-wrap">
    <div class="org-node" :class="levelClass" :title="node.name">
      <div class="org-node-dept">{{ node.name }}</div>

      <template v-for="head in node.heads" :key="`head-${head.tab || head.name}`">
        <div class="org-node-head" :title="head.position">
          <i class="fi fi-rr-user"></i>
          <span>{{ head.name }}</span>
        </div>
      </template>

      <div v-if="node.heads.length && visibleEmployees.length" class="org-node-head-divider"></div>

      <div v-if="staffCount > 2" class="org-node-count">{{ staffCount }} сотр.</div>

      <div v-for="employee in visibleEmployees" :key="`employee-${employee.tab || employee.name}`" class="org-node-employee" :title="employee.position">
        <i class="fi fi-rr-user"></i>
        <span>{{ employee.name }}</span>
      </div>

      <button v-if="hasHiddenEmployees" type="button" class="org-node-expand" @click="expanded = true">
        еще {{ hiddenEmployeeCount }}...
      </button>
    </div>

    <template v-if="childIds.length">
      <div class="org-vline"></div>
      <div class="org-children-row" :class="{ single: childIds.length === 1 }">
        <div
          v-for="childId in childIds"
          :key="childId"
          class="org-child"
        >
          <div class="org-vline child"></div>
          <SportzaniaOrgNode
            :chart="chart"
            :node-id="childId"
            :level="level + 1"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  name: 'SportzaniaOrgNode',
  props: {
    chart: {
      type: Object,
      required: true
    },
    nodeId: {
      type: String,
      required: true
    },
    level: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      expanded: false
    }
  },
  computed: {
    node() {
      return this.chart.departments?.[this.nodeId] || null
    },
    childIds() {
      return this.chart.children?.[this.nodeId] || []
    },
    levelClass() {
      return this.level === 0 ? 'root' : `level-${Math.min(this.level, 4)}`
    },
    staffCount() {
      return (this.node?.heads?.length || 0) + (this.node?.employees?.length || 0)
    },
    visibleEmployees() {
      const employees = this.node?.employees || []
      return this.expanded ? employees : employees.slice(0, 2)
    },
    hiddenEmployeeCount() {
      return Math.max(0, (this.node?.employees?.length || 0) - this.visibleEmployees.length)
    },
    hasHiddenEmployees() {
      return this.hiddenEmployeeCount > 0
    }
  }
}
</script>

<style scoped>
.org-node-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.org-node {
  background: var(--surface, #fff);
  border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  padding: 8px 12px;
  min-width: 140px;
  max-width: 210px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.org-node:hover {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
  border-color: #2563eb;
}

.org-node.root {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
  min-width: 180px;
}

.org-node.level-1 {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.org-node.level-2 {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.org-node.level-3 {
  background: #fefce8;
  border-color: #fde68a;
}

.org-node.level-4 {
  background: #fdf4ff;
  border-color: #e9d5ff;
}

.org-node-dept {
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 4px;
}

.org-node.level-1 .org-node-dept {
  color: #1d4ed8;
}

.org-node.level-2 .org-node-dept {
  color: #15803d;
}

.org-node.level-3 .org-node-dept {
  color: #92400e;
}

.org-node.level-4 .org-node-dept {
  color: #7e22ce;
}

.org-node.root .org-node-dept,
.org-node.root .org-node-head,
.org-node.root .org-node-employee,
.org-node.root .org-node-count {
  color: #fff;
}

.org-node-count {
  font-size: 0.68rem;
  color: var(--text-secondary, #64748b);
  margin-bottom: 3px;
}

.org-node-head,
.org-node-employee {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 0.72rem;
  line-height: 1.3;
  margin-top: 2px;
}

.org-node-head {
  font-weight: 700;
  color: var(--text-primary, #374151);
}

.org-node-employee {
  color: var(--text-secondary, #64748b);
}

.org-node-head i,
.org-node-employee i {
  font-size: 0.7rem;
  flex-shrink: 0;
}

.org-node-head-divider {
  width: 60%;
  height: 1px;
  background: var(--border-color, #e2e8f0);
  margin: 3px auto;
}

.org-node-expand {
  font: inherit;
  font-size: 0.65rem;
  color: #2563eb;
  cursor: pointer;
  margin-top: 2px;
  text-decoration: underline;
  background: none;
  border: none;
  padding: 0;
}

.org-vline {
  width: 2px;
  height: 16px;
  background: var(--border-color, #cbd5e1);
  flex-shrink: 0;
}

.org-children-row {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  position: relative;
}

.org-children-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 24px;
  right: 24px;
  height: 2px;
  background: var(--border-color, #cbd5e1);
}

.org-children-row.single::before {
  display: none;
}

.org-child {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 8px;
  position: relative;
}

.org-vline.child {
  z-index: 1;
}
</style>
