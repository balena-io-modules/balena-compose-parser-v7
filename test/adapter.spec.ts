import { expect } from 'chai';
import { describe, it } from 'mocha';

import { normalize, parse, toModernImageDescriptors } from '../lib';

describe('adapter', () => {
	describe('toModernImageDescriptors', () => {
		it('emits both tag and tags for a service with build and image', () => {
			const composition = normalize({
				version: '2.1',
				services: {
					main: { build: { context: './' }, image: 'named/result' },
				},
			});
			const [descriptor] = toModernImageDescriptors(parse(composition));
			const build = descriptor.image as any;

			// `tags` satisfies the compose-go shape...
			expect(build.tags).to.deep.equal(['named/result']);
			// ...and `tag` keeps @balena/compose's build pipeline working, which
			// still reads it at runtime. Remove once that reads `tags`.
			expect(build.tag).to.equal('named/result');
		});

		it('leaves a plain image descriptor alone', () => {
			const composition = normalize({
				version: '2.1',
				services: { main: { image: 'alpine' } },
			});
			const [descriptor] = toModernImageDescriptors(parse(composition));

			expect(descriptor.image).to.equal('alpine');
			expect(descriptor.serviceName).to.equal('main');
		});

		it('adds no tag when the service has no image', () => {
			const composition = normalize({
				version: '2.1',
				services: { main: { build: { context: './' } } },
			});
			const [descriptor] = toModernImageDescriptors(parse(composition));
			const build = descriptor.image as any;

			expect(build).to.not.have.property('tag');
			expect(build).to.not.have.property('tags');
			expect(build.context).to.equal('./');
		});
	});
});
