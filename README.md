# install

```
pnpm i wasm-pack-inline -g
```

# use

```
wasm-pack build --target=web --out-dir ./wasm --release

wasm-pack-inline ./wasm --dir wasm-inline --name index
```
