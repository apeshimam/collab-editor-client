import React, {useEffect, useState} from "react";
import MonacoEditor, { EditorDidMount } from "react-monaco-editor";
import * as monaco from 'monaco-editor';
import { MonacoServices } from "monaco-languageclient";
import * as Automerge from "@automerge/automerge";
import localforage, * as LocalForage from "localforage";
import Client
 from "../../WebSocketClient";
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
    let channel = new BroadcastChannel(docId)
    let client: Client<D>

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
            setDoc(doc);
            client = new Client(docId, doc);
        }
        setUp()
    }, [])
    
    
    if (!doc) return 'Loading ...'


    const editorDidMount: EditorDidMount = (editor) => {
        MonacoServices.install(monaco as any);
        if (editor && editor.getModel()) {
            const editorModel = editor.getModel();
            if (editorModel) {
                editorModel.setValue(doc.text.toString());
            }
        }
        editor.focus();
    };

    const onChange = (newCode: string, event: monaco.editor.IModelContentChangedEvent) => {
        let newDoc = Automerge.change(doc, doc=> {
            event.changes.forEach(change=>{
                doc.text.insertAt(change.range.startColumn-1, ...change.text.split(''))
            })

        })
        let binary = Automerge.save(newDoc)
        setDoc(newDoc)
        localforage.setItem(docId, binary).then(_ => console.log("success!")).catch(e => console.log(e))  

        let changes = Automerge.getChanges(doc, newDoc)
        if(!client)
            client = client = new Client(docId, doc);
        client.localChange(newDoc)
    };

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