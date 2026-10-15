import * as React from "react"
import { ArrowLeftIcon, ArrowRightIcon, TerminalIcon } from "lucide-react"
import Markdown from "react-markdown"
import { Link, NavLink, Navigate, Outlet, useLocation, useParams } from "react-router-dom"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { CodeBlock, CopyButton, highlight } from "@/site/code"
import { ComponentPreview, ComponentSource } from "@/site/component-preview"
import { agents, components, docs, ordered, pages, resolveHref, urlOf, type Block, type Page } from "@/site/pages"
import { WIDGETS } from "@/site/widgets"

/* ---- The column of names down the left ---------------------------------- */

function SidebarGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-6 first:pt-0">
      <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

function SidebarLink({ to, end, children }: { to: string; end?: boolean; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "relative flex h-[30px] w-fit items-center rounded-md px-2 text-[0.8rem] font-medium text-foreground/90 outline-none hover:bg-accent focus-visible:bg-accent",
          isActive && "glass-chosen text-foreground"
        )
      }
    >
      {children}
    </NavLink>
  )
}

export function DocsLayout() {
  return (
    <div className="container-wrapper flex flex-1 flex-col px-2">
      <div className="min-h-min flex-1 items-start px-0 [--sidebar-width:calc(var(--spacing)*72)] [--top-spacing:0] lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] lg:[--top-spacing:calc(var(--spacing)*4)]">
        <aside className="sticky top-[calc(var(--header-height)+0.6rem)] z-30 hidden h-[calc(100svh-10rem)] overscroll-none lg:flex">
          <div className="no-scrollbar w-(--sidebar-width) overflow-y-auto px-2 pt-(--top-spacing) pb-12 [mask-image:linear-gradient(to_bottom,black_calc(100%-3rem),transparent)]">
            <SidebarGroup label="Sections">
              {docs.map((page) => (
                <SidebarLink key={page.slug} to={urlOf(page)} end>
                  {page.title}
                </SidebarLink>
              ))}
              <SidebarLink to="/docs/components" end>
                Components
              </SidebarLink>
            </SidebarGroup>
            <SidebarGroup label="Components">
              {components.map((page) => (
                <SidebarLink key={page.slug} to={urlOf(page)}>
                  {page.title}
                </SidebarLink>
              ))}
            </SidebarGroup>
            <SidebarGroup label="Agents">
              {agents.map((page) => (
                <SidebarLink key={page.slug} to={urlOf(page)}>
                  {page.title}
                </SidebarLink>
              ))}
            </SidebarGroup>
          </div>
        </aside>
        <div className="h-full w-full">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

/* ---- What a page is made of ---------------------------------------------- */

const inlineCode = "relative rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-[0.8rem] break-words outline-none"
const linkClass = "font-medium underline underline-offset-4"

function Prose({ children }: { children: string }) {
  const { search } = useLocation()
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: (props) => <p className="leading-relaxed [&:not(:first-child)]:mt-6" {...props} />,
        a: ({ href = "", children: label }) => {
          const target = resolveHref(href)
          return target.to ? (
            <Link to={target.to.startsWith("#") ? { search, hash: target.to } : target.to} className={linkClass}>
              {label}
            </Link>
          ) : (
            <a href={target.href} target="_blank" rel="noreferrer" className={linkClass}>
              {label}
            </a>
          )
        },
        code: (props) => <code className={inlineCode} {...props} />,
        ul: (props) => <ul className="my-6 ml-6 list-disc" {...props} />,
        ol: (props) => <ol className="my-6 ml-6 list-decimal" {...props} />,
        li: (props) => <li className="mt-2" {...props} />,
        strong: (props) => <strong className="font-medium" {...props} />,
        table: (props) => (
          <div className="no-scrollbar my-6 w-full overflow-y-auto rounded-xl border">
            <table className="relative w-full overflow-hidden border-none text-sm [&_tbody_tr:last-child]:border-b-0" {...props} />
          </div>
        ),
        tr: (props) => <tr className="m-0 border-b" {...props} />,
        th: (props) => <th className="px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right" {...props} />,
        td: (props) => <td className="px-4 py-2 text-left whitespace-nowrap [&[align=center]]:text-center [&[align=right]]:text-right" {...props} />,
      }}
    >
      {children}
    </Markdown>
  )
}

const MANAGERS = {
  pnpm: (command: string) => command.replace(/^npx /, "pnpm dlx ").replace(/^npm install /, "pnpm add "),
  npm: (command: string) => command,
  yarn: (command: string) => command.replace(/^npx /, "yarn dlx ").replace(/^npm install /, "yarn add "),
  bun: (command: string) => command.replace(/^npx /, "bunx --bun ").replace(/^npm install /, "bun add "),
}
type Manager = keyof typeof MANAGERS
const ManagerContext = React.createContext<[Manager, (next: Manager) => void]>(["pnpm", () => {}])

/** One command, said for whichever package manager the reader uses; the choice is kept across the site. */
function CommandBlock({ command }: { command: string }) {
  const [manager, setManager] = React.useContext(ManagerContext)
  const text = MANAGERS[manager](command.replace("{origin}", window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "")))
  return (
    <div className="relative my-6 overflow-hidden rounded-xl bg-code">
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-1">
        <div className="flex size-4 items-center justify-center rounded-[1px] bg-foreground opacity-70">
          <TerminalIcon className="size-3 text-background" />
        </div>
        <div className="flex gap-0.5">
          {(Object.keys(MANAGERS) as Manager[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={key === manager}
              onClick={() => setManager(key)}
              className={cn(
                "h-7 rounded-md px-2 font-mono text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground",
                key === manager && "glass-chosen text-foreground"
              )}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      <CopyButton value={text} className="top-2" />
      <pre className="md-code no-scrollbar overflow-x-auto px-4 py-3.5 font-mono text-[13px]">
        <code dangerouslySetInnerHTML={{ __html: highlight(text, "bash") }} />
      </pre>
    </div>
  )
}

function Step({ children }: { children: string }) {
  return (
    <h3 className="step mt-8 scroll-m-28 text-[0.95rem] font-medium tracking-tight [counter-increment:step] before:absolute before:-ml-[42px] before:-mt-px before:flex before:size-7 before:items-center before:justify-center before:rounded-full before:bg-muted before:font-mono before:text-xs before:font-medium before:text-muted-foreground before:content-[counter(step)]">
      {children}
    </h3>
  )
}

/** How to install: the command, or by hand. An underlined pair of tabs, as on ui.shadcn.com. */
function Install({ block }: { block: Extract<Block, { type: "install" }> }) {
  const [tab, setTab] = React.useState<"cli" | "manual">("cli")
  return (
    <div className="mt-6">
      <div role="tablist" className="flex gap-4 border-b">
        {(["cli", "manual"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={key === tab}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px border-b-2 border-transparent px-0 pb-2.5 text-base font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground",
              key === tab && "border-foreground text-foreground"
            )}
          >
            {key === "cli" ? "Command" : "Manual"}
          </button>
        ))}
      </div>
      {tab === "cli" ? (
        block.cli && <CommandBlock command={block.cli} />
      ) : (
        <div className="ml-3.5 border-l pb-1 pl-7 [counter-reset:step]">
          {block.packages && (
            <>
              <Step>Install the following dependencies:</Step>
              <CommandBlock command={block.packages} />
            </>
          )}
          <Step>Copy and paste the following code into your project.</Step>
          {block.source && <ComponentSource name={block.source} />}
          <Step>Update the import paths to match your project setup.</Step>
        </div>
      )}
    </div>
  )
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return block.depth === 2 ? (
              <h2 key={index} id={block.id} className="mt-10 scroll-m-28 text-xl font-medium tracking-tight first:mt-0 lg:mt-12 [&+p]:mt-4!">
                <a href={`#${block.id}`}>{block.text}</a>
              </h2>
            ) : (
              <h3 key={index} id={block.id} className="mt-12 scroll-m-28 text-lg font-medium tracking-tight [&+p]:mt-4!">
                <a href={`#${block.id}`}>{block.text.replace(/`/g, "")}</a>
              </h3>
            )
          case "md":
            return <Prose key={index}>{block.text}</Prose>
          case "code":
            return block.lang === "bash" && /^(npx|npm install) /.test(block.code) && !block.code.includes("\n") ? (
              <CommandBlock key={index} command={block.code} />
            ) : (
              <CodeBlock key={index} code={block.code} lang={block.lang} title={block.title} />
            )
          case "preview":
            return <ComponentPreview key={index} name={block.name} align={block.align} className={block.className} wrapperClassName={block.wrapperClassName} hideCode={block.hideCode} />
          case "install":
            return <Install key={index} block={block} />
          case "source":
            return block.name ? <ComponentSource key={index} name={block.name} title={block.title} /> : null
          case "widget": {
            const Widget = block.name ? WIDGETS[block.name] : undefined
            return Widget ? <Widget key={index} /> : null
          }
          case "callout":
            return (
              <div key={index} className="mt-6 rounded-xl border bg-surface px-4 py-3 text-sm text-foreground/90 [&_p]:mt-0!">
                <Prose>{block.text}</Prose>
              </div>
            )
          case "step":
            return (
              <p key={index} className="mt-6 font-medium">
                {block.text}
              </p>
            )
        }
      })}
    </>
  )
}

/* ---- On This Page -------------------------------------------------------- */

function TableOfContents({ page }: { page: Page }) {
  const headings = page.blocks.filter((block): block is Extract<Block, { type: "heading" }> => block.type === "heading" && block.depth <= 3)
  const [active, setActive] = React.useState<string | null>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
      },
      { rootMargin: "0% 0% -80% 0%" }
    )
    for (const heading of headings) {
      const element = document.getElementById(heading.id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [headings])

  if (!headings.length) return null
  return (
    <div className="flex flex-col gap-2 p-4 pt-0 text-sm">
      <p className="sticky top-0 h-6 bg-background text-xs font-medium text-muted-foreground">On This Page</p>
      {headings.map((heading) => (
        <a
          key={heading.id}
          href={`#${heading.id}`}
          data-active={heading.id === active}
          data-depth={heading.depth}
          className="text-[0.8rem] text-muted-foreground no-underline transition-colors hover:text-foreground data-[active=true]:font-medium data-[active=true]:text-foreground data-[depth=3]:pl-4"
        >
          {heading.text.replace(/`/g, "")}
        </a>
      ))}
    </div>
  )
}

/* ---- A page -------------------------------------------------------------- */

function Neighbours({ url, labelled }: { url: string; labelled?: boolean }) {
  const at = ordered.findIndex((entry) => entry.url === url)
  const [previous, next] = [ordered[at - 1], ordered[at + 1]]
  const cls = labelled ? buttonVariants({ variant: "secondary", size: "sm" }) : cn(buttonVariants({ variant: "secondary", size: "icon" }), "size-7")
  return (
    <>
      {previous && (
        <Link to={previous.url} data-slot="button" data-variant="secondary" className={cls}>
          <ArrowLeftIcon /> {labelled ? previous.title : <span className="sr-only">Previous</span>}
        </Link>
      )}
      {next && (
        <Link to={next.url} data-slot="button" data-variant="secondary" className={cn(cls, labelled && "ml-auto")}>
          {labelled ? next.title : <span className="sr-only">Next</span>} <ArrowRightIcon />
        </Link>
      )}
    </>
  )
}

function DocShell({ title, description, url, toc, children }: { title: string; description: string; url: string; toc?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div data-slot="docs" className="flex scroll-mt-24 items-stretch pb-8 text-[1.05rem] sm:text-[15px] xl:w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-(--top-spacing) shrink-0" />
        <div className="mx-auto flex w-full max-w-160 min-w-0 flex-1 flex-col gap-6 px-4 py-6 text-foreground md:px-0 lg:py-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between md:items-start">
              <h1 className="scroll-m-24 text-3xl font-semibold tracking-tight">{title}</h1>
              <div className="ml-auto flex gap-2">
                <Neighbours url={url} />
              </div>
            </div>
            {description && <p className="text-[1.05rem] text-muted-foreground sm:text-base sm:text-balance md:max-w-[80%]">{description}</p>}
          </div>
          <div className="w-full flex-1 pb-16 sm:pb-0">{children}</div>
          <div className="hidden h-16 w-full items-center gap-2 px-4 sm:flex sm:px-0">
            <Neighbours url={url} labelled />
          </div>
        </div>
      </div>
      <div className="sticky top-[calc(var(--header-height)+1px)] z-30 ml-auto hidden h-[90svh] w-(--sidebar-width) flex-col gap-4 overflow-hidden overscroll-none pb-8 xl:flex">
        <div className="h-(--top-spacing) shrink-0" />
        <div className="no-scrollbar flex flex-col gap-8 overflow-y-auto px-8">{toc}</div>
      </div>
    </div>
  )
}

export function DocPage({ section }: { section: "docs" | "components" }) {
  const { slug = "introduction" } = useParams()
  const { hash } = useLocation()
  const page = pages.find((entry) => entry.slug === slug && (section === "docs" ? entry.section === "docs" : entry.section !== "docs"))
  const manager = React.useState<Manager>("pnpm")

  // A link to a heading lands on it once the page is there.
  React.useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [hash, page])

  if (!page) return <Navigate to="/docs/components" replace />
  return (
    // Keyed by the page, so one page's open code and running demos do not carry into the next.
    <ManagerContext.Provider value={manager}>
      <DocShell key={page.slug} title={page.title} description={page.description} url={urlOf(page)} toc={<TableOfContents page={page} />}>
        <Blocks blocks={page.blocks} />
      </DocShell>
    </ManagerContext.Provider>
  )
}

function ComponentGrid({ list }: { list: Page[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-x-8 lg:gap-x-16 lg:gap-y-6 xl:gap-x-20">
      {list.map((page) => (
        <Link key={page.slug} to={urlOf(page)} className="inline-flex items-center gap-2 text-lg font-medium underline-offset-4 hover:underline md:text-base">
          {page.title}
        </Link>
      ))}
    </div>
  )
}

export function ComponentsIndex() {
  return (
    <DocShell
      title="Components"
      description="Here you can find all the components available in the library, each one in Solid Glass."
      url="/docs/components"
    >
      <h2 id="all-components" className="mt-10 mb-6 scroll-m-28 text-xl font-medium tracking-tight first:mt-0">
        All Components
      </h2>
      <ComponentGrid list={components} />
      <h2 id="agents" className="mt-12 mb-2 scroll-m-28 text-xl font-medium tracking-tight">
        Agents
      </h2>
      <p className="mb-6 text-muted-foreground">A few more, for interfaces where an agent works while someone watches.</p>
      <ComponentGrid list={agents} />
    </DocShell>
  )
}
