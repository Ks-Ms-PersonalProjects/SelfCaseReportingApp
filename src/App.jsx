import { createCase } from './api.js';
import { DESCRIPTION_MAX, DESCRIPTION_MIN, ISSUE_MAP } from './constants.js';

const initialForm = {
  issueType: '',
  subIssueType: '',
  description: '',
};

export function renderApp(root) {
  let state = {
    form: { ...initialForm },
    errors: {},
    isSubmitting: false,
    successData: null,
    errorData: null,
    copyState: 'idle',
  };

  const validateForm = (form) => {
    const errors = {};
    const length = form.description.trim().length;

    if (!form.issueType) errors.issueType = 'Issue type is required.';
    if (!form.subIssueType) errors.subIssueType = 'Sub-issue type is required.';

    if (!length) {
      errors.description = 'Description is required.';
    } else if (length < DESCRIPTION_MIN || length > DESCRIPTION_MAX) {
      errors.description = `Description must be ${DESCRIPTION_MIN}-${DESCRIPTION_MAX} characters.`;
    }

    return errors;
  };

  const render = () => {
    const subOptions = state.form.issueType ? ISSUE_MAP[state.form.issueType] || [] : [];

    root.innerHTML = `
      <main class="app-shell">
        <section class="card">
          <h1>Case Reporting</h1>
          <p class="subtitle">Create a Dynamics 365 case through Power Automate.</p>

          <form id="case-form" novalidate>
            <div class="field">
              <label for="issueType">Issue Type</label>
              <select id="issueType" name="issueType" ${state.errors.issueType ? 'aria-invalid="true"' : ''}>
                <option value="">Select…</option>
                ${Object.keys(ISSUE_MAP)
                  .map((option) => `<option value="${option}" ${state.form.issueType === option ? 'selected' : ''}>${option}</option>`)
                  .join('')}
              </select>
              ${state.errors.issueType ? `<p class="error-text">${state.errors.issueType}</p>` : ''}
            </div>

            <div class="field">
              <label for="subIssueType">Sub-Issue Type</label>
              <select id="subIssueType" name="subIssueType" ${state.form.issueType ? '' : 'disabled'} ${state.errors.subIssueType ? 'aria-invalid="true"' : ''}>
                <option value="">Select…</option>
                ${subOptions
                  .map((option) => `<option value="${option}" ${state.form.subIssueType === option ? 'selected' : ''}>${option}</option>`)
                  .join('')}
              </select>
              ${state.errors.subIssueType ? `<p class="error-text">${state.errors.subIssueType}</p>` : ''}
            </div>

            <div class="field">
              <label for="description">Description</label>
              <textarea id="description" name="description" rows="5" minlength="${DESCRIPTION_MIN}" maxlength="${DESCRIPTION_MAX}" required ${state.errors.description ? 'aria-invalid="true"' : ''} placeholder="Describe the issue in detail (20+ characters).">${state.form.description}</textarea>
              <p class="hint">${state.form.description.length}/${DESCRIPTION_MAX}</p>
              ${state.errors.description ? `<p class="error-text">${state.errors.description}</p>` : ''}
            </div>

            <div class="actions">
              <button type="submit" ${state.isSubmitting ? 'disabled' : ''}>${state.isSubmitting ? 'Creating case…' : 'Create Case'}</button>
              <button id="reset-btn" type="button" class="secondary" ${state.isSubmitting ? 'disabled' : ''}>Reset</button>
            </div>
          </form>

          <div class="status" aria-live="polite">
            ${state.isSubmitting ? '<p class="loading">Submitting to Power Automate…</p>' : ''}
            ${state.successData ? `
              <section class="panel success">
                <h2>Case created</h2>
                <p><strong>Case Number:</strong> ${state.successData.caseNumber || 'Not returned'}</p>
                ${state.successData.caseId ? `<p><strong>Case ID:</strong> ${state.successData.caseId}</p>` : ''}
                ${state.successData.message ? `<p>${state.successData.message}</p>` : ''}
                <button id="copy-btn" type="button">Copy</button>
                ${state.copyState === 'copied' ? '<p class="hint">Copied to clipboard.</p>' : ''}
                ${state.copyState === 'error' ? '<p class="error-text">Unable to copy. Please copy manually.</p>' : ''}
              </section>
            ` : ''}
            ${state.errorData ? `
              <section class="panel error">
                <h2>Unable to create case</h2>
                <p>${state.errorData.message}</p>
                ${state.errorData.correlationId ? `<p><strong>Correlation / Request ID:</strong> ${state.errorData.correlationId}</p>` : ''}
              </section>
            ` : ''}
          </div>
        </section>
      </main>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    const form = root.querySelector('#case-form');
    const issueType = root.querySelector('#issueType');
    const subIssueType = root.querySelector('#subIssueType');
    const description = root.querySelector('#description');
    const resetBtn = root.querySelector('#reset-btn');
    const copyBtn = root.querySelector('#copy-btn');

    issueType?.addEventListener('change', (event) => {
      state.form.issueType = event.target.value;
      state.form.subIssueType = '';
      state.errors.issueType = undefined;
      state.errors.subIssueType = undefined;
      render();
    });

    subIssueType?.addEventListener('change', (event) => {
      state.form.subIssueType = event.target.value;
      state.errors.subIssueType = undefined;
      render();
    });

    description?.addEventListener('input', (event) => {
      state.form.description = event.target.value;
      state.errors.description = undefined;
      render();
    });

    resetBtn?.addEventListener('click', () => {
      state = { ...state, form: { ...initialForm }, errors: {}, successData: null, errorData: null, copyState: 'idle' };
      render();
    });

    copyBtn?.addEventListener('click', async () => {
      if (!state.successData?.caseNumber) return;
      try {
        await navigator.clipboard.writeText(state.successData.caseNumber);
        state.copyState = 'copied';
      } catch {
        state.copyState = 'error';
      }
      render();
      setTimeout(() => {
        state.copyState = 'idle';
        render();
      }, 2000);
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      state.errors = validateForm(state.form);

      if (Object.keys(state.errors).length) {
        render();
        return;
      }

      state.isSubmitting = true;
      state.successData = null;
      state.errorData = null;
      render();

      try {
        const result = await createCase({
          issueType: state.form.issueType,
          subIssueType: state.form.subIssueType,
          description: state.form.description.trim(),
          source: 'web',
        });

        state.form = { ...initialForm };
        state.errors = {};
        state.successData = {
          caseNumber: result.caseNumber,
          caseId: result.caseId,
          message: result.message,
        };
      } catch (error) {
        state.errorData = {
          message: error.message || 'Unable to create case. Please try again.',
          correlationId: error.correlationId || error.responseBody?.requestId || null,
        };
      } finally {
        state.isSubmitting = false;
        render();
      }
    });
  };

  render();
}
