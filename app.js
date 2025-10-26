(function(){
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // عناصر الواجهة
  const nationalId = $('#nationalId');
  const btn = $('#searchBtn');
  const alertBox = $('#alert');
  const result = $('#result');
  const incomeCard = $('#incomeCard');
  const orphansCard = $('#orphansCard');
  const orphansCount = $('#orphansCount');
  const orphansList = $('#orphansList');
  const editBaseDataForm = $('#editBaseDataForm'); 
  const attachmentsCard = $('#attachmentsCard');
  const allAttachmentsSummaryCard = $('#allAttachmentsSummaryCard');

  // أزرار وحقول التعديل
  const editBtn = $('#editBtn'); 
  const saveBtn = $('#saveBaseDataBtn'); 
  const cancelEditBtn = $('#cancelBaseDataEditBtn'); 
  
  const editBankAccount = $('#editBankAccount'); 
  const editContact = $('#editContact'); 
  const editSecondaryContact = $('#editSecondaryContact'); 
  const editHouseCoordinates = $('#editHouseCoordinates'); 
  const editLocationLink = $('#editLocationLink'); 
  const editNotes = $('#editNotes'); 
  
  const editIncomeBtn = $('#editIncomeBtn');
  const saveIncomeBtn = $('#saveIncomeBtn');
  const cancelIncomeBtn = $('#cancelIncomeBtn');
  const editableIncomeInput = $('#studentSocialStatus');
  
  const specificUploadInputs = $$('.specific-upload'); 

  // البيانات المحملة والمحدثة (in-memory)
  let allData = [];
  let currentRecord = null;
  const MAX_FILE_SIZE_MB = 2; 
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; 
  
  const ATTACHMENT_TYPES = ['educational', 'pension', 'socialSecurity', 'citizenAccount', 'insurance', 'studentStatus', 'nationalAddress'];

  const categoryNoteMap = { 
    'فئة أ': '(الأكثر احتياجاً)', 'فئة ب': '(احتياج عالي)', 'فئة ج': '(احتياح متوسط)', 'فئة د': '(الأقل احتياجاً)'
  };
  
  const SCHOOL_LEVEL_OPTIONS = ['غير ملتحق', 'روضة', 'ابتدائي', 'متوسط', 'ثانوي', 'جامعي', 'دراسات عليا'];
  
  // =========================================================================
  // وظائف الـ Splash Screen
  // =========================================================================

  function initSplashScreen() {
      const SPLASH_DURATION = 3000; // 3 ثوانٍ مدة العرض
      const splashScreen = $('#splashScreen');
      const body = $('body');
      
      if (!splashScreen || !body) return;

      setTimeout(() => {
          // 1. بدء حركة الإخفاء (Fade Out)
          splashScreen.classList.add('fade-out');
          
          // 2. إزالة كلاس التحميل من الـ body لإظهار المحتوى
          body.classList.remove('loading-state');

          // 3. إزالة العنصر من الـ DOM بعد انتهاء الحركة
          setTimeout(() => {
              if(splashScreen.parentNode) {
                  splashScreen.parentNode.removeChild(splashScreen);
              }
          }, 700); 
          
      }, SPLASH_DURATION);
  }
  
  // =========================================================================
  // الدوال المساعدة والتطبيق
  // =========================================================================

  function applyCurrentToAllData() {
      if (!currentRecord) return;
      const index = allData.findIndex(d => d.nationalId === currentRecord.nationalId);
      if (index !== -1) {
          allData[index] = JSON.parse(JSON.stringify(currentRecord)); 
      } else {
          allData.push(JSON.parse(JSON.stringify(currentRecord)));
      }
  }

  function showAlert(msg, type='success'){ 
    if(!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = 'alert ' + (type === 'error' ? 'error' : 'success');
    alertBox.classList.remove('hidden');
    setTimeout(()=> { if(alertBox) alertBox.classList.add('hidden'); }, 3500);
  }
  function clearAlert(){ 
    if(!alertBox) return;
    alertBox.className = 'alert hidden';
    alertBox.textContent = '';
  }

  function formatSAR(n){ 
    try { return new Intl.NumberFormat('ar-SA', {style:'currency', currency:'SAR', minimumFractionDigits:0}).format(n); }
    catch(e){ return (n||0) + ' ريال'; }
  }

  function sanitizeDigits(v){ return (v||'').replace(/\D/g,'').slice(0,10); }

  function calculateAge(birthDateStr) { 
      if (!birthDateStr) return null;
      const today = new Date();
      const birthDate = new Date(birthDateStr + 'T00:00:00'); 

      if (isNaN(birthDate)) return null; 

      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
      }
      return age >= 0 ? age : null;
  }

  function calculateTotalIncome() { 
      if (!currentRecord) return;
      
      const salary = parseFloat($('#guardianSalary').value) || 0; 
      const pension = parseFloat($('#pensionIncome').value) || 0;
      const social = parseFloat($('#socialSecurityIncome').value) || 0;
      const citizen = parseFloat($('#citizenAccountIncome').value) || 0;
      const insurance = parseFloat($('#insuranceIncome').value) || 0;
      
      const total = salary + pension + social + citizen + insurance;
      
      $('#totalIncome').textContent = formatSAR(total);
  }

  function renderAllAttachmentsSummary() {
      const summaryContainer = $('#allAttachmentsSummary');
      if (!summaryContainer || !currentRecord) return;
      
      if(allAttachmentsSummaryCard) allAttachmentsSummaryCard.classList.remove('hidden');

      summaryContainer.innerHTML = ''; 

      const generalAttachments = currentRecord.attachments && Array.isArray(currentRecord.attachments.general) ? currentRecord.attachments.general : [];
      
      const specificAttachments = [];
      ATTACHMENT_TYPES.forEach(type => {
          const attachment = currentRecord.attachments && currentRecord.attachments[type];
          if (attachment && attachment.name) {
              specificAttachments.push({ 
                  ...attachment, 
                  type: type, 
                  isSpecific: true 
              });
          }
      });

      const allAttachments = [
          ...generalAttachments.map(f => ({...f, type: 'عام', isSpecific: false})), 
          ...specificAttachments
      ];
      
      if (allAttachments.length === 0) {
          summaryContainer.innerHTML = '<p class="text-secondary">لا توجد ملفات مرفوعة حالياً في هذا السجل.</p>';
          return;
      }
      
      let ul = $('#attachmentSummaryList');
      if (!ul) {
          ul = document.createElement('ul');
          ul.id = 'attachmentSummaryList';
          ul.className = 'attachment-summary-list';
          summaryContainer.appendChild(ul);
      }
      ul.innerHTML = '';


      allAttachments.forEach(f => {
          const li = document.createElement('li');
          li.className = 'summary-item';
          
          let typeLabel;
          if (!f.isSpecific) {
              typeLabel = '(عام)';
          } else {
              switch(f.type) {
                  case 'nationalAddress': typeLabel = '(العنوان الوطني)'; break;
                  case 'studentStatus': typeLabel = '(الحالة الدارسية)'; break;
                  case 'educational': typeLabel = '(تعليم الأبناء)'; break;
                  case 'socialSecurity': typeLabel = '(الضمان الاجتماعي)'; break;
                  case 'citizenAccount': typeLabel = '(حساب المواطن)'; break;
                  case 'pension': typeLabel = '(التقاعد)'; break;
                  case 'insurance': typeLabel = '(التأمينات)'; break;
                  default: typeLabel = `(${f.type})`;
              }
          }

          li.innerHTML = `
              <a href="${f.url || '#'}" target="_blank">${f.name}</a>
              <span class="type-label">${typeLabel}</span>
              <span class="size-label">(${(f.size / 1024).toFixed(1)} KB)</span>
          `;
          
          ul.appendChild(li);
      });

  }
  
  function createAttachmentLink(containerId, attachmentData, type) { 
    const container = $(`#${containerId}`);
    container.innerHTML = '';
    
    const div = document.createElement('div');
    div.className = 'file-link-item';
    
    const statusEl = $(`#status-${type}`);
    if(statusEl) {
        statusEl.textContent = '';
        statusEl.className = 'upload-status';
    }
    
    if (attachmentData && attachmentData.name) {
      const a = document.createElement('a');
      a.href = attachmentData.url || '#';
      a.textContent = `${attachmentData.name}`; 
      a.target = '_blank';
      a.style.marginInlineEnd = '10px';
      div.appendChild(a);

      const sizeSpan = document.createElement('span');
      sizeSpan.textContent = ` (حجم: ${(attachmentData.size / 1024).toFixed(1)} KB)`; 
      sizeSpan.className = 'file-meta-size';
      div.appendChild(sizeSpan);
      
      const delBtn = document.createElement('button');
      delBtn.textContent = 'حذف';
      delBtn.className = 'btn-delete-small';
      delBtn.onclick = () => {
        currentRecord.attachments[type] = null;
        applyCurrentToAllData();
        createAttachmentLink(containerId, null, type); 
        renderAllAttachmentsSummary(); 
        showAlert(`تم حذف مرفق ${type} محلياً.`, 'success');
      };
      div.appendChild(delBtn);

    } else {
      div.textContent = 'لا يوجد مرفق حالياً.';
      div.style.color = 'var(--sub-text-color)';
      div.style.fontSize = '0.9rem';
    }
    container.appendChild(div);
  }
  
  function handleAttachmentUpload(e) {
      const inputElement = e.target;
      const file = inputElement.files[0];
      const type = inputElement.dataset.attachmentType;
      const containerId = `${type}Attachments`;

      if (!currentRecord) {
          showAlert('❌ يجب البحث عن ملف المستفيد أولاً.', 'error');
          inputElement.value = null; 
          return;
      }
      
      if (!file || !type) return;

      if (file.size > MAX_FILE_SIZE_BYTES) {
          showAlert(`فشل الرفع: حجم ملف ${file.name} يتجاوز الحد المسموح به.`, 'error');
          inputElement.value = null; 
          return;
      }
      
      showAlert(`جاري رفع: ${file.name}... 🔄`, 'success');
      
      setTimeout(() => {
          const url = URL.createObjectURL(file);
          const fileObj = { name: file.name, size: file.size, url };
          
          currentRecord.attachments = currentRecord.attachments || {};
          currentRecord.attachments[type] = fileObj;
          
          applyCurrentToAllData(); 
          
          createAttachmentLink(containerId, fileObj, type);
          renderAllAttachmentsSummary();

          showAlert(`✅ تم رفع ملف (${type}) محلياً.`, 'success');
          inputElement.value = null; 
          
      }, 500); 
  }

  function updateFileNameDisplay(inputId) {
      const inputElement = $(`#${inputId}`);
      const statusTextElement = $(`#fileName-${inputId}`); 

      if (inputElement && statusTextElement) {
          if (inputElement.files && inputElement.files.length > 0) {
              statusTextElement.textContent = inputElement.files[0].name;
              statusTextElement.style.color = 'var(--main-color)'; 
          } else {
              statusTextElement.textContent = 'لم يتم اختيار ملف';
              statusTextElement.style.color = '#6b7280'; 
          }
      }
  }

  async function loadDataIfNeeded(){ 
    if(allData && allData.length) return;
    try{
      const res = await fetch('data.json'); 
      allData = await res.json();
    }catch(err){
      // بيانات افتراضية 
      allData = [
        {
          "nationalId": "1122851536", "fullName": "ربيعه عوده ناجي العنزي", "fileNumber": "440244765", "registrationNumber": "", "category": "فئة ج", "dependentsCount": 4, "bankAccountNumber": "SA3280000178608010188361", "contactNumber": "0542228075", "secondaryContactNumber": "0550001234",
          "baseAmount": 6130, "monthlyAmount": 1226, "residentialArea": "الشملي", "locationLink": "https://maps.app.goo.gl/example1", "notes": "رابط الموقع غير متاح حالياً", "houseCoordinates": "24.7589,46.6777",
          "guardianSalary": 4500, "pensionIncome": 0, "socialSecurityIncome": 1000, "citizenAccountIncome": 300, "insuranceIncome": 0, "studentSocialStatus": "غير جامعي", 
          "attachments": {
              "general": [{ "name": "صك_الاعالة.pdf", "size": 12345, "url": "#" }], "educational": { "name": "تعريف_المدارس.pdf", "size": 8900, "url": "#" },
              "pension": null, "socialSecurity": { "name": "مستند_الضمان.pdf", "size": 5500, "url": "#" },
              "citizenAccount": { "name": "مستند_المواطن.pdf", "size": 4200, "url": "#" }, "insurance": null, "studentStatus": null,
              "nationalAddress": null 
          },
          "orphans": [
            { "name": "ماجد حصن حجاب العنزي", "birthDate": "2018-08-31", "age": null, "gender": "ذكر", "nationalId": "1189481805", "bankAccountNumber": null, "schoolLevel": "ابتدائي", "contactNumber": "0551234567" },
            { "name": "جود حصن حجاب العنزي",  "birthDate": "2020-02-14", "age": null, "gender": "أنثى", "nationalId": "1197069584", "bankAccountNumber": null, "schoolLevel": "روضة", "contactNumber": "0551234568" },
            { "name": "مالك حصن حجاب العنزي", "birthDate": "2021-10-23", "age": null, "gender": "ذكر", "nationalId": "1203473333", "bankAccountNumber": null, "schoolLevel": "غير ملتحق", "contactNumber": null }
          ]
        },
        {
          "nationalId": "1073900894", "fullName": "منال فرحان العنزي", "fileNumber": "830244491", "registrationNumber": "", "category": "فئة د", "dependentsCount": 2, "bankAccountNumber": "SA4880000208608016128308", "contactNumber": "0548768834", "secondaryContactNumber": "0500005678",
          "baseAmount": 12364, "monthlyAmount": 1766, "residentialArea": "قفار", "locationLink": "https://maps.app.goo.gl/example2", "notes": "الملاحظات الإدارية: المستفيد طالب جامعي جديد، يحتاج لتحديث حالة الضمان.", "houseCoordinates": "25.0000,45.0000",
          "guardianSalary": 0, "pensionIncome": 0, "socialSecurityIncome": 0, "citizenAccountIncome": 500, "insuranceIncome": 0, "studentSocialStatus": "متوسط",
          "attachments": {
              "general": [], "educational": { "name": "تعريف_الجامعة_طالب.pdf", "size": 12000, "url": "#" },
              "pension": null, "socialSecurity": null,
              "citizenAccount": { "name": "مستند_المواطن_منال.pdf", "size": 3300, "url": "#" }, "insurance": null, "studentStatus": { "name": "مستند_الحالة_الاجتماعية.pdf", "size": 6500, "url": "#" },
              "nationalAddress": { "name": "العنوان_الوطني.pdf", "size": 7000, "url": "#" } 
          },
          "orphans": [
            { "name": "ريان علي العنزي", "birthDate": "2018-11-14", "age": null, "gender": "ذكر", "nationalId": "1234567890", "bankAccountNumber": "SA8700001234567890123456", "schoolLevel": "ابتدائي", "contactNumber": "0541112233" },
            { "name": "فزاع علي العنزي", "birthDate": "2014-03-09", "age": null, "gender": "ذكر", "nationalId": "0987654321", "bankAccountNumber": null, "schoolLevel": "متوسط", "contactNumber": null }
          ]
        }
      ];
      if(err.message.includes('fetch')) showAlert('فشل في تحميل ملف البيانات (data.json). استخدام بيانات افتراضية.', 'error');
    }
  }
  
  function toggleIncomeEdit(enable) {
      if(editableIncomeInput) {
          editableIncomeInput.disabled = !enable;
      }
      
      editIncomeBtn.classList.toggle('hidden', enable);
      saveIncomeBtn.classList.toggle('hidden', !enable);
      cancelIncomeBtn.classList.toggle('hidden', !enable);
      
      if (enable) {
        showAlert('وضع تعديل المؤهل مفعّل. يمكنك الآن تعديل المؤهل/الحالة الإضافية.', 'success');
      }
  }

  function saveIncomeEdits() { 
      if (!currentRecord) return;
      
      currentRecord.studentSocialStatus = $('#studentSocialStatus').value.trim() || 'غير محدد';
      
      calculateTotalIncome(); 
      applyCurrentToAllData(); 
      
      toggleIncomeEdit(false);
      
      showAlert('تم حفظ تعديلات المؤهل/الحالة الإضافية محلياً. (تم تجاهل تعديل مبالغ الدخل).', 'success');
  }

  function cancelIncomeEdits() {
      if (!currentRecord) return;
      
      $('#guardianSalary').value = currentRecord.guardianSalary != null ? currentRecord.guardianSalary : 0;
      $('#pensionIncome').value = currentRecord.pensionIncome != null ? currentRecord.pensionIncome : 0;
      $('#socialSecurityIncome').value = currentRecord.socialSecurityIncome != null ? currentRecord.socialSecurityIncome : 0;
      $('#citizenAccountIncome').value = currentRecord.citizenAccountIncome != null ? currentRecord.citizenAccountIncome : 0;
      $('#insuranceIncome').value = currentRecord.insuranceIncome != null ? currentRecord.insuranceIncome : 0;
      
      $('#studentSocialStatus').value = currentRecord.studentSocialStatus || 'غير محدد';
      
      calculateTotalIncome(); 
      toggleIncomeEdit(false);
      showAlert('تم إلغاء التعديلات على قسم الدخل.', 'success');
  }

  function openBaseDataEditForm(){ 
    if(!currentRecord) return;
    if(!editBaseDataForm) return;

    editBaseDataForm.classList.remove('hidden');
    
    $('#editContact').value = currentRecord.contactNumber || '';
    $('#editSecondaryContact').value = currentRecord.secondaryContactNumber || ''; 
    editNotes.value = currentRecord.notes || ''; 
    editBankAccount.value = currentRecord.bankAccountNumber || '';
    $('#editHouseCoordinates').value = currentRecord.houseCoordinates || '';
    $('#editLocationLink').value = currentRecord.locationLink || '';
  }

  function saveBaseDataEdits(){ 
    if(!currentRecord) return;

    const newContact = $('#editContact').value.trim();
    const newSecondaryContact = $('#editSecondaryContact').value.trim();
    const newNotes = editNotes.value.trim();
    const newBankAccount = editBankAccount.value.trim();
    const newHouseCoordinates = $('#editHouseCoordinates').value.trim();
    const newLocationLink = $('#editLocationLink').value.trim();
    
    currentRecord.contactNumber = newContact;
    currentRecord.secondaryContactNumber = newSecondaryContact; 
    currentRecord.notes = newNotes;
    currentRecord.bankAccountNumber = newBankAccount;
    currentRecord.houseCoordinates = newHouseCoordinates;
    currentRecord.locationLink = newLocationLink;


    // *** تم حذف منطق رفع الملفات العامة من هذا القسم ***


    applyCurrentToAllData(); 
    
    renderBaseData(currentRecord);
    
    // تم حذف شرط if (fileUploaded) ... 
    
    renderAllAttachmentsSummary(); 
    
    editBaseDataForm.classList.add('hidden');
    showAlert('تم حفظ تعديلات البيانات الأساسية والملاحظات محلياً.', 'success');
  }

  function deleteRecord(){ 
    if(!currentRecord) return;
    if(!confirm('هل أنت متأكدة من حذف هذا السجل؟ العملية مؤقتة على الواجهة فقط.')) return;
    const idx = allData.findIndex(x => x.nationalId === currentRecord.nationalId);
    if(idx !== -1) allData.splice(idx,1);
    currentRecord = null;
    result.classList.add('hidden');
    incomeCard.classList.add('hidden');
    attachmentsCard.classList.add('hidden');
    orphansCard.classList.add('hidden');
    if(allAttachmentsSummaryCard) allAttachmentsSummaryCard.classList.add('hidden');
    showAlert('تم حذف السجل محلياً.', 'success');
  }


  function deleteGeneralAttachment(idx) {
    if (!currentRecord || !currentRecord.attachments || !currentRecord.attachments.general || currentRecord.attachments.general.length <= idx) return;

    currentRecord.attachments.general.splice(idx, 1);
    applyCurrentToAllData();
    
    renderGeneralAttachmentsList(currentRecord.attachments.general); 
    renderAllAttachmentsSummary(); 
    showAlert('تم حذف المرفق العام (محلياً).', 'success');
  }

  function renderGeneralAttachmentsList(generalAttachments) {
    const attachmentsList = $('#attachmentsList');
    attachmentsList.innerHTML = '';
    (generalAttachments || []).forEach((f, idx) => {
        const item = document.createElement('div');
        item.className = 'attachment-item';
        const a = document.createElement('a');
        a.href = f.url || '#';
        a.textContent = f.name || 'مرفق';
        a.onclick = (e) => { e.preventDefault(); if(f.url) window.open(f.url, '_blank'); else showAlert('لا يوجد ملف قابل للعرض محلياً', 'error'); };
        const meta = document.createElement('div');
        meta.className = 'small';
        meta.textContent = ` (حجم: ${(f.size / 1024).toFixed(1)} KB) `; 
        const del = document.createElement('button');
        del.className = 'btn-delete';
        del.textContent = 'حذف';
        del.onclick = ()=>{ deleteGeneralAttachment(idx); }; 
        item.appendChild(a);
        item.appendChild(meta);
        item.appendChild(del);
        attachmentsList.appendChild(item);
    });
  }


  function renderEditableOrphans(orphans) {
      if (!orphansList) return;
      orphansCard.classList.remove('hidden');
      orphansCount.textContent = orphans ? orphans.length : 0;
      orphansList.innerHTML = ''; 

      (orphans || []).forEach((o, index) => {
          const age = calculateAge(o.birthDate);
          o.age = age; 
          
          const schoolLevelOptionsHtml = SCHOOL_LEVEL_OPTIONS.map(level => 
              `<option value="${level}" ${o.schoolLevel === level ? 'selected' : ''}>${level}</option>`
          ).join('');

          const item = document.createElement('div');
          item.className = 'o';
          item.id = `orphan-${index}`;
          
          item.innerHTML = `
              <strong>${o.name || 'يتيم غير محدد'}</strong>
              <div class="field-display">
                <label>تاريخ الميلاد:</label>
                <input type="date" id="o-birthDate-${index}" class="editable-input" value="${o.birthDate || ''}" disabled>
              </div>
              <div class="field-display">
                <label>العمر (يُحسب تلقائيًا):</label>
                <input type="text" id="o-age-${index}" class="editable-input" value="${age !== null ? age : 'غير محدد'}" disabled>
              </div>
              <div class="field-display">
                <label>الجنس:</label>
                <select id="o-gender-${index}" class="editable-input" disabled>
                    <option value="ذكر" ${o.gender === 'ذكر' ? 'selected' : ''}>ذكر</option>
                    <option value="أنثى" ${o.gender === 'أنثى' ? 'selected' : ''}>أنثى</option>
                </select>
              </div>
              <div class="field-display">
                <label>رقم السجل المدني:</label>
                <input type="text" id="o-nid-${index}" class="editable-input mono" value="${o.nationalId || ''}" maxlength="10" disabled>
              </div>
              <div class="field-display">
                <label>رقم الحساب البنكي:</label>
                <input type="text" id="o-bankAccount-${index}" class="editable-input mono" value="${o.bankAccountNumber || ''}" disabled>
              </div>
              <div class="field-display">
                <label>المستوى الدراسي:</label>
                <select id="o-schoolLevel-${index}" class="editable-input" disabled>
                    ${schoolLevelOptionsHtml} 
                </select>
              </div>
              <div class="field-display">
                <label>رقم التواصل:</label>
                <input type="text" id="o-contact-${index}" class="editable-input mono" value="${o.contactNumber || ''}" maxlength="10" disabled>
              </div>

              <div class="actions">
                  <button class="btn-edit" id="edit-o-${index}">✎ تعديل</button>
                  <button class="btn-save hidden" id="save-o-${index}">حفظ</button>
                  <button class="btn-cancel hidden" id="cancel-o-${index}">إلغاء</button>
                  <button class="btn-delete" id="delete-o-${index}">حذف</button>
              </div>
          `;
          orphansList.appendChild(item);

          // إضافة مستمعي الأحداث
          $(`#edit-o-${index}`).addEventListener('click', () => toggleOrphanEdit(index, true));
          $(`#save-o-${index}`).addEventListener('click', () => saveOrphanEdit(index));
          $(`#cancel-o-${index}`).addEventListener('click', () => toggleOrphanEdit(index, false));
          $(`#delete-o-${index}`).addEventListener('click', () => deleteOrphan(index));
          
          $(`#o-birthDate-${index}`).addEventListener('change', (e) => {
              if(!e.target.disabled) {
                  const newAge = calculateAge(e.target.value);
                  $(`#o-age-${index}`).value = newAge !== null ? newAge : 'غير محدد';
              }
          });
      });
  }

  function toggleOrphanEdit(index, enable) {
      const item = $(`#orphan-${index}`);
      if (!item) return;

      const orphan = currentRecord.orphans[index];
      if (!orphan) return;

      const fields = [
          $(`#o-birthDate-${index}`), $(`#o-gender-${index}`), $(`#o-nid-${index}`),
          $(`#o-bankAccount-${index}`), $(`#o-schoolLevel-${index}`), $(`#o-contact-${index}`)
      ];
      const saveBtn = $(`#save-o-${index}`);
      const cancelBtn = $(`#cancel-o-${index}`);
      const editBtn = $(`#edit-o-${index}`);
      const ageInput = $(`#o-age-${index}`);

      fields.forEach(f => f.disabled = !enable);
      
      ageInput.disabled = true;

      saveBtn.classList.toggle('hidden', !enable);
      cancelBtn.classList.toggle('hidden', !enable);
      editBtn.classList.toggle('hidden', enable);

      if (!enable) {
          $(`#o-birthDate-${index}`).value = orphan.birthDate || '';
          $(`#o-gender-${index}`).value = orphan.gender || '';
          $(`#o-nid-${index}`).value = orphan.nationalId || '';
          $(`#o-bankAccount-${index}`).value = orphan.bankAccountNumber || '';
          $(`#o-schoolLevel-${index}`).value = orphan.schoolLevel || ''; 
          $(`#o-contact-${index}`).value = orphan.contactNumber || '';
          
          const age = calculateAge(orphan.birthDate);
          ageInput.value = age !== null ? age : 'غير محدد';
          showAlert('تم إلغاء التعديل.', 'success');
      }
  }

  function saveOrphanEdit(index) {
      if (!currentRecord || !currentRecord.orphans[index]) return;

      const orphan = currentRecord.orphans[index];

      orphan.birthDate = $(`#o-birthDate-${index}`).value.trim();
      orphan.gender = $(`#o-gender-${index}`).value.trim();
      orphan.nationalId = $(`#o-nid-${index}`).value.trim();
      orphan.bankAccountNumber = $(`#o-bankAccount-${index}`).value.trim();
      orphan.schoolLevel = $(`#o-schoolLevel-${index}`).value.trim();
      orphan.contactNumber = $(`#o-contact-${index}`).value.trim();

      const newAge = calculateAge(orphan.birthDate);
      orphan.age = newAge;
      
      applyCurrentToAllData();
      
      renderEditableOrphans(currentRecord.orphans); 
      showAlert(`تم حفظ تعديلات اليتيم ${orphan.name} محلياً.`, 'success');
  }

  function deleteOrphan(index) {
      if (!currentRecord || !currentRecord.orphans[index]) return;
      if (!confirm(`هل أنت متأكد من حذف اليتيم ${currentRecord.orphans[index].name}؟`)) return;

      currentRecord.orphans.splice(index, 1);
      currentRecord.dependentsCount = currentRecord.orphans.length; 
      
      applyCurrentToAllData();
      
      renderEditableOrphans(currentRecord.orphans);
      $('#dependentsCount').textContent = currentRecord.dependentsCount;
      
      showAlert('تم حذف اليتيم بنجاح (محلياً).', 'success');
  }


  function renderBaseData(d) {
    $('#fullName').textContent = d.fullName || '';
    $('#nid').textContent = d.nationalId || '';
    $('#fileNumber').textContent = d.fileNumber || '';
    $('#registrationNumber').textContent = d.registrationNumber || '';
    $('#category').textContent = d.category || '';
    $('#categoryNote').textContent = categoryNoteMap[d.category] || '';
    $('#dependentsCount').textContent = d.dependentsCount != null ? d.dependentsCount : '';
    $('#bankAccountNumber').textContent = d.bankAccountNumber || '';
    $('#contactNumber').textContent = d.contactNumber || '';
    $('#secondaryContactNumber').textContent = d.secondaryContactNumber || 'غير متوفر';
    $('#baseAmount').textContent = d.baseAmount != null ? formatSAR(d.baseAmount) : '';
    $('#monthlyAmount').textContent = d.monthlyAmount != null ? formatSAR(d.monthlyAmount) : '';
    $('#residentialArea').textContent = d.residentialArea || '';
    $('#houseCoordinates').textContent = d.houseCoordinates || '';
    const locA = $('#locationLink');
    if(locA){ locA.href = d.locationLink || '#'; locA.textContent = d.locationLink ? 'عرض على الخريطة' : 'غير متاح حالياً'; }

    $('#notesDisplay').textContent = d.notes || 'لا توجد ملاحظات إدارية';
  }


  function renderData(d){
    currentRecord = JSON.parse(JSON.stringify(d)); 
    result.classList.remove('hidden');
    incomeCard.classList.remove('hidden');
    attachmentsCard.classList.remove('hidden');
    
    renderBaseData(d);

    // تحديث قيم حقول الدخل (الآن فقط للعرض)
    $('#guardianSalary').value = d.guardianSalary != null ? d.guardianSalary : 0;
    $('#pensionIncome').value = d.pensionIncome != null ? d.pensionIncome : 0;
    $('#socialSecurityIncome').value = d.socialSecurityIncome != null ? d.socialSecurityIncome : 0;
    $('#citizenAccountIncome').value = d.citizenAccountIncome != null ? d.citizenAccountIncome : 0;
    $('#insuranceIncome').value = d.insuranceIncome != null ? d.insuranceIncome : 0;
    $('#studentSocialStatus').value = d.studentSocialStatus || 'غير محدد';
    
    calculateTotalIncome();
    toggleIncomeEdit(false); 


    renderGeneralAttachmentsList(d.attachments && d.attachments.general);
    
    // تم حذف استدعاء updateFileNameDisplay('editAttachment')


    const attached = d.attachments || {};
    ATTACHMENT_TYPES.forEach(type => {
      createAttachmentLink(`${type}Attachments`, attached[type], type);
    });
    
    renderEditableOrphans(d.orphans);

    if(editBaseDataForm) editBaseDataForm.classList.add('hidden');
    
    renderAllAttachmentsSummary();
  }

  async function search(){ 
    clearAlert();
    const nid = sanitizeDigits(nationalId.value);
    if(nid.length !== 10){
      showAlert('يرجى إدخال رقم السجل المدني المكون من 10 أرقام', 'error');
      return;
    }
    btn.disabled = true;
    await loadDataIfNeeded();

    try{
      let found = allData.find(x => x.nationalId === nid);
      
      result.classList.add('hidden');
      incomeCard.classList.add('hidden');
      attachmentsCard.classList.add('hidden');
      orphansCard.classList.add('hidden');
      if(allAttachmentsSummaryCard) allAttachmentsSummaryCard.classList.add('hidden');
      
      const summaryContainer = $('#allAttachmentsSummary');
      if (summaryContainer) summaryContainer.innerHTML = '<p class="text-secondary">لا توجد ملفات مرفوعة حالياً في هذا السجل.</p>';

      if(!found){
        showAlert('لا توجد بيانات للرقم المدني المدخل', 'error');
        return;
      }
      renderData(found);
      showAlert('تم العثور على البيانات بنجاح', 'success');
    }catch(err){
      console.error(err);
      showAlert('حدث خطأ أثناء عرض البيانات: ' + err.message, 'error');
    }finally{
      btn.disabled = false;
    }
  }


  // =========================================================================
  // الأحداث (Events)
  // =========================================================================
  
  // 1. تشغيل السبلاش أولاً
  initSplashScreen(); 
  
  // 2. تحميل البيانات
  loadDataIfNeeded(); 

  // 3. ربط الأحداث
  btn.addEventListener('click', search);
  nationalId.addEventListener('keydown', (e)=> { if(e.key === 'Enter') search(); });

  if(editBtn) editBtn.addEventListener('click', openBaseDataEditForm);
  if(saveBtn) saveBtn.addEventListener('click', saveBaseDataEdits); 
  if(cancelEditBtn) cancelEditBtn.addEventListener('click', ()=> { 
      if(editBaseDataForm) editBaseDataForm.classList.add('hidden');
      // تم حذف استدعاء updateFileNameDisplay('editAttachment')
  }); 

  // تم حذف ربط حدث change لـ #editAttachment

  // أحداث قسم الدخل
  if(editIncomeBtn) editIncomeBtn.addEventListener('click', () => toggleIncomeEdit(true));
  if(saveIncomeBtn) saveIncomeBtn.addEventListener('click', saveIncomeEdits);
  if(cancelIncomeBtn) cancelIncomeBtn.addEventListener('click', cancelIncomeEdits);

  specificUploadInputs.forEach(input => {
      input.addEventListener('change', handleAttachmentUpload);
  });
  
})();