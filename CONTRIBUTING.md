# Contributing

Thanks for helping out!

1. Fork and clone the repo, then `npm install`.
2. Create a branch: `git checkout -b feat/my-change`.
3. Make your change and add tests where it makes sense.
4. Before pushing, run:
   ```bash
   npm run format && npm run lint && npm run typecheck && npm test && npm run build
   ```
5. Open a pull request using the template. Keep PRs focused and small.

## Commit style

We use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:` …).

## Reporting bugs / requesting features

Use the issue templates. For security issues see [SECURITY.md](SECURITY.md).
