#!/usr/bin/env node
/**
 * Review imported issues and suggest labels
 * Usage: node review-issues.js <owner/repo> [--owner OWNER] [--repo REPO]
 */

const BASE = 'https://api.github.com';
const token = process.env.GITHUB_TOKEN;

if (!token) {
    console.error('❌ Error: GITHUB_TOKEN environment variable not set');
    process.exit(1);
}

// Parse command-line arguments
let owner, repo;
const args = process.argv.slice(2);

if (args.length === 0) {
    console.error('❌ Error: owner/repo required');
    console.error('Usage: node review-issues.js owner/repo');
    console.error('   or: node review-issues.js --owner OWNER --repo REPO');
    process.exit(1);
}

// Check for --owner --repo flags
let i = 0;
while (i < args.length) {
    if (args[i] === '--owner' && i + 1 < args.length) {
        owner = args[i + 1];
        i += 2;
    } else if (args[i] === '--repo' && i + 1 < args.length) {
        repo = args[i + 1];
        i += 2;
    } else if (!args[i].startsWith('--')) {
        // Parse owner/repo format
        const [o, r] = args[i].split('/');
        if (!owner) owner = o;
        if (!repo) repo = r;
        i++;
    } else {
        i++;
    }
}

if (!owner || !repo) {
    console.error('❌ Error: invalid owner/repo format');
    console.error('Usage: node review-issues.js owner/repo');
    console.error('   or: node review-issues.js --owner OWNER --repo REPO');
    process.exit(1);
}

async function ghFetch(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });

    if (!res.ok) {
        let message = res.statusText;
        try {
            const body = await res.json();
            message = body.message || message;
        } catch { /* ignore */ }
        throw new Error(`GitHub ${res.status}: ${message}`);
    }

    if (res.status === 204) return null;
    return res.json();
}

async function getIssues() {
    const owner_enc = encodeURIComponent(owner);
    const repo_enc = encodeURIComponent(repo);
    
    const issues = [];
    let page = 1;

    while (true) {
        const batch = await ghFetch(
            `/repos/${owner_enc}/${repo_enc}/issues?state=all&per_page=100&page=${page}&sort=created&direction=desc`
        );
        const onlyIssues = batch.filter((i) => !i.pull_request);
        issues.push(...onlyIssues);
        if (batch.length < 100) break;
        page++;
    }

    return issues.slice(0, 21); // Get the last 21 (newly imported)
}

async function main() {
    console.log('📋 Fetching recently imported issues...\n');
    const issues = await getIssues();
    
    issues.sort((a, b) => a.number - b.number);
    
    for (const issue of issues) {
        console.log(`Issue #${issue.number}: ${issue.title}`);
        console.log(`  Status: ${issue.state}`);
        console.log(`  Current Labels: ${issue.labels.map(l => l.name).join(', ') || '(none)'}`);
        console.log(`  Body preview: ${issue.body.substring(0, 100)}...`);
        console.log('');
    }
}

main().catch(console.error);
