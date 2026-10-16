# session-label

`/label` gives a Claude Code session a short name and a color in one step.

It reads the session's conversation, picks a kebab-case name such as `fix-login-redirect` and a color for the kind of work, then runs `/rename` and `/color` for you.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install session-label --marketplace hermanschutte/claude-session-label
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

From a shell:

```
claude plugin install session-label --marketplace hermanschutte/claude-session-label
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `hermanschutte/claude-session-label`, then Add plugin.

## Use

Type `/label` at any point in a session. In a new session with no prompts yet it prints `No label: no prompts yet`.

## Colors

| Color  | Work                             |
| ------ | -------------------------------- |
| red    | bug, error or incident           |
| green  | new feature                      |
| blue   | research or a question           |
| yellow | writing, docs or email           |
| purple | marketing or SEO                 |
| orange | infrastructure, deploy or config |
| pink   | UI or design                     |
| cyan   | data or analytics                |

## How it works

A skill cannot run built-in commands such as `/rename` and `/color`, so this is a mod: a plugin with a hooks module (`hooks/register.ts`).

It reads the session with `$.session.messages()`, without tool calls and their output. When the session was compacted, it keeps the latest compaction summary (up to 16,000 characters), which describes the earlier part of the session. It cuts each of your prompts to 300 characters, and when they come to more than 8,000 characters, it keeps an even sample from the first prompt to the last. It sends that to Haiku, so one `/label` costs at most about 6k input tokens, however long the session is. Then it runs `/rename` and `/color`.

Mods are an early-access Claude Code feature, and the API can change between releases. Tested on Claude Code 2.1.301.
