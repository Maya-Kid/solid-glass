"use client"

import * as React from "react"

import { Composer } from "@/components/ui/composer"

export default function ComposerRunning() {
  const [text, setText] = React.useState("")
  return (
    <Composer
      textareaProps={{ "aria-label": "Next message" }}
      className="w-full max-w-lg"
      value={text}
      onValueChange={setText}
      onSubmit={() => setText("")}
      onStop={() => {}}
      running
      placeholder="A turn is running. You can still write the next thing…"
    />
  )
}
