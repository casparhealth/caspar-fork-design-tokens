# Figma Design Tokens - Testing Guide

## Quick Setup Checklist

- [ ] **Build plugin** (using Docker)
- [ ] **Load in Figma Desktop** (Development mode)
- [ ] **Create GitHub token** (with `repo` scope)
- [ ] **Configure plugin settings** (GitHub URL + token)
- [ ] **Export tokens** from HCP Design System
- [ ] **Verify PR created** on GitHub
- [ ] **Check GitHub Actions** runs successfully

---

## Step-by-Step Testing

### 1️⃣ Build the Plugin

```bash
cd ~/poc-design-tokens

# Install dependencies (using Docker per team guidelines)
docker run --rm -v ${PWD}:/app -w /app node:18-alpine npm install

# Build plugin
docker run --rm -v ${PWD}:/app -w /app node:18-alpine npm run build
```

**✅ Success indicators:**
```
✅ plugin.js created (25.5 KB)
✅ ui.js created (345 KB)
✅ No build errors
```

---

### 2️⃣ Load Plugin in Figma

**Requirements:**
- Figma Desktop App (not browser version)
- Development mode enabled

**Steps:**
1. Open Figma Desktop App
2. Go to: `Plugins > Development > Import plugin from manifest`
3. Navigate to: `/home/igortro/poc-design-tokens`
4. Select: `manifest.json`
5. Click: **Import**

**✅ Success:** Plugin appears as "Design Tokens (Dev)" in Plugins menu

---

### 3️⃣ Create GitHub Token

**URL:** https://github.com/settings/tokens

**Steps:**
1. Click: **Generate new token (classic)**
2. Name: `figma-design-tokens`
3. Scopes:
   - ✅ `repo` (required)
   - ✅ `workflow` (optional but recommended)
4. Click: **Generate token**
5. Copy token: `ghp_xxxxxxxxxxxxxxxxxxxxx`

**⚠️ Important:** Save this token securely - GitHub won't show it again!

---

### 4️⃣ Configure Plugin Settings

**In Figma:**
1. Open HCP Design System file: `0YH3UZB9mUZyljS59v3LjY`
2. Open: `Plugins > Design Tokens (Dev) > Settings`
3. Go to: **"Push to Server"** tab

**Configuration:**

```
Server URL:
  casparhealth/caspar-frontend

Auth Type:
  github_commit  ← NEW OPTION

Access Token:
  ghp_YOUR_TOKEN_HERE  ← Paste from Step 3

Branch/Reference:
  (leave empty for auto-generation)

Filename:
  figma-design-tokens.json
```

4. Click: **Save Settings**

**✅ Success:** Settings saved without error

---

### 5️⃣ Export Tokens

**Steps:**
1. In HCP Design System file
2. Run: `Plugins > Design Tokens (Dev) > Send Design Tokens to Url`
3. Wait 10-30 seconds for processing

**✅ Success message:**
```
🎉 Design tokens pushed to server!
```

**❌ Error messages:**
- `🚨 401: Check your access token` → Token invalid/expired
- `🚨 404: Check your server url` → Repository URL wrong
- `🚨 Network error` → Internet connection issue

---

### 6️⃣ Verify on GitHub

**Check 1: Pull Request Created**

1. Go to: https://github.com/casparhealth/caspar-frontend/pulls
2. Look for PR: **"Update design tokens from Figma"**
3. Branch name format: `figma-tokens-update-1729089600000`

**✅ Verify:**
- [ ] PR exists
- [ ] PR title is descriptive
- [ ] PR has auto-generated description

**Check 2: File Committed**

1. Open the PR
2. Click: **Files changed** tab
3. Look for: `figma-design-tokens.json`

**✅ Verify:**
- [ ] File is present
- [ ] File size is ~113KB
- [ ] File contains 867 tokens
- [ ] Content looks correct (JSON format)

**Check 3: PR Description**

**Should contain:**
```markdown
## Design Token Update

This PR was automatically created by the Figma Design Tokens plugin.

### Changes
- Updated design tokens from Figma
- Commit: [your commit message]

**Note:** Please review the changes and run the transformation workflow...
```

---

### 7️⃣ Verify GitHub Actions

**Steps:**
1. In the PR, click: **Checks** tab
2. Look for workflow: `figma-tokens` or similar
3. Wait for completion (1-2 minutes)

**✅ Success indicators:**
- [ ] Workflow triggered automatically
- [ ] Workflow status: ✅ Green checkmark
- [ ] No errors in workflow logs

**Check transformation output:**
1. Go to: **Files changed** tab
2. Look for generated files:

```
✅ figma-design-tokens.json (input - 113KB)
✅ src/styles/tokens.css (generated)
✅ src/styles/tokens.scss (generated)
✅ src/styles/tokens.js (generated)
```

---

### 8️⃣ Test Locally (Optional)

**Checkout the branch:**

```bash
cd ~/caspar-frontend
git fetch origin
git checkout figma-tokens-update-XXXXX
```

**Verify token count:**

```bash
# Count tokens in JSON file
cat figma-design-tokens.json | jq '. | to_entries | length'
# Expected: 867

# Check file size
ls -lh figma-design-tokens.json
# Expected: ~113KB
```

**Run app with new tokens:**

```bash
# Start development server
npm start
# or your normal dev command

# Check browser console for theme changes
# Verify Material-UI components look correct
```

**✅ Success:**
- [ ] App starts without errors
- [ ] Tokens loaded correctly
- [ ] Theme applied to components
- [ ] No console warnings about missing tokens

---

## Troubleshooting

### Issue: Plugin not loading in Figma

**Solutions:**
- Use Figma Desktop App (not browser)
- Check `manifest.json` exists
- Verify build completed successfully
- Try: `Plugins > Development > Remove plugin` then re-import

### Issue: 401 Unauthorized

**Solutions:**
- Check token is valid (go to GitHub settings)
- Verify token has `repo` scope
- Try generating new token
- Make sure token not expired

### Issue: 404 Not Found

**Solutions:**
- Verify URL format: `casparhealth/caspar-frontend`
- Check repository name spelling
- Ensure you have access to the repository
- Try full URL: `https://github.com/casparhealth/caspar-frontend`

### Issue: No PR created

**Solutions:**
- Check GitHub for any error messages
- Verify branch was created (GitHub > Branches)
- Look for file in the branch
- Check Figma plugin console for errors

### Issue: GitHub Actions not running

**Solutions:**
- Check `.github/workflows/figma-tokens.yml` exists
- Verify workflow is enabled (GitHub > Actions)
- Check workflow trigger conditions
- Look at workflow logs for errors

### Issue: Token file too large error

**Solutions:**
- This should NOT happen with GitHub Commit API
- If it does, check you selected `github_commit` not `Bearer` or `token`
- Verify plugin is using the new integration

---

## Testing Checklist Summary

### Pre-Test ✅
- [ ] Plugin built successfully
- [ ] Plugin loaded in Figma Desktop
- [ ] GitHub token created with `repo` scope
- [ ] Plugin settings configured

### Export Test ✅
- [ ] Export completes successfully
- [ ] Success message appears
- [ ] No errors in Figma console

### GitHub Test ✅
- [ ] New branch created
- [ ] Token file committed (113KB)
- [ ] Pull Request created
- [ ] PR description is correct

### Automation Test ✅
- [ ] GitHub Actions triggered
- [ ] Transformation workflow runs
- [ ] Generated files appear in PR
- [ ] No workflow errors

### Final Validation ✅
- [ ] Token count correct (867)
- [ ] File size correct (~113KB)
- [ ] App runs with new tokens
- [ ] No regressions in UI

---

## Success Criteria

**✅ Plugin works if:**
1. Export completes without errors
2. PR created automatically on GitHub
3. 113KB token file committed successfully
4. GitHub Actions runs transformation
5. Generated CSS/SCSS/JS files are correct

**🎉 Ready for production if ALL criteria met!**

---

## Next Steps After Successful Testing

1. **Document for team:**
   - Create wiki page with setup instructions
   - Share GitHub token creation guide
   - Document troubleshooting tips

2. **Train designers:**
   - Walk through plugin setup
   - Demonstrate export process
   - Explain PR review workflow

3. **Monitor initial usage:**
   - Track success rate
   - Collect feedback
   - Fix any issues quickly

4. **Iterate:**
   - Improve error messages
   - Add progress indicators
   - Enhance PR descriptions

---

## Quick Reference

**Plugin Location:** `/home/igortro/poc-design-tokens`

**Build Command:**
```bash
docker run --rm -v ${PWD}:/app -w /app node:18-alpine npm run build
```

**HCP Design System File ID:** `0YH3UZB9mUZyljS59v3LjY`

**Repository URL:** `casparhealth/caspar-frontend`

**Expected Token Count:** 867 tokens

**Expected File Size:** ~113KB

**Auth Type:** `github_commit` (new option)

---

**Last Updated:** October 16, 2025
**Status:** ✅ Ready for testing
