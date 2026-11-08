import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'dotenv';
import type { NextConfig } from 'next';
interface WebpackConfig {
  resolve?: { extensionAlias?: Record<string, string[]> };
  plugins?: unknown[];
}

interface WebpackContext {
  webpack: { NormalModuleReplacementPlugin: new (pattern: RegExp, replacement: string) => unknown };
}

const repoRoot = path.resolve(__dirname, '..');
const rootEnvPath = path.join(repoRoot, '.env');
const rootEnv = existsSync(rootEnvPath) ? parse(readFileSync(rootEnvPath)) : {};
const useCorrection = (process.env.TP_WORKFLOW ?? rootEnv.TP_WORKFLOW) === 'correction';
const workflowSource = useCorrection ? 'correction/src/workflow.ts' : 'src/workflow.ts';

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  serverExternalPackages: ['@mastra/core'],
  env: {
    TP_REPO_ROOT: repoRoot,
    TP_WORKFLOW_SOURCE: workflowSource,
  },
  webpack: (config: WebpackConfig, { webpack }: WebpackContext) => {
    config.resolve ??= {};
    config.resolve.extensionAlias = { ...config.resolve.extensionAlias, '.js': ['.ts', '.js'] };
    if (useCorrection) {
      config.plugins ??= [];
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^@tp\/workflow$/, path.join(repoRoot, workflowSource)));
    }
    return config;
  },
};

export default nextConfig;
