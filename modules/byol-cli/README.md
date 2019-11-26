# BYOL CLI

[![CircleCI](https://img.shields.io/circleci/build/github/Swydo/byol/master.svg?label=circleci&style=flat-square)](https://circleci.com/gh/Swydo/custom-integrations) [![conventionalCommits](https://img.shields.io/badge/conventional%20commits-1.0.0-yellow.svg?style=flat-square)](https://conventionalcommits.org) [![GitHub](https://img.shields.io/github/license/Swydo/custom-integrations.svg?style=flat-square)](https://github.com/Swydo/custom-integrations/blob/master/LICENSE)

<img src="https://user-images.githubusercontent.com/2283434/52522860-25eee400-2c8b-11e9-8602-f8de0d158600.png">

---

A command line interface on top of [byol](../byol) that lets you easily invoke lamda functions from the command line or from
your code by starting your own lambda server.

## Install

Configure your project to pull @swydo packages from GitHub, also see [GitHub's documentation](https://help.github.com/en/github/managing-packages-with-github-packages/configuring-npm-for-use-with-github-packages#installing-packages-from-other-organizations).

```shell script
 echo "@swydo:registry=https://npm.pkg.github.com" >> .npmrc
```

Then install the module.

```shell script
npm install -g @swydo/byol-cli
```

## Commands

### start | start-lambda

Start an AWS-compatible Lambda server capable of running the functions defined in your `template.yml`. This is a
replacement for `sam local start-lambda`.

```shell script
byol start [-p PORT] [-s | --silent]
byol start-lambda [-p PORT] [-s | --silent]
```

With this server running you can call your Lambdas using the [aws-sdk](https://github.com/aws/aws-sdk-js).

### start-api

Starts a server mimicing API Gateway in proxy mode. Similar to `sam local start-api` you can call endpoints defined
in your template file. Currently, only event sources on the function resource `AWS::Serverless::Function` are supported.

```shell script
byol start-api [-p PORT] [-s | --silent]
```

With the server running, call your API over HTTP as usual.

### invoke

Invoke a function as defined in your `template.yml`. This is a replacement for `sam local invoke`.

```shell script
byol invoke -f FunctionName -e {} [-s | --silent]
```
