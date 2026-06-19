import { SfCommand } from '@salesforce/sf-plugins-core';
import { existsSync, lstatSync } from 'node:fs';
// `cp`/`rm`/`mkdir` are stable since Node >= 16; the plugin runtime targets Node >= 20.
// eslint-disable-next-line n/no-unsupported-features/node-builtins
import { cp, mkdir, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DEST = join(homedir(), '.claude', 'skills', 'agentforcepmd');

function isSymlink(p: string): boolean {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

export default class AgentpmdInstallSkill extends SfCommand<{ installed: string }> {
  public static readonly description = `Recursively copies the bundled skill tree (SKILL.md plus its references/
pages) to ~/.claude/skills/agentforcepmd/ so Claude Code can use it as a
skill. Any existing install at that path (including a dev symlink into a
checkout) is replaced. Restart Claude Code (or reload skills) afterward.`;
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

    // Clear any prior install first. node:fs cp refuses to overwrite a symlink
    // (e.g. a dev `ln -s` into a checkout) with a directory, and it won't prune
    // files removed upstream — so we replace the destination wholesale. rm on a
    // symlink unlinks the link only; it never follows into (or deletes) the
    // link's target.
    const wasSymlink = isSymlink(SKILL_DEST);
    await rm(SKILL_DEST, { force: true, recursive: true });
    await mkdir(dirname(SKILL_DEST), { recursive: true });
    await cp(skillSrc, SKILL_DEST, { recursive: true });

    if (wasSymlink) {
      this.warn(`Replaced an existing symlink at ${SKILL_DEST} with a copy of the bundled skill.`);
    }

    this.log(`Skill installed to ${SKILL_DEST}`);
    this.log('Restart Claude Code (or reload skills) to activate.');

    return { installed: SKILL_DEST };
  }
}
