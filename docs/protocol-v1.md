# LAB protocol v1

The canonical implementation repository is `Lootziffer666/LAB`.

The v1 JSON wire identifier remains:

```json
{"module":"trivium-lab"}
```

This is deliberate compatibility, not repository ownership. DECOMPILE, TRIVIUM, WIZARD, SWIFT and SHADED already validate that identifier.

LAB bundles additionally expose:

```json
{"canonicalRepository":"Lootziffer666/LAB"}
```

A future protocol version may rename the wire identifier only through an explicit, versioned migration. It must not be changed merely because the code moved to a dedicated repository.
