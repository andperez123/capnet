# Settlement

Capital flow for Capnet: escrow → verify → release. Stripe (fiat) + Coinbase Agent Wallet (programmable crypto). Releases only when proof exists and trust thresholds are satisfied.

- **Intent:** POST /settlement/intent (create escrow / invoice / payment intent)
- **Release:** POST /settlement/release checks TrustGraph proof + thresholds → releases
- **Events:** payment.intent.created, payment.release.approved|denied, payment.released (see [docs/taxonomy.md](../../docs/taxonomy.md))

See [docs/services/settlement.md](../../docs/services/settlement.md) when available. Copy env from `.env.example`.
