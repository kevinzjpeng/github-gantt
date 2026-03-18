/**
 * GitHub credential helpers, repo string parsing, and the status bar.
 *
 * Nothing in this module imports from other app modules, so it is safe
 * to import from anywhere without risking circular dependencies.
 */

const statusBar = document.getElementById('status-bar');

// ─── Credential storage ───────────────────────────────────────────────────────

export function getConfig() {
    return {
        token: localStorage.getItem('gh_token') || '',
        repo:  localStorage.getItem('gh_repo')  || '',
    };
}

export function saveConfig(token, repo) {
    localStorage.setItem('gh_token', token);
    localStorage.setItem('gh_repo', repo);
}

// ─── Repository string parsing ────────────────────────────────────────────────

/**
 * Parse various GitHub URL formats into { owner, repo }, or return null if invalid.
 * Accepts:
 *   - GitHub repo URL: https://github.com/owner/repo
 *   - GitHub org project URL: https://github.com/orgs/owner/projects/14
 *   - Direct format: owner/repo
 * @param {string} repoStr
 */
export function parseRepo(repoStr) {
    const input = repoStr.trim();
    
    // Try parsing as URL
    if (input.includes('://') || input.includes('github.com')) {
        try {
            const url = new URL(input.startsWith('http') ? input : 'https://' + input);
            const pathname = url.pathname;
            
            // Handle: https://github.com/orgs/owner/projects/14
            const orgMatch = pathname.match(/^\/orgs\/([^/]+)\/projects\/\d+$/);
            if (orgMatch) {
                return { owner: orgMatch[1], repo: null }; // Will ask user for repo
            }
            
            // Handle: https://github.com/owner/repo
            const repoMatch = pathname.match(/^\/([^/]+)\/([^/]+)(?:\/|$)/);
            if (repoMatch) {
                return { owner: repoMatch[1], repo: repoMatch[2] };
            }
        } catch (e) {
            return null;
        }
    }
    
    // Parse direct owner/repo format
    const parts = input.split('/');
    if (parts.length === 2 && parts[0] && parts[1]) {
        return { owner: parts[0], repo: parts[1] };
    }
    
    return null;
}

// ─── Status bar ───────────────────────────────────────────────────────────────

/**
 * Display a message in the status bar.
 * @param {string} msg
 * @param {'info'|'warn'|'error'|'success'} type
 */
export function setStatus(msg, type = 'info') {
    statusBar.textContent = msg;
    statusBar.className = `status-bar status-${type}`;
}
