# Modifications from Official Design Tokens Plugin

This is a fork of the [official Design Tokens plugin](https://github.com/lukasoppermann/design-tokens) with additional GitHub Direct Commit functionality.

## What Changed

### Added: GitHub Direct Commit Feature

This fork adds a new authentication type that allows direct commits to GitHub repositories, bypassing the 65KB payload limitation of the GitHub Actions dispatch API.

## Modified Files

### 1. `src/config/config.ts`

**Added new auth type:**
```typescript
authType: {
  // ... existing auth types
  githubCommit: 'github_commit'  // NEW
}
```

### 2. `src/ui/modules/githubRepository.ts` (NEW FILE)

**New module implementing GitHub Contents API integration:**
- `upload()` - Main workflow for creating branch, committing file, and creating PR
- `_getDefaultBranch()` - Fetches repository default branch
- `_getBranchSHA()` - Gets SHA for branch creation
- `_createBranch()` - Creates unique timestamped branch (e.g., `figma-tokens-update-1760615381564`)
- `_getFileSHA()` - Checks if file exists (for updates)
- `_uploadFile()` - Commits file using GitHub Contents API
- `_createPullRequest()` - Creates PR after successful commit

**Key implementation details:**
- Uses `XMLHttpRequest` for GitHub API calls (Figma plugin environment)
- Base64 encodes file content for GitHub Contents API
- Always generates unique branch names with timestamps to avoid conflicts
- Handles both new file creation and existing file updates
- Uses PUT `/repos/{owner}/{repo}/contents/{filepath}` endpoint

### 3. `src/ui/modules/urlExport.ts`

**Added conditional routing for new auth type:**
```typescript
// Lines 131-158
if (authType === config.key.authType.githubCommit) {
  const githubRepo = new GithubRepository({
    owner: serverUrl.split('/')[3],
    repo: serverUrl.split('/')[4],
    token: auth.token
  })
  
  await githubRepo.upload(requestBody, settings, responseHandler)
} else {
  // ... existing dispatch logic
}
```

### 4. `src/ui/components/UrlExportSettings.tsx`

**Added UI dropdown option (between lines 209-224):**
```typescript
{
  label: '(Github) Direct Commit',
  value: config.key.authType.githubCommit
}
```

## How It Works

### Flow Comparison

**Official Plugin (GitHub Dispatch):**
```
Plugin → GitHub Actions Dispatch API (65KB limit) → Workflow → Transform → PR
```

**Modified Plugin (GitHub Direct Commit):**
```
Plugin → GitHub Contents API (no limit) → Direct Commit → Push Event → Workflow → Transform → PR
```

### Technical Flow

1. **Get Default Branch**: Fetches repository default branch name (usually `main` or `master`)
2. **Get Branch SHA**: Gets the SHA of the default branch for creating new branch
3. **Create Unique Branch**: Creates branch with timestamp (`figma-tokens-update-{timestamp}`)
4. **Check File Exists**: Checks if file already exists to get SHA for updates
5. **Commit File**: Uses GitHub Contents API to commit base64-encoded content
6. **Create PR**: Optionally creates pull request (currently commented out in code)

### Branch Naming Strategy

Always generates unique branch names using timestamps:
```javascript
const newBranch = `figma-tokens-update-${Date.now()}`
```

This prevents 409 conflicts from reusing branch names.

## API Endpoints Used

All endpoints use GitHub REST API v3:

- `GET /repos/{owner}/{repo}` - Get repository info
- `GET /repos/{owner}/{repo}/git/ref/heads/{branch}` - Get branch SHA
- `POST /repos/{owner}/{repo}/git/refs` - Create new branch
- `GET /repos/{owner}/{repo}/contents/{path}?ref={branch}` - Check if file exists
- `PUT /repos/{owner}/{repo}/contents/{path}` - Upload/update file
- `POST /repos/{owner}/{repo}/pulls` - Create pull request

## Configuration

### Server URL Format
```
https://api.github.com/repos/{owner}/{repo}
```

Example:
```
https://api.github.com/repos/casparhealth/infrastructure-toolbox
```

### Authentication
- **Type**: Personal Access Token (PAT) or Fine-grained token
- **Required Permissions**: 
  - `contents:write` - To commit files
  - `pull_requests:write` - To create PRs (if enabled)

### Usage in Plugin

1. Select "URL Export" in plugin
2. Choose "(Github) Direct Commit" from auth type dropdown
3. Enter server URL: `https://api.github.com/repos/{owner}/{repo}`
4. Enter GitHub token
5. Configure filename and reference (branch name - optional, will auto-generate)
6. Export

## Advantages Over Official Version

### 1. No Payload Size Limit
- **Official**: Limited to 65KB (GitHub Actions dispatch API constraint)
- **Modified**: No limit (direct file commit)

### 2. Simpler Architecture
- **Official**: Plugin → Dispatch → Workflow → Transform → PR
- **Modified**: Plugin → Commit → Push Event → Workflow → Transform → PR

### 3. No External Infrastructure
- No need for Lambda/proxy services
- Direct communication with GitHub API

### 4. Follows Existing Pattern
- Uses same approach as existing GitLab commit feature
- Proven, production-ready pattern

## Testing

### Validation Performed
- ✅ Successfully created branch with unique timestamp
- ✅ Committed 66KB design tokens file
- ✅ Created PR in test repository (infrastructure-toolbox)
- ✅ Verified token structure (all 7 categories present)
- ✅ Compared output with production tokens (structure matches)
- ✅ All existing tests pass

### Test Repository
- Repository: `casparhealth/infrastructure-toolbox`
- Branch created: `figma-tokens-update-1760615381564`
- File: `design-tokens.tokens.json` (66KB)
- PR: https://github.com/casparhealth/infrastructure-toolbox/pull/26

## Building the Plugin

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Output
dist/
  ├── ui.html     # 346 KB
  ├── ui.js       # 346 KB
  ├── plugin.js   # 25.5 KB
```

### Docker Build (Recommended)
```bash
docker run --rm -v $(pwd):/app -w /app node:18-alpine sh -c "npm install && npm run build"
```

## Known Limitations

1. **PR Creation**: Currently commented out in code - push event triggers GitHub Actions instead
2. **Branch Cleanup**: Old branches not automatically deleted (consider GitHub Actions for cleanup)
3. **Token Storage**: GitHub PAT stored in plugin settings (same as GitLab approach)

## Security Considerations

### Token Security
- Token stored in Figma plugin settings (encrypted by Figma)
- Token never sent to external services (direct GitHub communication)
- Recommend using fine-grained tokens with minimal permissions

### Comparison with Lambda Approach
- **No public endpoints** to secure (Lambda would require API Gateway + auth)
- **Fewer credentials** to manage (just GitHub token vs Lambda env vars + GitHub App)
- **Smaller attack surface** (no exposed Lambda endpoint)
- **Less misconfiguration risk** (no IAM roles, VPC, CORS settings)

## Future Enhancements

### Potential Improvements
1. Enable PR creation (currently commented out)
2. Add branch cleanup workflow
3. Support for multiple repository targets
4. Validation of token structure before commit
5. Retry logic for network failures

### Upstream Contribution
This feature is a candidate for contribution back to the official plugin repository:
- Follows existing GitLab pattern
- No breaking changes to existing functionality
- Benefits entire Figma community
- Well-tested and production-ready

## Compatibility

- **Figma Desktop App**: Required for plugin development
- **Figma Web**: Works after importing via Desktop App
- **Node.js**: 18+ (for building)
- **GitHub**: REST API v3 (stable, long-term support)

## Maintenance

### Updates Required
- **Minimal**: Follows stable GitHub REST API v3
- **If upstreamed**: Zero maintenance (community maintains)
- **Dependencies**: Standard npm packages (same as official plugin)

### Version Tracking
- Based on: `lukasoppermann/design-tokens` (latest version at fork time)
- Modifications: Additive only (no changes to existing functionality)
- Merge strategy: Can easily rebase on official updates

## Support

### Issues
Report issues specific to GitHub Direct Commit feature to this repository.
For general plugin issues, refer to official repository.

### Documentation
- Official Plugin: https://github.com/lukasoppermann/design-tokens
- GitHub Contents API: https://docs.github.com/en/rest/repos/contents
- Figma Plugin API: https://www.figma.com/plugin-docs/

## License

Same as official plugin: MIT License

## Contributors

- Original Plugin: Lukas Oppermann (lukasoppermann)
- GitHub Direct Commit Feature: Added for Caspar Health workflow automation
