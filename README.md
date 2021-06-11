# Remirror Yjs Annotations Demo (via WebRTC)

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## [Live demo](https://collaborne.github.io/remirror-yjs-webrtc-demo)

## Getting started

1. `npm install`
2. `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

## About this this proof of concept

### Aims

The primary goal is to learn more about collaborative editing in a _serverless architecture_.

Additionally, as [annotations](https://github.com/remirror/remirror/tree/beta/packages/remirror__extension-annotation) are the basis of a key feature in Collaborne's NEXT app, we need to enable collaboration on both text _and_ annotation modifications.

### Background

The traditional approach for collaboration is a centralised server that mediates changes made by concurrent users. This is obviously contrary to our aim. Centralised approaches also suffer from latency issues, and are a single point of failure.

If collaborators could connect to each other directly (peer-to-peer) we could remove the need for a server at all. [WebRTC](https://medium.com/@mindfiresolutions.usa/why-should-every-web-developer-need-to-know-about-webrtc-9d14a3ae513f) provides this framework.

### Technologies used

#### Create React App

Does what is says on the tin.

#### Yjs

[Yjs](https://github.com/yjs/yjs) is a CRDT framework that enables peer-to-peer collaboration on shared data types. Yjs also provides an ecosystem of editor bindings for a wide range of open source editors (e.g. [Quill](https://github.com/yjs/y-quill) and [ProseMirror](https://github.com/yjs/y-prosemirror)) that enable collaborative editing.

#### Remirror

[Remirror](https://github.com/remirror/remirror) is a wrapper library for ProseMirror, it creates an abstraction layer that makes ProseMirror much easier to work with, as well as providing React and ProseMirror integration.

Remirror provides extensions, that abstract over various ProseMirror concepts such as schemas, commands and plugins, making it much simpler to group related logic together. Using these extensions it is much easier to construct an out-of-the-box editor, whilst still maintaining the flexibility that ProseMirror is known for.

Remirror provides a Yjs extension, and using a WebRTC [provider](https://github.com/yjs/yjs#providers), we allow peers to connect to one another to collaborate.

#### WebRTC

WebRTC enables real time communication between browsers directly, a signalling server is required to broker the initial peer-to-peer connections, but serves no other purpose. Furthermore public signalling servers are available, so you don't need to provide your own.

## Approach

### Setup

Using the fantastic technologies above, it proved to be rather trivial to set up a basic collaborative editor. Using Remirror's Yjs extension, and a [`y-webrtc` provider](https://github.com/yjs/y-webrtc), I had a working POC in just a few lines of code.

<!-- prettier-ignore-start -->
```jsx
// src/BasicEditor.tsx

const ydoc = new Y.Doc()

const { manager } = useRemirror({
  extensions: () => [
    new YjsExtension({
      getProvider: () => new WebrtcProvider('my-room', ydoc)
    })
  ]
});

return (
  <ThemeProvider>
    <Remirror manager={manager} autoRender />
  </ThemeProvider>
)
```
<!-- prettier-ignore-end -->

![Basic Collobrative Editing](https://user-images.githubusercontent.com/2003804/121685983-80e1b180-cab8-11eb-84ef-f959f54088be.png)

Of course this is very bare bones, so tweaking the ["awareness"](https://docs.yjs.dev/api/about-awareness) config makes for a more realistic end user experience.

We decided to use custom hooks to supply the provider, so we can utilise other hooks like `useContext` to obtain user details for the providers awareness config.

### Annotations

The setup above works perfectly for nodes and marks, as these are present in a serialised ProseMirror document (the `y-prosemirror` implementation uses a `Y.XMLFragment` as it's shared data type). _Decorations_ however are **not** part of the serialised document, and so are not shared.

Remirror's Annotation extension uses inline decorations to highlight regions of text, so to enable collaboration on these data structure we needed to build our own solution.

The Annotation extension provides commands and helpers to modify and obtain annotations data respectively. It uses a plugin that listens to transcactions and takes the appropriate action to update the internal array.

One solution would be to replace this array with a Y.Array instead. However being open source, we need to think beyond our own use cases. Just because you're using the annotation extension, doesn't mean you're also using Yjs, (plus Y.Array has a different API - more on that later). So adding a Yjs dependency to the annotations extension in a no-go.

Ideally we would pass an option to the annotation extension, indicating what kind of data structure to use, or we could **pass the structure directly**. Unfortunately `Y.Array` and the native `Array` have different APIs, so we would need to detect which data structure is being used, before each operation, or polyfill the missing methods.

|        | Native Array     | Y.Array            |
| ------ | ---------------- | ------------------ |
| Read   | `arr[0]`         | `arr.get(0)`       |
| Write  | `arr[0] = 1`     | `arr.insert(0, 1)` |
| Remove | `arr.filter(cb)` | `arr.delete(0, 1)` |

A much better alternative is `Y.Map` as this has a near identical API to a native `Map`.

|        | Native Map      | Y.Map           |
| ------ | --------------- | --------------- |
| Read   | `map.get(0)`    | `map.get(0)`    |
| Write  | `map.set(0, 1)` | `map.set(0, 1)` |
| Remove | `map.delete(0)` | `map.delete(0)` |

Now it doesn't matter if we get a `Y.Map` or a native `Map` via options, we can use the same methods without any overhead or polyfills.

This being open source, we should avoid breaking changes (or risk the wrath of [@ankon](https://github.com/ankon)) and ensure Annotation extension's helpers still return arrays, rather than maps. Fortunately we can use the map as an _internal_ data structure in the plugin, and write trivial code to keep the helpers non-breaking.

Next we obtain a `Y.Map` from our `Y.Doc`, and pass that via the extension options.

<!-- prettier-ignore-start -->
```jsx
// src/BasicEditor.tsx

const ydoc = new Y.Doc()

const { manager } = useRemirror({
  extensions: () => [
    new YjsExtension({
      getProvider: () => new WebrtcProvider('my-room', ydoc)
    }),
	new AnnotationExtension({
      getMap: () => ydoc.getMap('annotations')
    })
  ]
});

return (
  <ThemeProvider>
    <Remirror manager={manager} autoRender />
  </ThemeProvider>
)
```
<!-- prettier-ignore-end -->

We're halfway there, we're now sharing our annotations, but we're not yet updating our own view with annotation _others_ have created.

For that, we need to listen for changes on the shared `Y.Map` and update our own view accordingly.

<!-- prettier-ignore-start -->
```js
ydoc.on('update', () => {
  this.store.commands.redrawAnnotations();
});
```
<!-- prettier-ignore-end -->

If life were oh-so-simple, **I did say we're only halfway there**.

### Relative vs Absolute positions

Stealing from the [Yjs docs](https://docs.yjs.dev/ecosystem/editor-bindings/prosemirror)

> Index positions don't work as expected in ProseMirror. Instead of indexes, you should use **relative positions** that are based on the Yjs document. Relative positions always point to the place where you originally put them (relatively speaking). In peer-to-peer editing, it is impossible to transform index positions so that everyone ends up with the same positions.

Here we have a few requirements

1. Take _absolute_ positions from the commands exposed by the annotation extension
2. Transform these to _relative_ positions for the shared `Y.Map`
3. Transform our shared relative positions back to _absolute_ positions, for the decorations, and the helper methods.

Transforming between these position types requires access to a lot of the Yjs internals, which the annotation extension does not have direct access to. Perhaps the best course of action is to expose options in the annotation extension, that enable the transforming of positions. These can default to an identity function (a fancy way of saying a function that does nothing).

As we require a lot of Yjs internals, this should be handled by the Yjs extension.

<!-- prettier-ignore-start -->
```ts
private transformPosition(pos: number): number {
  const state = this.store.getState();
  const { type, binding } = ySyncPluginKey.getState(state);
  return absolutePositionToRelativePosition(pos, type, binding.mapping);
}

private transformPositionBeforeRender(pos: number): number | null {
  const state = this.store.getState();
  const { type, binding } = ySyncPluginKey.getState(state);
  return relativePositionToAbsolutePosition(this.provider.doc, type, pos, binding.mapping);
}
```
<!-- prettier-ignore-end -->

Now for the hairy part (**it would be especially useful to have feedback here**), we use the `onView` lifecycle of the Yjs extension, to detect the presence of the annotation extension, and override it's options to pass in all these options.

<!-- prettier-ignore-start -->
```ts
onView(): void {
  try {
    this.store.manager.getExtension(AnnotationExtension).setOptions({
      getMap: () => this.provider.doc.getMap('annotations'),
      transformPosition: this.transformPosition.bind(this),
      transformPositionBeforeRender: this.transformPositionBeforeRender.bind(this),
    });
    this.provider.doc.on('update', () => {
      this.store.commands.redrawAnnotations?.();
    });
  } catch {
    // AnnotationExtension isn't present in editor
  }
}
```
<!-- prettier-ignore-end -->

### Persistence

In addition to collaborating on a document we also need to save it. A standard approach to autosave is to trigger a submission of data after a few seconds of inactivity.

However when multiple users are collaborating on the same document this could lead to multiple users trying to save at the same time - leading to an unnecessary spike in traffic. To combat this, each user is assigned a randomised debounce timeout (between 3-10 seconds). The user with the _lowest_ timeout will save the document first, we then update a meta property on the `Y.Doc`. This is used to notify the other users **_not_** to save.

## Related pull requests

[remirror/remirror#956](https://github.com/remirror/remirror/pull/956)

[yjs/yjs#390](https://github.com/yjs/yjs/pull/309)
