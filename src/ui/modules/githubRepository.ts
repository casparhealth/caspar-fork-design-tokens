import { utf8ToBase64 } from '@utils/base64'
import {
  urlExportRequestBody,
  urlExportSettings
} from '@typings/urlExportData'

export class GithubRepository {
  owner: string
  repo: string
  token: string

  constructor(props: { owner: string; repo: string; token: string }) {
    this.owner = props.owner
    this.repo = props.repo
    this.token = props.token
  }

  async upload(
    { client_payload: clientPayload }: urlExportRequestBody,
    { reference: branch }: urlExportSettings,
    responseHandler: {
      onError: () => void;
      onLoaded: (request: XMLHttpRequest) => void;
    }
  ) {
    const encodedContent = utf8ToBase64(clientPayload.tokens)
    const filepath = clientPayload.filename

    try {
      // Get the default branch SHA to create new branch from
      console.log('Step 1: Getting default branch...')
      const defaultBranch = await this._getDefaultBranch()
      console.log('Default branch:', defaultBranch)
      
      console.log('Step 2: Getting branch SHA...')
      const defaultBranchSHA = await this._getBranchSHA(defaultBranch)
      console.log('Branch SHA:', defaultBranchSHA)
      
      // Create new branch for the token update
      // Always use a unique timestamp-based branch name to avoid conflicts
      const timestamp = Date.now()
      const newBranch = `figma-tokens-update-${timestamp}`
      console.log('Step 3: Creating new branch:', newBranch)
      await this._createBranch(newBranch, defaultBranchSHA)
      console.log('Branch created successfully')
      
      // Check if file exists to get its SHA
      console.log('Step 4: Checking if file exists:', filepath)
      const fileSHA = await this._getFileSHA(filepath, newBranch)
      console.log('File SHA:', fileSHA || 'File does not exist (will create new)')
      
      // Upload the file
      const uploadRequest = new XMLHttpRequest()
      uploadRequest.onerror = (_err) => responseHandler.onError()
      uploadRequest.onload = (event) => {
        const req = event.target as XMLHttpRequest
        if (req.status >= 200 && req.status < 300) {
          // After successful upload, create a pull request
          this._createPullRequest(
            newBranch,
            defaultBranch,
            clientPayload.commitMessage,
            responseHandler
          )
        } else {
          responseHandler.onLoaded(req)
        }
      }

      this._uploadFile({
        request: uploadRequest,
        content: encodedContent,
        commitMessage: clientPayload.commitMessage || `Update design tokens at ${Date.now()}`,
        filepath: filepath,
        branch: newBranch,
        fileSHA: fileSHA
      })
    } catch (error) {
      console.error('GitHub upload error:', error)
      if (error && error.request && error.code === 401) {
        responseHandler.onLoaded(error.request)
      } else {
        responseHandler.onError()
      }
    }
  }

  private _getDefaultBranch(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open(
        'GET',
        `https://api.github.com/repos/${this.owner}/${this.repo}`
      )
      this._setRequestHeader(request)

      request.onreadystatechange = (_ev: ProgressEvent) => {
        if (request.readyState !== XMLHttpRequest.DONE) {
          return
        }

        const statusCode = request.status
        if (statusCode === 200) {
          const response = JSON.parse(request.responseText)
          resolve(response.default_branch || 'main')
          return
        }

        reject({
          code: statusCode,
          message: request.response,
          request: request
        })
      }

      request.send()
    })
  }

  private _getBranchSHA(branch: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open(
        'GET',
        `https://api.github.com/repos/${this.owner}/${this.repo}/git/ref/heads/${branch}`
      )
      this._setRequestHeader(request)

      request.onreadystatechange = (_ev: ProgressEvent) => {
        if (request.readyState !== XMLHttpRequest.DONE) {
          return
        }

        const statusCode = request.status
        if (statusCode === 200) {
          const response = JSON.parse(request.responseText)
          resolve(response.object.sha)
          return
        }

        reject({
          code: statusCode,
          message: request.response,
          request: request
        })
      }

      request.send()
    })
  }

  private _createBranch(branchName: string, sha: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open(
        'POST',
        `https://api.github.com/repos/${this.owner}/${this.repo}/git/refs`
      )
      this._setRequestHeader(request)

      request.onreadystatechange = (_ev: ProgressEvent) => {
        if (request.readyState !== XMLHttpRequest.DONE) {
          return
        }

        const statusCode = request.status
        // 201 = created, 422 = already exists (which is ok for us)
        if (statusCode === 201 || statusCode === 422) {
          resolve()
          return
        }

        reject({
          code: statusCode,
          message: request.response,
          request: request
        })
      }

      request.send(JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: sha
      }))
    })
  }

  private _getFileSHA(
    filepath: string,
    branch: string
  ): Promise<string | null> {
    return new Promise<string | null>((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open(
        'GET',
        `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${filepath}?ref=${branch}`
      )
      this._setRequestHeader(request)

      request.onreadystatechange = (_ev: ProgressEvent) => {
        if (request.readyState !== XMLHttpRequest.DONE) {
          return
        }

        const statusCode = request.status
        if (statusCode === 200) {
          const response = JSON.parse(request.responseText)
          resolve(response.sha)
          return
        }

        if (statusCode === 404) {
          resolve(null) // File doesn't exist yet
          return
        }

        reject({
          code: statusCode,
          message: request.response,
          request: request
        })
      }

      request.send()
    })
  }

  private _uploadFile(args: {
    request: XMLHttpRequest;
    filepath: string;
    content: string;
    commitMessage: string;
    branch: string;
    fileSHA: string | null;
  }) {
    const { request, branch, content, commitMessage, filepath, fileSHA } = args

    const body: any = {
      message: commitMessage,
      content: content,
      branch: branch
    }

    // Include SHA if file exists (for update)
    if (fileSHA) {
      body.sha = fileSHA
    }

    request.open(
      'PUT',
      `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${filepath}`
    )
    this._setRequestHeader(request)

    request.send(JSON.stringify(body))
  }

  private _createPullRequest(
    headBranch: string,
    baseBranch: string,
    commitMessage: string,
    responseHandler: {
      onError: () => void;
      onLoaded: (request: XMLHttpRequest) => void;
    }
  ) {
    const request = new XMLHttpRequest()
    request.open(
      'POST',
      `https://api.github.com/repos/${this.owner}/${this.repo}/pulls`
    )
    this._setRequestHeader(request)

    request.onerror = (_err) => responseHandler.onError()
    request.onload = (event) => responseHandler.onLoaded(event.target as XMLHttpRequest)

    const body = {
      title: commitMessage || 'Update design tokens from Figma',
      head: headBranch,
      base: baseBranch,
      body: `## Design Token Update\n\nThis PR was automatically created by the Figma Design Tokens plugin.\n\n### Changes\n- Updated design tokens from Figma\n- Commit: ${commitMessage}\n\n**Note:** Please review the changes and run the transformation workflow before merging.`
    }

    request.send(JSON.stringify(body))
  }

  private _setRequestHeader(request: XMLHttpRequest) {
    request.setRequestHeader('Authorization', `Bearer ${this.token}`)
    request.setRequestHeader('Content-Type', 'application/json')
    request.setRequestHeader('Accept', 'application/vnd.github+json')
  }
}
