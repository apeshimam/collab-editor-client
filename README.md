This is a collaborative code edtior based upon Monaco and Automerge.

To run:

```npm run start```

You can then visit the app at http://0.0.0.0:9000.

Note that this client expects a WebSocket Server to be available at http://localhost:3000. Running the applicatio with out the WebSocket Server will surface errors in the web console, but the content will save successfully and merge when WebSocket server is again available.

You can use the server available at https://github.com/apeshimam/websockets-server-ts
