# GitHub Direct Commit Integration for Design Tokens Plugin

## Overview

This update adds **GitHub direct commit** functionality to the Figma Design Tokens plugin, bypassing the GitHub workflow dispatch 65KB payload limitation. Instead of sending tokens via `repository_dispatch` event, the plugin now commits the token file directly to a specified branch. The push event triggers GitHub Actions workflows automatically.

## Problem Solved

**Original Issue:**
- GitHub workflow dispatch has a ~65KB payload limit
- Production token file (`figma-design-tokens.json`) is 113KB
- Cannot send full token payload via `client_payload.tokens`

**Solution:**
- Use GitHub API directly to commit files (no payload size restriction)
- Commit to user-specified branch (creates if doesn't exist)
- Push event triggers existing GitHub Actions workflow
- No PR creation needed - workflow runs on push

## Changes Made

### 1. New File: `src/ui/modules/githubRepository.ts`

Complete GitHub API integration similar to existing GitLab implementation:

**Features:**
- ✅ Get default branch (main/develop)
- ✅ Check if branch exists
- ✅ Create new branch if needed (from default branch)
- ✅ Check if file exists (get SHA for updates)
- ✅ Upload/update file via GitHub Contents API
- ✅ Proper error handling and authentication

**Workflow:**
```
1. Check if target branch exists
2. If not, get default branch SHA and create target branch
3. Check if file exists (for SHA)
4. Commit token file to target branch
5. Push event triggers GitHub Actions workflow
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

### 4. Updated: `src/ui/components/UrlExportSettings.tsx`

Added Branch input field for GitHub Direct Commit:

**Features:**
- Shows "Branch" field when `github_commit` auth type is selected
- User specifies target branch name (e.g., "main", "develop", "design-tokens")
- Required field with validation (no whitespace allowed)
- Matches GitLab implementation pattern for consistency
- Branch is created automatically if it doesn't exist

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

Branch: main
(Or any branch name: develop, design-tokens, feature/tokens, etc.)
Note: Branch will be created automatically if it doesn't exist

Filename: figma-design-tokens.json
```

4. Save settings

### Exporting Tokens

**Option 1: Send to Server**
1. Open plugin: `Design Tokens > Send Design Tokens to Url`
2. Plugin will:
   - Check if specified branch exists
   - Create branch if it doesn't exist
   - Commit token file (no size limit!)
   - Push triggers GitHub Actions workflow automatically

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

1. ✅ Plugin commits tokens to specified branch (NEW - no payload limit)
2. ✅ Push event triggers GitHub Actions workflow
3. ✅ Runs transformation: `.github/workflows/figma-tokens.yml`
4. ✅ Generates CSS/SCSS/JS files
5. ✅ Files are committed back to the branch
6. ✅ Team can create PR manually if needed for review

**No changes needed to:**
- Existing GitHub Actions workflow (just needs push event trigger)
- Style Dictionary transformation
- Token consumption in application

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

Branch: main
(Or specify any branch name: develop, design-tokens, etc.)
Note: Branch will be created if it doesn't exist

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
2. Navigate to the branch you specified (e.g., "main" or "design-tokens")
3. Check the commits:
   - Verify `figma-design-tokens.json` was committed
   - Check file size is ~113KB (all 867 tokens)
   - Look for commit message: "Update figma-design-tokens.json from Figma"
4. Check the **Actions** tab:
   - Verify the workflow is running or completed
   - Check that transformation succeeded

### Step 7: Verify GitHub Actions Workflow

1. Go to the **Actions** tab in the repository
2. Find the latest workflow run for `figma-tokens`
3. Wait for workflow to complete (usually 1-2 minutes)
4. Check that transformation succeeded:
   - CSS files generated
   - SCSS files generated
   - JS/TS token files generated

### Step 8: Review Generated Files

On the branch you specified, check these files were updated:

```
✅ figma-design-tokens.json (113KB - all 867 tokens)
✅ src/styles/tokens.scss
✅ src/styles/tokens.css
✅ src/styles/tokens.js
```

### Step 9: Test in Local Development

1. Checkout the branch:
```bash
cd ~/caspar-frontend
git fetch origin
git checkout main  # or whatever branch you specified
git pull
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

### Step 10: Create PR if Needed

**If you committed to a feature branch:**
1. Create a Pull Request from your branch to main/develop
2. Add reviewers
3. Wait for approval and merge

**If you committed directly to main/develop:**
- Changes are already live
- No PR needed

## Common Testing Scenarios

### Scenario 1: First Time Setup

**Goal:** Verify plugin can create new branch and file

**Steps:**
1. Configure plugin with GitHub token and a new branch name (e.g., "design-tokens")
2. Export tokens
3. Check branch was created on GitHub
4. Verify file committed
5. Confirm workflow ran

**Expected Result:** ✅ Branch + File + Workflow run all completed successfully

### Scenario 2: Updating Existing Tokens

**Goal:** Verify plugin can update existing file in existing branch

**Steps:**
1. Modify tokens in Figma
2. Export tokens again to the same branch
3. Check that file is updated with new content
4. Verify workflow runs again

**Expected Result:** ✅ File updated with latest tokens, workflow triggered

### Scenario 3: Different Branch Names

**Goal:** Test flexibility of branch naming

**Steps:**
1. Export tokens to "main" branch
2. Change settings to "develop" branch
3. Export tokens again
4. Verify both branches have the token file

**Expected Result:** ✅ Can commit to any branch specified in settings

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
