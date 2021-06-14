# Remirror Yjs Annotations Demo (via WebRTC)

## Motivation

Collaborative editing allows more than one person to work on the same document at the same time. Our literature research answered many questions how to implement collaborative editing in a server architecture - but also left us with a couple of unknowns.

This repo contains our proof of concept to address the following unknowns:

1. **How do you approach collaborative editing in a _serverless architecture_?**

   The traditional approach for collaboration is a centralised server that mediates changes made by concurrent users. In particular, Yjs `y-websocket` requires to run a server with a permanent in-memory model of the document. This obviously conflicts with our goal of a serverless architecture.

   Centralised approaches also suffer from latency issues, and are a single point of failure.

   If collaborators could connect to each other directly (peer-to-peer) we could remove the need for a server at all.

2. **How and _when_ to persist document data?**

   Without a central instance (like Yjs `y-websocket`), we're also in charge of persisting the document on which the users collaborate. We could save the entire document to the backend or just the changes that are then merged into the main document.

   We also need to think about _when_ to save - if concurrent users are collaborating on the same document we could end up multiple users trying to save at the same time - leading to an unnecessary spike in traffic, or a conflict when trying to merge changes on the backend.

   There are a variety of approaches to consider, perhaps we could:

   - Save the document, when the last user closes it
   - Save the document, when _any_ user closes it
   - Save changes regularly, irrespective of whether collaboration is still taking place.

3. **How do we allow multiple documents to be opened in parallel?**

   Users may be collaborating on multiple documents at any one time, how do we keep track of which edits relate to which document?

4. **How do we share annotation data, that is additional data structure and not part of the document.**

   [Annotations](https://github.com/remirror/remirror/tree/beta/packages/remirror__extension-annotation) (or comments) append notes to the main body of document text, however they are not part of the document itself. They should be considered to be a separate data structure of metadata, with references to specific positions in the document where they relate.

   Known approaches for collaboration sync the main body of text, but can we collaborate on associated data structures too?

## Our approach

### [Live demo](https://collaborne.github.io/remirror-yjs-webrtc-demo)

Or locally

1. `npm install`
2. `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

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

[WebRTC](https://medium.com/@mindfiresolutions.usa/why-should-every-web-developer-need-to-know-about-webrtc-9d14a3ae513f) enables real time communication between browsers directly, a signalling server is required to broker the initial peer-to-peer connections, but serves no other purpose.

## Outcomes

### 1. How do you approach collaborative editing in a _serverless architecture_?

Earlier we stated a peer-to-peer approach is likely the best way to achieve collaboration without a centralised server. WebRTC provides this framework.

WebRTC **does** require a centralised signalling server, but public servers are available, so we wouldn't need to provide our own. In addition they only broker connections, rather than mediating changes.

Using the fantastic technologies above, it proved to be rather trivial to set up a basic collaborative editor using WebRTC. Using Remirror's Yjs extension, and a [`y-webrtc` provider](https://github.com/yjs/y-webrtc), I had a working POC in just a few lines of code.

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

// N.B. this doesn't seem to work in React's strict mode?
return (
  <ThemeProvider>
    <Remirror manager={manager} autoRender />
  </ThemeProvider>
)
```
<!-- prettier-ignore-end -->

![Basic Collobrative Editing](https://user-images.githubusercontent.com/2003804/121685983-80e1b180-cab8-11eb-84ef-f959f54088be.png)

Of course this is very bare bones, so tweaking the ["awareness"](https://docs.yjs.dev/api/about-awareness) config makes for a more realistic end user experience.

We decided to use custom hooks to supply the provider, so we can utilise other hooks like `useContext` to obtain user details for the providers' awareness config.

### 2. How and _when_ to persist document data?

Earlier we outlined 3 potential approaches

#### a. Save the entire document, when the last user closes it

This first approach removes the chance of multiple saves occurring simultaneously, however it is risky as the last user could lose internet connection, and all the work done by multiple users could be lost.

#### b. Save the entire document, when _any_ user closes it

This is a slight improvement on the first, mitigating the last user being the single point of failure. However, it may lead to a significant amount of users saving the document at the same time. Imagine users collaborating in a meeting room together, the meeting ends and they all close at the same time.

#### c. Save changes regularly, irrespective of whether collaboration is still taking place.

This approach is more akin to autosave, this obviously would lead to an increase in backend traffic, as we're saving much more often.

A standard approach to autosave is to trigger a submission of data after a few seconds of inactivity (debounced save).

This debounced save still needs careful consideration, _x_ seconds after the last change, is the same for all users. To combat this, our approach is assign a randomised debounce timeout (anywhere between 3 to 10 seconds) to each user. The user with the lowest timeout will save the document first, upon which they update a meta property on the Y.Doc. This is used to notify the other users **not** to save.

If the user with lowest timeout value disconnects, (or fails to save) the user with the _next_ lowest value will save the document instead.

### 3. How do we allow multiple documents to be opened in parallel?

This turned out to be fairly simple, Yjs has the concept of "Rooms", which fences off the document modifications made within it.

By using a document ID to create a room name, we can have a unique but consistent room name to allow multiple users to edit multiple documents simultaneously.

### 4. How do we share [annotation](https://github.com/remirror/remirror/tree/beta/packages/remirror__extension-annotation) data, that is additional data structure and not part of the document.

The out-of-the-box setup with Remirror's Yjs extension works brilliantly for synchronising document text (consisting of nodes and marks).

These are present in a serialised ProseMirror document (XML or JSON for instance) - the `y-prosemirror` implementation uses a `Y.XMLFragment` as it's shared data type.

_Decorations_ however are **not** part of a serialised ProseMirror document, and so these are _not_ shared. Remirror's Annotation extension uses inline **decorations** to highlight regions of text, so to enable collaboration on these data structures we needed to build our own solution.

The Annotation extension provides commands and helpers to modify and obtain annotations data respectively. It uses a plugin that listens to transactions and takes the appropriate action to update the internal array.

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

#### Relative vs Absolute positions

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
private transformPosition(pos: number): RelativePosition {
  const state = this.store.getState();
  const { type, binding } = ySyncPluginKey.getState(state);
  return absolutePositionToRelativePosition(pos, type, binding.mapping);
}

private transformPositionBeforeRender(relPos: RelativePosition): number | null {
  const state = this.store.getState();
  const { type, binding } = ySyncPluginKey.getState(state);
  return relativePositionToAbsolutePosition(this.provider.doc, type, relPos, binding.mapping);
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

## Open questions

We would appreciate any and all feedback from the community.

Please create [discussions](https://github.com/Collaborne/remirror-yjs-webrtc-demo/discussions) for general talking points, or [issues](https://github.com/Collaborne/remirror-yjs-webrtc-demo/issues) or pull request for bugs.

In particular we would love feedback in the areas below

1. Is the Yjs extension assuming annotations should be shared a step too far? Are there simpler solutions?
2. Is the approach to persisting the document sensible?
3. Does this solution have any blind spots, that mean this would not work in practice, or do you have alternative suggestions?

## Concerns

1. Remirror's Yjs extension doesn't appear to work in React's strict mode. Why?
2. Remirror places [default options on the extensions' constructor](https://github.com/remirror/remirror/blob/270edd91ba6badf9468721e35fa0ddc6a21c6dd2/packages/remirror__core/src/extension/extension-decorator.ts#L171), this seems problematic?
   - If you supply an object instance as a default option, it will be used by all instances of an Editor, leading to documents data bleeding in to one-another
   - The workaround is to use a function that creates a default argument, i.e. `getMap: () => new Map()`
   - Should default options be provided via a function instead? i.e. `this.getDefaultOptions()`

## Related pull requests

[remirror/remirror#956](https://github.com/remirror/remirror/pull/956)

[yjs/yjs#390](https://github.com/yjs/yjs/pull/309)
