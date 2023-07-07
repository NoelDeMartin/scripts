import type { Plugin } from 'rollup';

export default function html(): Plugin {
    return {
        name: 'html',
        transform(code, id) {
            if (!id.endsWith('.html')) {
                return;
            }

            return {
                code: `export default ${JSON.stringify(code)};`,
                map: { mappings: '' },
            };
        },
    };
}
