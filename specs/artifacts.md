# Artifact System Implementation Plan

## Why
The current mechanism for delivering generated files and work products (Action/Task outputs) relies on a simple expandable accordion in the chat or jumping to the `/tasks/:id` page to download binaries. This fractures the user experience, hiding complex outputs behind small interactions or forcing context switching, which diminishes the "magic" of AI generation. 
As seen in best-in-class platforms, an Artifact System transforms an AI assistant from a conversational tool into a collaborative workspace. Artifacts allow users to view, copy, download, and iterate upon complex deliverables (like code, documents, web previews, or graphical diagrams) strictly within the application's purview without disrupting the conversational flow.

## How

### Phase 1: Interactive Slide-in Interface (Completed & Executed)
- **Design & UX**: Introduce an `ArtifactPanel` that slides in from the right edge of the screen when a user clicks an `AssetCard` inside the chat bubble. This overlays the chat seamlessly, offering a wide, focused workspace while preserving chat context behind a backdrop.
- **Functionality**:
    - **Header**: File name, size, icon, and contextual actions (Preview, Copy, Download).
    - **Preview Area**: Dedicated scrollable area rendering file contents.
    - **Binary Support**: Clear empty state for binary files with a convenient download action.
- **Engineering**: `AssetCard` converted from `<details>` native HTML expanding element to a `<button>` that triggers the application state containing the currently viewed `TaskAsset`. The component transitions the UI dynamically.

### Phase 2: Rich Renderers (Next Step)
- **Markdown & Code**: Implement `react-syntax-highlighter` mapping or PrismJS to provide syntax-highlighting for code assets. Implement a full MDX/markdown renderer rather than displaying raw text for markdown documents.
- **Visual Iteration (React / HTML)**: Expand the `onPreview` functionality. Currently, `.html` files render in the `CodeModeShell`. Migrate this to a true sandboxed `iframe` within the Artifact Panel itself, or embed it side-by-side. 
- **Diagrams**: Use `mermaid.js` embedded react components to auto-render graphical output when a document's internal metadata indicates a diagram.

### Phase 3: Export Pipelines (PDFs, Word Docs)
- **Backend**: For exporting to PDF/Word, integrate tools like `puppeteer` (for PDF snapshotting of HTML renders) or libraries like `docx`/`pdf-lib` to construct structured files out of AI payloads.
- **Frontend Actions**: The `ArtifactPanel` will house a localized "Export" menu allowing format swapping at runtime, requesting the backend to asynchronously build and emit the requested binary over SSE/WebSockets.

### Phase 4: Artifact State Management & Persistence
- Treat artifacts as first-class, versioned entities (`artifact_versions` database schema) attached to Projects and Tasks. This allows users to iterate via prompt ("add a header to that document") and view older versions in an integrated history slider.

## Risks
1. **Z-Index and Layout Clashes**: Using fixed panels can often overlap improperly with tooltips, dropdowns (`select` elements), or other sidebars. 
2. **Performance Constraints**: Huge artifact payloads (e.g., massive text files, deep JSONs) can drag the main React thread when rendering un-paginated.
3. **Execution Sandboxing**: Rendering third-party AI-generated code/HTML in an iframe or preview must enforce CSP to prevent XSS if sensitive tokens exist in the user's LocalStorage.

## Verification
- **Test**: Run a general task to generate a markdown file. Note that clicking the asset pill slides in the UI.
- **Test**: Ensure copy/download actions correctly place content in the clipboard or trigger the browser download manager.
- **Verification of Phase 2+**: Implementations of renderer pipelines must have E2E Playwright coverage ensuring sandboxed code doesn't inherit parent window variables.
