import events from 'events';
import * as Automerge from "@automerge/automerge";

type D = { 
  text: Automerge.Text
}
export default class Client<T> extends events.EventEmitter {
  open: boolean = false;
  syncState: Automerge.SyncState;
  client: WebSocket;
  documentId: string;
  document: Automerge.Doc<D>
  cb: Function

  constructor(doc: Automerge.Doc<D>, cb: Function) {
    super()
    this.syncState = Automerge.initSyncState()
    this.client = this._createClient()
    this.document = doc
    this.cb = cb
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
        this.updatePeers()
      }
    };

    this.client.onclose = () => {
      setTimeout(() => {
        this._createClient()
      }, 100)
    };

    this.client.onmessage = (e) => {
      console.log('received event', e)
      let msg = new Uint8Array(e.data);
      let [ newDoc, newSyncState,  ] = Automerge.receiveSyncMessage(this.document, this.syncState, msg)
      this.document = newDoc
      this.syncState = newSyncState
      this.cb(this.document)
      this.updatePeers()
    }; 
    return this.client;
  }

  localChange(newDoc: Automerge.Doc<D>, sendUpdatePeersMessage: boolean) {
    this.document = newDoc
    if(sendUpdatePeersMessage) {
      if (!this.open) {
        this.once('open', () => this.updatePeers())
        return
      }
      this.updatePeers()
    }
  }

  updatePeers() {
      let [nextSyncState, msg] = Automerge.generateSyncMessage(
        this.document,
        this.syncState
      );
      this.syncState = nextSyncState
      console.log('generated msg', msg)
      if(msg)
        this.client.send(msg)
    }
  

  close() {
    console.log('Websocket client closed.')
    this.client.close()
  }
}