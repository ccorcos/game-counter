# Game Score Counter

[Live App](https://ccorcos.github.io/game-counter)

A simple application for keeping score in games. For example, golf or Settlers of Catan.

## Architecture

- No side-effects at the top level except for index.tsx.
- External effects interface through services defined on the Environment.
- The Environment is plumbed around everywhere.
- TupleDatabase as a UI state management system.

## Development

```sh
git clone git@github.com:ccorcos/game-counter.git
cd game-counter
npm install
npm start
```
