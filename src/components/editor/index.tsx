import React, { useEffect, useState, useRef } from "react";
import MonacoEditor, { EditorDidMount } from "react-monaco-editor";
import * as monaco from "monaco-editor";
import { MonacoServices } from "monaco-languageclient";
import * as Automerge from "@automerge/automerge";
import localforage from "localforage";
import Client from "../../WebSocketClient";

type D = {
  text: Automerge.Text;
};

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

export function Editor() {
  const [doc, setDoc] = useState<null | Automerge.Doc<D>>(null);
  const wsClient = useRef<null | Client<D>>(null);
  const monacoEditor = useRef<any>();
  const STORAGE_KEY = "_document";

  useEffect(() => {
    const setUp = async () => {
      let binary = await localforage.getItem<Uint8Array>(STORAGE_KEY);
      let doc: Automerge.Doc<D>;

      if (binary) {
        doc = Automerge.load(binary);
      } else {
        doc = Automerge.change<D>(Automerge.init(), (doc: D) => {
          doc.text = new Automerge.Text();
        });
      }
      setDoc(doc);
      wsClient.current = new Client(doc, remoteChange);
    };
    setUp();
  }, []);

  if (!doc) return "Loading ...";

  const editorDidMount: EditorDidMount = (editor) => {
    MonacoServices.install(monaco as any);
    if (editor && editor.getModel()) {
      const editorModel = editor.getModel();
      if (editorModel) {
        editorModel.setValue(doc.text.toString());
      }
    }
    editor.focus();
    monacoEditor.current = editor;
  };

  const onChange = (
    newCode: string,
    event: monaco.editor.IModelContentChangedEvent
  ) => {
    const sendUpdateMessage = !event.isFlush;
    if (sendUpdateMessage) {
      let newDoc = Automerge.change(doc, (doc) => {
        event.changes.forEach((change) => {
          if (change.text == "") {
            doc.text.deleteAt(change.rangeOffset, change.rangeLength);
          } else {
            doc.text.deleteAt(change.rangeOffset, change.rangeLength - 1);
            doc.text.insertAt(change.rangeOffset, ...change.text.split(""));
          }
        });
      });
      let binary = Automerge.save(newDoc);
      setDoc(newDoc);
      localforage.setItem(STORAGE_KEY, binary);
      wsClient.current.localChange(newDoc);
    }
  };

  function remoteChange(doc: Automerge.Doc<D>) {
    setDoc(doc);
    let binary = Automerge.save(doc);
    localforage.setItem(STORAGE_KEY, binary);
    let currentValue = monacoEditor.current.getModel().getValue();
    if (currentValue != doc.text.toString())
      monacoEditor.current.getModel().setValue(doc.text.toString());
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
          language="javascript"
          theme="vs"
          options={MONACO_OPTIONS}
          onChange={onChange}
          editorDidMount={editorDidMount}
        />
      </div>
    </div>
  );
}
