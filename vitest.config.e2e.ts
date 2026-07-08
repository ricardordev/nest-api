import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        root: 'test',
        include: ['**/*.e2e-spec.ts'],
        environment: 'node',
        globals: true,
        clearMocks: true,
        testTimeout: 30000,  // E2E tests may need longer timeout
    },
});
