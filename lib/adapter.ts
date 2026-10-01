import type {
	BuildConfig as ModernBuildConfig,
	Composition as ModernComposition,
	ImageDescriptor as ModernImageDescriptor,
	Service as ModernService,
} from '@balena/compose-parser';

import type {
	BuildConfig,
	Composition,
	ImageDescriptor,
	Service,
} from './types';

/**
 * Adapts this parser's output to the shape `@balena/compose-parser` emits, so a
 * consumer can feed results from either parser into one shared build pipeline.
 *
 * Only the fields that genuinely differ are mapped; everything else is
 * structurally identical and passes through. Types are imported as types only,
 * so this adds no runtime dependency. `@balena/compose-parser` ships a Go binary,
 * and consumers of the legacy parser should not have to install it.
 */

/**
 * `build.tag` (string, this parser) vs `build.tags` (string[], compose-go).
 *
 * We emit BOTH, deliberately. `@balena/compose` types its build pipeline
 * against the compose-go `ImageDescriptor`, but `multibuild/utils.ts` still
 * reads `tag` at runtime and `multibuild/build.ts` uses `task.tag` to name the
 * image. Emitting only `tags` would type-check and then silently stop tagging
 * images. The same bug already affects the compose-go path, where a service
 * declaring both `build:` and `image:` loses its tag.
 *
 * Drop `tag` here once `@balena/compose` reads `tags`.
 */
function adaptBuild(build: BuildConfig): ModernBuildConfig {
	const { tag, ...rest } = build;

	return {
		...rest,
		...(tag != null ? { tag, tags: [tag] } : {}),
	};
}

function adaptService(service: Service): ModernService {
	const { build, ...rest } = service;

	return {
		...rest,
		...(build != null ? { build: adaptBuild(build) } : {}),
	} as ModernService;
}

export function toModernComposition(
	composition: Composition,
): ModernComposition {
	return {
		version: composition.version,
		services: Object.fromEntries(
			Object.entries(composition.services).map(([name, service]) => [
				name,
				adaptService(service),
			]),
		),
		...(composition.networks != null ? { networks: composition.networks } : {}),
		...(composition.volumes != null ? { volumes: composition.volumes } : {}),
	} as ModernComposition;
}

/**
 * The form the build pipeline actually consumes: `@balena/compose`'s
 * `multibuild` takes `ImageDescriptor[]`, not a `Composition`.
 *
 * Note `tag` is only populated by this parser's `parse()`, not `normalize()`,
 * so adapt the descriptors rather than the composition when you need it.
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
