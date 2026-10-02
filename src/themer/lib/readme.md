# {{label}}

A [Protokuda](https://github.com/dennisdunn/protokuda) theme, version {{version}},
made for Protokuda {{pkVersion}}.

## How to use the theme

Put `{{file}}` next to your page and link it **after** Protokuda. The font and the library
come from the web:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap" />
<link rel="stylesheet" href="{{protokudaUrl}}" />
<link rel="stylesheet" href="{{file}}" />
```

That themes the whole page. To theme just part of it instead (one frame or section), add the
class to that element:

```html
<div class="pk-frame pk-std pk-theme-{{name}}">...</div>
```

The class works on its own, or inside a page that uses a different theme.

## Changing it

Open `{{file}}` in the themer of [Protokuda Studio](https://dennisdunn.github.io/pk-studio/#/themer) to keep editing.
The theme is plain CSS custom properties in Protokuda's `protokuda.theme` cascade layer, so your
own CSS outside a layer overrides any of them, e.g. `:root { --pk-primary: #f90; }`.
