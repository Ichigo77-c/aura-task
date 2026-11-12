import { Plugin } from "@opencode/plugin"
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import * as path from "node:path"
import * as readline from "node:readline"

/**
 * One Brain — live room between OpenCode and Claude Code.
 *
 * The plugin talks to a long-lived Node daemon (.claude/sync/room-daemon.ts)
 * over JSON lines. The daemon owns the OpenCode side of .claude/sync/sync.db.
 */
type TaskEvent = {
  messageId: string
  taskId: string
  description: string
  context: Record<string, unknown>
  priority: string
  from: string
}

type RoomMessage = {
  messageId: string
  type: string
  from: string
  text: string
}

export default Plugin.define({
  id: "one-brain",
  async setup(ctx) {
    const root = ctx.location.directory
    const tsxCli = path.join(root, ".claude", "sync", "node_modules", "tsx", "dist", "cli.mjs")
    const daemonScript = path.join(root, ".claude", "sync", "room-daemon.ts")
    const nodeBin = process.env.ONE_BRAIN_NODE ?? "node"

    let child: ChildProcessWithoutNullStreams
    try {
      child = spawn(nodeBin, [tsxCli, daemonScript], {
        cwd: root,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, ONE_BRAIN_OPENCODE: "1" },
      })
    } catch (error) {
      console.error(`[one-brain] cannot start room daemon: ${error}`)
      return
    }

    let ready = false
    let stopped = false
    let lastSessionID: string | undefined
    const buffer: RoomMessage[] = []
    const taskQueue: TaskEvent[] = []
    const assistantPosted = new Map<string, string>()
    const inflight = new Map<string, (payload: any) => void>()
    let requestCounter = 0

    const send = (payload: Record<string, unknown>) => {
      if (stopped) return
      try {
        child.stdin.write(`${JSON.stringify(payload)}\n`)
      } catch (error) {
        console.error(`[one-brain] write failed: ${error}`)
      }
    }

    const request = (payload: Record<string, unknown>, timeoutMs = 4000): Promise<any> => {
      const reqId = `req_${++requestCounter}`
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          inflight.delete(reqId)
          resolve({ ok: false, error: "timeout" })
        }, timeoutMs)
        inflight.set(reqId, (response) => {
          clearTimeout(timer)
          inflight.delete(reqId)
          resolve(response)
        })
        send({ ...payload, reqId })
      })
    }

    const pickSession = async (): Promise<string | undefined> => {
      if (lastSessionID) return lastSessionID
      try {
        const page: any = await ctx.session.list({ directory: root, limit: 5 })
        const items = page?.items ?? page?.sessions ?? page?.data ?? []
        const first = items[0]
        return first?.id ?? first?.sessionID
      } catch {
        return undefined
      }
    }

    const deliverTasks = async () => {
      if (!ready) return
      while (taskQueue.length) {
        const task = taskQueue[0]
        const sessionID = await pickSession()
        if (!sessionID) return
        taskQueue.shift()
        try {
          await ctx.session.prompt({
            sessionID,
            text: [
              `<one-brain-task from="Claude Code">`,
              task.description,
              `Context: ${JSON.stringify(task.context)}`,
              `When the task is done, report it with the onebrain_send tool so Claude Code sees the result.`,
              `</one-brain-task>`,
            ].join("\n"),
            delivery: "queue",
          })
          send({ cmd: "ack", id: task.messageId })
        } catch (error) {
          taskQueue.unshift(task)
          send({ cmd: "nack", id: task.messageId })
          console.error(`[one-brain] task delivery failed: ${error}`)
          return
        }
      }
    }

    // Show peer chat in the session without scheduling an extra model turn.
    // If no session exists yet, keep it buffered for the next model call.
    const deliverChat = async (message: RoomMessage) => {
      const sessionID = await pickSession()
      if (!sessionID) {
        buffer.push(message)
        if (buffer.length > 50) buffer.splice(0, buffer.length - 50)
        return
      }
      try {
        await ctx.session.synthetic({
          sessionID,
          text: `[Claude Code] ${message.text}`,
          resume: false,
        })
        send({ cmd: "ack", id: message.messageId })
      } catch (error) {
        console.error(`[one-brain] synthetic delivery failed: ${error}`)
        buffer.push(message)
        if (buffer.length > 50) buffer.splice(0, buffer.length - 50)
      }
    }

    if (child.stderr) {
      readline.createInterface({ input: child.stderr }).on("line", (line) => {
        if (line.trim()) console.error(`[one-brain] ${line}`)
      })
    }

    if (child.stdout) {
      readline.createInterface({ input: child.stdout }).on("line", (line) => {
        const trimmed = line.trim()
        if (!trimmed) return
        let payload: any
        try {
          payload = JSON.parse(trimmed)
        } catch {
          return
        }

        if (payload.request) {
          const resolve = inflight.get(String(payload.reqId))
          resolve?.(payload)
          return
        }

        if (payload.event === "ready") {
          ready = true
          console.error(`[one-brain] room daemon ready (${payload.agentId})`)
          void deliverTasks()
          return
        }

        if (payload.event === "task") {
          taskQueue.push(payload as TaskEvent)
          void deliverTasks()
          return
        }

        if (payload.event === "message") {
          if (typeof payload.text === "string" && payload.text.trim()) {
            void deliverChat({
              messageId: String(payload.messageId),
              type: String(payload.type),
              from: String(payload.from),
              text: payload.text,
            })
          } else {
            send({ cmd: "ack", id: String(payload.messageId) })
          }
          return
        }

        if (payload.event === "error") {
          console.error(`[one-brain] daemon error: ${payload.error}`)
        }
      })
    }

    child.on("exit", (code) => {
      ready = false
      if (!stopped) console.error(`[one-brain] room daemon exited with code ${code}`)
    })

    child.on("error", (error) => {
      console.error(`[one-brain] room daemon error: ${error.message}`)
    })

    // Forward user prompts to Claude Code.
    await ctx.session.hook("prompt", async (event: any) => {
      const sessionID = event?.sessionID
      if (sessionID) lastSessionID = String(sessionID)
      const text = typeof event?.prompt?.text === "string" ? event.prompt.text.trim() : ""
      if (!text || text.startsWith("/")) return
      await request({ cmd: "say", text: text.slice(0, 12000), meta: { sessionID: lastSessionID } })
      void deliverTasks()
    })

    // Inject unread peer messages into the next model call.
    await ctx.session.hook("context", (event: any) => {
      if (!buffer.length) return
      const lines = buffer
        .map((message) => `[${message.type} from ${message.from.slice(0, 8)}]\n${message.text.slice(0, 4000)}`)
        .join("\n\n")
      event.system.push({
        type: "text",
        text: `<one-brain-room>\nNew messages from Claude Code in the shared room:\n\n${lines}\n\nReply with the onebrain_send tool (or just answer normally — your final answer is shared automatically).\n</one-brain-room>`,
      })
      for (const message of buffer) send({ cmd: "ack", id: message.messageId })
      buffer.length = 0
    })

    // When a session goes idle, share its final assistant answer with Claude.
    const controller = new AbortController()
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({
          types: ["session.idle"],
          signal: controller.signal,
        })) {
          const sessionID = (event as any)?.data?.sessionID
          if (!sessionID || !ready) continue
          try {
            const messages: any = await ctx.session.context({ sessionID })
            const last = findLastAssistant(Array.isArray(messages) ? messages : [])
            if (!last) continue
            if (assistantPosted.get(String(sessionID)) === last.id) continue
            assistantPosted.set(String(sessionID), last.id)
            await request({
              cmd: "say",
              text: last.text.slice(0, 12000),
              dedupeKey: `opencode:assistant:${sessionID}:${last.id}`,
            })
          } catch (error) {
            console.error(`[one-brain] idle sync failed: ${error}`)
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) console.error(`[one-brain] event subscription failed: ${error}`)
      }
    })()

    await ctx.tool.transform((editor) => {
      editor.namespace({
        name: "onebrain",
        description: "Shared One Brain room with Claude Code",
      })

      editor.add({
        name: "send",
        description: "Send a message to Claude Code in the shared One Brain room.",
        input: {
          type: "object",
          properties: {
            text: { type: "string", description: "Message to send to Claude Code." },
          },
          required: ["text"],
          additionalProperties: false,
        },
        execute: async (input: any) => {
          const response = await request({ cmd: "say", text: String(input?.text ?? "") })
          return {
            content: response.ok
              ? "Message sent to Claude Code."
              : `Failed to send: ${response.error}`,
          }
        },
      })

      editor.add({
        name: "inbox",
        description: "Read unread messages from Claude Code in the shared room.",
        input: { type: "object", properties: {}, additionalProperties: false },
        execute: async () => {
          const response = await request({ cmd: "inbox" })
          const messages: any[] = Array.isArray(response.messages) ? response.messages : []
          if (!messages.length) return { content: "No unread messages from Claude Code." }
          return {
            content: messages
              .map((message) => `[${message.type} from Claude Code]\n${message.text}`)
              .join("\n\n"),
          }
        },
      })

      editor.add({
        name: "status",
        description: "Check that the One Brain room is connected.",
        input: { type: "object", properties: {}, additionalProperties: false },
        execute: async () => ({
          content: ready
            ? "One Brain room is connected: Claude Code and OpenCode share .claude/sync/sync.db."
            : "One Brain room daemon is not ready yet.",
        }),
      })
    })

    return () => {
      stopped = true
      controller.abort()
      try {
        send({ cmd: "shutdown" })
      } catch {}
      setTimeout(() => {
        try {
          child.kill()
        } catch {}
      }, 300)
    }
  },
})

function findLastAssistant(messages: any[]): { id: string; text: string } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    const info = message?.info ?? message?.message ?? message
    const role = info?.role ?? message?.role
    if (role !== "assistant") continue
    const parts = message?.parts ?? info?.content ?? info?.parts ?? []
    if (!Array.isArray(parts)) continue
    const text = parts
      .filter((part: any) => part && part.type === "text" && typeof part.text === "string")
      .map((part: any) => part.text)
      .join("\n")
      .trim()
    if (!text) continue
    return { id: String(info?.id ?? message?.id ?? `idx${i}`), text }
  }
  return null
}
