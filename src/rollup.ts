import { babel } from '@rollup/plugin-babel';
import type { OutputOptions, RollupOptions } from 'rollup';
import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

import { readProjectConfig } from './common';

export type RollupBuildOptions = Partial<{
    config: string;
    input: string;
    external: (string | RegExp)[];
    polyfills: false | 'bundled' | 'runtime';
}>;

export function rollupBuild(options?: RollupBuildOptions): Promise<RollupOptions[]>;
export function rollupBuild(output: OutputOptions, options?: RollupBuildOptions): Promise<RollupOptions>;
export async function rollupBuild(
    outputOrOptions: OutputOptions | RollupBuildOptions = {},
    options: RollupBuildOptions = {},
): Promise<RollupOptions | RollupOptions[]> {
    if (!isRollupOutputOptions(outputOrOptions)) {
        const builds = await getBuilds(outputOrOptions);

        return Promise.all(builds.map(([output, options]) => rollupBuild(output, options)));
    }

    return getRollupOptions(outputOrOptions, options);
}

async function getBuilds(options: RollupBuildOptions): Promise<[OutputOptions, RollupBuildOptions][]> {
    const { name, output } = await readProjectConfig(options.config);

    const builds: (undefined | '' | [OutputOptions, RollupBuildOptions])[] = [
        output.module && [{ file: output.module, format: 'esm' }, options],
        output.main && [{ file: output.main, format: 'cjs' }, {
            ...options,
            polyfills: options.polyfills ?? 'runtime',
        }],
        output.browser && [{ file: output.browser, format: 'umd', name }, {
            ...options,

            // TODO not bundling :/
            polyfills: options.polyfills ?? 'bundled',
        }],
    ];

    return builds.filter((build): build is [OutputOptions, RollupBuildOptions] => !!build);
}

async function getRollupOptions(output: OutputOptions, options: RollupBuildOptions): Promise<RollupOptions> {
    const config = await readProjectConfig(options.config);

    const includePolyfills = !!options.polyfills;
    const bundlePolyfills = options.polyfills === 'bundled';
    const plugins = [];

    plugins.push(typescript());

    if (includePolyfills)
        plugins.push(babel({
            extensions: ['.ts'],
            babelHelpers: bundlePolyfills ? 'bundled' : 'runtime',
            plugins: [
                '@babel/plugin-proposal-class-properties',
                ...(
                    bundlePolyfills
                        ? []
                        : [
                            [
                                '@babel/plugin-transform-runtime',
                                { useESModules: output.format === 'esm' },
                            ],
                            [
                                // This can be removed when this is closed: https://github.com/babel/babel/issues/10759
                                'babel-plugin-transform-remove-imports', {
                                    test: /^regenerator-runtime\/runtime/,
                                },
                            ],
                        ]
                ),
            ],
            presets: [
                '@babel/preset-typescript',
                [
                    '@babel/preset-env',
                    {
                        targets: '> 0.5%, last 2 versions, Firefox ESR, not dead',
                        corejs: { version: '3.8', proposals: true },
                        useBuiltIns: 'usage',
                    },
                ],
            ],
        }));

    if (bundlePolyfills)
        plugins.push(resolve());

    plugins.push(terser());

    return {
        input: options.input ?? 'src/main.ts',
        output: {
            sourcemap: true,
            ...output,
        },
        external: [
            ...config.external,
            ...(options.external ?? []),
            ...(bundlePolyfills ? [] : [
                /^core-js\//,
                /^@babel\/runtime\//,
                /^regenerator-runtime\//,
            ]),
        ],
        plugins,
    };
}

function isRollupOutputOptions(options: unknown): options is OutputOptions {
    return typeof options === 'object'
        && options !== null
        && 'format' in options;
}
