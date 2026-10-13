import { expect } from 'chai';
import * as fs from 'fs';
import * as yml from 'js-yaml';
import { describe, it } from 'mocha';
import * as path from 'path';

import { normalize, parse } from '../lib';

/**
 * The point of this package is that its behaviour does not change. Renovate keeps
 * it patched, which is what we want for CVEs, and is also how behaviour drifts,
 * since a YAML loader can change how a compose file parses without this parser
 * changing at all.
 *
 * The parser takes an already-loaded object, so snapshotting it on its own would
 * miss that. These run the whole pipeline the builder runs, taking YAML source
 * through js-yaml, then normalize and parse.
 *
 * To review an intentional change: UPDATE_SNAPSHOTS=1 npm test, then read the
 * diff. A diff here is a behaviour change in this parser, not a snapshot to
 * refresh.
 */

const SNAPSHOT_DIR = path.join(__dirname, 'snapshots');
const UPDATE = process.env.UPDATE_SNAPSHOTS === '1';

const fixtures = fs
	.readdirSync(SNAPSHOT_DIR)
	.filter((f) => f.endsWith('.yml'))
	.sort();

describe('snapshots', () => {
	// A run that rewrote snapshots proves nothing, so do not let it report green.
	after(() => {
		if (UPDATE) {
			throw new Error(
				'UPDATE_SNAPSHOTS=1 rewrote the snapshots, so this run proves nothing. ' +
					'Read git diff test/snapshots, then run the tests again without it.',
			);
		}
	});

	// An empty fixture list would pass every assertion below.
	it('has fixtures', () => {
		expect(fixtures).to.not.be.empty;
	});

	it('has no snapshot without a fixture', () => {
		const orphans = fs
			.readdirSync(SNAPSHOT_DIR)
			.filter((f) => f.endsWith('.json'))
			.filter((f) => !fixtures.includes(f.replace(/\.json$/, '.yml')));

		expect(orphans).to.deep.equal([]);
	});

	fixtures.forEach((fixture) => {
		it(fixture, () => {
			const source = fs.readFileSync(path.join(SNAPSHOT_DIR, fixture), 'utf-8');
			const composition = normalize(yml.load(source) as any);
			const actual = {
				// parse() mutates what it is given, it appends build.tag, so keep a
				// copy of the composition as normalize() left it.
				composition: structuredClone(composition),
				descriptors: parse(composition),
			};

			const snapshotPath = path.join(
				SNAPSHOT_DIR,
				fixture.replace(/\.yml$/, '.json'),
			);

			if (UPDATE || !fs.existsSync(snapshotPath)) {
				fs.writeFileSync(
					snapshotPath,
					JSON.stringify(actual, null, '\t') + '\n',
				);
				if (!UPDATE) {
					throw new Error(
						`No snapshot for ${fixture}; wrote one. Review it and commit.`,
					);
				}
				return;
			}

			const expected = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
			expect(actual).to.deep.equal(expected);
		});
	});
});

describe('yaml loader', () => {
	// Kept as its own assertion so a loader that stops accepting this form names
	// itself in the failure, rather than showing up as a snapshot diff.
	it('resolves merge keys in the multi-line flow form', () => {
		const loaded = yml.load(
			['a: &a', '  x: 1', 'b:', '  <<: [', '    *a', '  ]'].join('\n'),
		) as any;
		expect(loaded.b).to.deep.equal({ x: 1 });
	});
});
