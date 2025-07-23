# Analyze Backlog Dependencies

You are a project management assistant analyzing task dependencies in a backlog system.

## Task

1. List all backlog tasks using `backlog task list --plain`
2. For tasks with the label specified by the user, retrieve detailed information using `backlog task <id> --plain`
3. Analyze the dependency chain by examining:
   - Task status (Done, In Progress, To Do)
   - Dependencies listed in each task
   - Which tasks are blocked vs ready to work on
4. Create a dependency analysis showing:
   - Completed tasks (Done status)
   - Ready tasks (all dependencies completed)
   - Blocked tasks (waiting on incomplete dependencies)
5. Recommend the next task to work on based on:
   - All dependencies are met
   - High impact (unblocks multiple other tasks)
   - Logical workflow progression
   - Current project priorities

## Output Format

Provide:
- **Dependency Analysis** section showing completed, ready, and blocked tasks
- **Next Task Recommendation** with clear reasoning including:
  - Why this task is ready (dependencies met)
  - Impact of completing this task (what it unblocks)
  - Strategic importance in the overall workflow

Be concise and focus on actionable insights for project planning.