/* ═══════════════════════════════════════════════════
   FinConsol - Application Initialization
   Setup wizard, boot sequence
   ═══════════════════════════════════════════════════ */

(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    if (Store.isSetupComplete()) {
      showApp();
    } else {
      showSetupWizard();
    }
  });

  // ── Setup Wizard ──

  function showSetupWizard() {
    const wizard = document.getElementById('setup-wizard');
    const app = document.getElementById('app');
    wizard.classList.remove('hidden');
    app.classList.add('hidden');

    let step = 1;
    let selectedMode = 'full';

    const steps = wizard.querySelectorAll('.wizard-step');
    const backBtn = document.getElementById('wizard-back');
    const nextBtn = document.getElementById('wizard-next');

    // Mode selection
    wizard.querySelectorAll('.wizard-option').forEach(opt => {
      opt.addEventListener('click', () => {
        wizard.querySelectorAll('.wizard-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedMode = opt.dataset.mode;
      });
    });

    function showStep(n) {
      steps.forEach(s => s.classList.add('hidden'));
      const target = wizard.querySelector(`[data-step="${n}"]`);
      if (target) target.classList.remove('hidden');

      backBtn.classList.toggle('hidden', n === 1);
      nextBtn.textContent = n === 3 ? 'Launch Dashboard' : 'Next';

      // Hide entity input for single mode
      const entitiesGroup = document.getElementById('wizard-entities-group');
      if (entitiesGroup) {
        entitiesGroup.classList.toggle('hidden', selectedMode === 'single');
      }

      // Build summary for step 3
      if (n === 3) {
        const summary = document.getElementById('wizard-summary');
        const orgName = document.getElementById('wizard-org-name')?.value || 'My Organization';
        const currency = document.getElementById('wizard-currency')?.value || 'USD';
        const fiscal = document.getElementById('wizard-fiscal')?.value || '1';
        const entityText = document.getElementById('wizard-entities')?.value || '';
        const entityCount = entityText.split('\n').filter(e => e.trim()).length;
        const modeLabels = { single: 'Single Entity', multi: 'Multi-Entity', full: 'Full Suite (CFO/Controller)' };

        summary.innerHTML = `
          <div class="table-container" style="margin:16px 0;">
            <table>
              <tbody>
                <tr><td style="font-weight:600;">Mode</td><td>${modeLabels[selectedMode]}</td></tr>
                <tr><td style="font-weight:600;">Organization</td><td>${orgName}</td></tr>
                <tr><td style="font-weight:600;">Currency</td><td>${currency}</td></tr>
                <tr><td style="font-weight:600;">Fiscal Year Start</td><td>Month ${fiscal}</td></tr>
                ${entityCount > 0 ? `<tr><td style="font-weight:600;">Entities</td><td>${entityCount} entities</td></tr>` : ''}
              </tbody>
            </table>
          </div>
        `;
      }
    }

    backBtn.addEventListener('click', () => {
      if (step > 1) {
        step--;
        showStep(step);
      }
    });

    nextBtn.addEventListener('click', () => {
      if (step < 3) {
        step++;
        showStep(step);
      } else {
        // Finalize setup
        const orgName = document.getElementById('wizard-org-name')?.value || 'My Organization';
        const currency = document.getElementById('wizard-currency')?.value || 'USD';
        const fiscal = parseInt(document.getElementById('wizard-fiscal')?.value || '1');
        const entityText = document.getElementById('wizard-entities')?.value || '';

        Store.setConfig({
          mode: selectedMode,
          orgName: orgName,
          baseCurrency: currency,
          fiscalYearStart: fiscal,
          setupComplete: true,
          features: {
            intercompanyElimination: selectedMode !== 'single',
            budgetTracking: true,
            alertsEnabled: true,
            fuzzyMatching: selectedMode !== 'single',
            anomalyDetection: selectedMode === 'full'
          }
        });

        // Create initial entities
        if (selectedMode !== 'single') {
          const entityLines = entityText.split('\n').map(e => e.trim()).filter(Boolean);
          entityLines.forEach(name => {
            Store.addEntity({
              name,
              type: 'subsidiary',
              parentId: null,
              riskRating: 'medium',
              currency: currency,
              tags: []
            });
          });
        } else if (selectedMode === 'single') {
          Store.addEntity({
            name: orgName,
            type: 'subsidiary',
            parentId: null,
            riskRating: 'low',
            currency: currency,
            tags: []
          });
        }

        showApp();
      }
    });

    showStep(1);
  }

  // ── Launch App ──

  function showApp() {
    const wizard = document.getElementById('setup-wizard');
    const app = document.getElementById('app');
    wizard.classList.add('hidden');
    app.classList.remove('hidden');
    Dashboard.init();
  }

})();
