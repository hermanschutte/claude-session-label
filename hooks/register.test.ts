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

const user = (text: string) => ({ role: 'user' as const, text, toolUses: [] })
const assistant = (text: string) => ({ role: 'assistant' as const, text, toolUses: [] })

test('/label sends the prompts to haiku, then renames and colors', async ($, on) => {
  const clock = mock.clock(on)
  const ran: string[] = []
  const sent: { model: string; prompt: string }[] = []
  on('session.messages', () => ({
    value: [user('Fix the login redirect loop'), assistant('Looking at it.'), user('')]
  }))
  on('model.complete', (_$, e) => {
    sent.push({ model: e.model, prompt: e.prompt })
    return { value: { isAnswered: true as const, text: 'fix-login-redirect red\n', usage } }
  })
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
  expect(sent[0]?.model).toBe('haiku')
  expect(sent[0]?.prompt.endsWith('\n\nFix the login redirect loop')).toBe(true)
})

test('/label samples a long session from start to end under the cap', async ($, on) => {
  const prompts = Array.from({ length: 400 }, (_, i) => `prompt ${i} `.padEnd(400, 'x'))
  let sent = ''
  on('session.messages', () => ({ value: prompts.map(user) }))
  on('model.complete', (_$, e) => {
    sent = e.prompt
    return { value: { isAnswered: false as const, reason: 'empty-reply' as const, usage } }
  })

  await $.command.run(label)

  const sample = sent.split('\n\n').pop() ?? ''
  expect(sample.length).toBeLessThanOrEqual(24000)
  expect(sample.startsWith('prompt 0 ')).toBe(true)
  expect(sample).toContain('prompt 396 ')
  expect(sample.split('\n').every(p => p.length === 300)).toBe(true)
})

test('/label changes nothing on a bad reply', async ($, on) => {
  const clock = mock.clock(on)
  const ran: string[] = []
  on('session.messages', () => ({ value: [user('Fix the login redirect loop')] }))
  on('model.complete', () => ({
    value: { isAnswered: true as const, text: 'Sure! Here is a name: Login Fix', usage }
  }))
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

test('/label says so when there are no prompts yet', async ($, on) => {
  on('session.messages', () => ({ value: [] }))

  const out = await $.command.run(label)

  expect(out.text).toBe('No label: no prompts yet')
})
