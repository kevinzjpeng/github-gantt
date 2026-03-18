/**
 * Label filter bar and title search — UI rendering + event wiring.
 *
 * Builds the label pill buttons from the loaded issue set, keeps them in sync
 * with the active-label set, and triggers a Gantt refresh when filters change.
 */

import { state } from './state.js';
import { escHtml, escAttr, labelTextColor } from './utils.js';
import { getVisibleTasks } from './tasks.js';

const labelFilterBar    = document.getElementById('label-filter-bar');
const labelFilterPills  = document.getElementById('label-filter-pills');
const labelFilterClear  = document.getElementById('label-filter-clear');
const assigneeFilterBar   = document.getElementById('assignee-filter-bar');
const assigneeFilterPills = document.getElementById('assignee-filter-pills');
const assigneeFilterClear = document.getElementById('assignee-filter-clear');
const openOnlyFilter    = document.getElementById('open-only-filter');

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Re-build the label pill buttons from a fresh set of issues.
 * Hides the bar entirely when the repo has no labels.
 * @param {object[]} issues
 */
export function buildLabelFilter(issues) {
    const labelMap = new Map(); // name → { color, textColor }
    for (const issue of issues) {
        for (const label of (issue.labels || [])) {
            if (!labelMap.has(label.name)) {
                labelMap.set(label.name, {
                    color:     label.color,
                    textColor: labelTextColor(label.color),
                });
            }
        }
    }

    if (labelMap.size === 0) {
        labelFilterBar.classList.add('hidden');
        return;
    }

    const sorted = [...labelMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    labelFilterPills.innerHTML = sorted
        .map(([name, { color, textColor }]) => {
            const active = state.activeLabels.has(name) ? ' active' : '';
            return `<button class="label-filter-pill${active}" data-label="${escAttr(name)}"
                        style="background:#${escAttr(color)};color:${escAttr(textColor)}"
                    >${escHtml(name)}<span class="pill-close">✕</span></button>`;
        })
        .join('');

    labelFilterBar.classList.remove('hidden');
    updateFilterClearBtn();

    labelFilterPills.querySelectorAll('.label-filter-pill').forEach((pill) => {
        // Close button click removes the label
        pill.querySelector('.pill-close')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const name = pill.dataset.label;
            state.activeLabels.delete(name);
            pill.classList.remove('active');
            updateFilterClearBtn();
            applyLabelFilter();
        });
        
        // Pill click toggles active state
        pill.addEventListener('click', () => {
            const name = pill.dataset.label;
            if (state.activeLabels.has(name)) {
                state.activeLabels.delete(name);
                pill.classList.remove('active');
            } else {
                state.activeLabels.add(name);
                pill.classList.add('active');
            }
            updateFilterClearBtn();
            applyLabelFilter();
        });
    });
}

/** Show or hide the "Clear filters" button depending on whether any label is active. */
export function updateFilterClearBtn() {
    labelFilterClear.classList.toggle('hidden', state.activeLabels.size === 0);
}

/**
 * Build assignee filter pills from a fresh set of issues.
 * @param {object[]} issues
 */
export function buildAssigneeFilter(issues) {
    const assigneeMap = new Map(); // login → { login, avatarUrl }
    for (const issue of issues) {
        for (const assignee of (issue.assignees || [])) {
            if (!assigneeMap.has(assignee.login)) {
                assigneeMap.set(assignee.login, {
                    login: assignee.login,
                    avatarUrl: assignee.avatar_url,
                });
            }
        }
    }

    if (assigneeMap.size === 0) {
        assigneeFilterBar.classList.add('hidden');
        return;
    }

    const sorted = Array.from(assigneeMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    assigneeFilterPills.innerHTML = sorted
        .map(([login, { avatarUrl }]) => {
            const active = state.activeAssignees.has(login) ? ' active' : '';
            return `<button class="assignee-filter-pill${active}" data-assignee="${escAttr(login)}"
                        title="${escAttr(login)}"
                    ><img src="${escAttr(avatarUrl)}" alt="${escAttr(login)}" />
                     <span>${escHtml(login)}<span class="pill-close">✕</span></span></button>`;
        })
        .join('');

    assigneeFilterBar.classList.remove('hidden');
    updateAssigneeFilterClearBtn();

    assigneeFilterPills.querySelectorAll('.assignee-filter-pill').forEach((pill) => {
        // Close button click removes the assignee
        pill.querySelector('.pill-close')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const login = pill.dataset.assignee;
            state.activeAssignees.delete(login);
            pill.classList.remove('active');
            updateAssigneeFilterClearBtn();
            applyLabelFilter();
        });
        
        // Pill click toggles active state
        pill.addEventListener('click', () => {
            const login = pill.dataset.assignee;
            if (state.activeAssignees.has(login)) {
                state.activeAssignees.delete(login);
                pill.classList.remove('active');
            } else {
                state.activeAssignees.add(login);
                pill.classList.add('active');
            }
            updateAssigneeFilterClearBtn();
            applyLabelFilter();
        });
    });
}

/** Show or hide the "Clear filters" button depending on whether any assignee is active. */
export function updateAssigneeFilterClearBtn() {
    assigneeFilterClear.classList.toggle('hidden', state.activeAssignees.size === 0);
}
export function applyLabelFilter() {
    if (!state.ganttInstance) return;
    state.ganttInstance.refresh(getVisibleTasks());
}
