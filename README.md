# @balena/compose-parser-v7

The original balena compose file parser, based on JSON schema, extracted from
[`@balena/compose`](https://github.com/balena-io-modules/balena-compose) so that
it can be maintained without being changed.

Releases are built with either this parser or
[`@balena/compose-parser`](https://github.com/balena-io-modules/balena-compose-parser)
(compose-go), and users move between them on their own schedule by upgrading the
CLI. That only works if this parser keeps behaving exactly as it does today,
which is what the package exists to guarantee.

## The point is that behavior does not change

This package gets Renovate coverage, because we want CVE patches. That is also
how behavior drifts, and a YAML loader can change how a compose file parses
without this parser changing at all.

So `test/snapshots/` covers the whole pipeline the builder runs, taking YAML
source through `js-yaml`, then `normalize` and `parse`. A dependency bump that
changes any of it fails CI instead of shipping.

A diff there is a behaviour change for everyone still on this parser, not a
snapshot to refresh. To review one:

```sh
UPDATE_SNAPSHOTS=1 npm test
git diff test/snapshots
```

`js-yaml` is pinned to v4 in `renovate.json` for the same reason, which means
forgoing a v5 CVE fix. Revisit that alongside the decision on how long this parser
stays supported, not on its own.

## Usage

```ts
import { normalize, parse, toModernImageDescriptors } from '@balena/compose-parser-v7';

const composition = normalize(JsYaml.load(source));
const descriptors = parse(composition);

// Adapt to the compose-go shape, so either parser feeds one build pipeline
const modern = toModernImageDescriptors(descriptors);
```

`toModernImageDescriptors` maps this parser's descriptors onto the
`@balena/compose-parser` types. Only descriptors, since the two compositions
differ in value and not only in shape, which `lib/adapter.ts` explains. Those types are a types-only optional
peer dependency: `@balena/compose-parser` ships a Go binary, and consumers that
only need the legacy parser should not have to install it.

## Maintaining

* Treat `lib/` as frozen. It was extracted verbatim from
  `balena-compose@dae995f^:lib/parse/` and should stay diffable against it.
* Fix bugs here only when this parser is demonstrably wrong, and say so in the changelog.
* New compose features belong in `@balena/compose-parser`, not here.
