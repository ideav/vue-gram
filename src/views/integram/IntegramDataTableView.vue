<template>
  <div class="integram-datatable-wrapper" :class="`row-density-${rowDensity}`">
    <!-- Breadcrumb -->
    <IntegramBreadcrumb v-if="!embedded" :items="breadcrumbItems" :database="database" />

    <!-- Main Card -->
    <Card>
      <template #title>
        <div class="table-header-row">
          <!-- Left: Title + Badge -->
          <div class="flex align-items-start gap-2">
            <span class="table-title">{{ typeData?.val || 'Таблица' }}</span>
            <Badge
              :value="totalCount || filteredRows.length"
              class="records-badge"
              v-tooltip.bottom="totalCount ? `Всего записей в таблице: ${totalCount.toLocaleString()}` : ''"
            />
          </div>

          <!-- Right: Toolbar buttons + Search -->
          <div class="table-header-toolbar">
            <!-- Toolbar buttons -->
            <div class="flex gap-1">
              <Button
                icon="fi fi-rr-refresh"
                size="small"
                text
                rounded
                @click="loadData"
                v-tooltip.bottom="'Обновить'"
                :loading="loading"
              />
              <Button
                icon="fi fi-rr-pencil"
                size="small"
                text
                rounded
                @click="toggleEditMode"
                :class="{ 'p-button-primary': editMode === 'single-click' }"
                v-tooltip.bottom="editMode === 'single-click' ? 'Режим редактирования' : 'Включить редактирование'"
              />
              <Button
                :icon="hasActiveFilters ? 'fi fi-sr-filter' : 'fi fi-rr-filter'"
                size="small"
                text
                rounded
                @click="showFilterDialog"
                v-tooltip.bottom="'Фильтры'"
              />
              <Button
                icon="fi fi-rr-checkbox"
                size="small"
                text
                rounded
                :class="{ 'p-button-primary': isSelectionModeActive }"
                @click="toggleSelectionMode"
                v-tooltip.bottom="'Выделение строк'"
              />
              <Button
                icon="fi fi-rr-calculator"
                size="small"
                text
                rounded
                :class="{ 'p-button-primary': isFooterActive }"
                @click="toggleFooter"
                v-tooltip.bottom="'Футер с агрегациями'"
              />
              <Button
                icon="fi fi-rr-eye-crossed"
                size="small"
                text
                rounded
                @click="showColumnSelector = true"
                v-tooltip.bottom="'Колонки'"
              />
              <Button
                icon="fi fi-rr-print"
                size="small"
                text
                rounded
                @click="printTable"
                v-tooltip.bottom="'Печать'"
              />
              <Button
                icon="fi fi-rr-file-excel"
                size="small"
                text
                rounded
                @click="exportToExcel"
                v-tooltip.bottom="'Excel'"
              />
              <Button
                icon="fi fi-rr-file-pdf"
                size="small"
                text
                rounded
                @click="exportToPDF"
                v-tooltip.bottom="'PDF'"
              />
              <Button
                :icon="getRowDensityIcon()"
                size="small"
                text
                rounded
                @click="cycleRowDensity"
                v-tooltip.bottom="`Плотность строк: ${getRowDensityLabel()}`"
              />
              <Button
                icon="fi fi-rr-settings"
                size="small"
                text
                rounded
                @click="showSettingsDialog = true"
                v-tooltip.bottom="'Настройки'"
              />
              <Button
                icon="fi fi-rr-question"
                size="small"
                text
                rounded
                @click="showHelpDialog = true"
                v-tooltip.bottom="'Справка'"
              />
              <span class="toolbar-separator"></span>
              <Button
                icon="fi fi-rr-plus"
                size="small"
                text
                rounded
                @click="handleAddRow"
                v-tooltip.bottom="'Новая строка'"
                :loading="isAddingRow"
              />
              <Button
                icon="fi fi-rr-square-plus"
                size="small"
                text
                rounded
                @click="handleAddColumn"
                v-tooltip.bottom="'Новая колонка'"
                :loading="isAddingColumn"
              />
            </div>

            <!-- Search field with navigation (Phase 2) -->
            <div class="search-with-navigation">
              <IconField iconPosition="left" class="header-search">
                <InputIcon class="fi fi-rr-search" />
                <InputText
                  v-model="searchQuery"
                  placeholder="Поиск..."
                  @input="onSearchInput"
                />
              </IconField>
              <div v-if="searchMatches.length > 0" class="search-navigation-controls">
                <span class="search-counter">
                  {{ currentMatchIndex + 1 }} / {{ searchMatches.length }}
                </span>
                <Button
                  icon="fi fi-rr-angle-small-up"
                  size="small"
                  text
                  rounded
                  @click="prevSearchMatch"
                  v-tooltip.bottom="'Предыдущий (Shift+F3)'"
                />
                <Button
                  icon="fi fi-rr-angle-small-down"
                  size="small"
                  text
                  rounded
                  @click="nextSearchMatch"
                  v-tooltip.bottom="'Следующий (F3)'"
                />
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #content>
        <!-- Loading state - hide entire table during initial loading -->
        <div v-if="loading" class="text-center py-5">
          <ProgressSpinner />
          <p class="mt-2 text-color-secondary">Загрузка данных...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-5">
          <Message severity="error" :closable="false">{{ error }}</Message>
          <Button label="Повторить" icon="fi fi-rr-refresh" @click="loadData" class="mt-3" />
        </div>

        <!-- Partial data warning -->
        <div v-if="showPartialDataWarning" class="mb-3">
          <Message severity="warn" :closable="false">
            <template #default>
              <div class="flex align-items-center justify-content-between">
                <span>
                  Фильтрация работает только на загруженных {{ rows.length }} записях.
                  <template v-if="!settings.autoLoadAll">
                    Включите автозагрузку в настройках для поиска по всем данным.
                  </template>
                </span>
              </div>
            </template>
          </Message>
        </div>

        <!-- DataTable -->
        <DataTable
          ref="dataTableRef"
          v-if="!loading && !error"
          :headers="headers"
          :rows="filteredRows"
          :disableEditing="false"
          :disableTypeEditing="false"
          :editMode="editMode"
          :isLoading="loading"
          :isLoadingMore="loadingMore"
          :isAddingRow="isAddingRow"
          :isAddingColumn="isAddingColumn"
          :allDataLoaded="allDataLoaded"
          :dateStyle="settings.dateStyle"
          :serverUrl="apiServerUrl"
          :autoLoadDirs="settings.autoLoadDirs"
          :database="database"
          @cell-update="handleCellUpdate"
          @row-update="handleRowUpdate"
          @cell-multi-update="handleCellMultiUpdate"
          @load-directory-list="handleLoadDirectoryList"
          @load-dir-row="handleLoadDirRow"
          @load-nested-preview="handleLoadNestedPreview"
          @load-more="handleLoadMore"
          @add-row="handleAddRow"
          @add-column="handleAddColumn"
          @row-delete="handleRowDelete"
          @row-move-up="handleRowMoveUp"
          @open-nested="handleOpenNested"
          @row-change-parent="handleRowChangeParent"
          @open-directory="handleOpenDirectory"
          @button-action-change="handleButtonActionChange"
          @button-click="handleButtonClick"
          @upload-file="handleUploadFile"
          @header-action="handleHeaderAction"
        />
      </template>
    </Card>

    <!-- Background loading indicator - fixed at bottom of screen -->
    <Teleport to="body">
      <Transition name="slide-up">
        <div v-if="isBackgroundLoading" class="bg-loading-overlay">
          <div class="bg-loading-indicator">
            <div class="flex align-items-center gap-3">
              <i class="fi fi-spin fi-rr-spinner"></i>
              <div class="flex-1">
                <div class="flex justify-content-between align-items-center mb-1">
                  <span class="font-medium">Загрузка всех данных</span>
                  <span class="text-sm">{{ loadedCount }} / {{ totalCount }}</span>
                </div>
                <ProgressBar :value="backgroundProgress" :showValue="false" style="height: 6px;" />
              </div>
              <Button
                icon="fi fi-rr-cross-small"
                text
                rounded
                size="small"
                severity="secondary"
                @click="cancelBackgroundLoading"
                v-tooltip.left="'Отменить'"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Create Dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      modal
      :header="'Создать: ' + (typeData?.val || 'Запись')"
      :style="{ width: '40rem' }"
      :breakpoints="{ '960px': '75vw', '640px': '95vw' }"
    >
      <div class="flex flex-column gap-3">
        <div class="field">
          <label for="newObjectValue" class="font-bold">Значение *</label>
          <InputText
            id="newObjectValue"
            v-model="createForm.value"
            placeholder="Введите значение"
            class="w-full"
            @keydown.enter="handleCreate"
          />
        </div>

        <!-- Requisite fields -->
        <div v-for="req in editableRequisites" :key="req.id" class="field">
          <label :for="'req_' + req.id">{{ req.alias }}</label>

          <!-- Reference field (справочник) -->
          <ReferenceField
            v-if="req.refType"
            v-model="createForm.requisites[req.id]"
            :reqId="req.id"
            :refTypeId="req.refType"
            :database="database"
            :objectId="0"
            :multi="req.isMulti"
            :allowCreate="true"
          />

          <!-- Regular field -->
          <component
            v-else
            :is="getRequisiteInputComponent(req.base)"
            :id="'req_' + req.id"
            v-model="createForm.requisites[req.id]"
            :placeholder="'Введите ' + req.alias"
            class="w-full"
            v-bind="getRequisiteInputProps(req.base)"
          />
        </div>
      </div>

      <template #footer>
        <Button label="Отмена" text @click="showCreateDialog = false" />
        <Button
          label="Создать"
          icon="fi fi-rr-check"
          :loading="creating"
          :disabled="!createForm.value"
          @click="handleCreate"
        />
      </template>
    </Dialog>

    <!-- Add Column Dialog -->
    <Dialog
      v-model:visible="showAddColumnDialog"
      modal
      header="Добавить колонку"
      :style="{ width: '28rem' }"
      :breakpoints="{ '640px': '95vw' }"
    >
      <div class="flex flex-column gap-4">
        <div class="field">
          <label for="newColumnAlias" class="font-bold block mb-2">Название колонки *</label>
          <InputText
            id="newColumnAlias"
            v-model="newColumnAlias"
            placeholder="Например: Статус"
            class="w-full"
            @keydown.enter="createColumn"
          />
        </div>

        <div class="field">
          <label for="newColumnType" class="font-bold block mb-2">Тип данных</label>
          <Select
            id="newColumnType"
            v-model="newColumnType"
            :options="columnTypeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Выберите тип"
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="Отмена"
          text
          @click="showAddColumnDialog = false"
        />
        <Button
          label="Добавить"
          icon="fi fi-rr-plus"
          :loading="isAddingColumn"
          :disabled="!newColumnAlias.trim()"
          @click="createColumn"
        />
      </template>
    </Dialog>

    <!-- Delete Confirmation -->
    <ConfirmDialog />

    <!-- Column Selector Dialog -->
    <Dialog
      v-model:visible="showColumnSelector"
      header="Управление колонками"
      :modal="true"
      :style="{ width: '450px' }"
      :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
    >
      <div class="flex justify-content-between mb-4">
        <Button label="Показать все" @click="selectAllColumns(true)" size="small" icon="fi fi-rr-eye" outlined />
        <Button label="Скрыть все" @click="selectAllColumns(false)" size="small" icon="fi fi-rr-eye-crossed" outlined severity="secondary" />
      </div>
      <div class="flex flex-column gap-3 mb-4 max-h-20rem overflow-y-auto">
        <div v-for="column in columnOptions" :key="column.id" class="flex align-items-center p-2 surface-hover border-round">
          <Checkbox v-model="selectedColumns[column.id]" :inputId="'col-' + column.id" :binary="true" class="mr-3" />
          <label :for="'col-' + column.id" class="flex-grow-1 cursor-pointer" :class="{ 'text-color-secondary': !selectedColumns[column.id] }">
            {{ column.value }}
          </label>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-content-between w-full">
          <Button label="Отменить" @click="showColumnSelector = false" text size="small" />
          <Button label="Применить" @click="applyColumnSelection" size="small" icon="fi fi-rr-check" />
        </div>
      </template>
    </Dialog>

    <!-- Filter Dialog - Integram Style -->
    <Dialog
      v-model:visible="isFilterDialogVisible"
      header="Фильтрация данных"
      :modal="true"
      :style="{ width: '600px' }"
      :breakpoints="{ '960px': '90vw' }"
    >
      <div v-if="filterConditions.length === 0" class="filter-empty-state">
        <i class="fi fi-rr-filter" style="font-size: 2rem; color: var(--text-color-secondary);"></i>
        <p class="mt-3 mb-3 text-color-secondary">Условия фильтрации не заданы</p>
        <Button
          label="Добавить условие"
          icon="fi fi-rr-plus"
          outlined
          @click="addCondition"
        />
      </div>

      <div v-else class="filter-conditions-list">
        <div
          v-for="(condition, index) in filterConditions"
          :key="index"
          class="filter-condition-item"
        >
          <div class="condition-header">
            <h4 class="condition-title">Условие {{ index + 1 }}</h4>
            <Button
              icon="fi fi-rr-trash"
              text
              rounded
              severity="danger"
              size="small"
              @click="removeCondition(index)"
              v-tooltip.left="'Удалить условие'"
            />
          </div>

          <div class="condition-fields">
            <div class="field mb-3">
              <label :for="`column-${index}`">Столбец</label>
              <Select
                :id="`column-${index}`"
                v-model="condition.headerId"
                :options="filterableHeaders"
                optionLabel="value"
                optionValue="id"
                placeholder="Выберите столбец"
                class="w-full"
                @change="updateConditionType(index)"
              />
            </div>

            <div class="field mb-3">
              <label :for="`operator-${index}`">Оператор</label>
              <Select
                :id="`operator-${index}`"
                v-model="condition.operator"
                :options="getOperatorsForType(condition.type)"
                optionLabel="label"
                optionValue="value"
                placeholder="Выберите оператор"
                class="w-full"
              />
            </div>

            <!-- Value input field -->
            <template v-if="condition.operator !== 'isEmpty'">
              <div v-if="!isRangeOperator(condition.operator)" class="field">
                <label :for="`value-${index}`">Значение</label>
                <InputText
                  v-if="[3, 8, 12].includes(condition.type)"
                  :id="`value-${index}`"
                  v-model="condition.value"
                  class="w-full"
                  placeholder="Введите значение..."
                />
                <InputNumber
                  v-else-if="[13, 14].includes(condition.type)"
                  :id="`value-${index}`"
                  v-model="condition.value"
                  class="w-full"
                  placeholder="Введите число..."
                />
                <Calendar
                  v-else-if="[4, 9].includes(condition.type)"
                  :id="`value-${index}`"
                  v-model="condition.value"
                  class="w-full"
                  :showIcon="true"
                  dateFormat="dd.mm.yy"
                  :showTime="condition.type === 4"
                />
                <Textarea
                  v-else-if="[2, 12].includes(condition.type)"
                  :id="`value-${index}`"
                  v-model="condition.value"
                  class="w-full"
                  :rows="3"
                />
                <InputText
                  v-else
                  :id="`value-${index}`"
                  v-model="condition.value"
                  class="w-full"
                  placeholder="Введите значение..."
                />
              </div>

              <div v-else class="grid">
                <div class="col-6">
                  <div class="field">
                    <label :for="`value-from-${index}`">От</label>
                    <InputText
                      v-if="[3, 8, 12].includes(condition.type)"
                      :id="`value-from-${index}`"
                      v-model="condition.value"
                      class="w-full"
                    />
                    <InputNumber
                      v-else-if="[13, 14].includes(condition.type)"
                      :id="`value-from-${index}`"
                      v-model="condition.value"
                      class="w-full"
                    />
                    <Calendar
                      v-else-if="[4, 9].includes(condition.type)"
                      :id="`value-from-${index}`"
                      v-model="condition.value"
                      :showIcon="true"
                      dateFormat="dd.mm.yy"
                      :showTime="condition.type === 4"
                    />
                  </div>
                </div>
                <div class="col-6">
                  <div class="field">
                    <label :for="`value-to-${index}`">До</label>
                    <InputText
                      v-if="[3, 8, 12].includes(condition.type)"
                      :id="`value-to-${index}`"
                      v-model="condition.value2"
                      class="w-full"
                    />
                    <InputNumber
                      v-else-if="[13, 14].includes(condition.type)"
                      :id="`value-to-${index}`"
                      v-model="condition.value2"
                      class="w-full"
                    />
                    <Calendar
                      v-else-if="[4, 9].includes(condition.type)"
                      :id="`value-to-${index}`"
                      v-model="condition.value2"
                      :showIcon="true"
                      dateFormat="dd.mm.yy"
                      :showTime="condition.type === 4"
                    />
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <div class="mt-3">
          <Button
            label="Добавить условие"
            icon="fi fi-rr-plus"
            text
            class="w-full"
            @click="addCondition"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-content-between align-items-center w-full">
          <Button
            label="Сбросить все"
            icon="fi fi-rr-filter-slash"
            @click="resetAllFilters"
            severity="danger"
            text
            size="small"
          />
          <div class="flex gap-2">
            <Button
              label="Отмена"
              @click="cancelFilter"
              text
            />
            <Button
              ref="filterApplyButton"
              label="Применить"
              icon="fi fi-rr-check"
              @click="applyFilter"
            />
          </div>
        </div>
      </template>
    </Dialog>

    <!-- Nested (Subordinate) Table Dialog -->
    <Dialog
      v-model:visible="nestedDialog.visible"
      :header="nestedDialog.tableName || 'Подчинённая таблица'"
      :modal="true"
      :style="{ width: '80vw', maxWidth: '1200px' }"
      :breakpoints="{ '1200px': '90vw', '640px': '98vw' }"
      :maximizable="true"
      class="nested-table-dialog"
    >
      <div v-if="nestedDialog.loading" class="text-center py-5">
        <ProgressSpinner />
        <p class="mt-2 text-color-secondary">Загрузка...</p>
      </div>
      <div v-else-if="nestedDialog.tableId" class="nested-table-content">
        <IntegramDataTableWrapper
          :key="nestedDialog.tableId + '-' + nestedDialog.parentRowId"
          :typeId="nestedDialog.tableId"
          :database="database"
          :parentId="nestedDialog.parentRowId"
          :embedded="true"
        />
      </div>
      <template #footer>
        <div class="flex justify-content-between w-full">
          <Button
            label="Добавить запись"
            icon="fi fi-rr-plus"
            @click="createNestedRecord"
            outlined
          />
          <Button label="Закрыть" @click="nestedDialog.visible = false" />
        </div>
      </template>
    </Dialog>

    <!-- Directory Table Dialog -->
    <Dialog
      v-model:visible="directoryDialog.visible"
      :header="directoryDialog.typeName || 'Справочник'"
      :modal="true"
      :style="{ width: '80vw', maxWidth: '1200px' }"
      :breakpoints="{ '1200px': '90vw', '640px': '98vw' }"
      :maximizable="true"
      class="directory-table-dialog"
    >
      <div v-if="directoryDialog.typeId" class="directory-table-content">
        <IntegramDataTableWrapper
          :key="'dir-' + directoryDialog.typeId + '-' + directoryDialog.dirRowId"
          :typeId="directoryDialog.typeId"
          :database="database"
          :filterId="directoryDialog.dirRowId"
          :embedded="true"
        />
      </div>
      <template #footer>
        <Button label="Закрыть" @click="directoryDialog.visible = false" />
      </template>
    </Dialog>

    <!-- Help Dialog -->
    <Dialog
      v-model:visible="showHelpDialog"
      header="Справка по таблице"
      :modal="true"
      :style="{ width: '800px', maxHeight: '90vh' }"
      :breakpoints="{ '960px': '95vw' }"
      class="help-dialog"
    >
      <div class="help-content">
        <!-- Overview Section -->
        <div class="help-section">
          <div class="help-section-header">
            <i class="fi fi-rr-info"></i>
            <h3>Обзор</h3>
          </div>
          <div class="help-info-block">
            <p>Интерактивная таблица данных с поддержкой редактирования, фильтрации, сортировки и работы со связанными данными (справочниками и подчинёнными таблицами).</p>
          </div>
        </div>

        <!-- Navigation Section -->
        <div class="help-section">
          <div class="help-section-header">
            <i class="fi fi-rr-expand-arrows-alt"></i>
            <h3>Навигация и выделение</h3>
          </div>
          <div class="help-grid">
            <div class="help-card">
              <div class="help-card-icon">🖱️</div>
              <div class="help-card-title">Клик по ячейке</div>
              <div class="help-card-desc">Выделяет ячейку. Для справочников и подчинённых таблиц — открывает их в модальном окне.</div>
            </div>
            <div class="help-card">
              <div class="help-card-icon">👆👆</div>
              <div class="help-card-title">Двойной клик</div>
              <div class="help-card-desc">Входит в режим редактирования ячейки (если включён режим двойного клика).</div>
            </div>
            <div class="help-card">
              <div class="help-card-icon">🔲</div>
              <div class="help-card-title">Выделение диапазона</div>
              <div class="help-card-desc">Зажмите мышь и проведите по ячейкам для выделения. Внизу появится статус-бар с агрегациями (сумма, среднее, мин/макс).</div>
            </div>
          </div>
        </div>

        <!-- Preview Section -->
        <div class="help-section">
          <div class="help-section-header">
            <i class="fi fi-rr-eye"></i>
            <h3>Предварительный просмотр</h3>
          </div>
          <div class="help-info-block">
            <h4>Наведение на справочник</h4>
            <p>При наведении курсора на значение справочника (ссылку) появляется всплывающее окно с детальной информацией о записи: все поля, включая подчинённые таблицы (показывается количество).</p>
          </div>
          <div class="help-info-block mt-3">
            <h4>Клик по справочнику</h4>
            <p>Открывает справочник в модальном окне с фильтрацией по конкретной записи.</p>
          </div>
        </div>

        <!-- Editing Section -->
        <div class="help-section">
          <div class="help-section-header">
            <i class="fi fi-rr-pencil"></i>
            <h3>Редактирование</h3>
          </div>
          <div class="help-grid">
            <div class="help-card">
              <div class="help-card-icon">✏️</div>
              <div class="help-card-title">Режим редактирования</div>
              <div class="help-card-desc">Нажмите кнопку <i class="fi fi-rr-pencil"></i> в тулбаре для переключения между режимами: одинарный клик / двойной клик.</div>
            </div>
            <div class="help-card">
              <div class="help-card-icon">💾</div>
              <div class="help-card-title">Сохранение</div>
              <div class="help-card-desc"><kbd>Enter</kbd> — сохранить изменения.<br><kbd>Esc</kbd> — отменить редактирование.</div>
            </div>
            <div class="help-card">
              <div class="help-card-icon">🟢</div>
              <div class="help-card-title">Индикатор изменений</div>
              <div class="help-card-desc">Зелёный треугольник в углу ячейки означает, что она была изменена в текущей сессии.</div>
            </div>
          </div>
        </div>

        <!-- Fill Handle Section -->
        <div class="help-section">
          <div class="help-section-header">
            <i class="fi fi-rr-arrows-alt-v"></i>
            <h3>Автозаполнение (протяжка)</h3>
          </div>
          <div class="help-info-block">
            <p>При выделении ячейки в правом нижнем углу появляется маркер заполнения (маленький квадрат). Потяните его вниз или вправо для автозаполнения:</p>
            <ul class="help-list">
              <li><strong>Числовые последовательности:</strong> 1, 2, 3 → 4, 5, 6...</li>
              <li><strong>Дни недели:</strong> Понедельник, Вторник → Среда, Четверг...</li>
              <li><strong>Месяцы:</strong> Январь, Февраль → Март, Апрель...</li>
              <li><strong>Копирование:</strong> одиночное значение копируется во все ячейки</li>
            </ul>
          </div>
        </div>

        <!-- Toolbar Section -->
        <div class="help-section">
          <div class="help-section-header">
            <i class="fi fi-rr-menu-burger"></i>
            <h3>Панель инструментов</h3>
          </div>
          <div class="help-toolbar-grid">
            <div class="help-toolbar-item">
              <i class="fi fi-rr-refresh"></i>
              <span>Обновить данные</span>
            </div>
            <div class="help-toolbar-item">
              <i class="fi fi-rr-pencil"></i>
              <span>Режим редактирования</span>
            </div>
            <div class="help-toolbar-item">
              <i class="fi fi-rr-filter"></i>
              <span>Фильтры</span>
            </div>
            <div class="help-toolbar-item">
              <i class="fi fi-rr-checkbox"></i>
              <span>Режим выделения строк</span>
            </div>
            <div class="help-toolbar-item">
              <i class="fi fi-rr-calculator"></i>
              <span>Футер с агрегациями</span>
            </div>
            <div class="help-toolbar-item">
              <i class="fi fi-rr-eye-crossed"></i>
              <span>Видимость колонок</span>
            </div>
            <div class="help-toolbar-item">
              <i class="fi fi-rr-print"></i>
              <span>Печать таблицы</span>
            </div>
            <div class="help-toolbar-item">
              <i class="fi fi-rr-file-excel"></i>
              <span>Экспорт в Excel</span>
            </div>
            <div class="help-toolbar-item">
              <i class="fi fi-rr-file-pdf"></i>
              <span>Экспорт в PDF</span>
            </div>
            <div class="help-toolbar-item">
              <i class="fi fi-rr-settings"></i>
              <span>Настройки</span>
            </div>
            <div class="help-toolbar-item">
              <i class="fi fi-rr-plus"></i>
              <span>Новая строка</span>
            </div>
            <div class="help-toolbar-item">
              <i class="fi fi-rr-square-plus"></i>
              <span>Новая колонка</span>
            </div>
          </div>
        </div>

        <!-- Column Header Section -->
        <div class="help-section">
          <div class="help-section-header">
            <i class="fi fi-rr-grid"></i>
            <h3>Заголовки колонок</h3>
          </div>
          <div class="help-grid">
            <div class="help-card">
              <div class="help-card-icon">↕️</div>
              <div class="help-card-title">Сортировка</div>
              <div class="help-card-desc">Клик по заголовку сортирует данные. Повторный клик меняет направление. <kbd>Ctrl</kbd>+клик для мультисортировки.</div>
            </div>
            <div class="help-card">
              <div class="help-card-icon">↔️</div>
              <div class="help-card-title">Изменение ширины</div>
              <div class="help-card-desc">Потяните границу между заголовками для изменения ширины колонки.</div>
            </div>
            <div class="help-card">
              <div class="help-card-icon">📌</div>
              <div class="help-card-title">Закрепление</div>
              <div class="help-card-desc">ПКМ по заголовку → "Закрепить колонку". Закреплённые колонки остаются видимы при горизонтальной прокрутке.</div>
            </div>
          </div>
        </div>

        <!-- Context Menu Section -->
        <div class="help-section">
          <div class="help-section-header">
            <i class="fi fi-rr-list"></i>
            <h3>Контекстное меню (ПКМ)</h3>
          </div>
          <div class="help-info-block">
            <h4>По заголовку колонки</h4>
            <ul class="help-list">
              <li>Сортировка по возрастанию / убыванию</li>
              <li>Закрепить / открепить колонку</li>
              <li>Показать дубликаты (выделяет повторяющиеся значения цветом)</li>
              <li>Скрыть колонку</li>
            </ul>
          </div>
          <div class="help-info-block mt-3">
            <h4>По строке</h4>
            <ul class="help-list">
              <li>Редактировать строку (форма со всеми полями)</li>
              <li>Переместить вверх (изменить порядок)</li>
              <li>Изменить родителя (для иерархических таблиц)</li>
              <li>Удалить строку</li>
            </ul>
          </div>
        </div>

        <!-- Keyboard Shortcuts Section -->
        <div class="help-section">
          <div class="help-section-header">
            <i class="fi fi-rr-key"></i>
            <h3>Горячие клавиши</h3>
          </div>
          <div class="help-shortcuts">
            <div class="help-shortcut">
              <kbd>Enter</kbd>
              <span>Сохранить редактирование</span>
            </div>
            <div class="help-shortcut">
              <kbd>Esc</kbd>
              <span>Отменить редактирование</span>
            </div>
            <div class="help-shortcut">
              <kbd>F3</kbd>
              <span>Следующее совпадение поиска</span>
            </div>
            <div class="help-shortcut">
              <kbd>Shift</kbd> + <kbd>F3</kbd>
              <span>Предыдущее совпадение поиска</span>
            </div>
            <div class="help-shortcut">
              <kbd>Ctrl</kbd> + клик по заголовку
              <span>Мультисортировка</span>
            </div>
          </div>
        </div>

        <!-- Duplicates Section -->
        <div class="help-section">
          <div class="help-section-header">
            <i class="fi fi-rr-copy"></i>
            <h3>Поиск дубликатов</h3>
          </div>
          <div class="help-info-block">
            <p>ПКМ по заголовку колонки → "Показать дубликаты". Повторяющиеся значения будут выделены разными цветами (каждая группа своим цветом). В подсказке показывается количество повторений.</p>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Понятно" icon="fi fi-rr-check" @click="showHelpDialog = false" />
      </template>
    </Dialog>

    <!-- Settings Dialog -->
    <Dialog
      v-model:visible="showSettingsDialog"
      header="Настройки таблицы"
      :modal="true"
      :style="{ width: '600px', maxHeight: '90vh' }"
      :breakpoints="{ '960px': '95vw' }"
      class="settings-dialog"
    >
      <div class="settings-content">
        <!-- Loading Settings Section -->
        <div class="settings-section">
          <div class="settings-section-header">
            <i class="fi fi-rr-download"></i>
            <h3>Загрузка данных</h3>
          </div>
          <div class="settings-options">
            <div class="settings-option">
              <Checkbox
                v-model="settings.autoLoadAll"
                inputId="settingsAutoLoadCheckbox"
                binary
                @change="toggleAutoLoad(settings.autoLoadAll)"
              />
              <div class="settings-option-content">
                <label for="settingsAutoLoadCheckbox" class="settings-option-label">
                  Автоматически загружать все данные
                </label>
                <small class="settings-option-desc">
                  Загрузит все строки таблицы в фоне. Фильтрация и поиск будут работать по всем записям.
                </small>
              </div>
            </div>
            <div class="settings-option">
              <Checkbox
                v-model="settings.autoLoadDirs"
                inputId="settingsAutoLoadDirsCheckbox"
                binary
                @change="toggleAutoLoadDirs(settings.autoLoadDirs)"
              />
              <div class="settings-option-content">
                <label for="settingsAutoLoadDirsCheckbox" class="settings-option-label">
                  Автозагрузка справочников
                </label>
                <small class="settings-option-desc">
                  Загрузит данные всех справочников с задержкой 500мс между запросами.
                </small>
              </div>
            </div>
            <div class="settings-info-note">
              <i class="fi fi-rr-info"></i>
              <span>Для таблиц > {{ settings.maxAutoLoadSize.toLocaleString() }} записей автозагрузка отключена.</span>
            </div>
          </div>
        </div>

        <!-- Date Style Section -->
        <div class="settings-section">
          <div class="settings-section-header">
            <i class="fi fi-rr-calendar"></i>
            <h3>Отображение дат</h3>
          </div>
          <div class="date-style-grid">
            <div
              class="date-style-card"
              :class="{ active: settings.dateStyle === 'classic' }"
              @click="setDateStyle('classic')"
            >
              <div class="date-style-preview classic">
                <span class="date-dir-preview">18.12.2024</span>
              </div>
              <div class="date-style-name">Классический</div>
              <div class="date-style-desc">Стиль справочника</div>
            </div>

            <div
              class="date-style-card"
              :class="{ active: settings.dateStyle === 'relative' }"
              @click="setDateStyle('relative')"
            >
              <div class="date-style-preview relative">
                <span class="date-dir-preview today">Сегодня</span>
              </div>
              <div class="date-style-name">Относительный</div>
              <div class="date-style-desc">Стиль справочника + относит.</div>
            </div>

            <div
              class="date-style-card"
              :class="{ active: settings.dateStyle === 'pill' }"
              @click="setDateStyle('pill')"
            >
              <div class="date-style-preview pill">
                <span class="date-nested-preview">Сегодня</span>
              </div>
              <div class="date-style-name">Капсула</div>
              <div class="date-style-desc">Как вложенные таблицы</div>
            </div>
          </div>
        </div>

      </div>

      <template #footer>
        <Button label="Готово" icon="fi fi-rr-check" @click="showSettingsDialog = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useIntegramSession } from '@/composables/useIntegramSession'
import integramApiClient from '@/services/integramApiClient'
import DataTable from '@/components/integram/DataTable.vue'
import IntegramBreadcrumb from '@/components/integram/IntegramBreadcrumb.vue'
import IntegramDataTableWrapper from '@/components/integram/IntegramDataTableWrapper.vue'
import ReferenceField from '@/components/integram/fields/ReferenceField.vue'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Calendar from 'primevue/calendar'
import Checkbox from 'primevue/checkbox'

// Heavy libraries loaded dynamically on demand
let html2canvasModule = null
let jsPDFModule = null
let XLSXModule = null

const props = defineProps({
  // Props can override route params if needed
  typeIdProp: {
    type: [String, Number],
    default: null
  },
  // Alternative prop names for embedded use
  typeId: {
    type: [String, Number],
    default: null
  },
  databaseProp: {
    type: String,
    default: null
  },
  database: {
    type: String,
    default: null
  },
  serverUrl: {
    type: String,
    default: null
  },
  // Hide breadcrumb and some controls when embedded
  embedded: {
    type: Boolean,
    default: false
  },
  // Parent ID for filtering subordinate objects (F_U filter)
  parentId: {
    type: [String, Number],
    default: null
  },
  // Filter by specific object ID (F_I filter)
  filterId: {
    type: [String, Number],
    default: null
  }
})

const route = useRoute()
const router = useRouter()

// Get typeId from route params or prop
const typeId = computed(() => props.typeIdProp || props.typeId || route.params.typeId)
const toast = useToast()
const confirm = useConfirm()
const { isAuthenticated, database: sessionDatabase } = useIntegramSession()

// State
const loading = ref(true) // Start as true to prevent flash of table before data loads
const loadingMore = ref(false)
const error = ref(null)
const creating = ref(false)
const isAddingRow = ref(false)
const isAddingColumn = ref(false)
const showAddColumnDialog = ref(false)
const newColumnType = ref(3) // Default: SHORT text
const newColumnAlias = ref('')
const editMode = ref('double-click')
const showCreateDialog = ref(false)
const showColumnSelector = ref(false)
const dataTableRef = ref(null)

// Row selection mode (Phase 1 - Feature Roadmap)
const isSelectionModeActive = ref(false)

function toggleSelectionMode() {
  if (dataTableRef.value) {
    dataTableRef.value.toggleSelectionMode()
    isSelectionModeActive.value = dataTableRef.value.selectionModeEnabled()
  }
}

// Footer aggregations (Phase 1 - Feature Roadmap)
const isFooterActive = ref(false)

function toggleFooter() {
  if (dataTableRef.value) {
    dataTableRef.value.toggleFooter()
    isFooterActive.value = dataTableRef.value.isFooterVisible()
  }
}

// Row Density (Phase 2 - Feature Roadmap)
const rowDensity = ref('comfortable') // 'compact' | 'comfortable' | 'spacious'

function cycleRowDensity() {
  const densities = ['compact', 'comfortable', 'spacious']
  const currentIndex = densities.indexOf(rowDensity.value)
  rowDensity.value = densities[(currentIndex + 1) % densities.length]
}

function getRowDensityIcon() {
  switch (rowDensity.value) {
    case 'compact': return 'fi fi-rr-menu-burger'
    case 'comfortable': return 'fi fi-rr-grid'
    case 'spacious': return 'fi fi-rr-stop'
    default: return 'fi fi-rr-grid'
  }
}

function getRowDensityLabel() {
  switch (rowDensity.value) {
    case 'compact': return 'Компактный'
    case 'comfortable': return 'Удобный'
    case 'spacious': return 'Просторный'
    default: return 'Удобный'
  }
}

// Background directory loading (Phase 1 - Settings)
const isLoadingDirs = ref(false)
const dirLoadProgress = ref({ loaded: 0, total: 0 })
let dirLoadProgressInterval = null

function toggleBackgroundLoading() {
  if (!dataTableRef.value) return

  if (isLoadingDirs.value) {
    // Stop loading
    dataTableRef.value.stopBackgroundLoading()
    isLoadingDirs.value = false
    if (dirLoadProgressInterval) {
      clearInterval(dirLoadProgressInterval)
      dirLoadProgressInterval = null
    }
  } else {
    // Start loading (pass autoLoadDirs setting to function)
    isLoadingDirs.value = true
    dataTableRef.value.loadAllDirDataInBackground(settings.value.autoLoadDirs)

    // Update progress every 200ms
    dirLoadProgressInterval = setInterval(() => {
      if (dataTableRef.value) {
        dirLoadProgress.value = dataTableRef.value.backgroundLoadProgress()
        isLoadingDirs.value = dataTableRef.value.isBackgroundLoadingDirs()

        // Stop interval when loading completes
        if (!isLoadingDirs.value) {
          clearInterval(dirLoadProgressInterval)
          dirLoadProgressInterval = null
        }
      }
    }, 200)
  }
}

function toggleAutoLoadDirs(enabled) {
  // Ensure enabled is a boolean, not a string
  const enabledBool = enabled === true || enabled === 'true'
  console.log('[toggleAutoLoadDirs] Изменяем автозагрузку справочников:', { enabled, enabledBool, previous: settings.value.autoLoadDirs })

  // ВАЖНО: Отключаем загрузку если она уже происходит
  if (!enabledBool && dirLoadProgressInterval) {
    clearInterval(dirLoadProgressInterval)
    dirLoadProgressInterval = null
    if (dataTableRef.value) {
      dataTableRef.value.stopBackgroundLoading()
    }
    console.log('[toggleAutoLoadDirs] Остановили текущую загрузку справочников')
  }

  settings.value.autoLoadDirs = enabledBool
  // ВАЖНО: Передаем plain object вместо Proxy для корректной сериализации в JSON
  saveSettings({ ...settings.value })

  if (enabledBool && dataTableRef.value) {
    console.log('[toggleAutoLoadDirs] Запускаем фоновую загрузку справочников')
    isLoadingDirs.value = true
    dataTableRef.value.loadAllDirDataInBackground(enabledBool)

    // Update progress every 200ms
    dirLoadProgressInterval = setInterval(() => {
      if (dataTableRef.value) {
        dirLoadProgress.value = dataTableRef.value.backgroundLoadProgress()
        isLoadingDirs.value = dataTableRef.value.isBackgroundLoadingDirs()

        // Stop interval when loading completes
        if (!isLoadingDirs.value) {
          console.log('[toggleAutoLoadDirs] Фоновая загрузка справочников завершена')
          clearInterval(dirLoadProgressInterval)
          dirLoadProgressInterval = null
        }
      }
    }, 200)
  } else {
    console.log('[toggleAutoLoadDirs] Автозагрузка справочников отключена')
  }
}

// Nested (subordinate) table dialog state
const nestedDialog = ref({
  visible: false,
  tableId: null,
  parentRowId: null,
  tableName: '',
  loading: false
})

// Directory table dialog state
const directoryDialog = ref({
  visible: false,
  typeId: null,
  typeName: '',
  dirRowId: null
})

// Help dialog state
const showHelpDialog = ref(false)

// Settings dialog state
const showSettingsDialog = ref(false)

// Search & Filter state
const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const isFilterDialogVisible = ref(false)
const filterConditions = ref([])
const filterApplyButton = ref(null)
const routeQueryOverride = ref(null)
let searchDebounceTimer = null

// Search Navigation (Phase 2 - Feature Roadmap)
const searchMatches = ref([]) // Array of { rowId, headerId, value }
const currentMatchIndex = ref(-1)

// Column visibility
const allHeaders = ref([]) // All headers from API
const selectedColumns = ref({}) // { headerId: true/false }

// Data
const typeData = ref(null)
const requisitesMeta = ref([])
const headers = ref([])
const rows = ref([])

// Pagination
const currentPage = ref(1)
const rowsPerPage = ref(50)
const hasMore = ref(false)

// Background loading & Smart loading
const STORAGE_KEY = 'datatable_settings'
const DEFAULT_SETTINGS = {
  autoLoadAll: true,           // Фоновая загрузка всех данных (вкл по умолчанию)
  autoLoadDirs: true,          // Автозагрузка справочников (вкл по умолчанию)
  maxAutoLoadSize: 20000,      // Макс размер для автозагрузки
  backgroundChunkSize: 1000,   // Размер chunk
  backgroundDelay: 150,        // Задержка между chunk (мс)
  dateStyle: 'relative'        // Стиль дат: classic, relative, chip, smart
}

// Load settings from localStorage
// ВАЖНО: Эта функция СОЗДАЕТ запись в localStorage при первом открытии!
function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (stored) {
      // ✅ Пользователь уже открывал таблицу ранее - используем СОХРАНЕННЫЕ настройки
      const parsedSettings = JSON.parse(stored)
      console.log('[loadSettings] Загружены сохраненные настройки из localStorage:', parsedSettings)
      return { ...DEFAULT_SETTINGS, ...parsedSettings }
    } else {
      // ✅ ПЕРВОЕ ОТКРЫТИЕ - инициализируем localStorage с дефолтными значениями
      console.log('[loadSettings] ПЕРВОЕ ОТКРЫТИЕ: инициализируем localStorage с дефолтными настройками')
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS))
      return DEFAULT_SETTINGS
    }
  } catch (e) {
    console.error('[loadSettings] Ошибка при загрузке настроек:', e)
    // При ошибке все равно пытаемся сохранить дефолты
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS))
    } catch {
      console.error('[loadSettings] Не удалось сохранить дефолтные настройки')
    }
    return DEFAULT_SETTINGS
  }
}

// Save settings to localStorage
// ВАЖНО: Вызывается из toggleAutoLoad() и toggleAutoLoadDirs() когда пользователь изменяет настройки
function saveSettings(newSettings) {
  try {
    console.log('[saveSettings] Сохраняем НОВЫЕ настройки в localStorage:', newSettings)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
  } catch (e) {
    console.error('[saveSettings] Ошибка при сохранении настроек:', e)
  }
}

const settings = ref(loadSettings())
const allRows = ref([])                    // Все загруженные строки
const isBackgroundLoading = ref(false)     // Флаг фоновой загрузки
const backgroundProgress = ref(0)          // Прогресс (0-100)
const loadedCount = ref(0)                 // Загружено записей
const totalCount = ref(0)                  // Всего записей
const allDataLoaded = ref(false)           // Все данные загружены
const backgroundLoadingAborted = ref(false) // Отменена ли загрузка

// Create form
const createForm = ref({
  value: '',
  requisites: {}
})

// ✅ Extract constant breadcrumb item to avoid recreation
const TABLES_BREADCRUMB_ITEM = Object.freeze({ label: 'Таблицы', to: `/table`, icon: 'fi fi-rr-table' })

// Computed
const database = computed(() => props.databaseProp || props.database || route.params.database || sessionDatabase.value || 'A2025')

// API server URL for file downloads (FILE and PATH types)
// Priority: 1) prop, 2) integramApiClient.getServer(), 3) fallback to dronedoc.ru
const apiServerUrl = computed(() => {
  if (props.serverUrl) return props.serverUrl
  const serverFromClient = integramApiClient.getServer()
  return serverFromClient || 'https://dronedoc.ru'
})

const breadcrumbItems = computed(() => {
  const items = [TABLES_BREADCRUMB_ITEM]
  if (typeData.value?.val) {
    items.push({ label: typeData.value.val, icon: 'fi fi-rr-menu-burger' })
  }
  return items
})

// Editable requisites for create dialog (excludes nested/subordinate tables)
const editableRequisites = computed(() => {
  return requisitesMeta.value.filter(req => !req.isNested)
})

// Column options for selector dialog
const columnOptions = computed(() => {
  return allHeaders.value.map(h => ({
    id: h.id,
    value: h.value || h.title || `Column ${h.id}`
  }))
})

// Filtered rows based on search query and filter conditions
const filteredRows = computed(() => {
  // ВАЖНО: Используем allRows ТОЛЬКО когда загрузка ЗАВЕРШЕНА
  // Иначе таблица будет постоянно перерисовываться во время загрузки
  let result = allDataLoaded.value ? allRows.value : rows.value

  // ✅ ФИЛЬТРАЦИЯ ТЕПЕРЬ ВСЕГДА СЕРВЕРНАЯ
  // Клиентская фильтрация НЕ нужна - данные уже отфильтрованы на сервере
  // Только поиск (searchQuery) применяется на клиенте

  // Apply search query filter (клиентский поиск)
  const query = debouncedSearchQuery.value.toLowerCase().trim()
  if (query) {
    result = result.filter(row =>
      row.values.some(cell => String(cell.value || '').toLowerCase().includes(query))
    )
  }

  // filterConditions применяются на СЕРВЕРЕ через buildServerFilters()
  // НЕ дублируем фильтрацию на клиенте!

  return result
})

// Показывать ли предупреждение о неполных данных
const showPartialDataWarning = computed(() => {
  // Фильтры теперь ВСЕГДА серверные - предупреждение не нужно
  // Показывать только если:
  // 1. Данные не загружены полностью
  // 2. Есть ПОИСК (searchQuery) - он клиентский
  // 3. Автозагрузка включена
  return settings.value.autoLoadAll &&
         !allDataLoaded.value &&
         !isBackgroundLoading.value &&
         searchQuery.value.trim().length > 0
})

// Helper function to check if a cell value matches a filter condition
function matchesCondition(cellValue, condition) {
  const { operator, value, value2, type } = condition
  const strValue = String(cellValue).toLowerCase()
  const filterValue = String(value || '').toLowerCase()

  switch (operator) {
    case 'contains':
      return strValue.includes(filterValue)
    case 'equals':
      if (type === 13 || type === 14) { // NUMBER types
        return Number(cellValue) === Number(value)
      }
      return strValue === filterValue
    case 'notEquals':
      return strValue !== filterValue
    case 'startsWith':
      return strValue.startsWith(filterValue)
    case 'endsWith':
      return strValue.endsWith(filterValue)
    case 'isEmpty':
      return !cellValue || strValue.trim() === ''
    case 'greater':
      return Number(cellValue) > Number(value)
    case 'less':
      return Number(cellValue) < Number(value)
    case 'between':
      const numValue = Number(cellValue)
      return numValue >= Number(value) && numValue <= Number(value2)
    default:
      return true
  }
}

// Headers available for filtering
const filterableHeaders = computed(() => {
  return headers.value.filter(header => header.type !== 10) // Exclude certain types
})

// Check if there are active filters
const hasActiveFilters = computed(() => {
  return filterConditions.value.some(c =>
    c.operator === 'isEmpty' || (c.value !== null && c.value !== '')
  )
})

// Filter operators configuration
const OPERATORS = {
  text: [
    { label: 'содержит', value: 'contains' },
    { label: 'равно', value: 'equals' },
    { label: 'начинается с', value: 'startsWith' },
    { label: 'заканчивается на', value: 'endsWith' },
    { label: 'пусто', value: 'isEmpty' }
  ],
  number: [
    { label: 'равно', value: 'equals' },
    { label: 'больше', value: 'greater' },
    { label: 'меньше', value: 'less' },
    { label: 'между', value: 'between' },
    { label: 'пусто', value: 'isEmpty' }
  ],
  date: [
    { label: 'равно', value: 'equals' },
    { label: 'между', value: 'between' },
    { label: 'пусто', value: 'isEmpty' }
  ],
  boolean: [
    { label: 'равно', value: 'equals' },
    { label: 'не равно', value: 'notEquals' }
  ]
}

// Get type category for operator selection
function getTypeCategory(type) {
  switch (type) {
    case 3: case 8: case 12: return 'text'
    case 13: case 14: return 'number'
    case 9: case 4: return 'date'
    case 11: return 'boolean'
    default: return 'text'
  }
}

function getOperatorsForType(type) {
  return OPERATORS[getTypeCategory(type)]
}

function getDefaultOperatorForType(type) {
  return OPERATORS[getTypeCategory(type)][0].value
}

function isRangeOperator(operator) {
  return operator === 'between'
}

const LEGACY_TABLE_STATE_KEYS = new Set(['lnx', 'order_val', 'desc', 'f_show_all', 'full'])

function normalizeQueryValue(value) {
  const normalized = Array.isArray(value) ? value[0] : value
  if (normalized === null || normalized === undefined || normalized === '') return null
  return String(normalized)
}

function getLegacyRouteQueryState() {
  const legacyState = {}

  Object.entries(routeQueryOverride.value || route.query || {}).forEach(([key, value]) => {
    if (!key.startsWith('F_') && !LEGACY_TABLE_STATE_KEYS.has(key)) return

    const normalizedValue = normalizeQueryValue(value)
    if (normalizedValue !== null) {
      legacyState[key] = normalizedValue
    }
  })

  return legacyState
}

function applyEmbeddedFilters(queryFilters) {
  if (props.parentId !== null && props.parentId !== undefined && props.parentId !== '') {
    queryFilters.F_U = String(props.parentId)
  }

  if (props.filterId !== null && props.filterId !== undefined && props.filterId !== '') {
    queryFilters.F_I = String(props.filterId)
  }
}

function buildObjectListQueryFilters(page = 1, limit = rowsPerPage.value) {
  const queryFilters = {
    pg: page,
    LIMIT: limit,
    ...getLegacyRouteQueryState()
  }

  applyEmbeddedFilters(queryFilters)

  // Добавить серверные фильтры из Vue dialog. Они перекрывают URL filters
  // для тех же колонок, когда пользователь применяет новые условия.
  const serverFilters = buildServerFilters()
  if (Object.keys(serverFilters).length > 0) {
    Object.assign(queryFilters, serverFilters)
    console.log('[buildObjectListQueryFilters] Server filters:', serverFilters)
  }

  return queryFilters
}

function buildObjectCountQueryFilters(queryFilters) {
  const countFilters = {}

  Object.entries(queryFilters).forEach(([key, value]) => {
    if (key.startsWith('F_') || key === 'lnx') {
      countFilters[key] = value
    }
  })

  return countFilters
}

function buildRouteQueryForAppliedFilters() {
  const nextQuery = { ...(route.query || {}) }

  Object.keys(nextQuery).forEach(key => {
    if (key.startsWith('F_') && key !== 'F_U' && key !== 'F_I') {
      delete nextQuery[key]
    }
  })
  delete nextQuery.pg

  const serverFilters = buildServerFilters()
  Object.assign(nextQuery, serverFilters)

  if (!Object.prototype.hasOwnProperty.call(serverFilters, 'lnx') &&
      normalizeQueryValue(nextQuery.lnx) === '0') {
    delete nextQuery.lnx
  }

  return nextQuery
}

function syncRouteQueryWithAppliedFilters() {
  const nextQuery = buildRouteQueryForAppliedFilters()
  routeQueryOverride.value = nextQuery
  router.replace({ query: nextQuery })
}

// Methods
async function loadData(page = 1) {
  if (!isAuthenticated.value) {
    router.replace('/login')
    return
  }

  try {
    if (page === 1) {
      loading.value = true
    } else {
      loadingMore.value = true
    }
    error.value = null

    // Set database context
    if (database.value) {
      integramApiClient.setDatabase(database.value)
    }

    if (page === 1) {
      allRows.value = []
      allDataLoaded.value = false
      backgroundProgress.value = 0
      loadedCount.value = 0
      totalCount.value = 0
    }

    // Fetch objects using legacy URL-compatible table state.
    const queryFilters = buildObjectListQueryFilters(page, rowsPerPage.value)

    console.log('[loadData] Database:', integramApiClient.getDatabase(), 'TypeId:', typeId.value)
    const data = await integramApiClient.getObjectList(typeId.value, queryFilters)
    console.log('[loadData] API response reqs sample:', data.reqs ? Object.keys(data.reqs)[0] : 'none', data.reqs ? data.reqs[Object.keys(data.reqs)[0]] : null)
    typeData.value = data.type

    // Extract requisites metadata
    if (data.req_type && data.req_order) {
      requisitesMeta.value = data.req_order.map(reqId => ({
        id: reqId,
        alias: data.req_type[reqId] || `Req ${reqId}`,
        base: data.req_base?.[reqId] || 'SHORT',
        baseId: data.req_base_id?.[reqId],
        refType: data.ref_type?.[reqId] || null,
        isMulti: data.req_attrs?.[reqId]?.includes(':MULTI:') || false,
        isNested: !!data.arr_type?.[reqId]
      }))
    }

    // Transform data to DataTable format
    transformData(data, page === 1)

    // Check if more data available
    hasMore.value = (data.object || []).length >= rowsPerPage.value
    currentPage.value = page

    // Load total count for badge (only on first page)
    if (page === 1 && totalCount.value === 0) {
      try {
        const countResult = await integramApiClient.getObjectCount(
          typeId.value,
          buildObjectCountQueryFilters(queryFilters)
        )
        totalCount.value = countResult.count || 0
        console.log(`[loadData] Total records in table: ${totalCount.value}`)
      } catch (err) {
        console.warn('[loadData] Failed to get object count:', err)
      }
    }

    // Start background loading for first page
    if (page === 1) {
      console.log('[loadData] First page loaded. Settings from localStorage:', {
        autoLoadAll: settings.value.autoLoadAll,
        autoLoadDirs: settings.value.autoLoadDirs
      })

      // CRITICAL: Check for both boolean and string values
      const isAutoLoadAllEnabled = settings.value.autoLoadAll === true || settings.value.autoLoadAll === 'true'
      if (isAutoLoadAllEnabled) {
        // Запустить фоновую загрузку асинхронно (не ждать завершения)
        console.log('[loadData] autoLoadAll ВКЛЮЧЕНА - Scheduling background loading in 500ms...')
        setTimeout(() => {
          startBackgroundLoading()
        }, 500) // Небольшая задержка чтобы не перегружать сразу
      } else {
        console.log('[loadData] autoLoadAll ОТКЛЮЧЕНА - Background loading не будет запущена')
      }

      // Auto-start directory loading if enabled in settings
      console.log('[loadData] ПЕРЕД проверкой autoLoadDirs, значение:', settings.value.autoLoadDirs, 'typeof:', typeof settings.value.autoLoadDirs)
      // CRITICAL: Check for both boolean true AND string 'true'
      // if (value) will be TRUE for string "false"! Need explicit check
      const isAutoLoadDirsEnabled = settings.value.autoLoadDirs === true || settings.value.autoLoadDirs === 'true'
      if (isAutoLoadDirsEnabled) {
        console.log('[loadData] autoLoadDirs ВКЛЮЧЕНА (true) - Scheduling directory loading in 1000ms...')
        setTimeout(() => {
          console.log('[loadData] setTimeout callback: вызываем toggleAutoLoadDirs(true)')
          toggleAutoLoadDirs(true)
        }, 1000) // Немного больше задержка чтобы не перегружать одновременно с загрузкой всех строк
      } else {
        console.log('[loadData] autoLoadDirs ОТКЛЮЧЕНА (false) - Directory loading не будет запущена. Значение:', settings.value.autoLoadDirs)
      }
    }

  } catch (err) {
    error.value = err.message
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось загрузить данные: ' + err.message,
      life: 5000
    })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// Background loading function
async function startBackgroundLoading() {
  console.log('[BackgroundLoad] CALLED! settings.autoLoadAll =', settings.value.autoLoadAll, 'isBackgroundLoading =', isBackgroundLoading.value)

  // CRITICAL: Check for both boolean false AND string 'false'
  const isAutoLoadAllDisabled = settings.value.autoLoadAll === false || settings.value.autoLoadAll === 'false'
  if (isAutoLoadAllDisabled || isBackgroundLoading.value) {
    console.log('[BackgroundLoad] EARLY RETURN: autoLoadAll =', settings.value.autoLoadAll, 'isBackgroundLoading =', isBackgroundLoading.value)
    return
  }

  try {
    // Шаг 1: Определить размер таблицы
    console.log('[BackgroundLoad] Getting table size...')
    const sizeResult = await integramApiClient.getObjectCount(typeId.value)
    totalCount.value = sizeResult.count || 0

    console.log(`[BackgroundLoad] Table size: ${totalCount.value} records`)

    // Если таблица маленькая или уже все загружено
    if (totalCount.value <= rowsPerPage.value) {
      console.log('[BackgroundLoad] Table is small, no background loading needed')
      allDataLoaded.value = true
      allRows.value = [...rows.value]
      return
    }

    // Если таблица огромная - не загружать автоматически
    if (totalCount.value > settings.value.maxAutoLoadSize) {
      console.log(`[BackgroundLoad] Table is too large (${totalCount.value} > ${settings.value.maxAutoLoadSize}), skipping auto-load`)
      toast.add({
        severity: 'warn',
        summary: 'Большая таблица',
        detail: `Таблица содержит ${totalCount.value.toLocaleString()} записей. Автозагрузка отключена (лимит: ${settings.value.maxAutoLoadSize.toLocaleString()}). Фильтрация работает только на текущей странице (${rowsPerPage.value} записей).`,
        life: 8000
      })
      return
    }

    // Шаг 2: Начать фоновую загрузку
    isBackgroundLoading.value = true
    backgroundLoadingAborted.value = false

    // Собираем данные в обычный массив (не reactive) чтобы избежать мигания
    const tempAllRows = [...rows.value] // Начать с уже загруженных данных
    loadedCount.value = rows.value.length

    const chunkSize = settings.value.backgroundChunkSize
    const alreadyLoaded = rows.value.length // Сколько уже загружено (обычно 50)
    const remaining = totalCount.value - alreadyLoaded // Сколько осталось загрузить
    const additionalPages = Math.ceil(remaining / chunkSize) // Сколько дополнительных запросов нужно
    const startPage = 2 // Первая страница уже загружена

    console.log(`[BackgroundLoad] Already loaded: ${alreadyLoaded}, remaining: ${remaining}, additional pages: ${additionalPages}, chunk size: ${chunkSize}`)

    for (let chunk = 0; chunk < additionalPages; chunk++) {
      const page = startPage + chunk
      // Проверить отмену
      if (backgroundLoadingAborted.value) {
        console.log('[BackgroundLoad] Aborted by user')
        break
      }

      // Загрузить chunk with the same legacy URL/filter state as the first page.
      const queryFilters = buildObjectListQueryFilters(page, chunkSize)

      const data = await integramApiClient.getObjectList(typeId.value, queryFilters)

      // Трансформировать и добавить к allRows
      const objects = data.object || []
      const reqs = data.reqs || {}

      console.log(`[BackgroundLoad] Received ${objects.length} objects from page ${page}`)

      objects.forEach(obj => {
        const rowValues = headers.value.map(header => {
          if (header.id === 'val') {
            return {
              headerId: header.id,
              value: obj.val,
              type: header.type,
              columnType: header.columnType
            }
          } else {
            const reqId = header.termId
            const reqData = reqs[obj.id]?.[reqId]
            const cell = {
              headerId: header.id,
              value: reqData || '',
              type: header.type,
              refType: header.refType,
              columnType: header.columnType,
              isMulti: header.isMulti
            }

            // CRITICAL: Preserve nested properties for subordinate table navigation
            // This matches the logic in parseRows() function
            if (header.nested || header.columnType === 'nested') {
              cell.nested = true
              cell.nestedTableId = header.nestedTableId
              cell.nestedLink = obj.id // Parent row ID for F_U parameter

              console.log('[BackgroundLoad] NESTED cell created:', {
                headerId: header.id,
                objId: obj.id,
                nestedLink: cell.nestedLink,
                nestedTableId: cell.nestedTableId
              })
            }

            return cell
          }
        })

        // ВАЖНО: Добавляем в НЕ-реактивный массив, чтобы избежать мигания
        tempAllRows.push({
          id: obj.id,
          values: rowValues
        })
      })

      loadedCount.value = tempAllRows.length
      backgroundProgress.value = Math.round(((chunk + 1) / additionalPages) * 100)

      console.log(`[BackgroundLoad] Progress: ${chunk + 1}/${additionalPages} chunks, loaded ${loadedCount.value}/${totalCount.value} records (${backgroundProgress.value}%)`)

      // Задержка между запросами
      if (chunk < additionalPages - 1) {
        await new Promise(resolve => setTimeout(resolve, settings.value.backgroundDelay))
      }
    }

    // Завершено - АТОМАРНОЕ обновление реактивного массива
    if (!backgroundLoadingAborted.value) {
      // Сначала обновляем массив данных
      allRows.value = tempAllRows
      // ТОЛЬКО потом меняем флаг (это триггерит пересчет filteredRows)
      allDataLoaded.value = true

      console.log(`[BackgroundLoad] Complete! Loaded ${allRows.value.length} records`)

      toast.add({
        severity: 'success',
        summary: 'Загрузка завершена',
        detail: `Загружено ${allRows.value.length} записей. Фильтрация работает по всем данным.`,
        life: 3000
      })
    }

  } catch (err) {
    console.error('[BackgroundLoad] Error:', err)
    toast.add({
      severity: 'error',
      summary: 'Ошибка фоновой загрузки',
      detail: err.message,
      life: 5000
    })
  } finally {
    isBackgroundLoading.value = false
  }
}

// Cancel background loading
function cancelBackgroundLoading() {
  backgroundLoadingAborted.value = true
  isBackgroundLoading.value = false

  toast.add({
    severity: 'info',
    summary: 'Загрузка отменена',
    detail: `Сохранено ${loadedCount.value} записей из ${totalCount.value}`,
    life: 3000
  })
}

// Toggle auto-load setting
function toggleAutoLoad(value) {
  console.log('[toggleAutoLoad] Изменяем автозагрузку всех данных:', { value, previous: settings.value.autoLoadAll })
  settings.value.autoLoadAll = value
  // ВАЖНО: Передаем plain object вместо Proxy для корректной сериализации в JSON
  saveSettings({ ...settings.value })

  toast.add({
    severity: 'info',
    summary: 'Настройки сохранены',
    detail: value ? 'Автозагрузка включена' : 'Автозагрузка выключена',
    life: 2000
  })
}

// Set date display style
const DATE_STYLE_NAMES = {
  classic: 'Классический',
  relative: 'Относительный',
  chip: 'Чип',
  smart: 'Умный'
}

function setDateStyle(style) {
  settings.value.dateStyle = style
  // ВАЖНО: Передаем plain object вместо Proxy для корректной сериализации в JSON
  saveSettings({ ...settings.value })

  toast.add({
    severity: 'info',
    summary: 'Стиль дат изменён',
    detail: DATE_STYLE_NAMES[style] || style,
    life: 2000
  })
}

// Преобразовать filterConditions в серверные параметры Integram API
// Формат Legacy: F_{requisiteId}={value} с символами % для LIKE операторов
// lnx=0 для линейного поиска (LIKE/contains)
function buildServerFilters() {
  const serverFilters = {}
  let hasLikeFilters = false // Фильтры требующие LIKE (%, lnx=0)

  console.log('[buildServerFilters] START')
  console.log('[buildServerFilters] filterConditions:', JSON.stringify(filterConditions.value))
  console.log('[buildServerFilters] headers count:', headers.value.length)

  filterConditions.value.forEach((condition, idx) => {
    console.log(`[buildServerFilters] Condition ${idx}:`, condition)

    // Пропустить пустые условия
    if (!condition.headerId || !condition.value) {
      console.log(`[buildServerFilters] SKIP: Empty condition (headerId=${condition.headerId}, value=${condition.value})`)
      return
    }

    // Найти header чтобы получить termId (requisiteId)
    const header = headers.value.find(h => h.id === condition.headerId)
    console.log(`[buildServerFilters] Found header:`, header)

    if (!header || !header.termId) {
      console.warn('[buildServerFilters] SKIP: Header not found for condition:', condition)
      return
    }

    // Для колонки 'val' используем F_{typeId} (ID таблицы)
    // Для остальных колонок - F_{requisiteId}
    const filterKey = header.termId === 'val' ? `F_${typeId.value}` : `F_${header.termId}`
    let filterValue = String(condition.value)

    console.log(`[buildServerFilters] Filter key: ${filterKey} for termId: ${header.termId} (typeId: ${typeId.value})`)

    // Применить операторы поиска с символом % (как в Legacy)
    switch (condition.operator) {
      case 'contains':
        // Содержит: %value%
        filterValue = `%${filterValue.replace(/%/g, '')}%`
        hasLikeFilters = true
        break

      case 'startsWith':
        // Начинается с: value%
        filterValue = `${filterValue.replace(/%/g, '')}%`
        hasLikeFilters = true
        break

      case 'endsWith':
        // Заканчивается на: %value
        filterValue = `%${filterValue.replace(/%/g, '')}`
        hasLikeFilters = true
        break

      case 'equals':
        // Точное совпадение: value (без % и без lnx)
        // Просто передаём значение как есть
        break

      case 'notEquals':
      case 'greater':
      case 'less':
      case 'between':
        // Для числовых операторов - просто значение
        break

      default:
        // По умолчанию - как есть
        break
    }

    serverFilters[filterKey] = filterValue

    console.log(`[buildServerFilters] Added filter: ${filterKey}=${filterValue} (operator: ${condition.operator})`)
  })

  // Добавить lnx=0 ТОЛЬКО для LIKE операторов (contains, startsWith, endsWith)
  // Для точного совпадения (equals) lnx НЕ нужен!
  if (hasLikeFilters) {
    serverFilters.lnx = 0
    console.log('[buildServerFilters] Added lnx=0 for LIKE search')
  }

  console.log('[buildServerFilters] RESULT:', serverFilters)
  console.log('[buildServerFilters] END')

  return serverFilters
}

function transformData(data, reset = true) {
  console.log('[transformData] data.type:', data.type)
  console.log('[transformData] data.req_order:', data.req_order)
  console.log('[transformData] data.req_type:', data.req_type)

  // Build headers from requisites
  const newHeaders = [
    {
      id: 'val',
      value: data.type?.val || 'Значение',
      type: 3, // SHORT text
      width: 200,
      termId: 'val',
      isMain: true,
      columnType: 'regular'
    }
  ]

  // Add requisite headers
  if (data.req_order) {
    data.req_order.forEach(reqId => {
      const alias = data.req_type?.[reqId] || `Req ${reqId}`
      const base = data.req_base?.[reqId] || 'SHORT'
      const refType = data.ref_type?.[reqId]
      const isMulti = data.req_attrs?.[reqId]?.includes(':MULTI:') || false
      const isNested = !!data.arr_type?.[reqId]

      // Determine column type
      let columnType = 'regular'
      if (isNested) {
        columnType = 'nested'
      } else if (refType) {
        columnType = isMulti ? 'multi' : 'dir'
      }

      newHeaders.push({
        id: `req_${reqId}`,
        value: alias,
        type: getTypeIdFromBase(base),
        width: 150,
        termId: reqId,
        columnType,
        dirTableId: refType ? parseInt(refType) : null,
        isMulti,
        nested: isNested, // Boolean flag for DataTable.vue compatibility
        nestedTableId: isNested ? parseInt(reqId) : null, // For nested columns, reqId in req_order IS the subordinate table typeId
        attrs: data.req_attrs?.[reqId] || null // Store attrs for BUTTON type action URLs
      })
    })
  }

  headers.value = newHeaders

  // Initialize column visibility on first load
  if (reset && allHeaders.value.length === 0) {
    allHeaders.value = [...newHeaders]
    // Initialize all columns as visible
    const cols = {}
    newHeaders.forEach(h => {
      cols[h.id] = true
    })
    selectedColumns.value = cols
  }

  // Build rows from objects
  const objects = data.object || []
  const requisitesMap = data.reqs || {}

  // Debug: check if ref_XXX keys exist in reqs
  if (objects.length > 0) {
    const firstObjId = objects[0].id
    const firstObjReqs = requisitesMap[firstObjId]
    console.log('[parseRows] First object reqs keys:', firstObjReqs ? Object.keys(firstObjReqs) : 'none')
    console.log('[parseRows] Sample ref keys:', firstObjReqs ? Object.keys(firstObjReqs).filter(k => k.startsWith('ref_')) : 'none')
  }

  const newRows = objects.map((obj, index) => {
    const values = []

    // Add main value cell
    values.push({
      headerId: 'val',
      value: obj.val,
      type: 3
    })

    // Add requisite cells
    if (data.req_order) {
      data.req_order.forEach(reqId => {
        const reqValue = requisitesMap[obj.id]?.[reqId] || ''
        const base = data.req_base?.[reqId] || 'SHORT'
        const refType = data.ref_type?.[reqId]
        const isMulti = data.req_attrs?.[reqId]?.includes(':MULTI:') || false
        const isNested = !!data.arr_type?.[reqId]

        // Debug log for reqId 957
        if (reqId === '957' || reqId === 957) {
          console.log('[parseRows] DEBUG reqId 957:', {
            objId: obj.id,
            reqValue,
            isNested,
            arr_type_value: data.arr_type?.[reqId],
            has_arr_type: !!data.arr_type?.[reqId]
          })
        }

        // Build cell object
        const cell = {
          headerId: `req_${reqId}`,
          value: reqValue,
          type: getTypeIdFromBase(base)
        }

        // Handle reference/directory values
        // Integram returns ref_${reqId} with format "tableId:rowId" or "tableId:rowId1,rowId2" for multiselect
        const refKey = `ref_${reqId}`
        const refValue = requisitesMap[obj.id]?.[refKey]

        if (refType) {
          console.log('[parseRows] reqId:', reqId, 'refType:', refType, 'refKey:', refKey, 'refValue:', refValue, 'objReqs:', requisitesMap[obj.id])
        }

        if (refType && refValue) {
          const parts = refValue.split(':', 2)
          if (parts.length === 2) {
            const tableId = parseInt(parts[0])
            const rowIds = parts[1].split(',').map(id => parseInt(id)).filter(id => !isNaN(id))

            if (isMulti) {
              // Multiselect: store array of dirValues with display names
              // reqValue contains comma-separated display names (e.g., "Administrator, Manager")
              const displayNames = reqValue ? reqValue.split(',').map(s => s.trim()) : []
              cell.dirValues = rowIds.map((id, idx) => ({
                dirRowId: id,
                displayValue: displayNames[idx] || null
              }))
              cell.dirTableId = tableId
            } else {
              // Single directory reference
              cell.dirRowId = rowIds[0] || null
              cell.dirTableId = tableId
            }
          }
        } else if (refType && !refValue) {
          // Reference column but no value set
          if (isMulti) {
            cell.dirValues = []
          } else {
            cell.dirRowId = null
          }
        }

        // Mark nested/subordinate fields
        if (isNested) {
          cell.nested = true
          cell.nestedTableId = parseInt(reqId) // For nested columns, reqId in req_order IS the subordinate table typeId
          cell.nestedLink = obj.id // Link to parent object for opening subordinate table
          console.log('[parseRows] NESTED cell created:', {
            reqId,
            objId: obj.id,
            nestedLink: cell.nestedLink,
            nestedTableId: cell.nestedTableId,
            value: cell.value
          })
        }

        values.push(cell)
      })
    }

    return {
      id: obj.id,
      values
    }
  })

  if (reset) {
    rows.value = newRows
  } else {
    // Append for infinite scroll
    rows.value = [...rows.value, ...newRows]
  }
}

function getTypeIdFromBase(base) {
  // Map Integram base type names to type IDs
  // Full list: 2=HTML, 3=SHORT, 4=DATETIME, 5=GRANT, 6=PWD, 7=BUTTON,
  // 8=CHARS, 9=DATE, 10=FILE, 11=BOOLEAN, 12=MEMO, 13=NUMBER, 14=SIGNED,
  // 15=CALCULATABLE, 16=REPORT_COLUMN, 17=PATH
  const typeMap = {
    'HTML': 2,
    'SHORT': 3,
    'DATETIME': 4,
    'GRANT': 5,
    'PWD': 6,
    'BUTTON': 7,
    'CHARS': 8,
    'LONG': 8,      // LONG is same as CHARS
    'DATE': 9,
    'TIME': 9,      // TIME uses DATE display
    'FILE': 10,
    'BOOLEAN': 11,
    'BOOL': 11,
    'MEMO': 12,
    'NUMBER': 13,
    'SIGNED': 14,
    'CALCULATABLE': 15,
    'CALC': 15,
    'REPORT_COLUMN': 16,
    'REP_COL': 16,
    'PATH': 17
  }
  return typeMap[base] || 3
}

// Unified input component/props helpers (used for both requisites and filters)
function getInputComponentForType(type) {
  switch (type) {
    case 4: case 9: return Calendar  // DATETIME, DATE
    case 11: return Checkbox          // BOOLEAN
    case 13: case 14: return InputNumber // NUMBER, SIGNED
    case 2: case 12: return Textarea  // LONG, MEMO/HTML
    default: return InputText
  }
}

function getInputPropsForType(type, context = 'edit') {
  // context: 'edit' for form editing, 'filter' for filter dialog
  const dateFormat = context === 'filter' ? 'dd.mm.yy' : 'yy-mm-dd'
  switch (type) {
    case 4: return { dateFormat, showTime: true, showSeconds: context === 'filter' } // DATETIME
    case 9: return { dateFormat } // DATE
    case 11: return { binary: true } // BOOLEAN
    case 2: case 12: return { rows: 3 } // LONG, MEMO/HTML
    default: return {}
  }
}

// Requisite helpers (for create/edit forms)
function getRequisiteInputComponent(base) {
  return getInputComponentForType(getTypeIdFromBase(base))
}

function getRequisiteInputProps(base) {
  return getInputPropsForType(getTypeIdFromBase(base), 'edit')
}

function toggleEditMode() {
  editMode.value = editMode.value === 'double-click' ? 'single-click' : 'double-click'
  toast.add({
    severity: 'info',
    summary: editMode.value === 'single-click' ? 'Режим редактирования включен' : 'Режим редактирования выключен',
    detail: editMode.value === 'single-click' ? 'Кликните на ячейку для редактирования' : 'Двойной клик для редактирования',
    life: 2000
  })
}

// Column visibility methods
function selectAllColumns(visible) {
  const cols = {}
  allHeaders.value.forEach(h => {
    cols[h.id] = visible
  })
  selectedColumns.value = cols
}

function applyColumnSelection() {
  // Filter headers based on selectedColumns
  headers.value = allHeaders.value.filter(h => selectedColumns.value[h.id] !== false)
  showColumnSelector.value = false
  toast.add({
    severity: 'success',
    summary: 'Колонки обновлены',
    life: 2000
  })
}

// Search methods
function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    debouncedSearchQuery.value = searchQuery.value
    updateSearchMatches()
  }, 300)
}

// Search Navigation (Phase 2)
function updateSearchMatches() {
  if (!searchQuery.value.trim()) {
    searchMatches.value = []
    currentMatchIndex.value = -1
    return
  }

  const matches = []
  const query = searchQuery.value.toLowerCase()

  filteredRows.value.forEach(row => {
    headers.value.forEach(header => {
      const cellValue = String(row.cells[header.id]?.value || '').toLowerCase()
      if (cellValue.includes(query)) {
        matches.push({
          rowId: row.id,
          headerId: header.id,
          value: row.cells[header.id]?.value
        })
      }
    })
  })

  searchMatches.value = matches
  currentMatchIndex.value = matches.length > 0 ? 0 : -1
}

function nextSearchMatch() {
  if (searchMatches.value.length === 0) return

  currentMatchIndex.value = (currentMatchIndex.value + 1) % searchMatches.value.length
  scrollToCurrentMatch()
}

function prevSearchMatch() {
  if (searchMatches.value.length === 0) return

  currentMatchIndex.value = currentMatchIndex.value <= 0
    ? searchMatches.value.length - 1
    : currentMatchIndex.value - 1
  scrollToCurrentMatch()
}

function scrollToCurrentMatch() {
  if (currentMatchIndex.value < 0 || !dataTableRef.value) return

  const match = searchMatches.value[currentMatchIndex.value]
  if (match) {
    // Call DataTable's scrollToCell method if available
    if (dataTableRef.value.scrollToCell) {
      dataTableRef.value.scrollToCell(match.headerId, match.rowId)
    }
  }
}

function handleSearchNavigation(event) {
  // F3 - next match, Shift+F3 - previous match
  if (event.key === 'F3') {
    event.preventDefault()
    if (event.shiftKey) {
      prevSearchMatch()
    } else {
      nextSearchMatch()
    }
  }
}

// Filter methods
function showFilterDialog() {
  if (filterConditions.value.length === 0) {
    addCondition()
  }
  isFilterDialogVisible.value = true
  nextTick(() => {
    filterApplyButton.value?.$el?.focus()
  })
}

function addCondition() {
  const firstHeader = filterableHeaders.value[0]
  filterConditions.value.push({
    headerId: firstHeader?.id || null,
    type: firstHeader?.type || 3,
    operator: getDefaultOperatorForType(firstHeader?.type || 3),
    value: null,
    value2: null
  })
}

async function removeCondition(index) {
  filterConditions.value.splice(index, 1)

  // Перезагрузить данные с обновлёнными фильтрами
  currentPage.value = 1
  await loadData()

  if (filterConditions.value.length === 0) {
    isFilterDialogVisible.value = false
  }
}

function updateConditionType(index) {
  const header = filterableHeaders.value.find(h => h.id === filterConditions.value[index].headerId)
  if (header) {
    filterConditions.value[index].type = header.type
    filterConditions.value[index].operator = getDefaultOperatorForType(header.type)
    filterConditions.value[index].value = null
    filterConditions.value[index].value2 = null
  }
}

// Filter helpers (delegates to unified functions)
function getFilterComponent(type) {
  return getInputComponentForType(type)
}

function getFilterProps(type) {
  return getInputPropsForType(type, 'filter')
}

async function applyFilter() {
  isFilterDialogVisible.value = false

  // Для серверной фильтрации - всегда перезагрузить данные с фильтрами.
  console.log('[applyFilter] Applying server-side filters')
  currentPage.value = 1
  syncRouteQueryWithAppliedFilters()
  await loadData()

  toast.add({
    severity: 'success',
    summary: 'Фильтр применён',
    life: 2000
  })
}

async function resetAllFilters() {
  filterConditions.value = []
  addCondition()

  // Перезагрузить данные без фильтров (серверная фильтрация всегда активна)
  console.log('[resetAllFilters] Clearing filters and reloading')
  currentPage.value = 1
  syncRouteQueryWithAppliedFilters()
  await loadData()
}

function cancelFilter() {
  isFilterDialogVisible.value = false
}

// Export methods
function printTable() {
  const tableElement = document.querySelector('.coda-style-datatable')
  if (!tableElement) {
    toast.add({ severity: 'warn', summary: 'Таблица не найдена', life: 3000 })
    return
  }

  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <html>
      <head>
        <title>Печать таблицы - ${typeData.value?.val || 'Таблица'}</title>
        <style>
          body { margin: 20px; font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .table-title { font-size: 1.5rem; margin-bottom: 15px; text-align: center; }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="table-title">${typeData.value?.val || 'Таблица'}</div>
        ${tableElement.innerHTML}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
}

async function exportToPDF() {
  const tableElement = document.querySelector('.coda-style-datatable')
  if (!tableElement) {
    toast.add({ severity: 'warn', summary: 'Таблица не найдена', life: 3000 })
    return
  }

  try {
    toast.add({ severity: 'info', summary: 'Загрузка библиотек...', life: 1500 })

    // Dynamic import of heavy libraries
    if (!html2canvasModule) {
      html2canvasModule = (await import('html2canvas')).default
    }
    if (!jsPDFModule) {
      jsPDFModule = (await import('jspdf')).default
    }

    toast.add({ severity: 'info', summary: 'Создание PDF...', life: 2000 })

    const canvas = await html2canvasModule(tableElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })

    const pdf = new jsPDFModule('landscape', 'mm', 'a4')
    const imgData = canvas.toDataURL('image/png')
    const imgWidth = 280
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    const title = typeData.value?.val || 'Таблица'
    pdf.setFontSize(16)
    pdf.text(title, 10, 15)
    pdf.addImage(imgData, 'PNG', 10, 20, imgWidth, imgHeight)
    pdf.save(`${title.replace(/\s+/g, '_')}.pdf`)

    toast.add({ severity: 'success', summary: 'PDF создан', life: 3000 })
  } catch (error) {
    console.error('Ошибка при создании PDF:', error)
    toast.add({ severity: 'error', summary: 'Ошибка экспорта', detail: 'Не удалось создать PDF файл', life: 5000 })
  }
}

async function exportToExcel() {
  if (!filteredRows.value.length) {
    toast.add({ severity: 'warn', summary: 'Нет данных', detail: 'Нет данных для экспорта', life: 3000 })
    return
  }

  try {
    // Dynamic import of XLSX library
    if (!XLSXModule) {
      toast.add({ severity: 'info', summary: 'Загрузка библиотеки...', life: 1500 })
      XLSXModule = await import('xlsx')
    }

    const wsData = []

    // Header row
    const headerRow = headers.value.map(header => header.value)
    wsData.push(headerRow)

    // Data rows
    filteredRows.value.forEach(row => {
      const rowData = []
      headers.value.forEach(header => {
        const cell = row.values.find(c => c.headerId === header.id)
        rowData.push(cell ? cell.value || '' : '')
      })
      wsData.push(rowData)
    })

    const ws = XLSXModule.utils.aoa_to_sheet(wsData)
    const wb = XLSXModule.utils.book_new()
    const sheetName = (typeData.value?.val || 'Таблица').substring(0, 31)
    XLSXModule.utils.book_append_sheet(wb, ws, sheetName)

    const fileName = `${(typeData.value?.val || 'Таблица').replace(/\s+/g, '_')}.xlsx`
    XLSXModule.writeFile(wb, fileName)

    toast.add({ severity: 'success', summary: 'Excel создан', life: 3000 })
  } catch (error) {
    console.error('Ошибка при экспорте в Excel:', error)
    toast.add({ severity: 'error', summary: 'Ошибка экспорта', detail: 'Не удалось создать Excel файл', life: 5000 })
  }
}

// Event handlers
async function handleCellUpdate(event) {
  const { rowId, headerId, value, dirRowId, onSaveSuccess, onSaveError } = event

  try {
    if (headerId === 'val') {
      // Update main value
      await integramApiClient.saveObject(rowId, typeId.value, value, {})
    } else {
      // Update requisite - extract reqId from header ID
      const reqId = headerId.replace('req_', '')
      const requisites = {}

      // For directory columns, use dirRowId (object ID), not display value
      const header = headers.value.find(h => h.id === headerId)
      if (header?.dirTableId && dirRowId !== undefined && dirRowId !== null) {
        requisites[reqId] = String(dirRowId)
      } else {
        requisites[reqId] = value
      }

      await integramApiClient.setObjectRequisites(rowId, requisites)
    }

    // Update local data
    const rowIndex = rows.value.findIndex(r => r.id === rowId)
    if (rowIndex !== -1) {
      const cell = rows.value[rowIndex].values.find(v => v.headerId === headerId)
      if (cell) {
        cell.value = value
        if (dirRowId !== undefined) {
          cell.dirRowId = dirRowId
        }
      }
    }

    onSaveSuccess?.()

    toast.add({
      severity: 'success',
      summary: 'Сохранено',
      detail: 'Изменения сохранены',
      life: 2000
    })
  } catch (err) {
    onSaveError?.(err)

    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось сохранить: ' + err.message,
      life: 5000
    })
  }
}

async function handleRowUpdate(event) {
  const { id, headers: updatedHeaders } = event

  try {
    // Build requisites object
    const requisites = {}
    let mainValue = null

    updatedHeaders.forEach(updatedHeader => {
      if (updatedHeader.headerId === 'val') {
        mainValue = updatedHeader.value
      } else {
        const reqId = updatedHeader.headerId.replace('req_', '')
        const columnHeader = headers.value.find(h => h.id === updatedHeader.headerId)

        // For directory columns (single select), use dirRowId
        if (columnHeader?.dirTableId && !columnHeader.isMulti) {
          requisites[reqId] = updatedHeader.dirRowId ? String(updatedHeader.dirRowId) : ''
        }
        // For multiselect columns, use dirValues joined by comma
        else if (columnHeader?.dirTableId && columnHeader.isMulti && updatedHeader.dirValues) {
          requisites[reqId] = updatedHeader.dirValues.map(v => v.dirRowId).join(',')
        }
        // For regular columns, use value
        else {
          requisites[reqId] = updatedHeader.value
        }
      }
    })

    // Save object with all values
    if (mainValue !== null) {
      await integramApiClient.saveObject(id, typeId.value, mainValue, requisites)
    } else {
      await integramApiClient.setObjectRequisites(id, requisites)
    }

    // Update local data
    const rowIndex = rows.value.findIndex(r => r.id === id)
    if (rowIndex !== -1) {
      updatedHeaders.forEach(updatedHeader => {
        const cell = rows.value[rowIndex].values.find(v => v.headerId === updatedHeader.headerId)
        if (cell) {
          cell.value = updatedHeader.value
          if (updatedHeader.dirRowId !== undefined) {
            cell.dirRowId = updatedHeader.dirRowId
          }
          if (updatedHeader.dirValues !== undefined) {
            cell.dirValues = updatedHeader.dirValues
          }
        }
      })
    }

    toast.add({
      severity: 'success',
      summary: 'Сохранено',
      detail: 'Строка обновлена',
      life: 2000
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось обновить строку: ' + err.message,
      life: 5000
    })
  }
}

async function handleCellMultiUpdate(event) {
  const { rowId, headerId, dirTableId, dirValues, onSaveSuccess, onSaveError } = event

  try {
    const reqId = headerId.replace('req_', '')

    // Get current multiselect items from cell
    const rowIndex = rows.value.findIndex(r => r.id === rowId)
    const cell = rowIndex !== -1 ? rows.value[rowIndex].values.find(v => v.headerId === headerId) : null
    const oldValues = cell?.dirValues || []

    // Find items to add and remove
    const oldIds = new Set(oldValues.map(v => v.dirRowId))
    const newIds = new Set(dirValues.map(v => v.dirRowId))

    const toAdd = dirValues.filter(v => !oldIds.has(v.dirRowId))
    const toRemove = oldValues.filter(v => !newIds.has(v.dirRowId))

    // Add new items using _m_set
    for (const item of toAdd) {
      await integramApiClient.addMultiselectItem(rowId, reqId, item.dirRowId)
    }

    // Remove items using _m_del (if we have msId)
    for (const item of toRemove) {
      if (item.msId) {
        await integramApiClient.removeMultiselectItem(item.msId)
      } else {
        // Fallback: try to find msId from API
        console.warn('[handleCellMultiUpdate] No msId for item, cannot remove properly:', item)
      }
    }

    // Update local data with new values
    if (cell) {
      cell.dirValues = dirValues
    }

    onSaveSuccess?.()

    toast.add({
      severity: 'success',
      summary: 'Сохранено',
      detail: 'Значения обновлены',
      life: 2000
    })
  } catch (err) {
    onSaveError?.(err)

    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось обновить: ' + err.message,
      life: 5000
    })
  }
}

async function handleLoadDirectoryList(event) {
  const { dirTableId, callback } = event
  console.log('[handleLoadDirectoryList] Loading directory:', dirTableId)

  // NOTE: We ALWAYS load when explicitly requested via emit, regardless of autoLoadDirs setting
  // The autoLoadDirs check happens at the point where loading is initiated, NOT when handling the load request.
  // This allows dropdown/multiselect cells to work even when autoLoadDirs is disabled.

  try {
    const data = await integramApiClient.getObjectList(dirTableId, { LIMIT: 500 })
    console.log('[handleLoadDirectoryList] Got data for', dirTableId, ':', data?.object?.length || 0, 'items')
    const list = (data.object || []).map(obj => ({
      // Convert id to number for consistent matching with dirRowId (which is parsed as parseInt)
      id: parseInt(obj.id) || obj.id,
      value: obj.val
    }))
    console.log('[handleLoadDirectoryList] Sample item:', list[0])
    callback(list)
  } catch (err) {
    console.error('[handleLoadDirectoryList] Error loading directory', dirTableId, ':', err)
    callback([])
  }
}

async function handleLoadDirRow(event) {
  const { dirTableId, dirRowId, callback } = event
  console.log('[handleLoadDirRow] Loading directory row:', { dirTableId, dirRowId })

  // NOTE: We ALWAYS load when explicitly requested via emit, regardless of autoLoadDirs setting
  // The autoLoadDirs check happens at the point where loading is initiated (e.g., in preloadRowDirData,
  // showDirInfo, loadAllDirDataInBackground), NOT when handling the load request.
  // This allows hover/preview to work even when autoLoadDirs is disabled.

  try {
    // Load object data AND type metadata in parallel
    const [data, typeListData] = await Promise.all([
      integramApiClient.getObjectEditData(dirRowId),
      dirTableId ? integramApiClient.getObjectList(dirTableId, { LIMIT: 1 }) : null
    ])

    if (data && data.obj) {
      // Build headers array from req_type (column aliases)
      const headers = []
      const values = []
      const subordinates = [] // Array of subordinate tables with their objects

      // Add main value header - use type name or "Значение"
      const typeName = data.obj.type_name || data.type?.val || typeListData?.type?.val || 'Значение'
      headers.push({
        id: 'val',
        value: typeName
      })
      values.push({
        headerId: 'val',
        value: data.obj.val || ''
      })

      // Helper to extract value from reqData
      const extractValue = (reqData) => {
        if (!reqData) return ''
        if (typeof reqData === 'object') {
          return reqData.value ?? reqData.val ?? ''
        }
        return reqData
      }

      // Collect subordinate table IDs from type metadata (arr_type)
      const subordinateTypeIds = []
      const arrType = typeListData?.arr_type || data.arr_type
      const reqType = typeListData?.req_type || data.req_type
      if (arrType) {
        Object.keys(arrType).forEach(reqId => {
          if (arrType[reqId]) {
            subordinateTypeIds.push({
              typeId: parseInt(reqId),
              alias: reqType?.[reqId] || `Таблица ${reqId}`
            })
          }
        })
      }

      // Build unified items array in order from req_order
      const items = []
      const reqOrder = typeListData?.req_order || data.req_order || []

      // First pass: collect items in order (values and subordinate placeholders)
      for (const reqId of reqOrder) {
        if (arrType?.[reqId]) {
          // This is a subordinate table - add placeholder
          items.push({
            itemType: 'subordinate',
            typeId: parseInt(reqId),
            alias: reqType?.[reqId] || '',
            objects: [],
            count: 0
          })
        } else {
          // Regular value
          const reqValue = extractValue(data.reqs?.[reqId])
          if (reqValue || reqValue === 0) {
            items.push({
              itemType: 'value',
              headerId: reqId,
              alias: reqType?.[reqId] || '',
              value: reqValue,
              type: data.req_base_id?.[reqId] || null
            })
          }
        }
      }

      // Second pass: load subordinate data in parallel
      const subordinateItems = items.filter(i => i.itemType === 'subordinate')
      if (subordinateItems.length > 0) {
        const subPromises = subordinateItems.map(async (subItem) => {
          try {
            const subData = await integramApiClient.getObjectList(subItem.typeId, {
              F_U: dirRowId,
              LIMIT: 5
            })
            subItem.objects = (subData?.object || []).slice(0, 5).map(obj => ({
              id: obj.id,
              val: obj.val
            }))
            subItem.count = subData?.count || subItem.objects.length
          } catch (e) {
            console.warn(`Failed to load subordinate ${subItem.typeId}:`, e)
          }
        })
        await Promise.all(subPromises)
      }

      // Debug: log final preview data
      console.log('[DirPreview] Final data:', {
        itemsCount: items.length,
        items: items
      })

      callback({
        headers,
        rows: [{
          id: data.obj.id,
          val: data.obj.val,
          items  // unified array in correct order
        }]
      })
    } else {
      callback(null)
    }
  } catch (err) {
    console.error('Error loading dir row:', err)
    callback(null)
  }
}

/**
 * Load nested table preview data for hover popover
 * Shows first 5 records from the subordinate table
 */
async function handleLoadNestedPreview(event) {
  const { nestedTableId, parentRowId, tableName, callback } = event

  if (!nestedTableId || !parentRowId) {
    callback({ items: [], totalCount: 0 })
    return
  }

  try {
    // Load first 5 records filtered by parent
    const data = await integramApiClient.getObjectList(nestedTableId, {
      F_U: parentRowId,
      LIMIT: 6 // Load 6 to know if there are more
    })

    const items = (data?.object || []).slice(0, 5).map(obj => ({
      id: obj.id,
      val: obj.val,
      value: obj.val
    }))

    const totalCount = data?.count || items.length

    callback({
      items,
      totalCount,
      tableName
    })
  } catch (err) {
    console.error('[handleLoadNestedPreview] Error:', err)
    callback({ items: [], totalCount: 0 })
  }
}

function handleLoadMore() {
  if (!loadingMore.value && hasMore.value) {
    loadData(currentPage.value + 1)
  }
}

function handleOpenNested(event) {
  console.log('[handleOpenNested] RECEIVED event:', event)
  const { tableId, parentRowId, tableName } = event
  // Extract the requisite ID from header ID (format: "req_123")
  const reqId = tableId?.replace?.('req_', '') || tableId
  console.log('[handleOpenNested] Extracted reqId:', reqId, 'parentRowId:', parentRowId)

  if (parentRowId && reqId) {
    // Open nested table in dialog instead of navigating away
    console.log('[handleOpenNested] Condition TRUE - opening dialog')
    nestedDialog.value = {
      visible: true,
      tableId: reqId,
      parentRowId: parentRowId,
      tableName: tableName || 'Подчинённая таблица',
      loading: false
    }
    console.log('[handleOpenNested] Dialog state set:', nestedDialog.value)
  } else {
    console.log('[handleOpenNested] Condition FALSE - missing parentRowId or reqId')
  }
}

function handleOpenDirectory(event) {
  const { typeId, typeName, dirRowId } = event
  if (typeId) {
    directoryDialog.value = {
      visible: true,
      typeId: typeId,
      typeName: typeName || 'Справочник',
      dirRowId: dirRowId || null
    }
  }
}

async function createNestedRecord() {
  // Create a new record in the nested table with parent reference
  if (!nestedDialog.value.tableId || !nestedDialog.value.parentRowId) return

  try {
    nestedDialog.value.loading = true

    // Create object with parent ID
    const result = await integramApiClient.createObject(
      nestedDialog.value.tableId,
      'Новая запись',
      {},
      nestedDialog.value.parentRowId
    )

    toast.add({
      severity: 'success',
      summary: 'Создано',
      detail: 'Запись добавлена',
      life: 2000
    })

    // Force re-render of nested table by changing key
    const currentTableId = nestedDialog.value.tableId
    const currentParentId = nestedDialog.value.parentRowId
    nestedDialog.value.tableId = null
    await nextTick()
    nestedDialog.value.tableId = currentTableId
    nestedDialog.value.parentRowId = currentParentId

  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось создать запись: ' + err.message,
      life: 5000
    })
  } finally {
    nestedDialog.value.loading = false
  }
}

function handleAddRow() {
  showCreateDialog.value = true
}

function handleAddColumn() {
  newColumnAlias.value = ''
  newColumnType.value = 3 // Default: SHORT text
  showAddColumnDialog.value = true
}

async function createColumn() {
  if (!newColumnAlias.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Внимание',
      detail: 'Введите название колонки',
      life: 3000
    })
    return
  }

  try {
    isAddingColumn.value = true

    // Step 1: Add requisite to type
    const result = await integramApiClient.addRequisite(typeId.value, newColumnType.value)
    const newRequisiteId = result.id

    // Step 2: Set alias for the requisite
    await integramApiClient.saveRequisiteAlias(newRequisiteId, newColumnAlias.value.trim())

    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: `Колонка "${newColumnAlias.value}" добавлена!`,
      life: 3000
    })

    showAddColumnDialog.value = false
    newColumnAlias.value = ''

    // Reload data to get updated headers
    await loadData()

  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось создать колонку: ' + err.message,
      life: 5000
    })
  } finally {
    isAddingColumn.value = false
  }
}

// Column type options for add column dialog
const columnTypeOptions = [
  { value: 3, label: 'Текст (короткий)' },
  { value: 2, label: 'Текст (длинный)' },
  { value: 13, label: 'Число' },
  { value: 4, label: 'Дата и время' },
  { value: 9, label: 'Дата' },
  { value: 7, label: 'Логический (Да/Нет)' }
]

async function handleCreate() {
  if (!createForm.value.value) return

  try {
    creating.value = true
    isAddingRow.value = true

    // Build requisites
    const requisites = {}
    Object.entries(createForm.value.requisites).forEach(([reqId, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        const meta = requisitesMeta.value.find(r => r.id === reqId)
        if (meta) {
          if (meta.base === 'BOOLEAN' || meta.base === 'BOOL') {
            requisites[reqId] = value ? 'X' : ''
          } else if ((meta.base === 'DATE' || meta.base === 'DATETIME') && value instanceof Date) {
            requisites[reqId] = meta.base === 'DATE'
              ? value.toISOString().split('T')[0]
              : value.toISOString()
          } else {
            requisites[reqId] = value
          }
        }
      }
    })

    // Get parent ID from route if available
    const parentId = route.query.F_U || null

    const result = await integramApiClient.createObject(
      typeId.value,
      createForm.value.value,
      requisites,
      parentId
    )

    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: 'Запись создана!',
      life: 3000
    })

    showCreateDialog.value = false
    createForm.value = { value: '', requisites: {} }

    // Reload data
    await loadData()

  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось создать запись: ' + err.message,
      life: 5000
    })
  } finally {
    creating.value = false
    isAddingRow.value = false
  }
}

function handleRowDelete(rowId) {
  confirm.require({
    message: `Вы уверены, что хотите удалить запись #${rowId}?`,
    header: 'Подтверждение удаления',
    icon: 'fi fi-rr-triangle-warning',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await integramApiClient.deleteObject(rowId)

        // Remove from local data
        rows.value = rows.value.filter(r => r.id !== rowId)

        toast.add({
          severity: 'success',
          summary: 'Удалено',
          detail: 'Запись удалена',
          life: 2000
        })
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: 'Не удалось удалить: ' + err.message,
          life: 5000
        })
      }
    }
  })
}

async function handleRowMoveUp(rowId) {
  try {
    await integramApiClient.moveObjectUp(rowId)

    toast.add({
      severity: 'success',
      summary: 'Перемещено',
      detail: 'Объект перемещён вверх',
      life: 2000
    })

    // Reload data to reflect new order
    await loadData(1)
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось переместить: ' + err.message,
      life: 5000
    })
  }
}

async function handleRowChangeParent({ rowId, newParentId }) {
  try {
    // newParentId = 1 means make independent (up=1), otherwise set as subordinate
    await integramApiClient.moveObjectToParent(rowId, newParentId)

    const actionText = newParentId === 1 ? 'Запись теперь независимая' : `Запись переподчинена (ID родителя: ${newParentId})`

    toast.add({
      severity: 'success',
      summary: 'Подчинённость изменена',
      detail: actionText,
      life: 3000
    })

    // Reload data to reflect the change
    await loadData(1)
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось изменить подчинённость: ' + err.message,
      life: 5000
    })
  }
}

/**
 * Handle button action change from DataTable
 * Saves the button label, endpoint, and params to the column's attrs via _d_attrs API
 * New format: :ALIAS=ButtonLabel:endpoint:param1=value1:param2=value2:
 */
async function handleButtonActionChange({ headerId, termId, action, label, params }) {
  try {
    // Use label from dialog or fallback
    const buttonLabel = label || 'Кнопка'

    // Build attrs format: :ALIAS=Label:endpoint:param1=value1:param2=value2:
    let newAttrs = `:ALIAS=${buttonLabel}`

    // Add endpoint (or action id for 'none' type)
    if (action.endpoint) {
      newAttrs += `:${action.endpoint}`
    } else if (action.id) {
      newAttrs += `:${action.id}`
    }

    // Add params (only non-empty values)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value && value !== '') {
          newAttrs += `:${key}=${value}`
        }
      }
    }

    newAttrs += ':'

    // Save to server via _d_attrs endpoint
    await integramApiClient.saveRequisiteAttributes(termId, newAttrs)

    // Update local headers
    const headerIndex = headers.value.findIndex(h => h.id === headerId)
    if (headerIndex !== -1) {
      headers.value[headerIndex].attrs = newAttrs
    }

    toast.add({
      severity: 'success',
      summary: 'Кнопка настроена',
      detail: `"${buttonLabel}" → ${action.label}`,
      life: 3000
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось сохранить настройки кнопки: ' + err.message,
      life: 5000
    })
  }
}

/**
 * Handle button click from DataTable
 * Executes the configured action (API call, custom URL, etc.)
 * and reactively updates the UI based on refreshAction
 */
async function handleButtonClick({ rowId, headerId, endpoint, params, actionType, refreshAction }) {
  try {
    console.log('[handleButtonClick]', { rowId, headerId, endpoint, params, actionType, refreshAction })

    // For custom URLs, open in new tab
    if (actionType === 'custom-url') {
      let url = endpoint
      // Add params as query string if any
      if (params && Object.keys(params).length > 0) {
        const queryParams = new URLSearchParams(params).toString()
        url += (url.includes('?') ? '&' : '?') + queryParams
      }
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }

    // For API macros, make POST request
    if (actionType === 'api-macro') {
      // Convert params to form data
      const formData = new URLSearchParams()
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (value && value !== '') {
            formData.append(key, value)
          }
        }
      }

      // Make API call through integramApiClient
      await integramApiClient.post(endpoint, formData)

      // Show success toast
      toast.add({
        severity: 'success',
        summary: 'Действие выполнено',
        detail: `Запрос успешно выполнен: ${endpoint}`,
        life: 3000
      })

      // Reactive refresh based on refreshAction
      if (refreshAction === 'delete-row') {
        // Remove row from local data
        const rowIndex = rows.value.findIndex(r => r.id === rowId)
        if (rowIndex !== -1) {
          rows.value.splice(rowIndex, 1)
        }
      } else if (refreshAction === 'reload-table') {
        // Reload entire table
        await loadData(page.value)
      } else if (refreshAction === 'reload-cell') {
        // Reload specific row (find and update)
        const response = await integramApiClient.getObjectEditData(rowId)
        if (response?.obj) {
          const rowIndex = rows.value.findIndex(r => r.id === rowId)
          if (rowIndex !== -1) {
            // Update row data
            // (simplified - in real implementation, merge response into row)
            await loadData(page.value)
          }
        }
      }
    }
  } catch (err) {
    console.error('[handleButtonClick] Error:', err)
    toast.add({
      severity: 'error',
      summary: 'Ошибка действия',
      detail: 'Не удалось выполнить действие: ' + err.message,
      life: 5000
    })
  }
}

/**
 * Handle header/column actions from DataTable (delete, rename, etc.)
 * @param {Object} params - Action parameters
 * @param {string} params.action - Action type ('delete', 'rename', etc.)
 * @param {string} params.headerId - Header ID in DataTable
 * @param {string} params.termId - Requisite ID in database
 */
async function handleHeaderAction({ action, headerId, termId }) {
  console.log('[handleHeaderAction]', { action, headerId, termId })

  if (action === 'delete') {
    // Find header to get termId if not provided
    const header = headers.value.find(h => h.id === headerId)
    let requisiteId = termId || header?.termId

    console.log('[handleHeaderAction] Delete column:', { headerId, termId, requisiteId, header })

    // Check if trying to delete main column (val) - not allowed
    if (requisiteId === 'val' || headerId === 'val') {
      toast.add({
        severity: 'warn',
        summary: 'Невозможно удалить',
        detail: 'Главную колонку удалить нельзя',
        life: 5000
      })
      return
    }

    // Ensure requisiteId is a valid number (API expects numeric ID)
    // req_order from API returns requisite IDs as strings or numbers
    if (typeof requisiteId === 'string' && requisiteId !== 'val') {
      requisiteId = parseInt(requisiteId, 10)
    }

    if (!requisiteId || isNaN(requisiteId)) {
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: 'Не найден ID реквизита для удаления',
        life: 5000
      })
      return
    }

    try {
      // FIRST: Delete requisite via API
      // Legacy uses: intApi('POST','_d_del_req/'+colId(this)+'?JSON','reload')
      console.log('[handleHeaderAction] Calling deleteRequisite API with ID:', requisiteId, 'typeof:', typeof requisiteId)
      const result = await integramApiClient.deleteRequisite(requisiteId, true) // forced=true to delete even with data
      console.log('[handleHeaderAction] API response:', result)

      // Check for API error response
      // Backend returns errors as: [{"error":"message"}] or {"error":"message"}
      const errorMsg = Array.isArray(result)
        ? result[0]?.error
        : result?.error || result?.failed

      if (errorMsg) {
        throw new Error(errorMsg)
      }

      // ONLY AFTER successful API call: Update UI reactively
      const headerIndex = headers.value.findIndex(h => h.id === headerId)
      if (headerIndex !== -1) {
        const deletedHeader = headers.value[headerIndex]
        headers.value.splice(headerIndex, 1)

        toast.add({
          severity: 'success',
          summary: 'Колонка удалена',
          detail: deletedHeader.value || `Колонка #${requisiteId}`,
          life: 3000
        })
      }

      // Remove column data from rows
      rows.value.forEach(row => {
        if (row.values) {
          const cellIndex = row.values.findIndex(v => v.headerId === headerId)
          if (cellIndex !== -1) {
            row.values.splice(cellIndex, 1)
          }
        }
      })
    } catch (err) {
      console.error('[handleHeaderAction] Delete API error:', err)
      toast.add({
        severity: 'error',
        summary: 'Ошибка удаления',
        detail: err.message || 'Не удалось удалить колонку через API',
        life: 5000
      })
    }
  }
}

/**
 * Handle file upload for FILE (10) and PATH (17) column types
 * Uploads file to server and updates the cell value
 * @param {string} rowId - Object ID (row)
 * @param {string} headerId - Header ID (column in DataTable)
 * @param {string} termId - Requisite ID in database (for _m_save API)
 * @param {number} baseType - Base type (10=FILE, 17=PATH)
 * @param {File} file - File to upload
 * @param {Function} callback - Callback with result
 */
async function handleUploadFile({ rowId, headerId, termId, baseType, file, callback }) {
  try {
    toast.add({
      severity: 'info',
      summary: 'Загрузка файла',
      detail: `Загружаем ${file.name}...`,
      life: 2000
    })

    // Upload file using integramApiClient
    // termId is the requisite ID used in _m_save/{objectId} with key t{termId}
    const result = await integramApiClient.uploadRequisiteFile(rowId, termId, file)

    // Get updated object data from server to retrieve actual file path
    // This is more reliable than using file.name as server may generate different path
    let updatedValue = file.name
    try {
      const objectData = await integramApiClient.getObjectEditData(rowId)
      if (objectData?.reqs?.[termId]) {
        const reqData = objectData.reqs[termId]
        // Server returns value in different formats depending on type
        updatedValue = reqData.value || reqData || file.name
      }
    } catch (fetchErr) {
      console.warn('[handleUploadFile] Could not fetch updated value, using filename:', fetchErr)
    }

    // Reactively update local row data without full page reload
    // DataTable uses rows.values array where each item has { headerId, value, type }
    const rowIndex = rows.value.findIndex(r => r.id === rowId)
    if (rowIndex !== -1) {
      const row = rows.value[rowIndex]
      // Find the cell in values array by headerId
      const cellIndex = row.values?.findIndex(v => v.headerId === headerId)
      if (cellIndex !== -1 && cellIndex !== undefined) {
        // Update value reactively
        rows.value[rowIndex].values[cellIndex].value = updatedValue
      } else if (row.values) {
        // Cell doesn't exist yet - add it
        rows.value[rowIndex].values.push({
          headerId: headerId,
          value: updatedValue,
          type: 10 // FILE type
        })
      }
    }

    toast.add({
      severity: 'success',
      summary: 'Файл загружен',
      detail: file.name,
      life: 3000
    })

    // Call callback with success
    if (callback) {
      callback({ success: true, filename: updatedValue, result })
    }

    // No loadData() - reactive update is sufficient
  } catch (err) {
    console.error('[handleUploadFile] Error:', err)
    toast.add({
      severity: 'error',
      summary: 'Ошибка загрузки',
      detail: err.message || 'Не удалось загрузить файл',
      life: 5000
    })

    if (callback) {
      callback({ success: false, error: err.message })
    }
  }
}

// Issue #5005: ESC key handler for canceling cell edit
const handleGlobalEsc = (event) => {
  if (event.key === 'Escape') {
    // Check if DataTable is actually in edit mode using the exposed method
    if (dataTableRef.value?.isEditing && dataTableRef.value.isEditing()) {
      console.log('[IntegramDataTableWrapper] ESC pressed - canceling cell edit')
      dataTableRef.value.cancelCellEdit()
      // Stop propagation to prevent ESC from being handled elsewhere
      event.stopPropagation()
      event.preventDefault()
    }
  }
}

// Lifecycle
onMounted(async () => {
  // Add global ESC listener
  document.addEventListener('keydown', handleGlobalEsc)
  // Add F3 search navigation listener (Phase 2)
  document.addEventListener('keydown', handleSearchNavigation)

  if (!isAuthenticated.value) {
    router.replace('/login')
    return
  }
  await loadData()
})

// Watch for typeId changes (from route or prop)
watch(typeId, async (newTypeId) => {
  if (newTypeId) {
    routeQueryOverride.value = null
    currentPage.value = 1
    rows.value = []
    await loadData()
  }
})

// Фильтрация теперь применяется только по кнопке "Применить" (applyFilter)
// Watcher удалён чтобы избежать XHR запросов при каждом вводе символа в инпут

// Cleanup on unmount
onUnmounted(() => {
  // Remove global ESC listener
  document.removeEventListener('keydown', handleGlobalEsc)
  // Remove F3 search navigation listener (Phase 2)
  document.removeEventListener('keydown', handleSearchNavigation)

  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }

  // Clear directory load progress interval
  if (dirLoadProgressInterval) {
    clearInterval(dirLoadProgressInterval)
    dirLoadProgressInterval = null
  }
})
</script>

<style scoped>
.integram-datatable-wrapper {
  padding: 0 1rem 1rem 1rem;
  overflow: hidden;
}

.table-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  overflow: hidden;
}

.table-header-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
}

.button-active {
  background-color: var(--primary-color) !important;
  color: var(--primary-color-text) !important;
}

/* Header styles */
.table-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
}

.records-badge {
  background-color: var(--surface-200);
  color: var(--text-color-secondary);
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  vertical-align: super;
  margin-top: -0.5rem;
}

.header-search {
  width: 180px;
  min-width: 120px;
  max-width: 180px;
  flex-shrink: 1;
}

.header-search :deep(.p-inputtext) {
  width: 100% !important;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  font-size: 0.875rem;
}

.toolbar-separator {
  width: 1px;
  height: 20px;
  background: var(--surface-border);
  margin: 0 4px;
}

/* Responsive header */
@media screen and (max-width: 768px) {
  .header-search {
    width: 150px;
  }

  .table-title {
    font-size: 1rem;
  }
}

@media screen and (max-width: 576px) {
  .header-search {
    display: none;
  }
}

:deep(.coda-style-datatable) {
  max-height: calc(100vh - 250px) !important;
  min-height: 400px;
  overflow: auto;
}

:deep(.coda-style-datatable .table-container) {
  max-height: calc(100vh - 280px) !important;
  min-height: 350px;
  overflow: auto;
}

/* Filter dialog styles - Integram style */
.filter-empty-state {
  text-align: center;
  padding: 2rem 1rem;
}

.filter-conditions-list {
  max-height: 60vh;
  overflow-y: auto;
}

.filter-condition-item {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.filter-condition-item:last-child {
  margin-bottom: 0;
}

.condition-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--surface-border);
}

.condition-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.condition-fields {
  /* Container for fields */
}

.field {
  display: flex;
  flex-direction: column;
}

.field label {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color-secondary);
}

/* Nested table dialog styles */
.nested-table-content {
  min-height: 300px;
  max-height: 60vh;
  overflow: auto;
}

.nested-table-content :deep(.integram-datatable-wrapper) {
  padding: 0;
}

.nested-table-content :deep(.p-card) {
  box-shadow: none;
  border: none;
}

.nested-table-content :deep(.p-card-body) {
  padding: 0;
}

.nested-table-content :deep(.coda-style-datatable) {
  max-height: 50vh !important;
  min-height: 200px;
}

/* Background loading overlay - fixed at bottom of screen */
.bg-loading-overlay {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  width: auto;
  max-width: 500px;
  min-width: 350px;
}

.bg-loading-indicator {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.bg-loading-indicator .pi-spinner {
  color: var(--p-primary-color);
  font-size: 1.25rem;
}

.bg-loading-indicator .font-medium {
  font-weight: 500;
  color: var(--p-text-color);
}

.bg-loading-indicator .text-sm {
  font-size: 0.875rem;
  color: var(--p-text-color-secondary);
}

/* Slide up animation */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateX(-50%) translateY(100px);
  opacity: 0;
}

/* Row Density (Phase 2 - Feature Roadmap) */
.row-density-compact :deep(tr) {
  height: 24px !important;
}

.row-density-compact :deep(td),
.row-density-compact :deep(th) {
  padding: 2px 8px !important;
  font-size: 0.875rem;
}

.row-density-comfortable :deep(tr) {
  height: 32px !important;
}

.row-density-comfortable :deep(td),
.row-density-comfortable :deep(th) {
  padding: 4px 12px !important;
}

.row-density-spacious :deep(tr) {
  height: 48px !important;
}

.row-density-spacious :deep(td),
.row-density-spacious :deep(th) {
  padding: 8px 16px !important;
  font-size: 1rem;
}

/* Search with Navigation (Phase 2) */
.search-with-navigation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-navigation-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0 0.5rem;
  background: var(--surface-50);
  border-radius: 6px;
  border: 1px solid var(--surface-200);
}

.search-counter {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  white-space: nowrap;
  padding: 0 0.5rem;
}

/* Help Dialog Styles */
.help-content {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.help-section {
  margin-bottom: 1.5rem;
}

.help-section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.help-section-header i {
  font-size: 1.25rem;
  color: var(--primary-color);
}

.help-section-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
}

.help-info-block {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 1rem;
}

.help-info-block h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-color-secondary);
}

.help-info-block p {
  margin: 0;
  color: var(--text-color-secondary);
  line-height: 1.5;
}

.help-list {
  margin: 0.5rem 0 0 0;
  padding-left: 1.25rem;
  color: var(--text-color-secondary);
  line-height: 1.8;
}

.help-list li {
  margin-bottom: 0.25rem;
}

.help-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.help-card {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
}

.help-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.help-card-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.help-card-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.help-card-desc {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  line-height: 1.5;
}

.help-toolbar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.help-toolbar-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.help-toolbar-item i {
  color: var(--primary-color);
  font-size: 1rem;
  width: 20px;
  text-align: center;
}

.help-shortcuts {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.help-shortcut {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
}

.help-shortcut kbd {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.8rem;
  background: var(--surface-100);
  border: 1px solid var(--surface-300);
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.help-shortcut span {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.help-card-desc kbd {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.75rem;
  background: var(--surface-100);
  border: 1px solid var(--surface-300);
  border-radius: 3px;
}

/* Help Dialog customization */
:deep(.help-dialog .p-dialog-content) {
  padding: 1.5rem;
}

/* Settings Dialog Styles */
:deep(.settings-dialog .p-dialog-content) {
  padding: 1.5rem;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-section {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 1.25rem;
}

.settings-section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--surface-border);
}

.settings-section-header i {
  color: var(--primary-color);
  font-size: 1.1rem;
}

.settings-section-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
}

.settings-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.settings-option-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.settings-option-label {
  font-weight: 500;
  color: var(--text-color);
  cursor: pointer;
}

.settings-option-desc {
  color: var(--text-color-secondary);
  font-size: 0.8rem;
  line-height: 1.4;
}

.settings-info-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--surface-ground);
  border-radius: 6px;
  margin-top: 0.5rem;
}

.settings-info-note i {
  color: var(--blue-500);
  font-size: 0.9rem;
}

.settings-info-note span {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

/* Date Style Selection Grid */
.date-style-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.date-style-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--surface-ground);
  border: 2px solid var(--surface-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.date-style-card:hover {
  border-color: var(--primary-color);
  background: var(--surface-hover);
}

.date-style-card.active {
  border-color: var(--primary-color);
  background: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.date-style-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2.5rem;
  font-size: 0.9rem;
  color: var(--text-color);
}

.date-style-preview .date-dir-preview {
  display: inline-block;
  background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%);
  border: 1px solid var(--surface-200);
  color: var(--text-color);
  padding: 3px 10px;
  border-radius: 12px;
  text-align: center;
  font-weight: normal;
  white-space: nowrap;
  font-size: 0.85rem;
}

.date-style-preview .date-dir-preview.today {
  background: linear-gradient(135deg, var(--green-50) 0%, var(--green-100) 100%);
  border-color: var(--green-200);
  color: var(--green-700);
}

.date-style-preview .date-nested-preview {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  background: linear-gradient(135deg, var(--p-green-50, var(--green-50)) 0%, var(--p-green-100, var(--green-100)) 100%);
  border: 1px solid var(--p-green-200, var(--green-200));
  color: var(--p-green-700, var(--green-700));
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: normal;
}

.date-style-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-color);
}

.date-style-desc {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  text-align: center;
  line-height: 1.3;
}

@media (max-width: 480px) {
  .date-style-grid {
    grid-template-columns: 1fr;
  }
}
</style>
