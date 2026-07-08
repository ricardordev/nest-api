import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        root: 'src',
        include: ['**/*.spec.ts'],
        environment: 'node',
        globals: true,
        clearMocks: true,
        coverage: {
            provider: 'v8',
            include: ['**/*.ts'],
            exclude: [
                '**/main.ts',
                '**/*.module.ts',
                '**/dto/**',
                '**/*.entity.ts',
                '**/*.enum.ts',
                '**/*.types.ts',
                '**/*.interface.ts',
                '**/generated/**',
                '**/*.spec.ts',
                '**/common/**',
                '**/infra/**',
                '**/auth/auth.controller.ts',
                '**/auth/guards/**',
                '**/auth/strategies/**',
                '**/health/health.controller.ts',
                '**/single-data/single-data.controller.ts',
                '**/use-cases/delete-transaction.use-case.ts',
                '**/use-cases/find-transaction.use-case.ts',
                '**/use-cases/list-transaction.use-case.ts',
            ],
            reporter: ['text', 'lcov'],
            reportsDirectory: '../coverage',
        },
    },
});