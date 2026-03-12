
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { v4 as uuidv4 } from 'uuid'
import * as schema from '../packages/db/src/schema'
import { eq } from 'drizzle-orm'

const DATABASE_URL = 'postgresql://plexo:plexo-dev-local-only@localhost:5432/plexo'
const workspaceId = '8f372c7c-7da2-402c-8f77-e31a93aca72b'

async function seed() {
    const client = postgres(DATABASE_URL)
    const db = drizzle(client, { schema })

    console.log('🌱 Seeding Workbench Demo data...')

    // 1. Create a Project (Sprint)
    const sprintId = 'sprint-' + uuidv4().slice(0, 8)
    await db.insert(schema.sprints).values({
        id: sprintId,
        workspaceId,
        name: 'Workbench UI Overhaul',
        request: 'Implement Artifact Workbench Components across the monorepo.',
        status: 'running',
        category: 'code',
        metadata: { goal: 'Test the new side-by-side layout' }
    })

    // 2. Create a Task
    const taskId = 'task-' + uuidv4().slice(0, 8)
    await db.insert(schema.tasks).values({
        id: taskId,
        workspaceId,
        projectId: sprintId,
        type: 'general',
        status: 'running',
        source: 'dashboard',
        context: { goal: 'Test workbench' },
        title: 'Implement Artifact Workbench Components',
        description: 'Building the terminal, file tree, and preview panels.',
    })

    // 3. Create Task Steps (for Terminal/Logs)
    const steps = [
        {
            label: 'env_setup',
            tool: 'shell',
            input: 'pnpm install',
            output: '\x1b[32m✔\x1b[0m Dependencies installed successfully. (2.4s)\n\x1b[34mℹ\x1b[0m 142 packages added from 125 contributors.',
        },
        {
            label: 'build_ui',
            tool: 'shell',
            input: 'pnpm build:ui',
            output: 'Building apps/web...\n\x1b[33m▲\x1b[0m [Next.js] Compiling components...\n\x1b[32m✓\x1b[0m Compiled successfully in 842ms.\n\x1b[1;36m➜\x1b[0m ArtifactWorkbench.tsx: 45KB',
        },
        {
            label: 'run_tests',
            tool: 'shell',
            input: 'pnpm test:workbench',
            output: '\x1b[1;32mPASS\x1b[0m src/components/workbench/artifact-workbench.test.tsx\n  ArtifactWorkbench\n    \x1b[32m✓\x1b[0m should render in split-pane mode (42ms)\n    \x1b[32m✓\x1b[0m should handle pinning (15ms)\n\n\x1b[1;32mTest Suites: 1 passed, 1 total\x1b[0m\n\x1b[1;32mTests:       2 passed, 2 total\x1b[0m',
        }
    ]

    for (const s of steps) {
        await db.insert(schema.taskSteps).values({
            id: uuidv4(),
            taskId,
            stepNumber: steps.indexOf(s) + 1,
            ...s
        })
    }

    // 4. Create Artifacts (for File Tree)
    const files = [
        { name: 'artifact-workbench.tsx', type: 'code', content: 'export function ArtifactWorkbench() { ... }' },
        { name: 'terminal-panel.tsx', type: 'code', content: 'export function TerminalPanel() { ... }' },
        { name: 'styles.css', type: 'style', content: '.workbench { display: flex; }' },
    ]

    for (const f of files) {
        const artifactId = 'art-' + uuidv4().slice(0, 8)
        await db.insert(schema.artifacts).values({
            id: artifactId,
            workspaceId,
            taskId,
            projectId: sprintId,
            filename: f.name,
            type: f.type,
            currentVersion: 1
        })

        await db.insert(schema.artifactVersions).values({
            id: uuidv4(),
            artifactId,
            version: 1,
            content: f.content,
            changeSummary: 'Initial creation'
        })
    }

    console.log('✅ Workbench Demo data seeded successfully!')
    console.log(`- Project ID: ${sprintId}`)
    console.log(`- Task ID: ${taskId}`)
    
    await client.end()
}

seed().catch(console.error)
