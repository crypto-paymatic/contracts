# Security Policy

Paymatic is built with security first in mind. We follow a *responsible disclosure* policy and appreciate the community’s efforts to keep users’ funds safe.

---

## 📌 Supported Versions

| Version | Status | Maintained Until |
|---------|--------|-----------------|
| `main` / `HEAD` | **Active** | Ongoing |
| `v0.x`  | Bug‑fixes only | Until `v1.0.0` release |

Older branches are **out of scope** for security fixes except for critical, user‑fund‑impacting issues.

---

## 🔍 Scope

1. **Smart Contracts** in this repository (e.g. `contracts/PaymaticPayments.sol`).
2. **Deployment scripts** and hard‑coded configuration affecting on‑chain behavior.
3. **API keys / secrets leakage** in the codebase.

Out‑of‑scope:

* Front‑end UI/UX issues that do **not** risk loss/theft of funds.
* Third‑party dependencies (please report upstream).
* Denial‑of‑Service vectors requiring L1 consensus failure.

---

## 📣 Reporting a Vulnerability

1. **Email:** `i@axot.io` with the subject line `[SECURITY] <short title>`.
2. **PGP:** Encrypt your message (optional). Our public key: [`keyserver.ubuntu.com` – *0xBEEFCAFE*].
3. Include **step‑by‑step reproduction** and, if possible, a **minimal PoC**.
4. *Do not* create public GitHub issues or Pull Requests for vulnerabilities.

We will:

| Step | Timeline |
|------|----------|
| Acknowledge report | within **2 business days** |
| Investigate & confirm | within **5 business days** |
| Propose remediation plan & ETA | within **10 business days** |
| Release fix & public disclosure | typically **≤ 30 days**—may extend for critical L1 issues |

> **Thanks & Credit** – With your permission we will credit you in release notes. We currently do **not** run a formal bounty program; exceptional reports may receive discretionary rewards.

---

## 🛡️ Coordinated Disclosure Window

We follow the [90‑day disclosure standard](https://github.com/google/security-research-pocs). If a wider community fix is required or user funds are at immediate risk, we may request a shorter (< 90 days) embargo.

---

## 🔗 Third‑Party Dependencies

Paymatic leverages OpenZeppelin contracts. If you discover an issue in upstream libraries, please also notify the respective maintainers.

---

## 🧩 Development Best Practices

* All external calls occur **after** state mutation (`checks‑effects‑interactions`).
* `ReentrancyGuard` patterns reinforced via limited ERC‑20 transfer surfaces.
* All arithmetic uses Solidity ≥ 0.8.* built‑in overflow checks.
* Continuous fuzz & invariant testing in CI.

---

## 🤝 Contact

* Email: `i@axot.io`
* Twitter/X: [@paymatic](https://twitter.com/paymatic)

Your vigilance keeps Paymatic—and our users—safe. *Thank you!*


