# BYOL CLI

[![GitHubActions](https://img.shields.io/github/workflow/status/Swydo/byol/release.svg?label=github%20actions&style=flat-square)](https://github.com/Swydo/byol/actions) [![conventionalCommits](https://img.shields.io/badge/conventional%20commits-1.0.0-yellow.svg?style=flat-square)](https://conventionalcommits.org) [![GitHub](https://img.shields.io/github/license/Swydo/byol.svg?style=flat-square)](https://github.com/Swydo/byol/blob/master/LICENSE)

<img src="https://user-images.githubusercontent.com/2283434/52522860-25eee400-2c8b-11e9-8602-f8de0d158600.png">

---

A command line interface on top of [byol](../byol) that lets you easily invoke lamda functions from the command line or from
your code by starting your own lambda server.

## Install

```shell script
npm install -g @swydo/byol-cli
```

## Commands

### start (default)

Combine both `start-lambda` and `start-api`. Start an AWS-compatible Lambda server as well as a server mimicing 
API Gateway on the same port.

```shell script
byol [-p PORT] [-s | --silent] [--keep-alive] [--template-path] [--env-path] [--profile]
byol start [-p PORT] [-s | --silent] [--keep-alive] [--template-path] [--env-path] [--profile]
```

With this server running you can call your Lambdas using the [aws-sdk](https://github.com/aws/aws-sdk-js) and your
API over HTTP as usual.

### start-lambda

Start an AWS-compatible Lambda server capable of running the functions defined in your `template.yml`. This is a
replacement for `sam local start-lambda`.

```shell script
byol start-lambda [-p PORT] [-s | --silent] [--keep-alive] [--template-path] [--env-path] [--profile]
```

With this server running you can call your Lambdas using the [aws-sdk](https://github.com/aws/aws-sdk-js).

### start-api

Starts a server mimicing API Gateway in proxy mode. Similar to `sam local start-api` you can call endpoints defined
in your template file. Currently, only event sources on the function resource `AWS::Serverless::Function` are supported.

```shell script
byol start-api [-p PORT] [-s | --silent] [--keep-alive] [--template-path] [--env-path] [--profile]
```

With the server running, call your API over HTTP as usual.

### invoke

Invoke a function as defined in your `template.yml`. This is a replacement for `sam local invoke`.

```shell script
byol invoke -f FunctionName -e {} [-s | --silent] [--template-path] [--env-path] [--profile]
```
