"use client"

import DOMPurify from "dompurify"
import { useMemo, useSyncExternalStore } from "react"

const subscribe = () => () => {}

/**
 * Renders user-authored rich text (TipTap HTML) after sanitizing it with DOMPurify.
 * The vault decrypts secrets in this same origin, so raw HTML is never injected
 * unsanitized. Sanitizing needs a DOM, so nothing is rendered during SSR.
 */
export function SafeHtml({ html, className }: { html: string; className?: string }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false)
  const clean = useMemo(
    () => (isClient ? DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ["style", "form"], FORBID_ATTR: ["style"] }) : ""),
    [html, isClient]
  )
  // eslint-disable-next-line react/no-danger, no-restricted-syntax -- sanitized by DOMPurify above
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />
}
