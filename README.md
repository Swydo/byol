# BYOL

[![GitHubActions](https://img.shields.io/github/workflow/status/Swydo/byol/release.svg?label=github%20actions&style=flat-square)](https://github.com/Swydo/byol/actions) [![conventionalCommits](https://img.shields.io/badge/conventional%20commits-1.0.0-yellow.svg?style=flat-square)](https://conventionalcommits.org) [![GitHub](https://img.shields.io/github/license/Swydo/byol.svg?style=flat-square)](https://github.com/Swydo/byol/blob/master/LICENSE)

<img width="830" alt="Github Header" src="https://user-images.githubusercontent.com/2283434/183906965-4d07a08e-81a7-4960-980d-768dcc188562.png">

---

BYOL (Bring Your Own Lambda) consists of a set of tools to help you run your Node.js Lambda functions in your dev
environment. It aims to be a minimal replacement for [aws-sam-cli](https://github.com/awslabs/aws-sam-cli) without
requiring Docker or Python.

Although it doesn't as great of a job at mimicking the AWS environment, it will run your code with minimal from effort from
your side as long as the code isn't too picky about where or how it runs.

## When to uses BYOL

- You have a `sam` compatible setup but want to use `npm link`.
- Your Lambda functions are part of a "mono repository" powered by [lerna](https://github.com/lerna/lerna) or a similar tool that uses symlinks.
- You want a "good enough" development environment that uses the tools you are already using.

## Modules

- [byol](modules/byol)
- [byol-cli](modules/byol-cli)
