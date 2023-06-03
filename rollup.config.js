import { babel } from '@rollup/plugin-babel';
import typescript from 'rollup-plugin-typescript2';

const { external } = require('./noeldemartin.config');

export default {
    input: 'src/main.ts',
    output: [
        { file: 'node_modules/@noeldemartin/scripts/dist/noeldemartin-scripts.esm.js', format: 'esm' },
        { file: 'node_modules/@noeldemartin/scripts/dist/noeldemartin-scripts.cjs.js', format: 'cjs' },
    ],
    external: [
        ...external,
        /^@babel\/runtime\//,
        /^core-js\//,
        /^regenerator-runtime\//,
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
