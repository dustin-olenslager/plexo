# Spec: Claude-Inspired "Artifact Workbench" Interface

## Why
Claude Desktop's interface has proven that a multi-pane, "Artifact-first" layout significantly improves agentic productivity. Users can see the agent's "thinking" (chat/logs) and "doing" (code/preview) simultaneously. Plexo currently toggles between these, which creates cognitive load and obscures the relationship between communication and execution.

## How

### 1. The Dynamic Artifact Workbench
- **State**: The Workbench now has two primary states:
    - **Floating Overlay**: A semi-transparent, glassmorphic panel that slides over the chat. Useful for quick checks or mobile.
    - **Pinned Workspace**: A side-by-side layout (60/40) triggered by a "Pin" icon. Conversation remains the primary controller.
- **Glassmorphism**: Use `backdrop-blur-md bg-surface-1/60 border-l border-border/40` for the workbench background.

### 2. Global Modality: Mode Switcher Header
- A persistent central switcher in the top header.
- **Modes**:
    - **Chat**: Optimized for standard dialogue and quick questions.
    - **Code/Artifacts**: Activates the Workbench. User can select a specific Project/Repository scope from here.
    - **Insights**: Full-screen introspection of memory and system status.

### 3. Condensed Thought Traces
- Agent "thinking" logs are rendered as ultra-compact inline pills in the chat stream.
- Format: `[Icon] Action description` (e.g., `[Search] Scanning source...`).
- Visible but non-obtrusive. Clicking them reveals a secondary "Log Overlay" on the workbench if needed.

### 4. Implementation: The Sibling Refactor
- Refactor `CodeModeShell` into a generic `ArtifactWorkbench`.
- It will live as a sibling to the chat container in `ChatPage`, controlled by a `layoutMode` flag in a new `useWorkbenchState` hook.


## Risks
- **Screen Real Estate**: On 13" laptops, two columns can feel narrow.
    - *Mitigation*: Enable horizontal collapse/expand buttons (like VS Code's sidebars).
- **Mobile**: The two-pane view is impossible on mobile.
    - *Mitigation*: Implement a bottom-sheet for the Workbench or keep the mobile view as a tabbed overlay.

## Verification
- [ ] User starts a task in "Chat" mode; agent suggests switching to "Code" mode.
- [ ] In "Code" mode, agent writes a file; workbench automatically switches to the "Editor" tab and highlights the change.
- [ ] Clicking a tool-trace block in the chat highlights the corresponding artifact in the workbench.
