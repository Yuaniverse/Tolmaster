# Agent Skills Directory

This directory contains specialized "skills" that extend the capabilities of your AI agent.
Each individual skill should be in its own subdirectory and MUST contain a `SKILL.md` file.

## Structure
```
.agent/
  skills/
    skill_name/
      SKILL.md       # (Required) Instructions and prompt context
      scripts/       # (Optional) Helper scripts
      resources/     # (Optional) Reference files
```

## How it works
When the agent works on a task, it can "learn" these skills by reading the `SKILL.md` file. This provides it with tailored expertise, standard operating procedures, or specific coding guidelines relevant to your project.
