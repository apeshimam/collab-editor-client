import events from 'events'
import * as Automerge from "@automerge/automerge"

type D = {
  text: Automerge.Text
}

export default class Client<T> extends events.EventEmitter {
  open: boolean = false
  syncState: Automerge.SyncState
  client: WebSocket
  documentId: string
  document: Automerge.Doc<D>
  cb: Function
  
  syncStates = new Map<string, Automerge.SyncState>()

  constructor(doc: Automerge.Doc<D>, cb: Function) {
    super()
    this.syncState = Automerge.initSyncState()
    this.client = this._createClient()
    this.document = doc
    this.cb = cb
  }

  _createClient(): WebSocket {
    this.syncState = Automerge.initSyncState()
    this.client = new WebSocket(`ws://localhost:3000`, 'echo-protocol')
    this.client.binaryType = 'arraybuffer'

    this.client.onerror = () => {
      console.log('Connection Error')
    };

    this.client.onopen = () => {
      console.log('WebSocket Client Connected');
      if (this.client.readyState === this.client.OPEN) {
        this.open = true
        this.emit('open')
        this.sayHello()
      }
    };

    this.client.onclose = () => {
      setTimeout(() => {
        this._createClient()
      }, 100)
    };

    this.client.onmessage = (e) => {
      let msg = new Uint8Array(e.data);
      let senderSyncState = this.syncStates.get(e.origin)
      let isNewSender = false
      if(!senderSyncState) {
        senderSyncState = Automerge.initSyncState()
        isNewSender = true
      }

      let [newDoc, newSyncState,] = Automerge.receiveSyncMessage(this.document, senderSyncState, msg)
      this.document = newDoc
      this.syncStates.set(e.origin, newSyncState)
      this.cb(this.document)
      this.updatePeers(isNewSender)
    };
    return this.client;
  }

  localChange(newDoc: Automerge.Doc<D>) {
    this.document = newDoc
    if (!this.open) {
      this.once('open', () => this.updatePeers())
      return
    }
    this.updatePeers()
  }

  sayHello() {
    let [nextSyncState, msg] = Automerge.generateSyncMessage(
      this.document,
      Automerge.initSyncState())

      this.client.send(msg)
  }

  updatePeers(isNewSender=false) {
    this.syncStates.forEach( (syncState, peer) => {
      let [nextSyncState, msg] = Automerge.generateSyncMessage(
        this.document,
        syncState
      )
      this.syncStates.set(peer, nextSyncState)
      if(msg || isNewSender)
        this.client.send(msg)
    })  
  }


  close() {
    console.log('Websocket client closed.')
    this.client.close()
  }
}