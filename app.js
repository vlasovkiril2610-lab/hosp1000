document.addEventListener('DOMContentLoaded', () => {
  const BLOOD_OPTIONS = ["ОАК", "БХ", "Алкоголь", "Глюкоза", "ПТИ"];

  let patients = [];
  try {
    patients = JSON.parse(localStorage.getItem('hosp_patients')) || [];
    if (!Array.isArray(patients)) patients = [];
  } catch (e) {
    patients = [];
  }

  let activeTab = 'new'; // 'new' | 'patients' | 'pending'
  let selectedReason = '';
  let expandedPatientId = null;

  // Вкладка 1: Новый заезд
  const tabNew = document.getElementById('tab-new');
  const tabPatients = document.getElementById('tab-patients');
  const tabPending = document.getElementById('tab-pending');
  const viewNew = document.getElementById('view-new');
  const viewList = document.getElementById('view-list');

  const nameInput = document.getElementById('patient-name');
  const dobInput = document.getElementById('patient-dob');
  const timeInput = document.getElementById('admission-time');
  const reasonChipsEl = document.getElementById('reason-chips');

  const bpInput = document.getElementById('vital-bp');
  const hrInput = document.getElementById('vital-hr');
  const spo2Input = document.getElementById('vital-spo2');
  const tempInput = document.getElementById('vital-temp');
  const addBtn = document.getElementById('add-btn');
  const clearShiftBtn = document.getElementById('clear-shift-btn');

  function currentTimeStr() {
    return new Date().toTimeString().slice(0, 5);
  }

  function setAdmissionTimeNow() {
    if (timeInput) timeInput.value = currentTimeStr();
  }
  setAdmissionTimeNow();

  function updateReasonChips() {
    if (!reasonChipsEl) return;
    reasonChipsEl.querySelectorAll('.reason-chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.reason === selectedReason);
    });
  }

  if (reasonChipsEl) {
    reasonChipsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.reason-chip');
      if (!btn) return;
      const reason = btn.dataset.reason;
      selectedReason = selectedReason === reason ? '' : reason;
      updateReasonChips();
    });
  }

  function switchTab(tabName) {
    activeTab = tabName;
    if (tabNew) tabNew.classList.toggle('active', tabName === 'new');
    if (tabPatients) tabPatients.classList.toggle('active', tabName === 'patients');
    if (tabPending) tabPending.classList.toggle('active', tabName === 'pending');

    if (viewNew) viewNew.classList.toggle('hidden', tabName !== 'new');
    if (viewList) viewList.classList.toggle('hidden', tabName === 'new');

    if (tabName !== 'new') {
      renderList();
    }
  }

  if (tabNew) tabNew.addEventListener('click', () => switchTab('new'));
  if (tabPatients) tabPatients.addEventListener('click', () => switchTab('patients'));
  if (tabPending) tabPending.addEventListener('click', () => switchTab('pending'));

  function save() {
    try {
      localStorage.setItem('hosp_patients', JSON.stringify(patients));
      updateCounters();
      if (activeTab !== 'new') {
        renderList();
      }
    } catch (e) {
      alert('Память браузера переполнена (возможно, много фото). Удали фото или сдай смену.');
    }
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

    const needsCaseDetails = p.reason === 'Травма' || p.reason === 'ДТП';
    if (needsCaseDetails && !(p.details && (p.details.sampleTaken || p.details.sampleNumber))) {
      return true;
    }
    if (p.reason === 'ДТП' && !(p.police102 && (p.police102.time || p.police102.who))) {
      return true;
    }
    return false;
  }

  function updateCounters() {
    const pendingCount = patients.filter(isPatientPending).length;
    const allEl = document.getElementById('count-all');
    const pendEl = document.getElementById('count-pending');
    if (allEl) allEl.textContent = patients.length;
    if (pendEl) pendEl.textContent = pendingCount;
  }
  updateCounters();

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) {
        if (nameInput) nameInput.focus();
        return;
      }

      const admTime = (timeInput && timeInput.value) ? timeInput.value : currentTimeStr();
      const bp = bpInput ? bpInput.value.trim() : '';
      const hr = hrInput ? hrInput.value.trim() : '';
      const spo2 = spo2Input ? spo2Input.value.trim() : '';
      const temp = tempInput ? tempInput.value.trim() : '';

      const initialVitals = (bp || hr || spo2 || temp)
        ? [{ time: admTime, bp, hr, spo2, temp }]
        : [];

      const newPatient = {
        id: Date.now(),
        name,
        dob: dobInput ? dobInput.value.trim() : '',
        admissionTime: admTime,
        reason: selectedReason,
        vitalsHistory: initialVitals,
        // Всё остальное заполняется в разделе 2 (Пациенты)
        address: '',
        workStatus: 'unknown',
        workPlace: '',
        workRole: '',
        diagnosis: '',
        specialist: '',
        actions: {
          ecg: false,
          blood: [],
          bloodExtra: '',
          exams: ''
        },
        details: {
          time: '',
          place: '',
          what: '',
          sampleTaken: false,
          sampleNumber: '',
          sampleTime: ''
        },
        police102: {
          time: '',
          who: ''
        },
        outcome: {
          type: '',
          department: ''
        },
        photos: []
      };

      patients.unshift(newPatient);

      if (nameInput) nameInput.value = '';
      if (dobInput) dobInput.value = '';
      selectedReason = '';
      updateReasonChips();
      if (bpInput) bpInput.value = '';
      if (hrInput) hrInput.value = '';
      if (spo2Input) spo2Input.value = '';
      if (tempInput) tempInput.value = '';
      setAdmissionTimeNow();

      save();
      switchTab('patients');
    });
  }

  window.toggleCardDetails = (patientId) => {
    expandedPatientId = expandedPatientId === patientId ? null : patientId;
    renderList();
  };

  window.toggleCardEcg = (patientId) => {
    const p = patients.find(item => item.id === patientId);
    if (!p) return;
    if (!p.actions) p.actions = { ecg: false, blood: [], bloodExtra: '', exams: '' };
    p.actions.ecg = !p.actions.ecg;
    save();
  };

  window.addVitalRecord = (patientId) => {
    const p = patients.find(item => item.id === patientId);
    if (!p) return;

    const bp = (document.getElementById(`nv-bp-${patientId}`)?.value || '').trim();
    const hr = (document.getElementById(`nv-hr-${patientId}`)?.value || '').trim();
    const spo2 = (document.getElementById(`nv-spo2-${patientId}`)?.value || '').trim();
    const temp = (document.getElementById(`nv-temp-${patientId}`)?.value || '').trim();

    if (!bp && !hr && !spo2 && !temp) return;

    if (!Array.isArray(p.vitalsHistory)) p.vitalsHistory = [];
    p.vitalsHistory.push({
      time: currentTimeStr(),
      bp,
      hr,
      spo2,
      temp
    });
    save();
  };

  window.savePatientDetails = (patientId) => {
    const p = patients.find(item => item.id === patientId);
    if (!p) return;

    p.name = (document.getElementById(`ed-name-${patientId}`)?.value || '').trim() || p.name;
    p.dob = (document.getElementById(`ed-dob-${patientId}`)?.value || '').trim();
    p.reason = document.getElementById(`ed-reason-${patientId}`)?.value || '';
    p.address = (document.getElementById(`ed-address-${patientId}`)?.value || '').trim();
    p.workStatus = document.getElementById(`ed-wstatus-${patientId}`)?.value || 'unknown';
    p.workPlace = (document.getElementById(`ed-wplace-${patientId}`)?.value || '').trim();
    p.workRole = (document.getElementById(`ed-wrole-${patientId}`)?.value || '').trim();
    p.specialist = (document.getElementById(`ed-spec-${patientId}`)?.value || '').trim();
    p.diagnosis = (document.getElementById(`ed-diag-${patientId}`)?.value || '').trim();

    const selectedBlood = Array.from(
      document.querySelectorAll(`.ed-blood-${patientId}:checked`)
    ).map(cb => cb.value);

    p.actions = {
      ecg: Boolean(document.getElementById(`ed-ecg-${patientId}`)?.checked),
      blood: selectedBlood,
      bloodExtra: (document.getElementById(`ed-blood-extra-${patientId}`)?.value || '').trim(),
      exams: (document.getElementById(`ed-exams-${patientId}`)?.value || '').trim()
    };

    p.details = {
      time: (document.getElementById(`ed-dtime-${patientId}`)?.value || '').trim(),
      place: (document.getElementById(`ed-dplace-${patientId}`)?.value || '').trim(),
      what: (document.getElementById(`ed-dwhat-${patientId}`)?.value || '').trim(),
      sampleTaken: Boolean(document.getElementById(`ed-staken-${patientId}`)?.checked),
      sampleNumber: (document.getElementById(`ed-snum-${patientId}`)?.value || '').trim(),
      sampleTime: (document.getElementById(`ed-stime-${patientId}`)?.value || '').trim()
    };

    p.police102 = {
      time: (document.getElementById(`ed-ptime-${patientId}`)?.value || '').trim(),
      who: (document.getElementById(`ed-pwho-${patientId}`)?.value || '').trim()
    };

    p.outcome = {
      type: document.getElementById(`ed-otype-${patientId}`)?.value || '',
      department: (document.getElementById(`ed-odept-${patientId}`)?.value || '').trim()
    };

    expandedPatientId = null;
    save();
  };

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

  window.addCardPhoto = async (patientId, inputEl) => {
    const file = inputEl && inputEl.files && inputEl.files[0];
    if (!file) return;
    const p = patients.find(item => item.id === patientId);
    if (!p) return;
    try {
      const dataUrl = await compressImage(file);
      if (!Array.isArray(p.photos)) p.photos = [];
      p.photos.push(dataUrl);
      inputEl.value = '';
      save();
    } catch (e) {
      alert('Не удалось добавить фото');
    }
  };

  window.removeCardPhoto = (patientId, photoIndex) => {
    const p = patients.find(item => item.id === patientId);
    if (!p || !Array.isArray(p.photos)) return;
    p.photos.splice(photoIndex, 1);
    save();
  };

  window.openPhotoFull = (patientId, photoIndex) => {
    const p = patients.find(item => item.id === patientId);
    if (!p || !Array.isArray(p.photos) || !p.photos[photoIndex]) return;
    const win = window.open();
    if (win) {
      win.document.write(`<body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;"><img src="${p.photos[photoIndex]}" style="max-width:100%;max-height:100vh;"></body>`);
    }
  };

  window.deletePatient = (patientId) => {
    if (confirm('Удалить запись пациента?')) {
      if (expandedPatientId === patientId) expandedPatientId = null;
      patients = patients.filter(item => item.id !== patientId);
      save();
    }
  };

  if (clearShiftBtn) {
    clearShiftBtn.addEventListener('click', () => {
      if (patients.length === 0) return;
      if (confirm('Сдать смену и очистить список всех пациентов?')) {
        patients = [];
        expandedPatientId = null;
        save();
      }
    });
  }

  function escapeHtml(text = '') {
    return String(text)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function formatVitalEntry(v = {}) {
    const parts = [];
    if (v.bp) parts.push(`<b>АД:</b> ${escapeHtml(v.bp)}`);
    if (v.hr) parts.push(`<b>Пульс:</b> ${escapeHtml(v.hr)}`);
    if (v.spo2) parts.push(`<b>SpO₂:</b> ${escapeHtml(v.spo2)}%`);
    if (v.temp) parts.push(`<b>t°:</b> ${escapeHtml(v.temp)}°C`);
    return parts.join(' · ') || '—';
  }

  function formatWorkSummary(p) {
    if (p.workStatus === 'yes') {
      const parts = [p.workPlace, p.workRole].filter(Boolean);
      return parts.length ? `Работает: ${parts.join(' — ')}` : 'Работает: да';
    }
    if (p.workStatus === 'no') return 'Не работает';
    return '';
  }

  function renderList() {
    if (!viewList) return;

    const list = activeTab === 'pending'
      ? patients.filter(isPatientPending)
      : patients;

    if (list.length === 0) {
      viewList.innerHTML = `<p style="text-align:center; color:#64748b; margin-top:28px;">
        ${activeTab === 'pending' ? 'Незакрытых задач нет — смена готова!' : 'Пациентов пока нет. Добавь в разделе «Новый заезд».'}
      </p>`;
      return;
    }

    viewList.innerHTML = list.map(p => {
      const pending = isPatientPending(p);
      const isExpanded = expandedPatientId === p.id;
      const reason = p.reason || '';
      const reasonClass = reason === 'ДТП'
        ? 'reason-dtp'
        : (reason === 'Травма' ? 'reason-trauma' : (reason === 'Болезнь' ? 'reason-disease' : ''));

      const acts = p.actions || { ecg: false, blood: [], bloodExtra: '', exams: '' };
      const bloodList = Array.isArray(acts.blood) ? acts.blood : [];
      const bloodText = [...bloodList, acts.bloodExtra].filter(Boolean).join(', ');
      const det = p.details || {};
      const pol = p.police102 || {};
      const out = p.outcome || { type: '', department: '' };
      const vitals = Array.isArray(p.vitalsHistory) ? p.vitalsHistory : [];
      const photos = Array.isArray(p.photos) ? p.photos : [];
      const workStr = formatWorkSummary(p);

      const badges = [];
      if (reason) {
        const badgeCls = reason === 'ДТП' ? 'red' : (reason === 'Травма' ? 'amber' : '');
        badges.push(`<span class="badge ${badgeCls}">${escapeHtml(reason)}</span>`);
      }
      if (out.type) {
        const outLabel = out.type === 'Госпитализация' && out.department
          ? `Госпитализация: ${out.department}`
          : out.type;
        badges.push(`<span class="badge">${escapeHtml(outLabel)}</span>`);
      }
      badges.push(`<span class="badge ${pending ? 'amber' : 'ok'}">${pending ? 'К доделке' : 'Закрыто'}</span>`);

      const summaryHtml = !isExpanded ? `
        <div class="info-block">
          ${p.dob ? `<div><b>Дата рождения:</b> ${escapeHtml(p.dob)}</div>` : ''}
          ${p.address ? `<div><b>Проживает:</b> ${escapeHtml(p.address)}</div>` : ''}
          ${workStr ? `<div><b>${escapeHtml(workStr)}</b></div>` : ''}
          ${p.specialist ? `<div><b>К кому привезли:</b> ${escapeHtml(p.specialist)}</div>` : ''}
          ${p.diagnosis ? `<div><b>Диагноз:</b> ${escapeHtml(p.diagnosis)}</div>` : ''}
          ${bloodText ? `<div><b>Кровь:</b> ${escapeHtml(bloodText)}</div>` : ''}
          ${acts.exams ? `<div><b>Обследования:</b> ${escapeHtml(acts.exams)}</div>` : ''}
          ${(reason === 'Травма' || reason === 'ДТП') && (det.time || det.place || det.what || det.sampleTaken || det.sampleNumber || det.sampleTime) ? `
            <div><b>Обстоятельства:</b> ${escapeHtml([det.time, det.place, det.what].filter(Boolean).join(' · ') || '—')}</div>
            ${(det.sampleTaken || det.sampleNumber || det.sampleTime) ? `
              <div><b>Алкоголь и воздух:</b> ${det.sampleTaken ? 'набран' : 'не отмечено'} · № ${escapeHtml(det.sampleNumber || '—')} · ${escapeHtml(det.sampleTime || '—')}</div>
            ` : ''}
          ` : ''}
          ${reason === 'ДТП' && (pol.time || pol.who) ? `
            <div style="color:#fca5a5;"><b>102:</b> ${escapeHtml(pol.time || '—')} · ${escapeHtml(pol.who || '—')}</div>
          ` : ''}
        </div>
      ` : '';

      const vitalsHtml = !isExpanded ? `
        <div class="vitals-history">
          <div class="vitals-history-title">Показатели (история)</div>
          ${vitals.length ? vitals.map(v => `
            <div class="vital-entry">
              <div>${formatVitalEntry(v)}</div>
              <div class="vital-entry-time">${escapeHtml(v.time || '')}</div>
            </div>
          `).join('') : `<div style="font-size:13px; color:#94a3b8;">Замеров пока нет</div>`}
          <div class="add-vital-inline">
            <div class="input-row">
              <input type="text" id="nv-bp-${p.id}" placeholder="АД" autocomplete="off">
              <input type="text" id="nv-hr-${p.id}" placeholder="Пульс" autocomplete="off">
              <input type="text" id="nv-spo2-${p.id}" placeholder="SpO₂" autocomplete="off">
              <input type="text" id="nv-temp-${p.id}" placeholder="t°" autocomplete="off">
            </div>
            <button type="button" class="mini-btn" onclick="addVitalRecord(${p.id})">+ Добавить замер</button>
          </div>
        </div>
      ` : '';

      const photosHtml = photos.length ? `
        <div class="card-photos">
          ${photos.map((src, idx) => `
            <div class="card-photo-item">
              <img src="${src}" alt="Фото" onclick="openPhotoFull(${p.id}, ${idx})">
              <button type="button" class="remove-photo-btn" onclick="removeCardPhoto(${p.id}, ${idx})">✕</button>
            </div>
          `).join('')}
        </div>
      ` : '';

      const editorHtml = isExpanded ? `
        <div class="details-editor">
          <div class="editor-group-title">Данные и причина</div>
          <input type="text" id="ed-name-${p.id}" value="${escapeHtml(p.name || '')}" placeholder="ФИО / палата">
          <div class="input-row">
            <input type="text" id="ed-dob-${p.id}" value="${escapeHtml(p.dob || '')}" placeholder="Дата рождения">
            <select id="ed-reason-${p.id}" class="select-input">
              <option value="" ${!reason ? 'selected' : ''}>Причина: не выбрана</option>
              <option value="Болезнь" ${reason === 'Болезнь' ? 'selected' : ''}>Болезнь</option>
              <option value="Травма" ${reason === 'Травма' ? 'selected' : ''}>Травма</option>
              <option value="ДТП" ${reason === 'ДТП' ? 'selected' : ''}>ДТП</option>
            </select>
          </div>

          <div class="editor-group-title">Карта и маршрутизация</div>
          <input type="text" id="ed-address-${p.id}" value="${escapeHtml(p.address || '')}" placeholder="Место жительства">
          <div class="input-row">
            <select id="ed-wstatus-${p.id}" class="select-input">
              <option value="unknown" ${(p.workStatus || 'unknown') === 'unknown' ? 'selected' : ''}>Работа: не указано</option>
              <option value="no" ${p.workStatus === 'no' ? 'selected' : ''}>Не работает</option>
              <option value="yes" ${p.workStatus === 'yes' ? 'selected' : ''}>Работает: Да</option>
            </select>
            <input type="text" id="ed-wplace-${p.id}" value="${escapeHtml(p.workPlace || '')}" placeholder="Где работает">
            <input type="text" id="ed-wrole-${p.id}" value="${escapeHtml(p.workRole || '')}" placeholder="Кем">
          </div>
          <div class="input-row">
            <input type="text" id="ed-spec-${p.id}" value="${escapeHtml(p.specialist || '')}" placeholder="К кому привезли">
            <input type="text" id="ed-diag-${p.id}" value="${escapeHtml(p.diagnosis || '')}" placeholder="Диагноз">
          </div>

          <div class="editor-group-title">Анализы и обследования</div>
          <label class="checkbox-row">
            <input type="checkbox" id="ed-ecg-${p.id}" ${acts.ecg ? 'checked' : ''}>
            <span>ЭКГ выполнено</span>
          </label>
          <div class="blood-grid">
            ${BLOOD_OPTIONS.map(b => `
              <label class="checkbox-row">
                <input type="checkbox" class="ed-blood-${p.id}" value="${b}" ${bloodList.includes(b) ? 'checked' : ''}>
                <span>${b}</span>
              </label>
            `).join('')}
          </div>
          <input type="text" id="ed-blood-extra-${p.id}" value="${escapeHtml(acts.bloodExtra || '')}" placeholder="Другая кровь / № / примечание">
          <input type="text" id="ed-exams-${p.id}" value="${escapeHtml(acts.exams || '')}" placeholder="Обследования (УЗИ, КТ, рентген, консультации)">

          <div class="editor-group-title">Обстоятельства и 102</div>
          <div class="input-row">
            <input type="text" id="ed-dtime-${p.id}" value="${escapeHtml(det.time || '')}" placeholder="Время случая">
            <input type="text" id="ed-dplace-${p.id}" value="${escapeHtml(det.place || '')}" placeholder="Где произошло">
          </div>
          <input type="text" id="ed-dwhat-${p.id}" value="${escapeHtml(det.what || '')}" placeholder="Обстоятельства (что случилось)">
          <label class="checkbox-row">
            <input type="checkbox" id="ed-staken-${p.id}" ${det.sampleTaken ? 'checked' : ''}>
            <span>Набран алкоголь и воздух</span>
          </label>
          <div class="input-row">
            <input type="text" id="ed-snum-${p.id}" value="${escapeHtml(det.sampleNumber || '')}" placeholder="Номер пробы">
            <input type="text" id="ed-stime-${p.id}" value="${escapeHtml(det.sampleTime || '')}" placeholder="Во сколько набрана">
          </div>
          <div class="police-box">
            <div class="police-title">102</div>
            <div class="input-row">
              <input type="text" id="ed-ptime-${p.id}" value="${escapeHtml(pol.time || '')}" placeholder="Во сколько передали">
              <input type="text" id="ed-pwho-${p.id}" value="${escapeHtml(pol.who || '')}" placeholder="Кто принял">
            </div>
          </div>

          <div class="editor-group-title">Итог</div>
          <div class="input-row">
            <select id="ed-otype-${p.id}" class="select-input">
              <option value="" ${!out.type ? 'selected' : ''}>Не определено</option>
              <option value="Госпитализация" ${out.type === 'Госпитализация' ? 'selected' : ''}>Госпитализация</option>
              <option value="Амбулаторно" ${out.type === 'Амбулаторно' ? 'selected' : ''}>Амбулаторно</option>
            </select>
            <input type="text" id="ed-odept-${p.id}" value="${escapeHtml(out.department || '')}" placeholder="В какое отделение">
          </div>

          <div class="editor-actions">
            <button type="button" class="save-inline-btn" onclick="savePatientDetails(${p.id})">Сохранить</button>
            <button type="button" class="cancel-inline-btn" onclick="toggleCardDetails(${p.id})">Отмена</button>
          </div>
        </div>
      ` : '';

      return `
        <div class="patient-card ${reasonClass} ${!pending ? 'done' : ''}">
          <div class="card-header">
            <div>
              <div class="patient-title">${escapeHtml(p.name)}</div>
              <div class="patient-sub">${p.dob ? `ДР: ${escapeHtml(p.dob)}` : 'ДР не указана'}</div>
            </div>
            <div class="patient-time">Заезд: ${escapeHtml(p.admissionTime || '')}</div>
          </div>

          <div class="badges-row">${badges.join('')}</div>
          ${summaryHtml}
          ${vitalsHtml}
          ${photosHtml}
          ${editorHtml}

          <div class="tasks-grid">
            <div class="task-chip ${acts.ecg ? 'checked' : ''}" onclick="toggleCardEcg(${p.id})">
              ${acts.ecg ? '✓ ' : ''}ЭКГ
            </div>
            <div class="task-chip ${bloodText || acts.exams ? 'checked' : ''}" onclick="toggleCardDetails(${p.id})">
              ${bloodText || acts.exams ? '✓ ' : ''}Анализы / обсл.
            </div>
          </div>

          <div class="card-actions">
            <button type="button" class="small-btn" onclick="toggleCardDetails(${p.id})">
              ${isExpanded ? '✕ Закрыть детали' : '✎ Подробнее / Анализы / 102'}
            </button>
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
});