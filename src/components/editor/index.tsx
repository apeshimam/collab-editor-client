import React, {useEffect, useState, useRef} from "react";
import MonacoEditor, { EditorDidMount } from "react-monaco-editor";
import * as monaco from 'monaco-editor';
import { MonacoServices } from "monaco-languageclient";
import * as Automerge from "@automerge/automerge";
import localforage from "localforage";
import * as LocalForage from "localforage";
import Client from "../../WebSocketClient";
import { editor } from "monaco-editor-core";


const MONACO_OPTIONS: monaco.editor.IEditorConstructionOptions = {
    autoIndent: "full",
    automaticLayout: true,
    contextmenu: true,
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 24,
    hideCursorInOverviewRuler: true,
    matchBrackets: "always",
    minimap: {
        enabled: false,
    },
    readOnly: false,
    scrollbar: {
        horizontalSliderSize: 4,
        verticalSliderSize: 18,
    },
};
type D = { 
    text: Automerge.Text
}
export function Editor() {
    const [doc, setDoc] = useState<null|Automerge.Doc<D>>(null);
    let docId = window.location.hash.replace(/^#/, '')
    const [wsClient, setClient] = useState<null|Client<D>>(null)
    const monacoEditor = useRef<any>()
    useEffect(()=>{
        const setUp = async ()=> {
            let binary = await localforage.getItem<Uint8Array>(docId)
            let doc: Automerge.Doc<D>;

            if (binary) {
                doc = Automerge.load(binary)
            } else {
                doc = Automerge.change<D>(Automerge.init(), (doc: D) => {
                    doc.text = new Automerge.Text()
            })
        }    
            setDoc(doc)
            setClient(new Client(doc, remoteChange))
        }
        setUp()
    }, [])
    
    
    if (!doc) return 'Loading ...'


    const editorDidMount: EditorDidMount = (editor) => {
        MonacoServices.install(monaco as any)
        if (editor && editor.getModel()) {
            const editorModel = editor.getModel()
            if (editorModel) {
                editorModel.setValue(doc.text.toString())
            }
        }
        editor.focus()
        monacoEditor.current = editor
    };

    const onChange = (newCode: string, event: monaco.editor.IModelContentChangedEvent) => {
        let newDoc = Automerge.change(doc, doc=> {
            event.changes.forEach(change=>{
                doc.text.insertAt(change.range.startColumn-1, ...change.text.split(''))
            })

        })
        let binary = Automerge.save(newDoc)
        setDoc(newDoc)
        localforage.setItem(docId, binary)  
        wsClient.localChange(newDoc)
    };

    function remoteChange(doc: Automerge.Doc.<D>) {
        setDoc(doc)
        let binary = Automerge.save(doc)
        localforage.setItem(docId, binary) 
        monacoEditor.current.getModel().setValue(doc.text.toString())  
    }

    return (
        <div>
            <div>
                <h3>Web Editor</h3>
            </div>
            <div>
                <MonacoEditor
                    width="100%"
                    height="100vh"
                    language="json"
                    theme="vs"
                    options={MONACO_OPTIONS}
                    onChange={onChange}
                    editorDidMount={editorDidMount}
                />
            </div>
        </div>
    );
}

// class EditorState extends events.EventEmitter {
//     client: Client<D> | undefined
//     watcher: Function | undefined

//     constructor() {
//         super()
//         this.onDocumentChanged = this.onDocumentChanged.bind(this)
//     }

//     load(doc: Automerge.Doc<D>) {
//         if (this.client) {
//           this.client.close()
//         }
    
//         let observable = new Automerge.Observable()
//         chat.load(roomName, { observable }).then((room: chat.Room) => {
//           this.client = new Client<chat.Room>(roomName, room)
//           observable.observe(room, this.onDocumentChanged)
//           if (this.watcher) this.watcher(room.messages)
//           cb()
//         })
//       }

//     onDocumentChanged(after: Automerge.Doc<D>)  {
//         if(this.watcher)
//             this.watcher(after)
        
//     }

//     sendUpdate(doc: Automerge.Doc<D>) {
//         this.client.localChange(doc)
//     }


// }