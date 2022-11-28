This is a collaborative code edtior based upon Monaco and Automerge.

To run:

```npm run start```

You can then visit the app at http://0.0.0.0:9000.

This project is intended to work with https://github.com/apeshimam/websockets-server-ts/tree/main

When the client and server are connected, the this client will communicate with one or more Automerge peers. Additionally, all changes to the code edtior are persisted to local state using LocalForage. If the WebSocket Server is unavailable, the user can continue to use the application and have their edits persisted. Once the user reconnects, the clients will all merge any changes. This is accomplished using Automerge.


You can use the server available at https://github.com/apeshimam/websockets-server-ts
