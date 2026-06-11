/**
 * GitHub integration utilities.
 *
 * Uses the GitHub REST API (v3) with a Personal Access Token (PAT)
 * stored in GITHUB_TOKEN env var.
 */

const GITHUB_API = "https://api.github.com"

function getToken(): string {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error("GITHUB_TOKEN is not configured")
  return token
}

/**
 * Parse an owner/repo string like "myorg/myrepo".
 */
export function parseRepo(repo: string): { owner: string; repo: string } {
  const parts = repo.split("/")
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repo format "${repo}". Expected "owner/repo".`)
  }
  return { owner: parts[0], repo: parts[1] }
}

/**
 * Slugify a branch name:
 *  - lowercase
 *  - replace spaces/underscores/slashes with hyphens
 *  - strip any characters that are not alphanumeric or hyphens
 *  - collapse consecutive hyphens
 *  - truncate to 100 chars
 */
export function slugifyBranchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s/_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100)
}

/**
 * Get the SHA of the default branch (used as the base for new branches).
 */
async function getDefaultBranchSha(owner: string, repo: string): Promise<string> {
  const token = getToken()

  const repoRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })

  if (!repoRes.ok) {
    const body = await repoRes.json().catch(() => ({}))
    throw new Error(`Failed to fetch repo info: ${body.message || repoRes.statusText}`)
  }

  const repoData = await repoRes.json()
  const defaultBranch: string = repoData.default_branch

  const refRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  )

  if (!refRes.ok) {
    const body = await refRes.json().catch(() => ({}))
    throw new Error(`Failed to fetch default branch ref: ${body.message || refRes.statusText}`)
  }

  const refData = await refRes.json()
  return refData.object.sha as string
}

/**
 * Create a new branch in the given repo off the default branch.
 * Returns the branch name (which may have been suffixed to avoid conflicts).
 */
export async function createGithubBranch(
  repoString: string,
  branchName: string
): Promise<{ branchName: string; url: string }> {
  const token = getToken()
  const { owner, repo } = parseRepo(repoString)
  const sha = await getDefaultBranchSha(owner, repo)

  // Try to create the branch; if it already exists, append a timestamp.
  let finalName = branchName
  let attempt = 0

  while (attempt < 3) {
    const name = attempt === 0 ? finalName : `${branchName}-${Date.now()}`
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: `refs/heads/${name}`, sha }),
    })

    if (res.ok) {
      finalName = name
      break
    }

    const body = await res.json().catch(() => ({}))

    // 422 = "Reference already exists"
    if (res.status === 422) {
      attempt++
      continue
    }

    throw new Error(`Failed to create branch: ${body.message || res.statusText}`)
  }

  const url = `https://github.com/${owner}/${repo}/tree/${finalName}`
  return { branchName: finalName, url }
}

/**
 * Validate that a GitHub webhook signature (SHA-256 HMAC) matches the secret.
 * Call this inside your webhook handler to verify requests are from GitHub.
 */
export async function verifyGithubWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body))
  const hexSig = "sha256=" + Buffer.from(sig).toString("hex")

  // Constant-time comparison
  if (hexSig.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < hexSig.length; i++) {
    diff |= hexSig.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return diff === 0
}
