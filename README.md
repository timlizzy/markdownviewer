# Markdown Viewer

A local markdown viewer that runs in the browser. Supports Mermaid diagrams, syntax-highlighted code blocks, dark mode, and live file watching.

## Features

- Drag-and-drop or file picker to open `.md` / `.markdown` files
- Live auto-refresh when the file changes on disk (via File System Access API)
- Mermaid diagram rendering (flowcharts, sequence diagrams, etc.)
- Syntax highlighting via highlight.js
- Dark/light mode (follows system preference, manually toggleable)
- Keyboard shortcut: `Cmd/Ctrl+O` to open a file

## Install

```bash
npm install
```

## Usage

### Run locally

```bash
npm start
```

Opens the server at `http://localhost:3060`. Open a `.md` file in the browser UI.

### Global CLI

Install globally to use the `mdview` command from anywhere:

```bash
npm install -g .
```

Then run from any directory:

```bash
mdview               # starts on :3060 and opens your browser
mdview -p 4000       # custom port
mdview --no-open     # skip auto-opening the browser
mdview --help        # show options
```

#### Options

| Flag | Default | Description |
|------|---------|-------------|
| `-p`, `--port <number>` | `3060` | Port to listen on |
| `--no-open` | — | Do not open the browser automatically |
| `-h`, `--help` | — | Show help |

## Requirements

- Node.js 16+
- A modern browser (Chrome/Edge recommended for live file watching — requires the File System Access API)
