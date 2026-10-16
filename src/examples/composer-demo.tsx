"use client"

import * as React from "react"
import { BookOpenCheckIcon, Link2Icon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Composer, ComposerFooter, ComposerFooterEnd, ComposerPick } from "@/components/ui/composer"
import { ContextRing } from "@/components/ui/context-ring"
import { Tag } from "@/components/ui/tag"

const MODES = [
  { value: "ask", label: "Ask first", hint: "Stops and waits wherever the decision is yours." },
  { value: "auto", label: "Autonomous", hint: "Finishes a step, picks the next, and goes on until it needs you." },
]
const MODELS = [
  { value: "opus", label: "opus-5.5" },
  { value: "sonnet", label: "sonnet-5.5" },
]
const EFFORTS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
]

export default function ComposerDemo() {
  const [text, setText] = React.useState("")
  const [tags, setTags] = React.useState(["Check references", "sources.md"])
  // Backspace at the very start of the text reaches the tag before it: the
  // first press picks it out, the second removes it.
  const [armed, setArmed] = React.useState(false)
  const [mode, setMode] = React.useState("ask")
  const [model, setModel] = React.useState("opus")
  const [effort, setEffort] = React.useState("high")

  return (
    <div className="w-full max-w-lg">
      <Composer
        textareaProps={{ "aria-label": "Message" }}
        value={text}
        onValueChange={(value) => {
          setText(value)
          setArmed(false)
        }}
        onSubmit={() => setText("")}
        placeholder="Keep going, or change direction…"
        onBackspaceAtStart={() => {
          if (!tags.length) return false
          if (!armed) setArmed(true)
          else {
            setTags((current) => current.slice(0, -1))
            setArmed(false)
          }
          return true
        }}
        leading={
          <Button variant="ghost" size="icon" aria-label="Add" className="shrink-0 text-muted-foreground hover:text-foreground">
            <PlusIcon className="size-4.5" />
          </Button>
        }
        tags={
          tags.length > 0 &&
          tags.map((tag, index) => (
            <Tag
              key={tag}
              className="mb-0.5"
              icon={tag.includes(".") ? <Link2Icon /> : <BookOpenCheckIcon />}
              armed={armed && index === tags.length - 1}
              onRemove={() => setTags((current) => current.filter((entry) => entry !== tag))}
            >
              {tag}
            </Tag>
          ))
        }
      />
      <ComposerFooter>
        <ComposerPick label="Mode" align="start" value={mode} options={MODES} onValueChange={setMode} />
        <ComposerFooterEnd>
          <ComposerPick label="Model" value={model} options={MODELS} onValueChange={setModel} />
          <ComposerPick
            label="Effort"
            value={effort}
            options={EFFORTS}
            onValueChange={setEffort}
            shown={`Effort · ${EFFORTS.find((entry) => entry.value === effort)?.label}`}
          />
          <ContextRing used={86_300} window={200_000} />
        </ComposerFooterEnd>
      </ComposerFooter>
    </div>
  )
}
