# Custom Blender `.glb` Models

Drop exported `.glb` files from Blender into this folder (`public/models/`) and set `modelUrl` on any drink in `src/data/cocktails.js`:

```js
// Example in src/data/cocktails.js:
modelUrl: '/models/negroni.glb'
```

You can also test any `.glb` file live in the running app without touching code: tap the **`•••`** button in the top-right corner of the menu and choose **Upload Custom `.glb` for Current Drink**.
