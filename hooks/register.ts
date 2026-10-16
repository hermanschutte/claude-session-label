import type { Register } from 'claude-code'

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']

const PROMPT = `Give this session a label for a list of open sessions. Do not use tools.
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
    const reply = await $.model.fork({ prompt: PROMPT })
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
