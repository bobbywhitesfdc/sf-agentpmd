import { SfCommand } from '@salesforce/sf-plugins-core';
import { existsSync } from 'node:fs';
// `cp` is stable since Node 16.7; the plugin runtime targets Node >= 20.
// eslint-disable-next-line n/no-unsupported-features/node-builtins
import { cp } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DEST = join(homedir(), '.claude', 'skills', 'agentforcepmd');

export default class AgentpmdInstallSkill extends SfCommand<{ installed: string }> {
  public static readonly description = `Recursively copies the bundled skill tree (SKILL.md plus its references/
pages) to ~/.claude/skills/agentforcepmd/ so Claude Code can use it as a
skill. Restart Claude Code (or reload skills) afterward to activate it.`;
  public static readonly examples = ['$ sf agentpmd install-skill'];
  public static readonly summary = 'Install the agentforcepmd Claude Code skill to ~/.claude/skills/.';

  public async run(): Promise<{ installed: string }> {
    // Resolve the skill source relative to this package's installed location.
    // Compiled file lives at dist/commands/agentpmd/install-skill.js. Joining
    // '..' from the file path strips the filename first, so reaching the
    // package root (above dist/) takes four hops: install-skill.js → agentpmd
    // → commands → dist → <pkgRoot>.
    const pkgRoot = join(fileURLToPath(import.meta.url), '..', '..', '..', '..');
    const skillSrc = join(pkgRoot, 'skill');

    if (!existsSync(skillSrc)) {
      this.error(`Skill source not found at ${skillSrc} — is the package installed correctly?`);
    }

    await cp(skillSrc, SKILL_DEST, { recursive: true });

    this.log(`Skill installed to ${SKILL_DEST}`);
    this.log('Restart Claude Code (or reload skills) to activate.');

    return { installed: SKILL_DEST };
  }
}
