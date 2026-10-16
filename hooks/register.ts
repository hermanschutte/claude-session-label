import type { Register } from 'claude-code'

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']

// A compacted session holds a summary of its earlier part, which starts with this text (Claude Code's own).
const SUMMARY_START = 'This session is being continued from a previous conversation'
// The latest summary is kept up to SUMMARY_CHARS; each prompt is cut to PROMPT_CHARS and
// the prompts stay under PROMPTS_CHARS. Together about 6k tokens.
const SUMMARY_CHARS = 16000
const PROMPT_CHARS = 300
const PROMPTS_CHARS = 8000

const PROMPT = `Give a Claude Code session a label for a list of open sessions.
Below is a summary of the earlier part of the session when it was compacted, then the person's prompts, oldest first.
Name the main task of the whole session, not only the latest task.
Reply with one line and nothing else: <name> <color>
- name: 2 to 4 lowercase words joined by dashes that name the main task, for example my-new-feature.
- color: pick by the kind of work. red: bug, error or incident. green: new feature. blue: research or a question. yellow: writing, docs or email. purple: marketing or SEO. orange: infrastructure, deploy or config. pink: UI or design. cyan: data or analytics.`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'label',
      description: 'Names and colors this session from its work'
    })
    return next(e)
  })

  on('command.run', { command: 'label' }, async $ => {
    const texts = (await $.session.messages())
      .filter(m => m.role === 'user' && m.text.trim())
      .map(m => m.text.trim())
    const summary = texts.filter(t => t.startsWith(SUMMARY_START)).pop()
    const prompts = texts
      .filter(t => !t.startsWith(SUMMARY_START))
      .map(t => t.slice(0, PROMPT_CHARS))
    if (!summary && prompts.length === 0) return { text: 'No label: no prompts yet' }

    // Keep every step-th prompt, so a long session is sampled from its start to its end.
    let sample = prompts
    for (let step = 2; sample.join('\n').length > PROMPTS_CHARS; step++) {
      sample = prompts.filter((_, i) => i % step === 0)
    }

    const parts = [PROMPT]
    if (summary) parts.push(`Summary of the earlier part:\n${summary.slice(0, SUMMARY_CHARS)}`)
    parts.push(`Prompts:\n${sample.join('\n')}`)
    const reply = await $.model.complete({ model: 'haiku', prompt: parts.join('\n\n') })
    if (!reply.isAnswered) return { text: `No label: ${reply.reason}` }
    const [name, color] = reply.text.trim().split(/\s+/)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name ?? '') || !COLORS.includes(color ?? '')) {
      return { text: `No label: unexpected reply "${reply.text.trim()}"` }
    }
    // The host refuses $.command.run inside a command.run hook, so run them once this hook is done.
    $.clock.after(0, () => {
      void $.command.run({ command: 'rename', args: name }).then(() =>
        $.command.run({ command: 'color', args: color })
      )
    })
    return { text: `Label: ${name} (${color})` }
  })
}
