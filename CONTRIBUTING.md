# Contributing to **Paymatic**

First off, thanks for taking the time to contribute! 🎉  This project lives on community support, and we’re grateful for every issue, pull‑request, review, and suggestion.

> **Note:** By participating in this project you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md) and responsible‐disclosure rules in [SECURITY.md](SECURITY.md).

---

## 📑 Table of Contents

1. [Getting Started](#getting-started)
2. [Branch & PR Workflow](#branch--pr-workflow)
3. [Coding Standards](#coding-standards)
4. [Testing & Coverage](#testing--coverage)
5. [Commit Messages](#commit-messages)
6. [Issue Reporting](#issue-reporting)
7. [Security](#security)
8. [License](#license)

---

## Getting Started

### 1. Fork & Clone

```bash
$ git clone https://github.com/<your-handle>/paymatic-contracts.git
$ cd paymatic-contracts
$ git remote add upstream https://github.com/crypto-paymatic/contracts.git
```

### 2. Install Dependencies

We use **yarn** in CI, but npm works too:

```bash
$ yarn
```

### 3. Build & Test

```bash
# compile contracts
$ yarn build

# run tests (Hardhat)
$ yarn test

# run tests (coverage)
$ yarn coverage
```

---

## Branch & PR Workflow

| Step | What to Do |
|------|------------|
| 1 | **Create an Issue** – outline the bug/feature first. |
| 2 | **Branch** – `git checkout -b feat/<name>` or `fix/<name>`. |
| 3 | **Commit Often** – keep commits focused and atomic. |
| 4 | **Rebase** on `main` – keep history clean: `git pull --rebase upstream main`. |
| 5 | **Open PR** – fill in the PR template, link issue, add screenshots/tests. |
| 6 | **Review Cycle** – address comments; maintainers will squash‑merge when ready. |

Pull‑requests must pass **CI** (lint, tests, coverage) before merge.

---

## Coding Standards

### Solidity

* Solidity ^0.8.27
* Follow the [Solidity Style Guide](https://docs.soliditylang.org/en/v0.8.27/style-guide.html).
* `solhint` / `prettier-plugin-solidity` enforce style: `yarn lint`.
* Use **NatSpec** for all external/public functions.
* Checks‑Effects‑Interactions; no inline assembly unless justified.

### TypeScript / Scripts

* `eslint` + `prettier` (auto‑fix on save) – run `yarn lint` before committing.
* Keep deployment scripts idempotent.

### Documentation

* Update **README.md** & **docs/** when behavior changes.
* Public/exported symbols need descriptive comments.

---

## Testing & Coverage

* Use Hardhat’s `chai` for unit tests and Foundry for fuzz / invariant tests.
* Cover:
  * Reentrancy & edge cases
  * Fee math & rounding
  * Access control & pausable branches
* Target **≥ 100 %** line coverage (`yarn coverage`).

---

## Commit Messages

We follow the **Conventional Commits** spec:

```
<type>(scope): <short summary>

<body> – optional, wrapped at 72 chars.

<footer> – optional: Closes #123
```

Valid `<type>` values: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

---

## Issue Reporting

* Search existing issues *before* opening a new one.
* Use the **bug** or **feature** template provided.
* Provide minimal reproduction steps or a failing test.

---

## Security

If you discover a security vulnerability, please **do not** open an issue. Follow the steps in [SECURITY.md](SECURITY.md).

---

## License

By contributing, you agree that your code will be released under the project’s **BSL‑1.0** license, unless you note otherwise in the PR.

---

Thanks for helping make **Paymatic** better! 💜


