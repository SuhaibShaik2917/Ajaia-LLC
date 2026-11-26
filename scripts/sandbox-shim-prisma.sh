#!/bin/sh
# Sandbox-only workaround.
#
# `prisma generate` probes the schema-engine binary for its version even though
# Prisma 7 generation does not use it. In this offline sandbox the binary cannot
# be downloaded from binaries.prisma.sh, so we drop in a stub that answers
# `--version`. Nothing else in the CLI can use the stub (db push still needs the
# real engine), which is why prisma/sql/init.sql exists as a bootstrap fallback.
set -e
COMMIT="${PRISMA_ENGINE_COMMIT:-d1b3f377ca835d73fd50954a5e22128b9ebdd6b8}"
TARGET="node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x"
if [ -f "$TARGET" ] && [ ! -x "$TARGET" ]; then :; fi
printf '#!/bin/sh\necho "schema-engine-cli %s"\n' "$COMMIT" > "$TARGET"
chmod +x "$TARGET"
echo "Stubbed $TARGET"
