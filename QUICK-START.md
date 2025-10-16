# Quick Start Guide - GitHub Commit Integration

## ✅ Build Status: SUCCESS

The plugin has been successfully built with GitHub direct commit integration!

```
Build output:
✅ plugin.js (25.5 KB)
✅ ui.js (345 KB)
✅ ui.html (345 KB)
```

## 🎯 What This Solves

**Problem:**
- GitHub workflow dispatch limited to ~65KB payload
- Production tokens are 113KB → Cannot use workflow_dispatch

**Solution:**
- Direct GitHub API commit (no size limit)
- Auto-creates branch + commit + PR
- Maintains existing transformation workflow

## 🚀 Setup Instructions

### 1. Create GitHub Personal Access Token

```bash
# Go to: https://github.com/settings/tokens
# Click: Generate new token (classic)
# Scopes needed:
#   ✅ repo (Full control of private repositories)
#   ✅ workflow (Update workflows - optional)
# Copy token: ghp_xxxxxxxxxx
```

### 2. Configure Plugin Settings

**In Figma:**

1. Open: `Plugins > Design Tokens > Settings`
2. Navigate to: **"Push to Server"** section
3. Fill in:

```
Server URL: casparhealth/caspar-frontend
(or: https://github.com/casparhealth/caspar-frontend)

Auth Type: github_commit

Access Token: ghp_YOUR_TOKEN_HERE

Branch (optional): figma-tokens-update
(Leave empty for auto-generated branch name)

Filename: figma-design-tokens.json
```

4. Click **Save**

### 3. Export Tokens

**Method 1: Send to Server (Recommended)**

```
1. Plugins > Design Tokens > Send Design Tokens to Url
2. Wait for success message: "🎉 Design tokens pushed to server!"
3. Check GitHub for new PR
```

**Method 2: Export File + Manual Upload**

```
1. Plugins > Design Tokens > Export Design Token File
2. Save JSON file locally
3. Use custom script to upload (see below)
```

## 📋 What Happens When You Export

**Automatic Workflow:**

```
1. Plugin creates new branch: figma-tokens-update-{timestamp}
2. Commits figma-design-tokens.json (113KB - no problem!)
3. Creates Pull Request automatically
4. PR description includes:
   - Update timestamp
   - Commit message
   - Instructions for review

5. GitHub Actions automatically runs:
   - .github/workflows/figma-tokens.yml
   - Transforms tokens to CSS/SCSS/JS
   - Updates PR with generated files

6. Team reviews and merges PR
```

## 🔧 Load Plugin in Figma

**Development Mode:**

1. Open Figma Desktop App
2. Go to: `Plugins > Development > Import plugin from manifest`
3. Navigate to: `/home/igortro/poc-design-tokens`
4. Select: `manifest.json`
5. Click: **Import**

**Testing:**

1. Open: HCP Design System file (0YH3UZB9mUZyljS59v3LjY)
2. Run plugin: `Plugins > Design Tokens (Dev) > Send Design Tokens to Url`
3. Check GitHub: `https://github.com/casparhealth/caspar-frontend/pulls`

## ✨ Features

### Direct Commit API

✅ **No payload size limit** (handles 113KB tokens)
✅ **Auto-branch creation** (no manual branch setup)
✅ **Auto-PR creation** (with description)
✅ **Existing workflow compatibility** (no changes needed)
✅ **Error handling** (401, 404, 422 errors handled)

### URL Format Support

Accepts multiple formats:

```
✅ owner/repo
✅ https://github.com/owner/repo
✅ https://api.github.com/repos/owner/repo
```

### Branch Naming

```
Auto-generated: figma-tokens-update-1729089600000
Custom: figma-tokens-update (from settings)
```

## 🧪 Testing Checklist

### Pre-Test Setup

- [ ] GitHub token created with `repo` scope
- [ ] Plugin built successfully (`npm run build`)
- [ ] Plugin loaded in Figma (Development mode)
- [ ] HCP Design System file opened

### Export Test

- [ ] Configure plugin settings (GitHub URL + token)
- [ ] Run: `Send Design Tokens to Url`
- [ ] Verify success message
- [ ] Check GitHub for new branch
- [ ] Check GitHub for new PR
- [ ] Verify PR description is correct
- [ ] Confirm token file committed (113KB)

### GitHub Actions Test

- [ ] PR triggers GitHub Actions workflow
- [ ] Workflow runs transformation
- [ ] CSS/SCSS/JS files generated
- [ ] No errors in workflow logs

### Final Validation

- [ ] Review generated token files
- [ ] Compare with original tokens (867 tokens)
- [ ] Verify Material-UI theme updates
- [ ] Test in caspar-frontend app

## 🐛 Troubleshooting

### 401 Unauthorized

**Issue:** Token invalid or missing scope
**Fix:**
```bash
# Create new token with 'repo' scope
# Update plugin settings with new token
```

### 404 Not Found

**Issue:** Repository URL incorrect
**Fix:**
```
# Use format: casparhealth/caspar-frontend
# Or: https://github.com/casparhealth/caspar-frontend
```

### 422 Unprocessable

**Issue:** Branch already exists (not a real error)
**Result:** Plugin will use existing branch and update file

### Network Error

**Issue:** GitHub API unreachable
**Fix:**
```bash
# Check internet connection
# Try again
# Verify GitHub status: https://www.githubstatus.com/
```

### File Not Updated

**Issue:** Wrong branch or file path
**Fix:**
```
# Verify filename setting: figma-design-tokens.json
# Check branch name in GitHub
# Verify PR was created
```

## 📊 Comparison

| Method | Payload Limit | Automation | PR Creation |
|--------|--------------|------------|-------------|
| **Workflow Dispatch** | ❌ 65KB | ✅ Full | ❌ Manual |
| **GitHub Commit API** | ✅ No limit | ✅ Full | ✅ Automatic |

## 🔗 Related Files

**Plugin files:**
- `/home/igortro/poc-design-tokens/src/ui/modules/githubRepository.ts` (new)
- `/home/igortro/poc-design-tokens/src/config/config.ts` (updated)
- `/home/igortro/poc-design-tokens/src/ui/modules/urlExport.ts` (updated)

**Production files:**
- `/home/igortro/caspar-frontend/figma-design-tokens.json` (113KB)
- `/home/igortro/caspar-frontend/.github/workflows/figma-tokens.yml`
- `/home/igortro/caspar-frontend/src/app/react/theme/*`

**Documentation:**
- `/home/igortro/poc-design-tokens/GITHUB-INTEGRATION.md` (full details)
- `/home/igortro/poc-figma-tokens-sync/FIGMA-API-LIMITATIONS.md` (research)

## 📝 Next Steps

1. **Test in Development:**
   ```bash
   # Load plugin in Figma Desktop App
   # Configure GitHub settings
   # Export tokens from HCP Design System
   # Verify PR creation
   ```

2. **Team Training:**
   - Document plugin setup process
   - Share GitHub token creation guide
   - Train designers on new workflow

3. **Deploy to Production:**
   - Submit plugin to Figma Community (if public)
   - Update internal documentation
   - Migrate from manual export to automated sync

4. **Monitor:**
   - Track PR creation success rate
   - Monitor GitHub Actions workflow runs
   - Collect feedback from design team

## 🎓 Learning Resources

- GitHub API: https://docs.github.com/en/rest
- Plugin Development: https://www.figma.com/plugin-docs/
- Original Plugin: https://github.com/lukasoppermann/design-tokens
- Style Dictionary: https://amzn.github.io/style-dictionary/

---

**Status:** ✅ Ready for testing
**Build:** ✅ Success
**Integration:** ✅ Complete
**Documentation:** ✅ Complete
