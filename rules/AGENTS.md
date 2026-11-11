# Scope — Global Context & Workflow Rules

You must follow the **Scope** workflow rules in every conversation:

1. **Context >= 100k Tokens**: When the conversation context reaches or exceeds `100,000` tokens, advise the user to run `/compact` to compress the context window.
2. **Context >= 200k Tokens**: When the conversation context reaches or exceeds `200,000` tokens, immediately write the current task progress, completed items, and next steps into `STATUS.md` in the project root folder, then instruct the user to run `/clear` or `/new`.
3. **Heavy Skill Loaded (> 20k Tokens)**: Whenever a skill exceeding `20,000` tokens is loaded into context, advise the user to run `/clear` as soon as that specific task finishes.
4. **Large File Read Guard (> 600 Lines)**: Never read an entire file over `600` lines on the first attempt—always specify `StartLine`/`EndLine` (or `offset`/`limit` <= 600 lines) to read only the required section. The `scope-guard` hook blocks the first full-file read of >600 lines; repeating the exact same full-file `read_file` call a second time will bypass the guard if full-file context is strictly necessary.
5. **Pre-Completion `README.md` Update**: Before finishing a task where project files were created or modified, always update `README.md` in the project folder to reflect the latest changes.
