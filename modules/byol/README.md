# BYOL

[![CircleCI](https://img.shields.io/circleci/build/github/Swydo/byol/master.svg?label=circleci&style=flat-square)](https://circleci.com/gh/Swydo/custom-integrations) [![conventionalCommits](https://img.shields.io/badge/conventional%20commits-1.0.0-yellow.svg?style=flat-square)](https://conventionalcommits.org) [![GitHub](https://img.shields.io/github/license/Swydo/custom-integrations.svg?style=flat-square)](https://github.com/Swydo/custom-integrations/blob/master/LICENSE)

<img src="https://user-images.githubusercontent.com/2283434/52522860-25eee400-2c8b-11e9-8602-f8de0d158600.png">

---

Invoke lamda functions from your code.

## Install

Configure your project to pull @swydo packages from GitHub, also see [GitHub's documentation](https://help.github.com/en/github/managing-packages-with-github-packages/configuring-npm-for-use-with-github-packages#installing-packages-from-other-organizations).

```shell script
 echo "@swydo:registry=https://npm.pkg.github.com" >> .npmrc
```

Then install the module.

```shell script
npm install -g @swydo/byol
```
