import * as React from "react"
import { useSearchParams } from "react-router-dom"

import Blocks from "@/create/blocks"
import { CreateContext, decode, encode, fontFamily, loadFont, overrides, shared, theme as themed, wash, type Mode, type Options } from "@/create/options"
import { Wall } from "@/home/wall"
import { useTheme } from "@/site/theme"

type View = "01" | "02"
type PreviewState = { preset: string; mode: Mode; view: View }
const UPDATE = "solid-glass:preview-update"
const READY = "solid-glass:preview-ready"

/** A document of its own lets stock components portal to body and still wear the chosen look. */
export function PreviewFrame({ options, mode, view }: { options: Options; mode: Mode; view: View }) {
  const frame = React.useRef<HTMLIFrameElement>(null)
  const current = React.useRef<PreviewState>({ preset: encode(options), mode, view })
  current.current = { preset: encode(options), mode, view }
  // Keep the address stable: changing a dial should not reload the frame or close a running demo.
  const [address] = React.useState(() => `${import.meta.env.BASE_URL}create/preview?${new URLSearchParams({ preset: encode(options), theme: mode, view })}`)
  const sync = React.useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: UPDATE, ...current.current }, window.location.origin)
  }, [])

  React.useEffect(sync, [options, mode, view, sync])
  React.useEffect(() => {
    const ready = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === READY) sync()
    }
    window.addEventListener("message", ready)
    return () => window.removeEventListener("message", ready)
  }, [sync])

  return <iframe ref={frame} src={address} title="Your Solid Glass preview" onLoad={sync} className="h-full w-full border-0" />
}

/** The frame can also be opened directly; its address contains everything needed for its first paint. */
export function PreviewDocument() {
  const [params] = useSearchParams()
  const [preset, setPreset] = React.useState(params.get("preset"))
  const [view, setView] = React.useState<View>(params.get("view") === "02" ? "02" : "01")
  const options = React.useMemo(() => decode(preset), [preset])
  const { theme, setTheme } = useTheme()

  React.useEffect(() => {
    const update = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== UPDATE) return
      const { preset: next, mode, view: nextView } = event.data
      if (typeof next !== "string" || (mode !== "light" && mode !== "dark") || (nextView !== "01" && nextView !== "02")) return
      setPreset(next)
      setView(nextView)
      // An initial ?theme override is for this visit; merely syncing a preset must not save it.
      if (mode !== (document.documentElement.classList.contains("dark") ? "dark" : "light")) setTheme(mode)
    }
    window.addEventListener("message", update)
    // React's lazy route may mount after the iframe's load event: ask again once the listener exists.
    if (window.parent !== window) window.parent.postMessage({ type: READY }, window.location.origin)
    return () => window.removeEventListener("message", update)
  }, [setTheme])

  React.useEffect(() => {
    loadFont(options.font)
    loadFont(options.heading)
  }, [options.font, options.heading])

  const variables = {
    ...shared(options),
    ...overrides(options, theme),
    ...themed(options),
    "--create-heading": fontFamily(options.heading),
    "--create-accent": wash(options, theme),
  }
  // An unset custom property must stay absent so var() can use its fallback;
  // the literal word "undefined" would instead invalidate the resulting colour.
  const declarations = Object.entries(variables)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value};`).join(" ")

  return (
    <CreateContext.Provider value={options}>
      <style>{`:root { ${declarations} } body { font-family: ${fontFamily(options.font)}; }`}</style>
      <div data-create-preview>{view === "01" ? <Blocks /> : <Wall full />}</div>
    </CreateContext.Provider>
  )
}
