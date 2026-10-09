#!/usr/bin/env node
// Usage:
//   node changelog.mjs release <vX.Y.Z> <YYYY-MM-DD> [changelog-path]
//   node changelog.mjs next <vX.Y.Z> [changelog-path]
import { readFileSync, writeFileSync } from 'node:fs';

const REPO_URL = 'https://github.com/PackmindHub/update-packmind-artifacts';
const SECTIONS = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];
const UNRELEASED_TEMPLATE = [
  '## [Unreleased]',
  '',
  ...SECTIONS.flatMap((s) => [`### ${s}`, '']),
].join('\n');

const [command, version, ...rest] = process.argv.slice(2);

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

if (!/^v\d+\.\d+\.\d+$/.test(version ?? '')) {
  fail(`version must look like vX.Y.Z, got "${version}"`);
}

function splitUnreleased(content) {
  const start = content.indexOf('## [Unreleased]');
  if (start === -1) fail('no "## [Unreleased]" section found');
  const nextRelease = content.indexOf('\n## [', start + 1);
  const linksStart = content.search(/\n\[[^\]]+\]: /);
  const candidates = [nextRelease, linksStart].filter((i) => i !== -1);
  const end = candidates.length ? Math.min(...candidates) + 1 : content.length;
  return {
    before: content.slice(0, start),
    section: content.slice(start, end),
    after: content.slice(end),
  };
}

function previousVersion(content) {
  const match = content.match(/^\[Unreleased\]: .*\/compare\/(v\d+\.\d+\.\d+)\.\.\.HEAD$/m);
  if (!match) fail('no "[Unreleased]: .../compare/vA.B.C...HEAD" link found');
  return match[1];
}

function release(date, path) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) fail(`date must be YYYY-MM-DD, got "${date}"`);
  let content = readFileSync(path, 'utf8');
  if (content.includes(`## [${version}]`)) fail(`${version} is already in the changelog`);

  const { before, section, after } = splitUnreleased(content);
  const subsections = section
    .split(/\n(?=### )/)
    .slice(1)
    .map((s) => s.trim())
    .filter((s) => s.split('\n').slice(1).some((line) => line.trim() !== ''));
  if (subsections.length === 0) fail('[Unreleased] has no entries, nothing to release');

  const released = [`## [${version}] ${date}`, ...subsections].join('\n\n') + '\n\n';
  const previous = previousVersion(content);
  content = before + released + after;

  // Drop the [Unreleased] link (re-added by `next`) and append the new version link.
  content = content.replace(/^\[Unreleased\]: .*\n?/m, '');
  content = content.trimEnd() + `\n[${version}]: ${REPO_URL}/compare/${previous}...${version}\n`;

  writeFileSync(path, content);
  console.log(`CHANGELOG released as ${version} (${date}), previous version ${previous}`);
}

function next(path) {
  let content = readFileSync(path, 'utf8');
  if (content.includes('## [Unreleased]')) fail('[Unreleased] section already exists');
  const firstRelease = content.indexOf('## [');
  if (firstRelease === -1) fail('no release section found');
  content =
    content.slice(0, firstRelease) + UNRELEASED_TEMPLATE + '\n' + content.slice(firstRelease);

  // Keep link definitions ordered: [Unreleased] first, then newest version.
  const unreleasedLink = `[Unreleased]: ${REPO_URL}/compare/${version}...HEAD\n`;
  const firstLink = content.search(/^\[v\d+\.\d+\.\d+\]: /m);
  if (firstLink === -1) fail('no version link definitions found');
  content = content.slice(0, firstLink) + unreleasedLink + content.slice(firstLink);

  writeFileSync(path, content);
  console.log(`CHANGELOG reopened [Unreleased] after ${version}`);
}

if (command === 'release') release(rest[0], rest[1] ?? 'CHANGELOG.md');
else if (command === 'next') next(rest[0] ?? 'CHANGELOG.md');
else fail(`unknown command "${command}" (expected "release" or "next")`);
