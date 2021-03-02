import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export type NoelDeMartinConfig = {
    name: string;
    output: NoelDeMartinConfigOutput;
    external: (string | RegExp)[];
    declarations: [];
};

export type NoelDeMartinConfigOutput = Partial<{
    browser: string;
    main: string;
    module: string;
    types: string;
}>;

export function projectPath(path: string): string {
    return resolve(process.cwd(), path);
}

export async function readProjectConfig(name: string = 'noeldemartin.config.js'): Promise<NoelDeMartinConfig> {
    const projectConfig = await getProjectConfig(name);
    const defaultConfig = getDefaultConfig();
    const keys = Object.keys(defaultConfig) as (keyof NoelDeMartinConfig)[];

    return keys.reduce((config, key) => ({
        ...config,
        [key]: projectConfig[key] ?? defaultConfig[key],
    }), {} as Partial<NoelDeMartinConfig>) as NoelDeMartinConfig;
}

const configsCache: Record<string, NoelDeMartinConfig> = {};

async function getProjectConfig(name: string): Promise<Partial<NoelDeMartinConfig>> {
    const configFilePath = projectPath(name);

    if (!(configFilePath in configsCache))
        configsCache[configFilePath] = existsSync(configFilePath)
            ? (await import(configFilePath)).default
            : {};

    return configsCache[configFilePath];
}

function getDefaultConfig(): NoelDeMartinConfig {
    const {
        name,
        browser,
        main,
        module,
        types,
        dependencies,
    } = JSON.parse(readFileSync(projectPath('package.json')).toString());

    return {
        name,
        output: { browser, main, module, types },
        external: Object
            .keys(dependencies ?? {})
            .filter(dependency => ['core-js', '@babel/runtime', 'regenerator-runtime'].indexOf(dependency) === -1),
        declarations: [],
    };
}
