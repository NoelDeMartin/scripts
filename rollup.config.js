import { babel } from '@rollup/plugin-babel';
import typescript from 'rollup-plugin-typescript2';

export default {
    input: 'src/main.ts',
    output: [
        { file: 'node_modules/@noeldemartin/scripts/dist/noeldemartin-scripts.esm.js', format: 'esm' },
        { file: 'node_modules/@noeldemartin/scripts/dist/noeldemartin-scripts.cjs.js', format: 'cjs' },
    ],
    external: [
        '@microsoft/api-extractor',
        '@noeldemartin/utils',
        '@rollup/plugin-babel',
        '@rollup/plugin-commonjs',
        '@rollup/plugin-json',
        '@rollup/plugin-node-resolve',
        'fs',
        'path',
        'rollup-plugin-icons',
        'rollup-plugin-terser',
        'rollup-plugin-typescript2',
        'rollup-plugin-vue',
        'rollup',
        /^@babel\/runtime\//,
        /^core-js\//,
        /^regenerator-runtime\//,
        /^unplugin-icons\//,
    ],
    plugins: [
        typescript(),
        babel({
            extensions: ['.ts'],
            babelHelpers: 'bundled',
            presets: [
                '@babel/preset-typescript',
                [
                    '@babel/preset-env',
                    {
                        targets: 'node 12',
                        corejs: { version: '3.8', proposals: true },
                        useBuiltIns: 'usage',
                    },
                ],
            ],
        }),
    ],
};
