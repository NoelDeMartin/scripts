import fs from 'fs';
import rollup from 'rollup';
import typescript from 'rollup-plugin-typescript2';
import vue from 'rollup-plugin-vue';
import icons from 'unplugin-icons/rollup';
import { dirname, resolve } from 'path';
import { Extractor, ExtractorConfig, ExtractorLogLevel } from '@microsoft/api-extractor';

import html from './plugins/html';
import { nodeBuiltins } from './node';
import { packageJson, projectPath, readProjectConfig } from './common';
import type { NoelDeMartinConfig } from './common';

export type ApiExtractorBuildTypesOptions = Partial<{
    config: string;
    input: string;
    output: string;
    external: (string | RegExp)[];
    alias: Record<string, string[]>;
    declarations: string[];
}>;

export async function apiExtractorBuildTypes(options: ApiExtractorBuildTypesOptions = {}): Promise<void> {
    const config = await readProjectConfig(options.config);
    const output = options.output ?? config.output.types;

    if (!output) {
        console.log('Output types configuration is missing');

        process.exit(1);
    }

    clearTmp();

    const tmpDeclarationsFile = await generateDeclarations(options, config);

    await appendProjectDeclarations(tmpDeclarationsFile, options.declarations ?? config.declarations);
    await appendModuleDeclarations(tmpDeclarationsFile, dirname(projectPath(options.input ?? config.input)));
    await publishDeclarations(tmpDeclarationsFile, output);

    console.log('Done!');
}

function clearTmp(): void {
    if (!fs.existsSync(projectPath('tmp')))
        return;

    fs.rmSync(projectPath('tmp'), { recursive: true });
}

async function generateDeclarations(
    options: ApiExtractorBuildTypesOptions,
    config: NoelDeMartinConfig,
): Promise<string> {
    console.log('Generating declarations...');

    const aliases = prepareAliases(options.alias ?? getDefaultAliases());
    const vueOptions = typeof config.vue === 'object' ? config.vue : (config.vue ? {} : false);
    const bundle = await rollup.rollup({
        external: [
            ...options.external ?? config.overrides.types?.external ?? config.external ?? [],
            ...config.externalExtra ?? [],
            ...nodeBuiltins,
            '@total-typescript/ts-reset',
            /^virtual:/,
        ],
        input: projectPath(options.input ?? config.input),
        plugins: [
            vueOptions && vue(vueOptions),
            config.icons && icons(),
            html(),
            typescript({
                tsconfig: projectPath('tsconfig.json'),
                tsconfigOverride: {
                    compilerOptions: {
                        rootDir: 'src',
                        declaration: true,
                        outDir: 'tmp',
                    },
                },
            }),
        ],
    });

    await bundle.write({ dir: projectPath('tmp') });

    rewriteAliasesInDirectory(projectPath('tmp'), aliases);

    const tmpDeclarationsFile = await rollupGeneratedDeclarations(options, config);

    restoreAliasesInFile(tmpDeclarationsFile, aliases);

    return tmpDeclarationsFile;
}

function prepareAliases(paths: Record<string, string[]>): [RegExp, string, string][] {
    return Object.entries(paths).map(([alias, paths]) => [
        new RegExp(alias.slice(0, -1), 'mg'),
        projectPath(`tmp/${paths[0]}`).slice(0, -1),
        alias.slice(0, -1),
    ]);
}

function rewriteAliasesInDirectory(directoryPath: string, aliases: [RegExp, string, string][]): void {
    const fileNames = fs.readdirSync(directoryPath);

    for (const fileName of fileNames) {
        const filePath = resolve(directoryPath, fileName);
        const fileStats = fs.lstatSync(filePath);

        fileStats.isDirectory()
            ? rewriteAliasesInDirectory(filePath, aliases)
            : rewriteAliasesInFile(filePath, aliases);
    }
}

function rewriteAliasesInFile(filePath: string, aliases: [RegExp, string, string][]): void {
    let contents = fs.readFileSync(filePath).toString();

    for (const [alias, replacement] of aliases) {
        contents = contents.replace(alias, replacement);
    }

    fs.writeFileSync(filePath, contents);
}

function restoreAliasesInFile(filePath: string, aliases: [RegExp, string, string][]): void {
    let contents = fs.readFileSync(filePath).toString();

    for (const [, replacement, original] of aliases) {
        contents = contents.replace(new RegExp(replacement, 'mg'), original);
    }

    fs.writeFileSync(filePath, contents);
}

async function rollupGeneratedDeclarations(
    options: ApiExtractorBuildTypesOptions,
    config: NoelDeMartinConfig,
): Promise<string> {
    console.log('Rolling up generated declarations...');

    const mainEntryPointFilePath = projectPath(
        (options.input ?? config.input).replace(/.ts$/, '.d.ts').replace('src/', 'tmp/'),
    );
    const rollupFile = projectPath('tmp/rollup.d.ts');
    const extractorConfig = ExtractorConfig.prepare({
        configObject: {
            mainEntryPointFilePath,
            dtsRollup: {
                enabled: true,
                untrimmedFilePath: rollupFile,
            },
            messages: {
                extractorMessageReporting: {
                    'ae-missing-release-tag': { logLevel: ExtractorLogLevel.None },
                },
            },
            compiler: {
                tsconfigFilePath: projectPath('tsconfig.json'),
            },
            projectFolder: projectPath(),
        },
        packageJson: packageJson(),
        packageJsonFullPath: projectPath('package.json'),
        configObjectFullPath: undefined,
    });

    Extractor.invoke(extractorConfig, {
        localBuild: process.env.NODE_ENV !== 'production',
    });

    return rollupFile;
}

async function appendProjectDeclarations(declarationsFilePath: string, declarations: string[]): Promise<void> {
    console.log('Appending project declarations...');

    const declarationsFile = fs.readFileSync(declarationsFilePath);
    const projectDeclarations = [
        ...declarations.map(path => fs.readFileSync(projectPath(path))),
        declarationsFile,
    ];

    fs.writeFileSync(declarationsFilePath, projectDeclarations.join(''));
}

async function appendModuleDeclarations(declarationsFilePath: string, basePath: string): Promise<void> {
    const fileNames = fs.readdirSync(basePath);

    for (const fileName of fileNames) {
        const filePath = resolve(basePath, fileName);
        const fileStats = fs.lstatSync(filePath);

        if (fileStats.isDirectory()) {
            appendModuleDeclarations(declarationsFilePath, filePath);

            continue;
        }

        const fileContents = fs.readFileSync(filePath).toString();
        const moduleDeclarations = fileContents.match(/\ndeclare (module|global) (\n|.)*/gm);

        if (!moduleDeclarations) {
            continue;
        }

        fs.appendFileSync(declarationsFilePath, unwrapLocalModuleDeclarations(moduleDeclarations[0]));
    }
}

function unwrapLocalModuleDeclarations(moduleDeclarations: string): string {
    let match: RegExpMatchArray | null;

    // eslint-disable-next-line no-cond-assign
    while (match = moduleDeclarations.match(/\ndeclare module '@\/[^']+' {((?:\n|.)*?)\n}/m)) {
        moduleDeclarations = moduleDeclarations.replace(match[0], match[1] ?? '');
    }

    return moduleDeclarations;
}

async function publishDeclarations(generatedDeclarationsPath: string, outputDeclarationsPath: string): Promise<void> {
    console.log('Moving declarations to dist folder...');

    fs.renameSync(generatedDeclarationsPath, outputDeclarationsPath);
}

function getDefaultAliases(): Record<string, string[]> {
    try {
        const { compilerOptions } = JSON.parse(fs.readFileSync(projectPath('tsconfig.json')).toString());
        const aliases = (compilerOptions.paths ?? {}) as Record<string, string[]>;

        return Object.entries(aliases).reduce((fixedAliases, [alias, paths]) => {
            fixedAliases[alias] = paths.map(path => path.replace('/src', ''));

            return fixedAliases;
        }, {} as Record<string, string[]>);
    } catch (error) {
        return {};
    }
}
