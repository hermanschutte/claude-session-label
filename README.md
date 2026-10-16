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

Type `/label` once the session has done some work. In a new session with no conversation yet it prints `No label: nothing-to-fork`.

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

A skill cannot run built-in commands such as `/rename` and `/color`, so this is a mod: a plugin with a hooks module (`hooks/register.ts`). It asks the session's own model one question over the conversation with `$.model.fork`, which reuses the session's prompt cache, then runs `/rename` and `/color`.

Mods are an early-access Claude Code feature, and the API can change between releases. Tested on Claude Code 2.1.301.
