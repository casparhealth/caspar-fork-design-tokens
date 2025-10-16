# GitHub Direct Commit Integration for Design Tokens Plugin

## Overview

This update adds **GitHub direct commit** functionality to the Figma Design Tokens plugin, bypassing the GitHub workflow dispatch 65KB payload limitation. Instead of sending tokens via `repository_dispatch` event, the plugin now creates a branch, commits the token file directly, and creates a pull request automatically.

## Problem Solved

**Original Issue:**
- GitHub workflow dispatch has a ~65KB payload limit
- Production token file (`figma-design-tokens.json`) is 113KB
- Cannot send full token payload via `client_payload.tokens`

**Solution:**
- Use GitHub API directly to commit files (no payload size restriction)
- Create branch → commit file → create PR automatically
- Existing GitHub Actions transformation workflow still runs on PR

## Changes Made

### 1. New File: `src/ui/modules/githubRepository.ts`

Complete GitHub API integration similar to existing GitLab implementation:

**Features:**
- ✅ Get default branch (main/develop)
- ✅ Create new branch for token update
- ✅ Check if file exists (get SHA for updates)
- ✅ Upload/update file via GitHub Contents API
- ✅ Auto-create Pull Request with description
- ✅ Proper error handling and authentication

**Workflow:**
```
1. Get default branch SHA
2. Create new branch (figma-tokens-update-{timestamp})
3. Check if file exists (for SHA)
4. Commit token file to new branch
5. Create PR from new branch to default branch
6. GitHub Actions runs transformation on PR
```

### 2. Updated: `src/config/config.ts`

Added new auth type for GitHub commits:

```typescript
authType: {
  token: 'token',
  gitlabToken: 'gitlab_token',
  gitlabCommit: 'gitlab_commit',
  githubCommit: 'github_commit',  // ← NEW
  basic: 'Basic',
  bearer: 'Bearer'
}
```

### 3. Updated: `src/ui/modules/urlExport.ts`

Added GitHub commit handler in the URL export flow:

**Features:**
- Import `GithubRepository` module
- Parse repository URL (supports multiple formats)
- Handle GitHub commit auth type
- Fallback to existing POST request for other auth types

**Supported URL formats:**
- `https://api.github.com/repos/owner/repo`
- `https://github.com/owner/repo`
- `owner/repo`

## Usage Instructions

### Plugin Settings

1. Open Figma Design Tokens plugin
2. Go to **Settings > Push to Server**
3. Configure GitHub settings:

```
Server URL: casparhealth/caspar-frontend
OR: https://github.com/casparhealth/caspar-frontend
OR: https://api.github.com/repos/casparhealth/caspar-frontend

Auth Type: github_commit

Access Token: ghp_YOUR_GITHUB_TOKEN_HERE
(Token needs permissions: repo, workflow)

Branch/Reference: figma-tokens-update
(Optional - will auto-generate if empty)

Filename: figma-design-tokens.json
```

4. Save settings

### Exporting Tokens

**Option 1: Send to Server**
1. Open plugin: `Design Tokens > Send Design Tokens to Url`
2. Plugin will:
   - Create new branch
   - Commit token file (no size limit!)
   - Create Pull Request automatically
   - Add PR description with changes

**Option 2: Manual Export**
1. Export JSON file: `Design Tokens > Export Design Token File`
2. Use custom script to upload (see below)

## GitHub Token Requirements

**Scopes needed:**
- `repo` - Full control of private repositories
- `workflow` - Update GitHub Actions workflows (optional)

**Create token:**
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `workflow`
4. Copy token to plugin settings

## Integration with Existing Workflow

**Current caspar-frontend workflow:**

1. ✅ Plugin creates branch + commits tokens (NEW - no payload limit)
2. ✅ Plugin creates Pull Request automatically
3. ✅ GitHub Actions detects PR
4. ✅ Runs transformation: `.github/workflows/figma-tokens.yml`
5. ✅ Generates CSS/SCSS/JS files
6. ✅ Team reviews PR
7. ✅ Merge to main/develop

**No changes needed to:**
- Existing GitHub Actions workflow
- Style Dictionary transformation
- Token consumption in application
- PR review process

## Testing in Figma

### Step 1: Build the Plugin

Using Docker (per team guidelines):

```bash
cd ~/poc-design-tokens

# Install dependencies
docker run --rm -v ${PWD}:/app -w /app node:18-alpine npm install

# Build the plugin
docker run --rm -v ${PWD}:/app -w /app node:18-alpine npm run build
```

**Expected output:**
```
✅ plugin.js (25.5 KB)
✅ ui.js (345 KB)
✅ ui.html (345 KB)
```

### Step 2: Load Plugin in Figma Desktop App

1. **Open Figma Desktop App** (required for plugin development)
2. Navigate to: `Plugins > Development > Import plugin from manifest`
3. Browse to: `/home/igortro/poc-design-tokens`
4. Select: `manifest.json`
5. Click: **Import**

The plugin will now appear as **"Design Tokens (Dev)"** in your plugins menu.

### Step 3: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click: **Generate new token (classic)**
3. Token name: `figma-design-tokens`
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Actions workflows - optional)
5. Click: **Generate token**
6. Copy the token: `ghp_xxxxxxxxxxxxxxxxxxxx`

**⚠️ Save this token - you won't see it again!**

### Step 4: Configure Plugin Settings

1. Open HCP Design System file in Figma: `0YH3UZB9mUZyljS59v3LjY`
2. Open plugin: `Plugins > Design Tokens (Dev) > Settings`
3. Navigate to: **"Push to Server"** tab
4. Fill in the following settings:

```
Server URL: casparhealth/caspar-frontend

Auth Type: github_commit
(Select from dropdown - this is the new option)

Access Token: ghp_YOUR_TOKEN_HERE
(Paste the token from Step 3)

Branch/Reference: (leave empty for auto-generation)
(Optional: enter "figma-tokens-update" for custom branch name)

Filename: figma-design-tokens.json
(This should match the file in caspar-frontend repo)
```

5. Click: **Save Settings**

### Step 5: Test Token Export

1. Make sure you're in the HCP Design System file
2. Run plugin: `Plugins > Design Tokens (Dev) > Send Design Tokens to Url`
3. Wait for the plugin to process (may take 10-30 seconds)
4. Look for success message: **"🎉 Design tokens pushed to server!"**

**If you see an error:**
- `🚨 401` → Check your GitHub token
- `🚨 404` → Verify repository URL format
- `🚨 Network error` → Check internet connection

### Step 6: Verify on GitHub

1. Go to: https://github.com/casparhealth/caspar-frontend
2. Click: **Pull requests** tab
3. You should see a new PR titled: **"Update design tokens from Figma"**
4. Click on the PR to review:
   - Check the branch name (e.g., `figma-tokens-update-1729089600000`)
   - Verify `figma-design-tokens.json` was committed
   - Check file size is ~113KB (all 867 tokens)
   - Review the auto-generated PR description

### Step 7: Verify GitHub Actions Workflow

1. In the PR, click: **Checks** tab
2. Verify the workflow is running: `figma-tokens`
3. Wait for workflow to complete (usually 1-2 minutes)
4. Check that transformation succeeded:
   - CSS files generated
   - SCSS files generated
   - JS/TS token files generated

### Step 8: Review Generated Files

In the PR, check these files were updated:

```
✅ figma-design-tokens.json (113KB - all 867 tokens)
✅ src/styles/tokens.scss
✅ src/styles/tokens.css
✅ src/styles/tokens.js
```

### Step 9: Test in Local Development

1. Checkout the PR branch:
```bash
cd ~/caspar-frontend
git fetch origin
git checkout figma-tokens-update-TIMESTAMP
```

2. Verify tokens are correct:
```bash
# Check token count
cat figma-design-tokens.json | jq '. | to_entries | length'
# Should output: 867

# Check file size
ls -lh figma-design-tokens.json
# Should be ~113KB
```

3. Run the app locally to test theme changes:
```bash
# Using your normal caspar-frontend dev process
npm start
# or
make dev
```

### Step 10: Merge or Close

**If everything looks good:**
1. Add reviewers to the PR
2. Wait for approval
3. Merge the PR
4. Delete the branch (GitHub will prompt you)

**If there are issues:**
1. Close the PR
2. Delete the branch
3. Check plugin settings
4. Try exporting again

## Common Testing Scenarios

### Scenario 1: First Time Setup

**Goal:** Verify plugin can create new branch and file

**Steps:**
1. Configure plugin with GitHub token
2. Export tokens
3. Check new branch created
4. Verify file committed
5. Confirm PR opened

**Expected Result:** ✅ Branch + File + PR all created successfully

### Scenario 2: Updating Existing Tokens

**Goal:** Verify plugin can update existing file

**Steps:**
1. Modify tokens in Figma
2. Export tokens again
3. Check existing branch is reused or new branch created
4. Verify file updated with new content

**Expected Result:** ✅ File updated with latest tokens

### Scenario 3: Multiple Exports

**Goal:** Test repeated exports create separate branches

**Steps:**
1. Export tokens → PR created
2. Export tokens again (without merging first PR)
3. Check that second export creates new branch with different timestamp

**Expected Result:** ✅ Two separate PRs with different branch names

### Scenario 4: Large Token File

**Goal:** Confirm 113KB file uploads successfully

**Steps:**
1. Export full HCP Design System (867 tokens)
2. Verify no payload size errors
3. Check GitHub shows full 113KB file

**Expected Result:** ✅ No size limit errors, full file committed

## Troubleshooting

**401 Unauthorized:**
- Check GitHub token is valid
- Verify token has `repo` scope
- Ensure token not expired

**404 Not Found:**
- Verify repository URL format
- Check owner/repo names are correct
- Ensure token has access to repository

**422 Unprocessable:**
- Branch might already exist (OK - will use existing)
- Check file path is correct
- Verify commit message format

**Network Error:**
- Check internet connection
- Verify GitHub API is accessible
- Try different URL format

## File Structure

```
poc-design-tokens/
├── src/
│   ├── config/
│   │   └── config.ts (updated - new auth type)
│   └── ui/
│       └── modules/
│           ├── githubRepository.ts (NEW)
│           ├── gitlabRepository.ts (existing)
│           └── urlExport.ts (updated - GitHub integration)
├── manifest.json
├── package.json
└── README.md
```

## Next Steps

1. **Build Plugin:**
   ```bash
   cd ~/poc-design-tokens
   docker run --rm -v ${PWD}:/app -w /app node:18-alpine npm install
   docker run --rm -v ${PWD}:/app -w /app node:18-alpine npm run build
   ```

2. **Test with HCP Design System:**
   - Load plugin in Figma
   - Configure GitHub settings
   - Export tokens
   - Verify PR creation

3. **Documentation for Design Team:**
   - How to configure plugin settings
   - GitHub token creation guide
   - Troubleshooting common issues

4. **Deploy:**
   - Submit updated plugin to Figma Community
   - Update internal documentation
   - Train design team on new workflow

## Related Files

- **Original tokens:** `/home/igortro/poc-figma-tokens-sync/original-figma-design-tokens.json` (867 tokens, 113KB)
- **Production workflow:** `/home/igortro/caspar-frontend/.github/workflows/figma-tokens.yml`
- **Token usage:** `/home/igortro/caspar-frontend/src/app/react/theme/*`

## References

- GitHub API Documentation: https://docs.github.com/en/rest
- Contents API: https://docs.github.com/en/rest/repos/contents
- Pull Requests API: https://docs.github.com/en/rest/pulls
- Original Plugin: https://github.com/lukasoppermann/design-tokens
