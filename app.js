document.addEventListener('DOMContentLoaded', () => {
  const DEFAULT_TASKS = [
    "Осмотр / Витальные",
    "Забор крови (ОАК/БХ)",
    "ЭКГ",
    "Катетер / Доступ",
    "Назначения выполнены",
    "Журнал / База (eHealth)"
  ];

  const TRAUMA_TYPES = ["Виробнича травма", "Невиробнича травма", "ДТП", "ДТН", "Кримінальна травма"];
  const POLICE_TYPES = ["ДТП", "ДТН", "Кримінальна травма"];

  let patients = [];
  try {
    patients = JSON.parse(localStorage.getItem('hosp_patients')) || [];
    if (!Array.isArray(patients)) patients = [];
  } catch (e) {
    patients = [];
  }

  let currentFilter = 'all';
  let editingPatientId = null;

  const nameInput = document.getElementById('patient-name');
  const timeInput = document.getElementById('admission-time');
  const phoneInput = document.getElementById('patient-phone');
  const workInput = document.getElementById('patient-work');
  const addressInput = document.getElementById('patient-address');
  const outcomeSelect = document.getElementById('outcome-select');
  const caseTypeSelect = document.getElementById('case-type');

  const traumaFields = document.getElementById('trauma-fields');
  const policeFields = document.getElementById('police-fields');

  const traumaTimeInput = document.getElementById('trauma-time');
  const traumaPlaceInput = document.getElementById('trauma-place');
  const traumaWhatInput = document.getElementById('trauma-what');
  const journalRefInput = document.getElementById('journal-ref');

  const sampleTakenInput = document.getElementById('sample-taken');
  const sampleNumberInput = document.getElementById('sample-number');
  const sampleTimeInput = document.getElementById('sample-time');

  const policeTimeInput = document.getElementById('police-time');
  const policeWhoInput = document.getElementById('police-who');

  const noteInput = document.getElementById('patient-note');
  const addBtn = document.getElementById('add-btn');
  const listEl = document.getElementById('patients-list');
  const tabAll = document.getElementById('tab-all');
  const tabPending = document.getElementById('tab-pending');
  const clearShiftBtn = document.getElementById('clear-shift-btn');

  function setCurrentTime() {
    if (!timeInput) return;
    const now = new Date();
    timeInput.value = now.toTimeString().slice(0, 5);
  }
  setCurrentTime();

  function updateCaseFormVisibility() {
    if (!caseTypeSelect || !traumaFields || !policeFields) return;
    const type = caseTypeSelect.value;
    const isTrauma = TRAUMA_TYPES.includes(type);
    const isPolice = POLICE_TYPES.includes(type);

    traumaFields.classList.toggle('hidden', !isTrauma);
    policeFields.classList.toggle('hidden', !isPolice);
  }

  if (caseTypeSelect) {
    caseTypeSelect.addEventListener('change', updateCaseFormVisibility);
  }
  updateCaseFormVisibility();

  function buildTasksForType(type) {
    const tasks = [...DEFAULT_TASKS];
    if (TRAUMA_TYPES.includes(type)) {
      tasks.push(`Запись: ${type}`);
      tasks.push("Алкоголь и воздух (№ и время)");
    }
    if (POLICE_TYPES.includes(type)) {
      tasks.push("Передано в 102 (зафиксировано)");
    }
    return tasks.map(label => ({ label, done: false }));
  }

  function save() {
    localStorage.setItem('hosp_patients', JSON.stringify(patients));
    render();
  }

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) {
        if (nameInput) nameInput.focus();
        return;
      }

      const caseType = caseTypeSelect ? caseTypeSelect.value : 'standard';
      const isTrauma = TRAUMA_TYPES.includes(caseType);
      const isPolice = POLICE_TYPES.includes(caseType);

      const newPatient = {
        id: Date.now(),
        name,
        time: (timeInput && timeInput.value) ? timeInput.value : new Date().toTimeString().slice(0, 5),
        phone: phoneInput ? phoneInput.value.trim() : '',
        address: addressInput ? addressInput.value.trim() : '',
        work: workInput ? workInput.value.trim() : '',
        outcome: outcomeSelect ? outcomeSelect.value : '',
        caseType,
        trauma: isTrauma ? {
          time: traumaTimeInput ? traumaTimeInput.value.trim() : '',
          place: traumaPlaceInput ? traumaPlaceInput.value.trim() : '',
          what: traumaWhatInput ? traumaWhatInput.value.trim() : '',
          journal: journalRefInput ? journalRefInput.value.trim() : '',
          sampleTaken: sampleTakenInput ? Boolean(sampleTakenInput.checked) : false,
          sampleNumber: sampleNumberInput ? sampleNumberInput.value.trim() : '',
          sampleTime: sampleTimeInput ? sampleTimeInput.value.trim() : ''
        } : null,
        police: isPolice ? {
          time: policeTimeInput ? policeTimeInput.value.trim() : '',
          who: policeWhoInput ? policeWhoInput.value.trim() : ''
        } : null,
        note: noteInput ? noteInput.value.trim() : '',
        tasks: buildTasksForType(caseType)
      };

      patients.unshift(newPatient);

      if (nameInput) nameInput.value = '';
      if (phoneInput) phoneInput.value = '';
      if (addressInput) addressInput.value = '';
      if (workInput) workInput.value = '';
      if (outcomeSelect) outcomeSelect.value = '';
      if (noteInput) noteInput.value = '';
      if (traumaTimeInput) traumaTimeInput.value = '';
      if (traumaPlaceInput) traumaPlaceInput.value = '';
      if (traumaWhatInput) traumaWhatInput.value = '';
      if (journalRefInput) journalRefInput.value = '';
      if (sampleTakenInput) sampleTakenInput.checked = false;
      if (sampleNumberInput) sampleNumberInput.value = '';
      if (sampleTimeInput) sampleTimeInput.value = '';
      if (policeTimeInput) policeTimeInput.value = '';
      if (policeWhoInput) policeWhoInput.value = '';
      if (caseTypeSelect) caseTypeSelect.value = 'standard';

      updateCaseFormVisibility();
      setCurrentTime();
      save();
    });
  }

  window.toggleTask = (patientId, taskIndex) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient && Array.isArray(patient.tasks) && patient.tasks[taskIndex]) {
      patient.tasks[taskIndex].done = !patient.tasks[taskIndex].done;
      save();
    }
  };

  window.startInlineEdit = (patientId) => {
    editingPatientId = editingPatientId === patientId ? null : patientId;
    render();
  };

  window.cancelInlineEdit = () => {
    editingPatientId = null;
    render();
  };

  window.saveInlineEdit = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const phoneEl = document.getElementById(`edit-phone-${patientId}`);
    const addressEl = document.getElementById(`edit-address-${patientId}`);
    const workEl = document.getElementById(`edit-work-${patientId}`);
    const outcomeEl = document.getElementById(`edit-outcome-${patientId}`);
    const noteEl = document.getElementById(`edit-note-${patientId}`);

    const tTimeEl = document.getElementById(`edit-t-time-${patientId}`);
    const tPlaceEl = document.getElementById(`edit-t-place-${patientId}`);
    const tWhatEl = document.getElementById(`edit-t-what-${patientId}`);
    const tJournalEl = document.getElementById(`edit-t-journal-${patientId}`);

    const sTakenEl = document.getElementById(`edit-s-taken-${patientId}`);
    const sNumberEl = document.getElementById(`edit-s-number-${patientId}`);
    const sTimeEl = document.getElementById(`edit-s-time-${patientId}`);

    const pTimeEl = document.getElementById(`edit-p-time-${patientId}`);
    const pWhoEl = document.getElementById(`edit-p-who-${patientId}`);

    if (phoneEl) patient.phone = phoneEl.value.trim();
    if (addressEl) patient.address = addressEl.value.trim();
    if (workEl) patient.work = workEl.value.trim();
    if (outcomeEl) patient.outcome = outcomeEl.value;
    if (noteEl) patient.note = noteEl.value.trim();

    const hasTraumaBlock = Boolean(tTimeEl || tPlaceEl || tWhatEl || tJournalEl || sTakenEl || sNumberEl || sTimeEl);
    if (hasTraumaBlock) {
      patient.trauma = {
        time: tTimeEl ? tTimeEl.value.trim() : '',
        place: tPlaceEl ? tPlaceEl.value.trim() : '',
        what: tWhatEl ? tWhatEl.value.trim() : '',
        journal: tJournalEl ? tJournalEl.value.trim() : '',
        sampleTaken: sTakenEl ? Boolean(sTakenEl.checked) : false,
        sampleNumber: sNumberEl ? sNumberEl.value.trim() : '',
        sampleTime: sTimeEl ? sTimeEl.value.trim() : ''
      };
    }

    const hasPoliceBlock = Boolean(pTimeEl || pWhoEl);
    if (hasPoliceBlock) {
      patient.police = {
        time: pTimeEl ? pTimeEl.value.trim() : '',
        who: pWhoEl ? pWhoEl.value.trim() : ''
      };
    }

    editingPatientId = null;
    save();
  };

  window.deletePatient = (patientId) => {
    if (confirm('Удалить запись?')) {
      if (editingPatientId === patientId) editingPatientId = null;
      patients = patients.filter(p => p.id !== patientId);
      save();
    }
  };

  if (clearShiftBtn) {
    clearShiftBtn.addEventListener('click', () => {
      if (patients.length === 0) return;
      if (confirm('Сдать смену и удалить всех пациентов из списка?')) {
        patients = [];
        editingPatientId = null;
        save();
      }
    });
  }

  if (tabAll) {
    tabAll.addEventListener('click', () => {
      currentFilter = 'all';
      tabAll.classList.add('active');
      if (tabPending) tabPending.classList.remove('active');
      render();
    });
  }

  if (tabPending) {
    tabPending.addEventListener('click', () => {
      currentFilter = 'pending';
      tabPending.classList.add('active');
      if (tabAll) tabAll.classList.remove('active');
      render();
    });
  }

  function escapeHtml(text = '') {
    return String(text)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function render() {
    if (!listEl) return;

    const pendingPatients = patients.filter(p => Array.isArray(p.tasks) && p.tasks.some(t => !t.done));

    const countAllEl = document.getElementById('count-all');
    const countPendingEl = document.getElementById('count-pending');
    if (countAllEl) countAllEl.textContent = patients.length;
    if (countPendingEl) countPendingEl.textContent = pendingPatients.length;

    const visibleList = currentFilter === 'all' ? patients : pendingPatients;

    if (visibleList.length === 0) {
      listEl.innerHTML = `<p style="text-align:center; color:#64748b; margin-top:30px;">
        ${currentFilter === 'all' ? 'Пока никого не завозили' : 'Всё выполнено, можно сдавать смену!'}
      </p>`;
      return;
    }

    listEl.innerHTML = visibleList.map(p => {
      const tasks = Array.isArray(p.tasks) ? p.tasks : [];
      const allDone = tasks.length > 0 && tasks.every(t => t.done);
      const caseType = p.caseType || 'standard';
      const isTrauma = TRAUMA_TYPES.includes(caseType) || Boolean(p.trauma);
      const isPolice = POLICE_TYPES.includes(caseType) || Boolean(p.police);
      const isEditing = editingPatientId === p.id;

      const badges = [];
      if (caseType !== 'standard') {
        badges.push(`<span class="badge ${isPolice ? 'police' : ''}">${escapeHtml(caseType)}</span>`);
      }
      if (p.outcome) {
        badges.push(`<span class="badge outcome">${escapeHtml(p.outcome)}</span>`);
      }
      const badgesHtml = badges.length ? `<div class="badges-row">${badges.join('')}</div>` : '';

      const metaHtml = (!isEditing && (p.phone || p.address || p.work)) ? `
        <div class="meta-info">
          ${p.phone ? `<div><b>Телефон:</b> ${escapeHtml(p.phone)}</div>` : ''}
          ${p.address ? `<div><b>Проживает:</b> ${escapeHtml(p.address)}</div>` : ''}
          ${p.work ? `<div><b>Работа:</b> ${escapeHtml(p.work)}</div>` : ''}
        </div>
      ` : '';

      const t = p.trauma || {};
      const pol = p.police || {};
      const hasSampleInfo = Boolean(t.sampleTaken || t.sampleNumber || t.sampleTime);

      let detailsHtml = '';
      if (!isEditing && (isTrauma || isPolice)) {
        detailsHtml = `
          <div class="case-details">
            ${t.time ? `<div><b>Время травмы:</b> ${escapeHtml(t.time)}</div>` : ''}
            ${t.place ? `<div><b>Где:</b> ${escapeHtml(t.place)}</div>` : ''}
            ${t.what ? `<div><b>Обстоятельства:</b> ${escapeHtml(t.what)}</div>` : ''}
            ${t.journal ? `<div><b>Журнал:</b> ${escapeHtml(t.journal)}</div>` : ''}
            ${hasSampleInfo ? `
              <div class="sampling-summary">
                <b>Алкоголь и воздух:</b> ${t.sampleTaken ? 'набраны' : 'не отмечено'} · ${t.sampleNumber ? `№ ${escapeHtml(t.sampleNumber)}` : '№ не указан'} · ${t.sampleTime ? `в ${escapeHtml(t.sampleTime)}` : 'время не указано'}
              </div>
            ` : ''}
            ${isPolice ? `
              <div class="police-summary">
                <b>102:</b> ${pol.time ? `в ${escapeHtml(pol.time)}` : 'время не указано'} · ${pol.who ? `принял(а): ${escapeHtml(pol.who)}` : 'кто принял не указано'}
              </div>
            ` : ''}
          </div>
        `;
      }

      let inlineEditHtml = '';
      if (isEditing) {
        inlineEditHtml = `
          <div class="inline-edit-box">
            <div class="inline-edit-title">Редактирование в карточке</div>
            <div class="input-row">
              <input type="text" id="edit-phone-${p.id}" value="${escapeHtml(p.phone || '')}" placeholder="Номер телефона" autocomplete="off">
              <input type="text" id="edit-work-${p.id}" value="${escapeHtml(p.work || '')}" placeholder="Кем работает" autocomplete="off">
            </div>
            <input type="text" id="edit-address-${p.id}" value="${escapeHtml(p.address || '')}" placeholder="Где проживает" autocomplete="off">
            <select id="edit-outcome-${p.id}" class="select-input">
              <option value="" ${!p.outcome ? 'selected' : ''}>Куда пошел (не указано)</option>
              <option value="Госпитализирован" ${p.outcome === 'Госпитализирован' ? 'selected' : ''}>Госпитализирован</option>
              <option value="Амбулаторно" ${p.outcome === 'Амбулаторно' ? 'selected' : ''}>Амбулаторно</option>
              <option value="Другое" ${p.outcome === 'Другое' ? 'selected' : ''}>Другое (уточнить в заметке)</option>
            </select>
            <input type="text" id="edit-note-${p.id}" value="${escapeHtml(p.note || '')}" placeholder="Диагноз / назначения / заметка..." autocomplete="off">
            ${(isTrauma || isPolice) ? `
              <div class="input-row">
                <input type="text" id="edit-t-time-${p.id}" value="${escapeHtml(t.time || '')}" placeholder="Во сколько травма" autocomplete="off">
                <input type="text" id="edit-t-place-${p.id}" value="${escapeHtml(t.place || '')}" placeholder="Где произошло" autocomplete="off">
              </div>
              <input type="text" id="edit-t-what-${p.id}" value="${escapeHtml(t.what || '')}" placeholder="Обстоятельства (что случилось)" autocomplete="off">
              <input type="text" id="edit-t-journal-${p.id}" value="${escapeHtml(t.journal || '')}" placeholder="Журнал / № записи" autocomplete="off">
              <div class="sampling-box">
                <div class="sampling-title">Алкоголь и воздух</div>
                <label class="checkbox-row">
                  <input type="checkbox" id="edit-s-taken-${p.id}" ${t.sampleTaken ? 'checked' : ''}>
                  <span>Алкоголь и воздух набраны</span>
                </label>
                <div class="input-row">
                  <input type="text" id="edit-s-number-${p.id}" value="${escapeHtml(t.sampleNumber || '')}" placeholder="Какой номер" autocomplete="off">
                  <input type="text" id="edit-s-time-${p.id}" value="${escapeHtml(t.sampleTime || '')}" placeholder="Во сколько набрана" autocomplete="off">
                </div>
              </div>
            ` : ''}
            ${isPolice ? `
              <div class="police-box">
                <div class="police-title">Передача в 102</div>
                <div class="input-row">
                  <input type="text" id="edit-p-time-${p.id}" value="${escapeHtml(pol.time || '')}" placeholder="Во сколько передали" autocomplete="off">
                  <input type="text" id="edit-p-who-${p.id}" value="${escapeHtml(pol.who || '')}" placeholder="Кто принял" autocomplete="off">
                </div>
              </div>
            ` : ''}
            <div class="inline-edit-actions">
              <button class="save-inline-btn" onclick="saveInlineEdit(${p.id})">Сохранить</button>
              <button class="cancel-inline-btn" onclick="cancelInlineEdit()">Отмена</button>
            </div>
          </div>
        `;
      }

      return `
        <div class="patient-card ${allDone ? 'done' : ''} ${isPolice ? 'police-card' : (isTrauma ? 'trauma-card' : '')}">
          <div class="card-header">
            <div>
              <div class="patient-title">${escapeHtml(p.name)}</div>
              ${badgesHtml}
            </div>
            <div class="patient-time">Заезд: ${escapeHtml(p.time || '')}</div>
          </div>
          ${metaHtml}
          ${detailsHtml}
          ${(!isEditing && p.note) ? `<div class="patient-note">${escapeHtml(p.note)}</div>` : ''}
          ${inlineEditHtml}
          <div class="tasks-grid">
            ${tasks.map((task, idx) => `
              <div class="task-chip ${task.done ? 'checked' : ''}" onclick="toggleTask(${p.id}, ${idx})">
                ${task.done ? '✓ ' : ''}${escapeHtml(task.label)}
              </div>
            `).join('')}
          </div>
          <div class="card-actions">
            <button class="small-btn" onclick="startInlineEdit(${p.id})">${isEditing ? '✕ Закрыть' : '✎ Редактировать'}</button>
            <button class="small-btn del" onclick="deletePatient(${p.id})">Удалить</button>
          </div>
        </div>
      `;
    }).join('');
  }

  render();
});