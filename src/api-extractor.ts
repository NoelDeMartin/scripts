import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';
import { resolve } from 'path';
import fs from 'fs';
import rollup from 'rollup';
import typescript from '@rollup/plugin-typescript';

import { projectPath, readProjectConfig } from './common';
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

    if (!output)
        throw new Error('Output types configuration missing');

    clearTmp();

    const tmpDeclarationsFile = await generateDeclarations(options, config);

    await appendProjectDeclarations(tmpDeclarationsFile, options.declarations ?? config.declarations);
    await publishDeclarations(tmpDeclarationsFile, output);

    console.log('Done!');
}

function clearTmp(): void {
    if (!fs.existsSync(projectPath('tmp')))
        return;

    fs.rmdirSync(projectPath('tmp'), { recursive: true });
}

async function generateDeclarations(
    options: ApiExtractorBuildTypesOptions,
    config: NoelDeMartinConfig,
): Promise<string> {
    console.log('Generating declarations...');

    const aliases = prepareAliases(options.alias ?? getDefaultAliases());
    const bundle = await rollup.rollup({
        external: options.external ?? config.external,
        input: projectPath(options.input ?? 'src/main.ts'),
        plugins: [
            typescript({
                rootDir: 'src',
                declaration: true,
                outDir: 'tmp',
            }),
        ],
    });

    await bundle.write({ dir: projectPath('tmp') });

    rewriteAliasesInDirectory(projectPath('tmp'), aliases);

    return rollupGeneratedDeclarations();
}

function prepareAliases(paths: Record<string, string[]>): [RegExp, string][] {
    return Object.entries(paths).map(([alias, paths]) => [
        new RegExp(alias.slice(0, -2), 'mg'),
        projectPath(`tmp/${paths[0]}`).slice(0, -2),
    ]);
}

function rewriteAliasesInDirectory(directoryPath: string, aliases: [RegExp, string][]): void {
    const fileNames = fs.readdirSync(directoryPath);

    for (const fileName of fileNames) {
        const filePath = resolve(directoryPath, fileName);
        const fileStats = fs.lstatSync(filePath);

        fileStats.isDirectory()
            ? rewriteAliasesInDirectory(filePath, aliases)
            : rewriteAliasesInFile(filePath, aliases);
    }
}

function rewriteAliasesInFile(filePath: string, aliases: [RegExp, string][]): void {
    let contents = fs.readFileSync(filePath).toString();

    for (const [alias, replacement] of aliases) {
        contents = contents.replace(alias, replacement);
    }

    fs.writeFileSync(filePath, contents);
}

async function rollupGeneratedDeclarations(): Promise<string> {
    console.log('Rolling up generated declarations...');

    const extractorConfig = ExtractorConfig.loadFileAndPrepare(projectPath('api-extractor.json'));
    const { dtsRollup } = JSON.parse(fs.readFileSync(projectPath('api-extractor.json')).toString());

    Extractor.invoke(extractorConfig, {
        localBuild: process.env.NODE_ENV !== 'production',
        showVerboseMessages: true,
    });

    return projectPath(dtsRollup.untrimmedFilePath.replace('<projectFolder>/', ''));
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

async function publishDeclarations(generatedDeclarationsPath: string, outputDeclarationsPath: string): Promise<void> {
    console.log('Moving declarations to dist folder...');

    fs.renameSync(generatedDeclarationsPath, outputDeclarationsPath);
}

function getDefaultAliases(): Record<string, string[]> {
    try {
        const { compilerOptions } = JSON.parse(fs.readFileSync(projectPath('tsconfig.json')).toString());

        return compilerOptions.paths ?? {};
    } catch (error) {
        return {};
    }
}
