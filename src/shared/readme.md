# {{title}}

A [Protokuda](https://github.com/dennisdunn/protokuda) screen, version {{version}}, made with
[Protokuda Studio](https://dennisdunn.github.io/pk-studio/) for Protokuda {{pkVersion}}.

## What's here

{{files}}

Open `index.html` in a browser. The font and Protokuda come from the web, pinned to exactly
version {{pkVersion}} so the page looks like it did in the studio:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap" />
<link rel="stylesheet" href="{{protokudaUrl}}" />
```

## Themes

{{themes}}

## Changing it

Open the project's `.json` file in [Protokuda Studio](https://dennisdunn.github.io/pk-studio/) to keep
editing; this folder is an export of it. Everything here is plain HTML and CSS, and Protokuda keeps its
rules in cascade layers, so your own CSS outside a layer overrides any of them, e.g.
`:root { --pk-primary: #f90; }`.
