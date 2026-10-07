import type {
	BuildConfig as ModernBuildConfig,
	ImageDescriptor as ModernImageDescriptor,
} from '@balena/compose-parser';

import type { BuildConfig, ImageDescriptor } from './types';

/**
 * Adapts this parser's image descriptors to the shape `@balena/compose-parser`
 * emits, so a consumer can feed results from either parser into one build
 * pipeline. Descriptors are what the pipeline takes.
 *
 * Types are imported as types only, so this adds no runtime dependency.
 * `@balena/compose-parser` ships a Go binary and consumers of this parser should
 * not have to install it.
 *
 * Only descriptors are adapted. A whole `Composition` is not, because the two
 * differ in value across thirteen fields of `Service` and two each of `Network`
 * and `Volume`. compose-go normalizes while it parses and this parser does not,
 * so it emits `dns: "8.8.8.8"` where compose-go emits `["8.8.8.8"]`,
 * `expose: [8080]` against `["8080"]`, `sysctls: ["k=v"]` against `{ k: "v" }`,
 * and so on. Converting all of that would be reimplementing someone else's
 * normalizer, and `command` could not be converted faithfully anyway, since
 * compose-go splits a string the way a shell would and getting the quoting
 * slightly wrong changes what a container runs.
 *
 * `BuildConfig` and `ImageDescriptor` are the two types that do match, which is
 * why this adapter is the shape it is.
 */

/**
 * `build.tag` (string, here) vs `build.tags` (string[], compose-go).
 *
 * We emit both, deliberately. `@balena/compose` types its build pipeline against
 * the compose-go descriptor but still reads `tag` at runtime to name the image,
 * so emitting only `tags` would type-check and then quietly stop tagging. The
 * cast covers `tag`, which the modern type does not have.
 *
 * Drop both once `@balena/compose` reads `tags`.
 */
function adaptBuild(build: BuildConfig): ModernBuildConfig {
	const { tag, ...rest } = build;

	return {
		...rest,
		...(tag != null ? { tag, tags: [tag] } : {}),
	};
}

/**
 * Note `tag` is only populated by `parse()`, not `normalize()`, so adapt the
 * descriptors rather than the composition when you need it.
 */
export function toModernImageDescriptors(
	descriptors: ImageDescriptor[],
): ModernImageDescriptor[] {
	return descriptors.map((descriptor) => ({
		...descriptor,
		image:
			typeof descriptor.image === 'string'
				? descriptor.image
				: adaptBuild(descriptor.image),
	}));
}
