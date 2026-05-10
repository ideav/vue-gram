<template>
  <div class="cabinet-view">
    <header class="cabinet-topbar">
      <div>
        <p class="cabinet-kicker">{{ database }} / personal cabinet</p>
        <h1>Личный кабинет</h1>
      </div>
      <div class="cabinet-identity">
        <div class="cabinet-avatar" :style="avatarStyle">
          <span v-if="!profile.photo">{{ profileInitial }}</span>
        </div>
        <div>
          <strong>{{ profile.email || profile.name || 'Пользователь' }}</strong>
          <span>{{ profile.plan || 'Free' }}</span>
        </div>
      </div>
    </header>

    <div v-if="loading" class="cabinet-loading">
      <ProgressSpinner style="width: 42px; height: 42px" strokeWidth="4" />
      <span>Загрузка данных...</span>
    </div>

    <Message v-else-if="loadError" severity="error" class="cabinet-message">
      {{ loadError }}
    </Message>

    <div v-else class="cabinet-layout">
      <aside class="cabinet-nav" aria-label="Разделы личного кабинета">
        <button
          v-for="item in sections"
          :key="item.id"
          :data-testid="`cabinet-tab-${item.id}`"
          type="button"
          class="cabinet-nav-item"
          :class="{ active: activeSection === item.id }"
          @click="selectSection(item.id)"
        >
          <i :class="item.icon" aria-hidden="true"></i>
          <span>{{ item.label }}</span>
        </button>
        <button type="button" class="cabinet-nav-item disabled" disabled title="Скоро">
          <i class="fi fi-rr-shop" aria-hidden="true"></i>
          <span>Маркетплейс</span>
        </button>
      </aside>

      <main class="cabinet-content">
        <section v-if="activeSection === 'databases'" class="cabinet-section">
          <div class="section-header-row">
            <div>
              <h2>Мои базы данных</h2>
              <p>{{ databases.length }} БД, {{ summary.totalUsage }} ед. ресурсов</p>
            </div>
            <div class="database-actions">
              <label class="icon-input" title="Поиск по базам данных">
                <i class="fi fi-rr-search" aria-hidden="true"></i>
                <input v-model="databaseSearch" type="search" placeholder="Поиск..." data-testid="database-search">
              </label>
              <select v-model="databaseSort" class="compact-select" aria-label="Сортировка баз данных">
                <option value="">Без сортировки</option>
                <option value="name:asc">Имя ↑</option>
                <option value="name:desc">Имя ↓</option>
                <option value="count:asc">Расход ↑</option>
                <option value="count:desc">Расход ↓</option>
                <option value="date:asc">Дата ↑</option>
                <option value="date:desc">Дата ↓</option>
              </select>
              <button
                type="button"
                class="primary-button"
                data-testid="create-database-toggle"
                :disabled="!permissions.canCreateDatabase"
                @click="createFormVisible = !createFormVisible"
              >
                <i class="fi fi-rr-plus" aria-hidden="true"></i>
                <span>Создать БД</span>
              </button>
            </div>
          </div>

          <Message v-if="!permissions.canCreateDatabase" severity="warn" class="cabinet-message">
            На бесплатном тарифном плане можно создать не более трех баз данных.
          </Message>

          <form v-if="createFormVisible && permissions.canCreateDatabase" class="inline-form" @submit.prevent="createNewDatabase">
            <label>
              <span>Имя базы данных</span>
              <input v-model="createDatabaseName" type="text" autocomplete="off" data-testid="new-database-name">
            </label>
            <label>
              <span>Шаблон</span>
              <select v-model="createDatabaseTemplate">
                <option value="RU">Русский</option>
                <option value="EN">English</option>
              </select>
            </label>
            <button type="submit" class="primary-button" :disabled="creatingDatabase">
              <i class="fi fi-rr-check" aria-hidden="true"></i>
              <span>Создать</span>
            </button>
            <button type="button" class="secondary-button" @click="resetCreateDatabaseForm">Отменить</button>
            <span v-if="createDatabaseError" class="field-error">{{ createDatabaseError }}</span>
          </form>

          <div v-if="filteredDatabases.length === 0" class="empty-state">Нет баз данных</div>

          <div v-else class="database-list">
            <article v-for="db in filteredDatabases" :key="db.id || db.name" class="database-row">
              <div class="database-row-main">
                <div>
                  <a class="database-name" :href="databaseHref(db.name)" :target="db.name">{{ formatDatabaseName(db.name) }}</a>
                  <span v-if="db.id" class="muted">#{{ db.id }}</span>
                  <span v-if="db.createdAt" class="muted">Создана: {{ formatDate(db.createdAt) }}</span>
                </div>
                <div class="database-meta">
                  <span>Шаблон: <strong>{{ db.template || 'default' }}</strong></span>
                  <span>Расход: <strong>{{ db.count }}</strong></span>
                  <span>Оплачено до: <strong :class="{ danger: isDatePassed(db.planDate) }">{{ formatDate(db.planDate) }}</strong></span>
                </div>
              </div>

              <div v-if="databaseDrafts[db.id]" class="database-edit-grid">
                <label>
                  <span>Описание</span>
                  <textarea
                    v-model="databaseDrafts[db.id].description"
                    rows="2"
                    :data-testid="`database-description-${db.id}`"
                  ></textarea>
                </label>
                <label>
                  <span>Публичное имя</span>
                  <input
                    v-model="databaseDrafts[db.id].publicName"
                    type="text"
                    maxlength="127"
                    :data-testid="`database-public-name-${db.id}`"
                    @input="rememberPublicDatabaseName(db)"
                  >
                </label>
                <label class="checkbox-row">
                  <input
                    v-model="databaseDrafts[db.id].registrationOpen"
                    type="checkbox"
                    :data-testid="`database-register-${db.id}`"
                  >
                  <span>Регистрация открыта</span>
                </label>
                <label>
                  <span>Время жизни токена, минут</span>
                  <input
                    v-model="databaseDrafts[db.id].tokenLifetime"
                    type="text"
                    inputmode="numeric"
                    :data-testid="`database-ttl-${db.id}`"
                  >
                </label>
              </div>

              <div class="row-actions">
                <button
                  type="button"
                  class="primary-button small-button"
                  :data-testid="`save-database-${db.id}`"
                  :disabled="!hasDatabaseChanges(db.id) || savingDatabaseId === db.id"
                  @click="saveDatabase(db)"
                >
                  <i class="fi fi-rr-disk" aria-hidden="true"></i>
                  <span>Сохранить</span>
                </button>
                <button
                  v-if="permissions.canRestoreAdmin"
                  type="button"
                  class="secondary-button small-button"
                  :disabled="restoringDatabase === db.name"
                  @click="restoreAdmin(db)"
                >
                  <i class="fi fi-rr-user-shield" aria-hidden="true"></i>
                  <span>Восстановить админа</span>
                </button>
              </div>
            </article>
          </div>
        </section>

        <section v-else-if="activeSection === 'profile'" class="cabinet-section narrow-section">
          <h2>Профиль</h2>
          <div class="form-grid">
            <label>
              <span>Имя</span>
              <input v-model="profileDraft.name" type="text" data-testid="profile-name">
            </label>
            <label>
              <span>Телефон</span>
              <input v-model="profileDraft.phone" type="tel" data-testid="profile-phone">
            </label>
            <label class="wide-field">
              <span>Email</span>
              <input :value="profileDraft.email" type="email" disabled title="Email нельзя изменить">
            </label>
            <label class="wide-field">
              <span>Обо мне</span>
              <textarea v-model="profileDraft.notes" rows="4" data-testid="profile-notes"></textarea>
            </label>
            <label class="wide-field">
              <span>Фото</span>
              <input type="file" accept="image/*" @change="onPhotoSelected">
            </label>
            <label class="wide-field">
              <span>Аккаунт</span>
              <div class="username-row">
                <input
                  v-model.trim="profileDraft.username"
                  type="text"
                  maxlength="33"
                  autocomplete="off"
                  data-testid="profile-username"
                  :disabled="usernameLocked"
                  title="Только латинские буквы, цифры и одиночный дефис, начинается с буквы, до 33 символов"
                >
                <button
                  type="button"
                  class="secondary-button"
                  data-testid="save-username"
                  :disabled="usernameLocked || savingUsername"
                  @click="saveProfileUsername"
                >
                  Сохранить аккаунт
                </button>
              </div>
              <small>Только латинские буквы, цифры и одиночный дефис, начинается с буквы, до 33 символов.</small>
              <span v-if="usernameError" class="field-error">{{ usernameError }}</span>
            </label>
            <label class="checkbox-row wide-field">
              <input
                v-model="profileDraft.isPublic"
                type="checkbox"
                data-testid="profile-public"
                @change="guardPublicProfile"
              >
              <span>Публичный профиль</span>
            </label>
          </div>

          <Message v-if="profileError" severity="error" class="cabinet-message">{{ profileError }}</Message>

          <button
            type="button"
            class="primary-button"
            data-testid="save-profile"
            :disabled="savingProfile || !hasProfileChanges"
            @click="saveProfile"
          >
            <i class="fi fi-rr-disk" aria-hidden="true"></i>
            <span>Сохранить изменения</span>
          </button>
        </section>

        <section v-else-if="activeSection === 'community'" class="cabinet-section">
          <div class="section-header-row">
            <div>
              <h2>Кооперации</h2>
              <p>Приглашения, публичные доступы и запросы к базам данных.</p>
            </div>
            <label class="icon-input">
              <i class="fi fi-rr-search" aria-hidden="true"></i>
              <input v-model="communitySearch" type="search" placeholder="Поиск...">
            </label>
          </div>

          <div class="segmented-control">
            <button type="button" :class="{ active: communityTab === 'my-invites' }" @click="communityTab = 'my-invites'">Приглашенные мной</button>
            <button type="button" :class="{ active: communityTab === 'invitations' }" @click="communityTab = 'invitations'">Приглашения мне</button>
            <button type="button" :class="{ active: communityTab === 'requests' }" @click="communityTab = 'requests'">Запросы</button>
          </div>

          <div class="community-list">
            <article v-for="invite in visibleCommunityItems" :key="invite.InviteID" class="community-row">
              <div>
                <strong>{{ invite.DB || '-' }}</strong>
                <span>{{ invite.Name || invite.Description || 'Без описания' }}</span>
              </div>
              <span class="status-pill">{{ invite.State || invite.StateID || '-' }}</span>
            </article>
            <p v-if="visibleCommunityItems.length === 0" class="empty-state">Нет записей</p>
          </div>
        </section>

        <section v-else-if="activeSection === 'tariff'" class="cabinet-section narrow-section">
          <h2>Тариф</h2>
          <dl class="summary-list">
            <div><dt>Ваш тариф</dt><dd>{{ profile.plan || 'Free' }}</dd></div>
            <div><dt>Следующее списание</dt><dd>{{ formatDate(profile.planDate) }}</dd></div>
            <div><dt>Использовано ресурсов</dt><dd>{{ summary.totalUsage }} из {{ summary.planLimit }}</dd></div>
          </dl>
          <div class="usage-bar"><span :style="{ width: `${Math.min(summary.usagePercent, 100)}%` }"></span></div>
        </section>

        <section v-else-if="activeSection === 'balance'" class="cabinet-section">
          <h2>Баланс</h2>
          <p class="large-metric">{{ profile.balance }} руб.</p>
          <table class="cabinet-table">
            <thead><tr><th>Дата</th><th>Сумма</th><th>Примечание</th></tr></thead>
            <tbody>
              <tr v-for="(row, index) in balanceHistory" :key="index">
                <td>{{ row.Paid || row.paid || '-' }}</td>
                <td>{{ row.Payment || row.payment || '-' }}</td>
                <td>{{ row.Notes || row.notes || '-' }}</td>
              </tr>
              <tr v-if="balanceHistory.length === 0"><td colspan="3">Нет операций</td></tr>
            </tbody>
          </table>
        </section>

        <section v-else-if="activeSection === 'bonuses'" class="cabinet-section narrow-section">
          <h2>Бонусы</h2>
          <p class="large-metric">{{ profile.bonus }}</p>
          <p>Бонусы можно конвертировать в валюту баланса: 1 бонус = 1 рубль.</p>
        </section>

        <section v-else-if="activeSection === 'referrals'" class="cabinet-section">
          <h2>Партнерская программа</h2>
          <div class="referral-grid">
            <label>
              <span>Регистрация</span>
              <input :value="referralRegisterLink" readonly>
            </label>
            <label>
              <span>Сайт Интеграма</span>
              <input :value="referralSiteLink" readonly>
            </label>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import cabinetService, { isValidCabinetUsername } from '@/services/integramCabinetService'

const route = useRoute()
const toast = useToast()

const sections = [
  { id: 'databases', label: 'Базы данных', icon: 'fi fi-rr-database' },
  { id: 'community', label: 'Кооперации', icon: 'fi fi-rr-share' },
  { id: 'profile', label: 'Профиль', icon: 'fi fi-rr-user' },
  { id: 'tariff', label: 'Тариф', icon: 'fi fi-rr-tags' },
  { id: 'balance', label: 'Баланс', icon: 'fi fi-rr-wallet' },
  { id: 'bonuses', label: 'Бонусы', icon: 'fi fi-rr-gift' },
  { id: 'referrals', label: 'Партнерская программа', icon: 'fi fi-rr-users-alt' }
]

const database = computed(() => route.params.database || 'my')
const activeSection = ref(getSectionFromHash() || 'databases')
const loading = ref(true)
const loadError = ref('')
const snapshot = ref({
  profile: {},
  databases: [],
  summary: { totalUsage: 0, usagePercent: 0, planLimit: 0 },
  permissions: { canCreateDatabase: true, canRestoreAdmin: true }
})
const balanceHistory = ref([])
const communityInvites = ref([])

const profileDraft = reactive({
  name: '',
  phone: '',
  email: '',
  notes: '',
  photo: '',
  username: '',
  isPublic: false
})
const originalProfile = reactive({
  name: '',
  phone: '',
  notes: '',
  isPublic: false
})

const databaseDrafts = reactive({})
const originalDatabaseDrafts = reactive({})

const databaseSearch = ref('')
const databaseSort = ref('')
const savingProfile = ref(false)
const savingUsername = ref(false)
const savingDatabaseId = ref('')
const restoringDatabase = ref('')
const photoFile = ref(null)
const savedUsername = ref('')
const usernameLocked = ref(false)
const usernameError = ref('')
const profileError = ref('')
const createFormVisible = ref(false)
const createDatabaseName = ref('')
const createDatabaseTemplate = ref('RU')
const createDatabaseError = ref('')
const creatingDatabase = ref(false)
const communityTab = ref('my-invites')
const communitySearch = ref('')

const profile = computed(() => snapshot.value.profile || {})
const databases = computed(() => snapshot.value.databases || [])
const summary = computed(() => snapshot.value.summary || { totalUsage: 0, usagePercent: 0, planLimit: 0 })
const permissions = computed(() => snapshot.value.permissions || { canCreateDatabase: true, canRestoreAdmin: true })

const avatarStyle = computed(() => profile.value.photo ? { backgroundImage: `url(${profile.value.photo})` } : {})
const profileInitial = computed(() => (profile.value.email || profile.value.name || 'U').charAt(0).toUpperCase())
const referralId = computed(() => profile.value.id || profile.value.userObjectId || '0')
const referralRegisterLink = computed(() => `https://ideav.ru?aff=${referralId.value}`)
const referralSiteLink = computed(() => `https://ideav.ru/ru?aff=${referralId.value}`)

const hasProfileChanges = computed(() => {
  return profileDraft.name !== originalProfile.name ||
    profileDraft.phone !== originalProfile.phone ||
    profileDraft.notes !== originalProfile.notes ||
    profileDraft.isPublic !== originalProfile.isPublic ||
    Boolean(photoFile.value)
})

const filteredDatabases = computed(() => {
  const query = databaseSearch.value.trim().toLocaleLowerCase()
  let rows = databases.value

  if (query) {
    rows = rows.filter(db => [
      db.name,
      db.template,
      db.description,
      db.publicName,
      db.createdAt,
      db.planDate,
      String(db.count)
    ].some(value => String(value || '').toLocaleLowerCase().includes(query)))
  }

  if (!databaseSort.value) return rows

  const [field, direction] = databaseSort.value.split(':')
  const dir = direction === 'desc' ? -1 : 1

  return rows.slice().sort((a, b) => {
    if (field === 'count') return dir * ((a.count || 0) - (b.count || 0))
    if (field === 'date') return dir * (parseDateValue(a.createdAt) - parseDateValue(b.createdAt))
    return dir * String(a.name || '').localeCompare(String(b.name || ''))
  })
})

const visibleCommunityItems = computed(() => {
  const userId = profile.value.userObjectId || profile.value.id || ''
  const query = communitySearch.value.trim().toLocaleLowerCase()

  return communityInvites.value.filter(item => {
    if (communityTab.value === 'my-invites' && !(item.HostUserID === userId && item.StateID !== '375')) return false
    if (communityTab.value === 'invitations' && !(item.HostUserID !== userId && (item.GuestUserID === userId || item.GuestUserID === '') && item.StateID !== '375')) return false
    if (communityTab.value === 'requests' && item.StateID !== '375') return false
    if (!query) return true
    return [item.DB, item.Name, item.Description, item.State, item.GuestUser, item.HostUser]
      .some(value => String(value || '').toLocaleLowerCase().includes(query))
  })
})

function getSectionFromHash() {
  const hash = String(route.hash || '').replace(/^#/, '')
  const section = hash.split('/')[0]
  return sections.some(item => item.id === section) ? section : null
}

function selectSection(section) {
  activeSection.value = section
  if (typeof history !== 'undefined') history.replaceState(null, '', `#${section}`)
}

function applySnapshot(nextSnapshot) {
  snapshot.value = nextSnapshot
  const nextProfile = nextSnapshot.profile || {}

  Object.assign(profileDraft, {
    name: nextProfile.name || '',
    phone: nextProfile.phone || '',
    email: nextProfile.email || '',
    notes: nextProfile.notes || '',
    photo: nextProfile.photo || '',
    username: nextProfile.username || '',
    isPublic: Boolean(nextProfile.isPublic)
  })
  Object.assign(originalProfile, {
    name: profileDraft.name,
    phone: profileDraft.phone,
    notes: profileDraft.notes,
    isPublic: profileDraft.isPublic
  })

  savedUsername.value = profileDraft.username || ''
  usernameLocked.value = isValidCabinetUsername(savedUsername.value)

  for (const key of Object.keys(databaseDrafts)) delete databaseDrafts[key]
  for (const key of Object.keys(originalDatabaseDrafts)) delete originalDatabaseDrafts[key]

  for (const db of nextSnapshot.databases || []) {
    const draft = {
      description: db.description || '',
      publicName: db.publicName || '',
      registrationOpen: Boolean(db.registrationOpen),
      tokenLifetime: db.tokenLifetime || ''
    }
    databaseDrafts[db.id] = { ...draft }
    originalDatabaseDrafts[db.id] = { ...draft }
  }
}

async function loadCabinet() {
  loading.value = true
  loadError.value = ''

  try {
    const [cabinetSnapshot, historyRows, inviteRows] = await Promise.all([
      cabinetService.getCabinetSnapshot(),
      cabinetService.getBalanceHistory().catch(() => []),
      cabinetService.getCommunityInvites().catch(() => [])
    ])
    applySnapshot(cabinetSnapshot)
    balanceHistory.value = historyRows
    communityInvites.value = inviteRows
  } catch (error) {
    loadError.value = error.message || 'Не удалось загрузить личный кабинет'
  } finally {
    loading.value = false
  }
}

function hasDatabaseChanges(id) {
  const draft = databaseDrafts[id]
  const original = originalDatabaseDrafts[id]
  if (!draft || !original) return false

  return draft.description !== original.description ||
    draft.publicName !== original.publicName ||
    draft.registrationOpen !== original.registrationOpen ||
    draft.tokenLifetime !== original.tokenLifetime
}

async function saveDatabase(db) {
  const draft = databaseDrafts[db.id]
  if (!draft) return

  savingDatabaseId.value = db.id
  try {
    await cabinetService.saveDatabaseSettings(db.id, { ...draft })
    originalDatabaseDrafts[db.id] = { ...draft }
    rememberPublicDatabaseName(db)
    toast.add({ severity: 'success', summary: 'Настройки базы данных сохранены', life: 2500 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Ошибка сохранения настроек базы данных', detail: error.message, life: 4000 })
  } finally {
    savingDatabaseId.value = ''
  }
}

async function restoreAdmin(db) {
  restoringDatabase.value = db.name
  try {
    await cabinetService.restoreDatabaseAdmin(db.name)
    toast.add({ severity: 'success', summary: 'Администратор восстановлен', life: 2500 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Ошибка восстановления администратора', detail: error.message, life: 4000 })
  } finally {
    restoringDatabase.value = ''
  }
}

async function saveProfile() {
  profileError.value = ''

  if (profileDraft.isPublic && !isValidCabinetUsername(savedUsername.value)) {
    profileError.value = 'Сначала сохраните Аккаунт в правильном формате, чтобы включить публичный профиль'
    return
  }

  savingProfile.value = true
  try {
    await cabinetService.saveCabinetProfile(profile.value.userObjectId, {
      name: profileDraft.name,
      phone: profileDraft.phone,
      notes: profileDraft.notes,
      isPublic: profileDraft.isPublic,
      photo: photoFile.value
    })
    Object.assign(originalProfile, {
      name: profileDraft.name,
      phone: profileDraft.phone,
      notes: profileDraft.notes,
      isPublic: profileDraft.isPublic
    })
    photoFile.value = null
    toast.add({ severity: 'success', summary: 'Профиль сохранен', life: 2500 })
  } catch (error) {
    profileError.value = error.message || 'Ошибка сохранения профиля'
  } finally {
    savingProfile.value = false
  }
}

async function saveProfileUsername() {
  const username = profileDraft.username.trim()
  usernameError.value = ''

  if (!isValidCabinetUsername(username)) {
    usernameError.value = 'Неверный формат аккаунта. Только латинские буквы, цифры и дефис, начинается с буквы, до 33 символов'
    return
  }

  savingUsername.value = true
  try {
    const response = await cabinetService.saveUsername(username)
    if (response?.name !== undefined && response.name !== username) {
      throw new Error('Сервер вернул неожиданный ответ')
    }
    savedUsername.value = username
    profileDraft.username = username
    usernameLocked.value = true
    toast.add({ severity: 'success', summary: 'Аккаунт сохранен', life: 2500 })
  } catch (error) {
    usernameError.value = `Ошибка сохранения: ${error.message || 'неизвестная ошибка'}`
  } finally {
    savingUsername.value = false
  }
}

function guardPublicProfile() {
  if (!profileDraft.isPublic) return
  if (isValidCabinetUsername(savedUsername.value)) return

  profileDraft.isPublic = false
  usernameError.value = 'Сначала сохраните Аккаунт в правильном формате, чтобы включить публичный профиль'
}

function onPhotoSelected(event) {
  const file = event.target?.files?.[0]
  photoFile.value = file || null
}

function rememberPublicDatabaseName(db) {
  if (typeof document === 'undefined' || !db?.name || !databaseDrafts[db.id]) return
  const publicName = databaseDrafts[db.id].publicName || ''
  document.cookie = `idbname_${db.name}=${encodeURIComponent(publicName)}; path=/; max-age=31536000`
}

async function createNewDatabase() {
  createDatabaseError.value = ''
  creatingDatabase.value = true

  try {
    await cabinetService.createDatabase({
      name: createDatabaseName.value,
      template: createDatabaseTemplate.value
    })
    resetCreateDatabaseForm()
    await loadCabinet()
    toast.add({ severity: 'success', summary: 'База данных создана', life: 2500 })
  } catch (error) {
    createDatabaseError.value = error.message || 'Ошибка создания базы данных'
  } finally {
    creatingDatabase.value = false
  }
}

function resetCreateDatabaseForm() {
  createFormVisible.value = false
  createDatabaseName.value = ''
  createDatabaseTemplate.value = 'RU'
  createDatabaseError.value = ''
}

function databaseHref(name) {
  return name ? `/${name}` : '#'
}

function formatDatabaseName(name) {
  if (!name) return '-'
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function parseDateValue(value) {
  if (!value) return 0
  const parts = String(value).split('.')
  if (parts.length !== 3) return 0
  return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime()
}

function isDatePassed(value) {
  const timestamp = parseDateValue(value)
  return timestamp > 0 && timestamp < Date.now()
}

function formatDate(value) {
  if (!value) return '-'
  const parts = String(value).split('.')
  if (parts.length !== 3) return value
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  const month = Number(parts[1]) - 1
  if (month < 0 || month > 11) return value
  return `${Number(parts[0])} ${months[month]} ${parts[2]}`
}

onMounted(loadCabinet)
</script>

<style scoped>
.cabinet-view {
  min-height: 100%;
  color: var(--text-primary);
}

.cabinet-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
}

.cabinet-kicker {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin: 0 0 0.25rem;
  text-transform: uppercase;
}

.cabinet-topbar h1,
.cabinet-section h2 {
  margin: 0;
  font-size: 1.45rem;
  line-height: 1.2;
}

.cabinet-identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.cabinet-identity strong,
.cabinet-identity span {
  display: block;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cabinet-identity span {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.cabinet-avatar {
  align-items: center;
  background: #1976d2 center / cover;
  border-radius: 50%;
  color: #fff;
  display: flex;
  flex: 0 0 auto;
  font-weight: 700;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.cabinet-loading {
  align-items: center;
  color: var(--text-secondary);
  display: flex;
  gap: 0.75rem;
  min-height: 260px;
  justify-content: center;
}

.cabinet-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 1.5rem;
}

.cabinet-nav {
  align-self: start;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-right: 0.75rem;
}

.cabinet-nav-item {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  gap: 0.65rem;
  min-height: 38px;
  padding: 0.55rem 0.75rem;
  text-align: left;
}

.cabinet-nav-item:hover {
  background: var(--surface-hover);
}

.cabinet-nav-item.active {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 700;
}

.cabinet-nav-item.disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.cabinet-content {
  min-width: 0;
}

.cabinet-section {
  display: grid;
  gap: 1rem;
}

.narrow-section {
  max-width: 820px;
}

.section-header-row {
  align-items: start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.section-header-row p {
  color: var(--text-secondary);
  margin: 0.3rem 0 0;
}

.database-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

.icon-input {
  align-items: center;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  display: flex;
  gap: 0.5rem;
  min-height: 36px;
  padding: 0 0.65rem;
}

.icon-input input {
  border: 0;
  min-width: 140px;
  outline: 0;
}

.compact-select,
.inline-form select,
.form-grid input,
.form-grid textarea,
.database-edit-grid input,
.database-edit-grid textarea,
.inline-form input,
.referral-grid input {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  color: var(--text-primary);
  font: inherit;
  min-height: 36px;
  padding: 0.45rem 0.6rem;
  width: 100%;
}

.database-edit-grid textarea,
.form-grid textarea {
  resize: vertical;
}

.primary-button,
.secondary-button {
  align-items: center;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  gap: 0.45rem;
  justify-content: center;
  min-height: 36px;
  padding: 0.45rem 0.75rem;
}

.primary-button {
  background: #1976d2;
  border: 1px solid #1976d2;
  color: #fff;
}

.secondary-button {
  background: #fff;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.small-button {
  min-height: 32px;
  padding: 0.35rem 0.6rem;
}

.cabinet-message {
  margin: 0;
}

.inline-form {
  align-items: end;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: minmax(180px, 1fr) minmax(140px, 180px) auto auto;
  padding: 0.85rem;
}

.inline-form label,
.form-grid label,
.database-edit-grid label,
.referral-grid label {
  display: grid;
  gap: 0.3rem;
}

.inline-form label span,
.form-grid label > span,
.database-edit-grid label > span,
.referral-grid label > span {
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.database-list,
.community-list {
  display: grid;
  gap: 0.75rem;
}

.database-row,
.community-row {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  display: grid;
  gap: 0.8rem;
  padding: 1rem;
}

.database-row-main {
  display: grid;
  gap: 0.45rem;
}

.database-name {
  color: var(--link-color);
  font-size: 1.05rem;
  font-weight: 700;
  margin-right: 0.5rem;
  text-decoration: none;
}

.muted {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-right: 0.5rem;
}

.database-meta {
  color: var(--text-secondary);
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.danger {
  color: var(--color-danger);
}

.database-edit-grid,
.form-grid,
.referral-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wide-field {
  grid-column: 1 / -1;
}

.checkbox-row {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}

.checkbox-row input {
  width: auto;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.username-row {
  align-items: center;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: minmax(0, 1fr) auto;
}

.field-error {
  color: var(--color-danger);
  font-size: 0.86rem;
}

.segmented-control {
  border-bottom: 1px solid var(--border-color);
  display: flex;
  gap: 0.35rem;
}

.segmented-control button {
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  padding: 0.65rem 0.75rem;
}

.segmented-control button.active {
  border-color: #1976d2;
  color: #1976d2;
  font-weight: 700;
}

.community-row {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.community-row span {
  color: var(--text-secondary);
  display: block;
}

.status-pill {
  background: #e0f2f1;
  border-radius: 999px;
  color: #00695c !important;
  font-size: 0.8rem;
  padding: 0.2rem 0.55rem;
}

.summary-list {
  display: grid;
  gap: 0.6rem;
  margin: 0;
}

.summary-list div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.summary-list dt {
  color: var(--text-secondary);
}

.summary-list dd {
  font-weight: 700;
  margin: 0;
}

.usage-bar {
  background: var(--surface-100);
  border-radius: 999px;
  height: 10px;
  overflow: hidden;
}

.usage-bar span {
  background: #2e7d32;
  display: block;
  height: 100%;
}

.large-metric {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.cabinet-table {
  border-collapse: collapse;
  width: 100%;
}

.cabinet-table th,
.cabinet-table td {
  border-bottom: 1px solid var(--border-color);
  padding: 0.65rem;
  text-align: left;
}

.empty-state {
  color: var(--text-secondary);
  padding: 1rem 0;
}

@media (max-width: 900px) {
  .cabinet-topbar,
  .section-header-row {
    align-items: stretch;
    flex-direction: column;
  }

  .cabinet-layout {
    grid-template-columns: 1fr;
  }

  .cabinet-nav {
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
    flex-direction: row;
    overflow-x: auto;
    padding: 0 0 0.75rem;
  }

  .cabinet-nav-item {
    flex: 0 0 auto;
  }

  .database-actions,
  .row-actions {
    justify-content: stretch;
  }

  .database-actions > *,
  .row-actions > * {
    flex: 1 1 auto;
  }

  .inline-form,
  .database-edit-grid,
  .form-grid,
  .referral-grid,
  .username-row {
    grid-template-columns: 1fr;
  }
}
</style>
