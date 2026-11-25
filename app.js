document.addEventListener('DOMContentLoaded', () => {
  const RED_CATEGORIES = ["Криминал", "ДТП"];
  const AMBER_CATEGORIES = ["Виробнича травма", "Невиробнича травма"];
  const ALL_CATEGORIES = [...RED_CATEGORIES, ...AMBER_CATEGORIES];

  let patients = [];
  try {
    patients = JSON.parse(localStorage.getItem('hosp_patients')) || [];
    if (!Array.isArray(patients)) patients = [];
  } catch (e) {
    patients = [];
  }

  let currentFilter = 'all';
  let selectedCategory = '';
  let editingPatientId = null;
  let pendingPhotoDataUrl = '';

  // I. Карта пациента
  const nameInput = document.getElementById('patient-name');
  const dobInput = document.getElementById('patient-dob');
  const timeInput = document.getElementById('admission-time');
  const addressInput = document.getElementById('patient-address');
  const workStatusSelect = document.getElementById('work-status');
  const workDetailsRow = document.getElementById('work-details-row');
  const workPlaceInput = document.getElementById('work-place');
  const workRoleInput = document.getElementById('work-role');
  const diagnosisInput = document.getElementById('patient-diagnosis');
  const specialistInput = document.getElementById('patient-specialist');

  // II. Категория
  const categoryChipsEl = document.getElementById('category-chips');
  const caseDetailsBox = document.getElementById('case-details-box');
  const caseTimeInput = document.getElementById('case-time');
  const casePlaceInput = document.getElementById('case-place');
  const caseWhatInput = document.getElementById('case-what');
  const sampleTakenInput = document.getElementById('sample-taken');
  const sampleNumberInput = document.getElementById('sample-number');
  const sampleTimeInput = document.getElementById('sample-time');
  const police102Box = document.getElementById('police-102-box');
  const policeTimeInput = document.getElementById('police-time');
  const policeWhoInput = document.getElementById('police-who');

  // III. Действия
  const ecgInput = document.getElementById('action-ecg');
  const bloodExtraInput = document.getElementById('blood-extra');
  const bpInput = document.getElementById('vital-bp');
  const spo2Input = document.getElementById('vital-spo2');
  const hrInput = document.getElementById('vital-hr');
  const tempInput = document.getElementById('vital-temp');
  const outcomeTypeSelect = document.getElementById('outcome-type');
  const outcomeDeptInput = document.getElementById('outcome-dept');

  // Фото и список
  const photoInput = document.getElementById('patient-photo');
  const photoPreviewName = document.getElementById('photo-preview-name');
  const clearPhotoBtn = document.getElementById('clear-photo-btn');
  const addPhotoPreview = document.getElementById('add-photo-preview');
  const addBtn = document.getElementById('add-btn');
  const listEl = document.getElementById('patients-list');
  const tabAll = document.getElementById('tab-all');
  const tabPending = document.getElementById('tab-pending');
  const clearShiftBtn = document.getElementById('clear-shift-btn');

  function currentTimeStr() {
    return new Date().toTimeString().slice(0, 5);
  }

  function setAdmissionTimeNow() {
    if (timeInput) timeInput.value = currentTimeStr();
  }
  setAdmissionTimeNow();

  function updateWorkVisibility() {
    if (!workStatusSelect || !workDetailsRow) return;
    workDetailsRow.classList.toggle('hidden', workStatusSelect.value !== 'yes');
  }
  if (workStatusSelect) {
    workStatusSelect.addEventListener('change', updateWorkVisibility);
  }
  updateWorkVisibility();

  function updateOutcomeVisibility() {
    if (!outcomeTypeSelect || !outcomeDeptInput) return;
    outcomeDeptInput.classList.toggle('hidden', outcomeTypeSelect.value !== 'Госпитализация');
  }
  if (outcomeTypeSelect) {
    outcomeTypeSelect.addEventListener('change', updateOutcomeVisibility);
  }
  updateOutcomeVisibility();

  function updateCategoryUI() {
    if (categoryChipsEl) {
      categoryChipsEl.querySelectorAll('.cat-chip').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cat === selectedCategory);
      });
    }
    const isCase = ALL_CATEGORIES.includes(selectedCategory);
    const isPolice = RED_CATEGORIES.includes(selectedCategory);
    if (caseDetailsBox) caseDetailsBox.classList.toggle('hidden', !isCase);
    if (police102Box) police102Box.classList.toggle('hidden', !isPolice);
  }

  if (categoryChipsEl) {
    categoryChipsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-chip');
      if (!btn) return;
      const cat = btn.dataset.cat;
      selectedCategory = selectedCategory === cat ? '' : cat;
      updateCategoryUI();
    });
  }
  updateCategoryUI();

  function compressImage(file, maxWidth = 720, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function resetPhotoForm() {
    pendingPhotoDataUrl = '';
    if (photoInput) photoInput.value = '';
    if (photoPreviewName) photoPreviewName.textContent = 'Фото не выбрано';
    if (clearPhotoBtn) clearPhotoBtn.classList.add('hidden');
    if (addPhotoPreview) {
      addPhotoPreview.src = '';
      addPhotoPreview.classList.add('hidden');
    }
  }

  if (photoInput) {
    photoInput.addEventListener('change', async () => {
      const file = photoInput.files && photoInput.files[0];
      if (!file) return;
      try {
        pendingPhotoDataUrl = await compressImage(file);
        if (photoPreviewName) photoPreviewName.textContent = file.name;
        if (clearPhotoBtn) clearPhotoBtn.classList.remove('hidden');
        if (addPhotoPreview) {
          addPhotoPreview.src = pendingPhotoDataUrl;
          addPhotoPreview.classList.remove('hidden');
        }
      } catch (e) {
        alert('Не удалось обработать фото');
        resetPhotoForm();
      }
    });
  }

  if (clearPhotoBtn) {
    clearPhotoBtn.addEventListener('click', resetPhotoForm);
  }

  function save() {
    try {
      localStorage.setItem('hosp_patients', JSON.stringify(patients));
      render();
    } catch (e) {
      alert('Память браузера переполнена (возможно, много фото). Удали фото или сдай смену.');
    }
  }

  function getSelectedBloodChecks() {
    return Array.from(document.querySelectorAll('.blood-cb:checked')).map(el => el.value);
  }

  function clearBloodChecks() {
    document.querySelectorAll('.blood-cb').forEach(el => {
      el.checked = false;
    });
  }

  function buildInitialVitals() {
    const bp = bpInput ? bpInput.value.trim() : '';
    const spo2 = spo2Input ? spo2Input.value.trim() : '';
    const hr = hrInput ? hrInput.value.trim() : '';
    const temp = tempInput ? tempInput.value.trim() : '';
    if (!bp && !spo2 && !hr && !temp) return [];
    return [{
      time: (timeInput && timeInput.value) ? timeInput.value : currentTimeStr(),
      bp,
      spo2,
      hr,
      temp
    }];
  }

  function isPatientPending(p) {
    const hasEcg = Boolean(p.actions && p.actions.ecg);
    const hasBlood = Boolean(
      (p.actions && Array.isArray(p.actions.blood) && p.actions.blood.length > 0) ||
      (p.actions && p.actions.bloodExtra)
    );
    const hasVitals = Array.isArray(p.vitalsHistory) && p.vitalsHistory.length > 0;
    const hasOutcome = Boolean(p.outcome && p.outcome.type);

    if (!hasEcg || !hasBlood || !hasVitals || !hasOutcome) return true;

    const isCase = ALL_CATEGORIES.includes(p.category);
    const isPolice = RED_CATEGORIES.includes(p.category);
    if (isCase && !(p.caseDetails && (p.caseDetails.sampleTaken || p.caseDetails.sampleNumber))) {
      return true;
    }
    if (isPolice && !(p.police102 && (p.police102.time || p.police102.who))) {
      return true;
    }
    return false;
  }

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) {
        if (nameInput) nameInput.focus();
        return;
      }

      const isCase = ALL_CATEGORIES.includes(selectedCategory);
      const isPolice = RED_CATEGORIES.includes(selectedCategory);

      const newPatient = {
        id: Date.now(),
        name,
        dob: dobInput ? dobInput.value.trim() : '',
        admissionTime: (timeInput && timeInput.value) ? timeInput.value : currentTimeStr(),
        address: addressInput ? addressInput.value.trim() : '',
        work: {
          status: workStatusSelect ? workStatusSelect.value : 'unknown',
          place: workPlaceInput ? workPlaceInput.value.trim() : '',
          role: workRoleInput ? workRoleInput.value.trim() : ''
        },
        diagnosis: diagnosisInput ? diagnosisInput.value.trim() : '',
        specialist: specialistInput ? specialistInput.value.trim() : '',
        category: selectedCategory,
        caseDetails: isCase ? {
          time: caseTimeInput ? caseTimeInput.value.trim() : '',
          place: casePlaceInput ? casePlaceInput.value.trim() : '',
          what: caseWhatInput ? caseWhatInput.value.trim() : '',
          sampleTaken: sampleTakenInput ? Boolean(sampleTakenInput.checked) : false,
          sampleNumber: sampleNumberInput ? sampleNumberInput.value.trim() : '',
          sampleTime: sampleTimeInput ? sampleTimeInput.value.trim() : ''
        } : null,
        police102: isPolice ? {
          time: policeTimeInput ? policeTimeInput.value.trim() : '',
          who: policeWhoInput ? policeWhoInput.value.trim() : ''
        } : null,
        actions: {
          ecg: ecgInput ? Boolean(ecgInput.checked) : false,
          blood: getSelectedBloodChecks(),
          bloodExtra: bloodExtraInput ? bloodExtraInput.value.trim() : ''
        },
        vitalsHistory: buildInitialVitals(),
        outcome: {
          type: outcomeTypeSelect ? outcomeTypeSelect.value : '',
          department: outcomeDeptInput ? outcomeDeptInput.value.trim() : ''
        },
        photos: pendingPhotoDataUrl ? [pendingPhotoDataUrl] : []
      };

      patients.unshift(newPatient);

      // Сброс формы
      if (nameInput) nameInput.value = '';
      if (dobInput) dobInput.value = '';
      if (addressInput) addressInput.value = '';
      if (workStatusSelect) workStatusSelect.value = 'unknown';
      if (workPlaceInput) workPlaceInput.value = '';
      if (workRoleInput) workRoleInput.value = '';
      if (diagnosisInput) diagnosisInput.value = '';
      if (specialistInput) specialistInput.value = '';
      selectedCategory = '';
      if (caseTimeInput) caseTimeInput.value = '';
      if (casePlaceInput) casePlaceInput.value = '';
      if (caseWhatInput) caseWhatInput.value = '';
      if (sampleTakenInput) sampleTakenInput.checked = false;
      if (sampleNumberInput) sampleNumberInput.value = '';
      if (sampleTimeInput) sampleTimeInput.value = '';
      if (policeTimeInput) policeTimeInput.value = '';
      if (policeWhoInput) policeWhoInput.value = '';
      if (ecgInput) ecgInput.checked = false;
      clearBloodChecks();
      if (bloodExtraInput) bloodExtraInput.value = '';
      if (bpInput) bpInput.value = '';
      if (spo2Input) spo2Input.value = '';
      if (hrInput) hrInput.value = '';
      if (tempInput) tempInput.value = '';
      if (outcomeTypeSelect) outcomeTypeSelect.value = '';
      if (outcomeDeptInput) outcomeDeptInput.value = '';

      resetPhotoForm();
      updateWorkVisibility();
      updateOutcomeVisibility();
      updateCategoryUI();
      setAdmissionTimeNow();
      save();
    });
  }

  // Быстрое добавление нового замера показателей в историю карточки
  window.addVitalRecord = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const bp = (document.getElementById(`nv-bp-${patientId}`)?.value || '').trim();
    const spo2 = (document.getElementById(`nv-spo2-${patientId}`)?.value || '').trim();
    const hr = (document.getElementById(`nv-hr-${patientId}`)?.value || '').trim();
    const temp = (document.getElementById(`nv-temp-${patientId}`)?.value || '').trim();

    if (!bp && !spo2 && !hr && !temp) return;

    if (!Array.isArray(patient.vitalsHistory)) patient.vitalsHistory = [];
    patient.vitalsHistory.push({
      time: currentTimeStr(),
      bp,
      spo2,
      hr,
      temp
    });
    save();
  };

  // Быстрый тоггл ЭКГ прямо на карточке
  window.toggleCardEcg = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    if (!patient.actions) patient.actions = { ecg: false, blood: [], bloodExtra: '' };
    patient.actions.ecg = !patient.actions.ecg;
    save();
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

    patient.name = (document.getElementById(`ed-name-${patientId}`)?.value || '').trim() || patient.name;
    patient.dob = (document.getElementById(`ed-dob-${patientId}`)?.value || '').trim();
    patient.address = (document.getElementById(`ed-address-${patientId}`)?.value || '').trim();
    patient.specialist = (document.getElementById(`ed-spec-${patientId}`)?.value || '').trim();
    patient.diagnosis = (document.getElementById(`ed-diag-${patientId}`)?.value || '').trim();

    const wStatus = document.getElementById(`ed-wstatus-${patientId}`)?.value || 'unknown';
    patient.work = {
      status: wStatus,
      place: (document.getElementById(`ed-wplace-${patientId}`)?.value || '').trim(),
      role: (document.getElementById(`ed-wrole-${patientId}`)?.value || '').trim()
    };

    const oType = document.getElementById(`ed-otype-${patientId}`)?.value || '';
    patient.outcome = {
      type: oType,
      department: (document.getElementById(`ed-odept-${patientId}`)?.value || '').trim()
    };

    if (!patient.actions) patient.actions = { ecg: false, blood: [], bloodExtra: '' };
    patient.actions.ecg = Boolean(document.getElementById(`ed-ecg-${patientId}`)?.checked);
    patient.actions.bloodExtra = (document.getElementById(`ed-blood-extra-${patientId}`)?.value || '').trim();

    if (ALL_CATEGORIES.includes(patient.category) || patient.caseDetails) {
      patient.caseDetails = {
        time: (document.getElementById(`ed-ctime-${patientId}`)?.value || '').trim(),
        place: (document.getElementById(`ed-cplace-${patientId}`)?.value || '').trim(),
        what: (document.getElementById(`ed-cwhat-${patientId}`)?.value || '').trim(),
        sampleTaken: Boolean(document.getElementById(`ed-staken-${patientId}`)?.checked),
        sampleNumber: (document.getElementById(`ed-snum-${patientId}`)?.value || '').trim(),
        sampleTime: (document.getElementById(`ed-stime-${patientId}`)?.value || '').trim()
      };
    }

    if (RED_CATEGORIES.includes(patient.category) || patient.police102) {
      patient.police102 = {
        time: (document.getElementById(`ed-ptime-${patientId}`)?.value || '').trim(),
        who: (document.getElementById(`ed-pwho-${patientId}`)?.value || '').trim()
      };
    }

    editingPatientId = null;
    save();
  };

  window.addCardPhoto = async (patientId, inputEl) => {
    const file = inputEl && inputEl.files && inputEl.files[0];
    if (!file) return;
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    try {
      const dataUrl = await compressImage(file);
      if (!Array.isArray(patient.photos)) patient.photos = [];
      patient.photos.push(dataUrl);
      inputEl.value = '';
      save();
    } catch (e) {
      alert('Не удалось добавить фото');
    }
  };

  window.removeCardPhoto = (patientId, photoIndex) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !Array.isArray(patient.photos)) return;
    patient.photos.splice(photoIndex, 1);
    save();
  };

  window.openPhotoFull = (patientId, photoIndex) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !Array.isArray(patient.photos) || !patient.photos[photoIndex]) return;
    const win = window.open();
    if (win) {
      win.document.write(`<body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;"><img src="${patient.photos[photoIndex]}" style="max-width:100%;max-height:100vh;"></body>`);
    }
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
      if (confirm('Сдать смену и удалить всех пациентов?')) {
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

  function formatWorkText(w = {}) {
    if (w.status === 'yes') {
      const parts = [w.place, w.role].filter(Boolean);
      return parts.length ? `Работает: ${parts.join(' — ')}` : 'Работает: да';
    }
    if (w.status === 'no') return 'Не работает';
    return '';
  }

  function formatVitalEntry(v = {}) {
    const parts = [];
    if (v.bp) parts.push(`<b>АД:</b> ${escapeHtml(v.bp)}`);
    if (v.spo2) parts.push(`<b>SpO₂:</b> ${escapeHtml(v.spo2)}%`);
    if (v.hr) parts.push(`<b>Пульс:</b> ${escapeHtml(v.hr)}`);
    if (v.temp) parts.push(`<b>t°:</b> ${escapeHtml(v.temp)}°C`);
    return parts.join(' · ') || '—';
  }

  function render() {
    if (!listEl) return;

    const pendingPatients = patients.filter(isPatientPending);
    const countAllEl = document.getElementById('count-all');
    const countPendingEl = document.getElementById('count-pending');
    if (countAllEl) countAllEl.textContent = patients.length;
    if (countPendingEl) countPendingEl.textContent = pendingPatients.length;

    const visibleList = currentFilter === 'all' ? patients : pendingPatients;

    if (visibleList.length === 0) {
      listEl.innerHTML = `<p style="text-align:center; color:#64748b; margin-top:28px;">
        ${currentFilter === 'all' ? 'Пока заездов нет' : 'Всё закрыто, можно сдавать смену'}
      </p>`;
      return;
    }

    listEl.innerHTML = visibleList.map(p => {
      const done = !isPatientPending(p);
      const cat = p.category || '';
      const isPolice = RED_CATEGORIES.includes(cat);
      const isAmber = AMBER_CATEGORIES.includes(cat);
      const isCase = ALL_CATEGORIES.includes(cat) || Boolean(p.caseDetails);
      const isEditing = editingPatientId === p.id;
      const photos = Array.isArray(p.photos) ? p.photos : [];
      const vitals = Array.isArray(p.vitalsHistory) ? p.vitalsHistory : [];
      const acts = p.actions || { ecg: false, blood: [], bloodExtra: '' };
      const out = p.outcome || { type: '', department: '' };
      const cd = p.caseDetails || {};
      const pol = p.police102 || {};

      const badges = [];
      if (cat) badges.push(`<span class="badge ${isPolice ? 'police' : ''}">${escapeHtml(cat)}</span>`);
      if (out.type) {
        const outLabel = out.type === 'Госпитализация' && out.department
          ? `Госпитализация: ${out.department}`
          : out.type;
        badges.push(`<span class="badge outcome">${escapeHtml(outLabel)}</span>`);
      }

      const workStr = formatWorkText(p.work || {});
      const bloodList = Array.isArray(acts.blood) ? acts.blood : [];
      const bloodText = [...bloodList, acts.bloodExtra].filter(Boolean).join(', ');

      const infoHtml = !isEditing ? `
        <div class="info-block">
          ${p.dob ? `<div><b>Дата рождения:</b> ${escapeHtml(p.dob)}</div>` : ''}
          ${p.address ? `<div><b>Место жительства:</b> ${escapeHtml(p.address)}</div>` : ''}
          ${workStr ? `<div><b>${escapeHtml(workStr)}</b></div>` : ''}
          ${p.specialist ? `<div><b>К кому привезли:</b> ${escapeHtml(p.specialist)}</div>` : ''}
          ${p.diagnosis ? `<div><b>Диагноз:</b> ${escapeHtml(p.diagnosis)}</div>` : ''}
          ${bloodText ? `<div><b>Кровь:</b> ${escapeHtml(bloodText)}</div>` : ''}
          ${isCase ? `
            ${cd.time ? `<div><b>Время случая:</b> ${escapeHtml(cd.time)}</div>` : ''}
            ${cd.place ? `<div><b>Где произошло:</b> ${escapeHtml(cd.place)}</div>` : ''}
            ${cd.what ? `<div><b>Обстоятельства / журнал:</b> ${escapeHtml(cd.what)}</div>` : ''}
            ${(cd.sampleTaken || cd.sampleNumber || cd.sampleTime) ? `
              <div><b>Алкоголь и воздух:</b> ${cd.sampleTaken ? 'набран' : 'не отмечено'} · № ${escapeHtml(cd.sampleNumber || '—')} · в ${escapeHtml(cd.sampleTime || '—')}</div>
            ` : ''}
          ` : ''}
          ${(isPolice || p.police102) ? `
            <div style="color:#fca5a5;"><b>102:</b> в ${escapeHtml(pol.time || '—')} · принял(а): ${escapeHtml(pol.who || '—')}</div>
          ` : ''}
        </div>
      ` : '';

      const vitalsHtml = !isEditing ? `
        <div class="vitals-history">
          <div class="vitals-history-title">Показатели (история замеров)</div>
          ${vitals.length ? vitals.map(v => `
            <div class="vital-entry">
              <div>${formatVitalEntry(v)}</div>
              <div class="vital-entry-time">${escapeHtml(v.time || '')}</div>
            </div>
          `).join('') : `<div style="font-size:13px; color:#94a3b8;">Замеров пока нет</div>`}
          <div class="add-vital-inline">
            <div class="input-row">
              <input type="text" id="nv-bp-${p.id}" placeholder="АД" autocomplete="off">
              <input type="text" id="nv-spo2-${p.id}" placeholder="SpO₂ %" autocomplete="off">
              <input type="text" id="nv-hr-${p.id}" placeholder="Пульс" autocomplete="off">
              <input type="text" id="nv-temp-${p.id}" placeholder="t°" autocomplete="off">
            </div>
            <button type="button" class="mini-btn" onclick="addVitalRecord(${p.id})">+ Добавить замер сейчас</button>
          </div>
        </div>
      ` : '';

      const photosHtml = photos.length ? `
        <div class="card-photos">
          ${photos.map((src, pIdx) => `
            <div class="card-photo-item">
              <img src="${src}" alt="Фото" onclick="openPhotoFull(${p.id}, ${pIdx})">
              <button type="button" class="remove-photo-btn" onclick="removeCardPhoto(${p.id}, ${pIdx})">✕</button>
            </div>
          `).join('')}
        </div>
      ` : '';

      const editHtml = isEditing ? `
        <div class="inline-edit-box">
          <div class="section-heading">Редактирование карты</div>
          <input type="text" id="ed-name-${p.id}" value="${escapeHtml(p.name || '')}" placeholder="ФИО">
          <div class="input-row">
            <input type="text" id="ed-dob-${p.id}" value="${escapeHtml(p.dob || '')}" placeholder="Дата рождения">
            <input type="text" id="ed-spec-${p.id}" value="${escapeHtml(p.specialist || '')}" placeholder="К кому привезли">
          </div>
          <input type="text" id="ed-address-${p.id}" value="${escapeHtml(p.address || '')}" placeholder="Место жительства">
          <div class="input-row">
            <select id="ed-wstatus-${p.id}" class="select-input">
              <option value="unknown" ${(p.work?.status || 'unknown') === 'unknown' ? 'selected' : ''}>Работа: не указано</option>
              <option value="no" ${p.work?.status === 'no' ? 'selected' : ''}>Не работает</option>
              <option value="yes" ${p.work?.status === 'yes' ? 'selected' : ''}>Работает: Да</option>
            </select>
            <input type="text" id="ed-wplace-${p.id}" value="${escapeHtml(p.work?.place || '')}" placeholder="Где работает">
            <input type="text" id="ed-wrole-${p.id}" value="${escapeHtml(p.work?.role || '')}" placeholder="Кем">
          </div>
          <input type="text" id="ed-diag-${p.id}" value="${escapeHtml(p.diagnosis || '')}" placeholder="Диагноз">

          <label class="checkbox-row">
            <input type="checkbox" id="ed-ecg-${p.id}" ${acts.ecg ? 'checked' : ''}>
            <span>ЭКГ сделано</span>
          </label>
          <input type="text" id="ed-blood-extra-${p.id}" value="${escapeHtml(acts.bloodExtra || '')}" placeholder="Кровь / примечание">

          <div class="input-row">
            <select id="ed-otype-${p.id}" class="select-input">
              <option value="" ${!out.type ? 'selected' : ''}>Итог: не определено</option>
              <option value="Госпитализация" ${out.type === 'Госпитализация' ? 'selected' : ''}>Госпитализация</option>
              <option value="Амбулаторно" ${out.type === 'Амбулаторно' ? 'selected' : ''}>Амбулаторно</option>
            </select>
            <input type="text" id="ed-odept-${p.id}" value="${escapeHtml(out.department || '')}" placeholder="В какое отделение">
          </div>

          ${isCase ? `
            <div class="input-row">
              <input type="text" id="ed-ctime-${p.id}" value="${escapeHtml(cd.time || '')}" placeholder="Время случая">
              <input type="text" id="ed-cplace-${p.id}" value="${escapeHtml(cd.place || '')}" placeholder="Где произошло">
            </div>
            <input type="text" id="ed-cwhat-${p.id}" value="${escapeHtml(cd.what || '')}" placeholder="Обстоятельства / журнал">
            <label class="checkbox-row">
              <input type="checkbox" id="ed-staken-${p.id}" ${cd.sampleTaken ? 'checked' : ''}>
              <span>Набран алкоголь и воздух</span>
            </label>
            <div class="input-row">
              <input type="text" id="ed-snum-${p.id}" value="${escapeHtml(cd.sampleNumber || '')}" placeholder="Номер пробы">
              <input type="text" id="ed-stime-${p.id}" value="${escapeHtml(cd.sampleTime || '')}" placeholder="Во сколько набрана">
            </div>
          ` : ''}

          ${(isPolice || p.police102) ? `
            <div class="input-row">
              <input type="text" id="ed-ptime-${p.id}" value="${escapeHtml(pol.time || '')}" placeholder="102: во сколько">
              <input type="text" id="ed-pwho-${p.id}" value="${escapeHtml(pol.who || '')}" placeholder="102: кто принял">
            </div>
          ` : ''}

          <div class="inline-edit-actions">
            <button type="button" class="save-inline-btn" onclick="saveInlineEdit(${p.id})">Сохранить</button>
            <button type="button" class="cancel-inline-btn" onclick="cancelInlineEdit()">Отмена</button>
          </div>
        </div>
      ` : '';

      return `
        <div class="patient-card ${done ? 'done' : ''} ${isPolice ? 'cat-red' : (isAmber ? 'cat-amber' : '')}">
          <div class="card-header">
            <div>
              <div class="patient-title">${escapeHtml(p.name)}</div>
              ${p.specialist ? `<div class="patient-sub">К кому: ${escapeHtml(p.specialist)}</div>` : ''}
            </div>
            <div class="patient-time">Заезд: ${escapeHtml(p.admissionTime || '')}</div>
          </div>

          ${badges.length ? `<div class="badges-row">${badges.join('')}</div>` : ''}
          ${infoHtml}
          ${vitalsHtml}
          ${photosHtml}
          ${editHtml}

          <div class="tasks-grid">
            <div class="task-chip ${acts.ecg ? 'checked' : ''}" onclick="toggleCardEcg(${p.id})">
              ${acts.ecg ? '✓ ' : ''}ЭКГ
            </div>
            <div class="task-chip ${bloodText ? 'checked' : ''}" onclick="startInlineEdit(${p.id})">
              ${bloodText ? '✓ ' : ''}Кровь (${bloodText || 'не указано'})
            </div>
          </div>

          <div class="card-actions">
            <button type="button" class="small-btn" onclick="startInlineEdit(${p.id})">${isEditing ? '✕ Закрыть' : '✎ Редактировать'}</button>
            <label class="small-btn" style="cursor:pointer;">
              📷 Фото
              <input type="file" accept="image/*" capture="environment" class="hidden" onchange="addCardPhoto(${p.id}, this)">
            </label>
            <button type="button" class="small-btn del" onclick="deletePatient(${p.id})">Удалить</button>
          </div>
        </div>
      `;
    }).join('');
  }

  render();
});