import { babel } from '@rollup/plugin-babel';
import { stringToSlug, stringToStudlyCase } from '@noeldemartin/utils';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
import resolveCommonJS from '@rollup/plugin-commonjs';
import resolveNode from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import type { OutputOptions, RollupOptions } from 'rollup';
import type { Options as TerserOptions } from 'rollup-plugin-terser';

import { readProjectConfig } from './common';

export type RollupBuildOptions = Partial<{
    config: string;
    input: string;
    external: (string | RegExp)[];
    globals: Record<string, string>;
    polyfills: false | 'bundled' | 'runtime';
    terser: TerserOptions | false;
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
    const config = await readProjectConfig(options.config);

    const builds: (undefined | '' | [OutputOptions, RollupBuildOptions])[] = [
        config.output.module && [
            getOutputOptions(config.output.module, { format: 'esm' }),
            {
                ...options,
                ...config.overrides.module ?? {},
                polyfills: options.polyfills ?? config.overrides.module?.polyfills ?? config.polyfills ?? 'runtime',
            },
        ],
        config.output.main && [
            getOutputOptions(config.output.main, { format: 'cjs' }),
            {
                ...options,
                ...config.overrides.main ?? {},
                polyfills: options.polyfills ?? config.overrides.main?.polyfills ?? config.polyfills ?? 'runtime',
            },
        ],
        config.output.browser && [
            getOutputOptions(config.output.browser, { name: config.name, format: 'umd' }),
            {
                ...options,
                ...config.overrides.browser ?? {},
                polyfills: options.polyfills ?? config.overrides.browser?.polyfills ?? config.polyfills ?? 'bundled',
            },
        ],
    ];

    return builds.filter((build): build is [OutputOptions, RollupBuildOptions] => !!build);
}

async function getRollupOptions(output: OutputOptions, options: RollupBuildOptions): Promise<RollupOptions> {
    const config = await readProjectConfig(options.config);

    const includePolyfills = !!(options.polyfills ?? config.polyfills);
    const bundlePolyfills = options.polyfills === 'bundled';
    const terserOptions = options.terser ?? config.minify ?? config.terser;
    const plugins = [];

    plugins.push(typescript());
    plugins.push(resolveNode());
    plugins.push(resolveCommonJS());
    plugins.push(json());

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

    if (terserOptions)
        plugins.push(terser(terserOptions));

    return {
        input: options.input ?? 'src/main.ts',
        output: {
            sourcemap: true,
            exports: 'named',
            globals: options.globals ?? config.globals ?? (name => {
                if (name === config.name) {
                    return config.name;
                }

                return stringToStudlyCase(stringToSlug(name));
            }),
            ...output,
        },
        external: [
            ...(options.external ?? config.external ?? []),
            ...(bundlePolyfills ? [] : [
                /^core-js\//,
                /^@babel\/runtime\//,
                /^regenerator-runtime\//,
            ]),
        ],
        plugins,
    };
}

function getOutputOptions(file: string, options: OutputOptions): OutputOptions {
    if (options.format === 'umd')
        return { file, ...options };

    const [,, dir, name, suffix] = file.match(/((.*)\/)?([^.]+)\.(.*)/) as string[];

    return {
        dir,
        entryFileNames: `${name}.${suffix}`,
        chunkFileNames: `[name].hash.${suffix}`,
        ...options,
    };
}

function isRollupOutputOptions(options: unknown): options is OutputOptions {
    return typeof options === 'object'
        && options !== null
        && 'format' in options;
}
