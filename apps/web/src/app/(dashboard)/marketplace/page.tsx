import MarketplaceClient from './MarketplaceClient'

interface RegistryItem {
    id: string
    name: string
    description: string
    category: string
    logo_url: string | null
    auth_type: string
    oauth_scopes: string[]
    setup_fields: Array<{ key: string; label: string; type: string }>
    tools_provided: string[]
    cards_provided: string[]
    is_core: boolean
    doc_url: string | null
}

interface InstalledItem {
    id: string
    registryId: string
    name: string
    status: 'active' | 'error' | 'expired' | 'disconnected'
}

async function fetchMarketplaceData(workspaceId: string) {
    const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

    const [regRes, instRes] = await Promise.all([
        fetch(`${apiBase}/api/connections/registry`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/connections/installed?workspaceId=${workspaceId}`, { cache: 'no-store' }),
    ])

    const registry: RegistryItem[] = regRes.ok
        ? ((await regRes.json()) as { items: RegistryItem[] }).items
        : []

    const installed: InstalledItem[] = instRes.ok
        ? ((await instRes.json()) as { items: InstalledItem[] }).items
        : []

    return { registry, installed }
}

export default async function MarketplacePage() {
    const workspaceId = process.env.DEV_WORKSPACE_ID ?? '00000000-0000-0000-0000-000000000000'
    const { registry, installed } = await fetchMarketplaceData(workspaceId)

    return (
        <MarketplaceClient
            registry={registry}
            installed={installed}
            workspaceId={workspaceId}
        />
    )
}
