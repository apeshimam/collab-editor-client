import events from 'events';
import { createHash } from 'crypto';
import * as Automerge from "@automerge/automerge";

export default class Client<T> extends events.EventEmitter {
  open: boolean = false;
  syncState: Automerge.SyncState;
  client: WebSocket;
  documentId: string;
  document: Automerge.Doc<T>

  constructor(documentId: string, document: Automerge.Doc<T>) {
    super()
    if (!document) throw new Error('document required')
    this.document = document;

    this.syncState = Automerge.initSyncState()
    this.client = this._createClient()
  }

  _createClient(): WebSocket {
    this.syncState = Automerge.initSyncState()
    this.client = new WebSocket(`ws://localhost:3000`, 'echo-protocol');
    this.client.binaryType = 'arraybuffer';

    this.client.onerror = () => {
      console.log('Connection Error');
    };

    this.client.onopen = () => {
      console.log('WebSocket Client Connected');
      if (this.client.readyState === this.client.OPEN) {
        this.open = true
        this.emit('open')
        this.updatePeers(this.document)
      }
    };

    this.client.onclose = () => {
      setTimeout(() => {
        this._createClient()
      }, 100)
    };

    this.client.onmessage = (e) => {
      //@ts-ignore
      let msg = new Uint8Array(e.data);
      //@ts-ignore
      let [ newDoc, newSyncState,  ] = Automerge.receiveSyncMessage(this.document, this.syncState, msg)
      this.document = newDoc;
      this.syncState = newSyncState;
      this.updatePeers(newDoc)
    }; 
    return this.client;
  }

  localChange(newDoc: Automerge.Doc<T>) {
    debugger
    this.document = newDoc
    if (!this.open) {
      this.once('open', () => this.updatePeers(newDoc))
      return
    }
    this.updatePeers(newDoc)
  }

  updatePeers(newDoc: Automerge.Doc<T>) {
    let [nextSyncState, msg] = Automerge.generateSyncMessage(
      newDoc,
      this.syncState
    );
    this.syncState = nextSyncState
    if (msg) {
      console.log('sending sync msg')
      this.client.send(msg)
    } 
  }

  close() {
    console.log('Websocket client closed.')
    this.client.close()
  }
}