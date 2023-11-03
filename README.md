# Remote Image CLI

Remote image cli (tobsmg-cli) is a simple CLI tool for interacting with a [remote-img](https://github.com/Tobshub/remote-img) server.

## Installation

Clone and build the package. 
This step requires nodejs and a node package manager of your choice(npm, yarn or pnpm).

Ensure you have `pkg` installed.

```bash
npm install -g pkg
```

```bash
$ git clone https://github.com/Tobshub/remote-img-cli.git
$ cd remote-img-cli
$ pnpm install && pnpm build
```

Then copy the executable for your platform from the `pkg-out` folder to a folder in your PATH.

On a linux machine with `$HOME/.local/bin` in the $PATH, that would be:
```bash
$ cp pkg-out/tobsmg-linux $HOME/.local/bin/tobsmg
```

An executable is built for linux, mac-os and windows.

## Usage

```bash
$ tobsmg --help
```

