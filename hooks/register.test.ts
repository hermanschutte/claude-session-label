import { test, expect, mock } from 'claude-code/testing'

const usage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0
}

const label = {
  command: 'label',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 }
} as const

test('/label renames and colors the session from the fork reply', async ($, on) => {
  const clock = mock.clock(on)
  const ran: string[] = []
  on('model.fork', () => ({ value: { isAnswered: true as const, text: 'fix-login-redirect red\n', usage } }))
  on('command.run', { command: 'rename' }, (_$, e) => {
    ran.push(`rename ${e.args}`)
    return { text: '' }
  })
  on('command.run', { command: 'color' }, (_$, e) => {
    ran.push(`color ${e.args}`)
    return { text: '' }
  })

  const out = await $.command.run(label)
  await clock.advance(1)

  expect(out.text).toBe('Label: fix-login-redirect (red)')
  expect(ran).toEqual(['rename fix-login-redirect', 'color red'])
})

test('/label changes nothing on a bad reply', async ($, on) => {
  const clock = mock.clock(on)
  const ran: string[] = []
  on('model.fork', () => ({ value: { isAnswered: true as const, text: 'Sure! Here is a name: Login Fix', usage } }))
  on('command.run', { command: 'rename' }, () => {
    ran.push('rename')
    return { text: '' }
  })
  on('command.run', { command: 'color' }, () => {
    ran.push('color')
    return { text: '' }
  })

  const out = await $.command.run(label)
  await clock.advance(1)

  expect(out.text).toMatch(/^No label: unexpected reply/)
  expect(ran).toEqual([])
})

test('/label says why when there is nothing to fork', async ($, on) => {
  on('model.fork', () => ({ value: { isAnswered: false as const, reason: 'nothing-to-fork' as const } }))

  const out = await $.command.run(label)

  expect(out.text).toBe('No label: nothing-to-fork')
})
