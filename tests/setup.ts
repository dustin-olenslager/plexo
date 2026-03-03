// Set required env vars before any module is loaded in unit tests.
// DATABASE_URL points to the running dev DB so the postgres driver can
// initialise — actual DB methods are mocked per-test so no real writes happen.
process.env.DATABASE_URL = 'postgresql://plexo:plexo-dev-local-only@localhost:5432/plexo'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-unit'
process.env.NODE_ENV = 'test'

