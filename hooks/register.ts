import type { Register } from 'claude-code'

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']

// Each prompt is cut to PROMPT_CHARS; the whole sample stays under MAX_CHARS (about 6k tokens).
const PROMPT_CHARS = 300
const MAX_CHARS = 24000

const PROMPT = `Give a Claude Code session a label for a list of open sessions. Below are the person's prompts from the whole session, oldest first.
Reply with one line and nothing else: <name> <color>
- name: 2 to 4 lowercase words joined by dashes that name the main task of the whole session, for example my-new-feature.
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
    const prompts = (await $.session.messages())
      .filter(m => m.role === 'user' && m.text.trim())
      .map(m => m.text.trim().slice(0, PROMPT_CHARS))
    if (prompts.length === 0) return { text: 'No label: no prompts yet' }

    // Keep every step-th prompt, so a long session is sampled from its start to its end.
    let sample = prompts
    for (let step = 2; sample.join('\n').length > MAX_CHARS; step++) {
      sample = prompts.filter((_, i) => i % step === 0)
    }

    const reply = await $.model.complete({
      model: 'haiku',
      prompt: `${PROMPT}\n\n${sample.join('\n')}`
    })
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
