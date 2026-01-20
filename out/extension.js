"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const jsonc_parser_1 = require("jsonc-parser");
function activate(context) {
    console.log('JSON Array Length extension is now active');
    // Register the CodeLens provider for JSON files
    // Use scheme: '*' to match both file and untitled schemes
    const selector = [
        { language: 'json', scheme: '*' },
        { language: 'jsonc', scheme: '*' },
    ];
    const provider = new JSONArrayLengthCodeLensProvider();
    const disposable = vscode.languages.registerCodeLensProvider(selector, provider);
    context.subscriptions.push(disposable);
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('jsonLength')) {
            provider.refresh();
        }
    }));
}
function deactivate() { }
class JSONArrayLengthCodeLensProvider {
    constructor() {
        this._onDidChangeCodeLenses = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
    }
    refresh() {
        this._onDidChangeCodeLenses.fire();
    }
    provideCodeLenses(document, token) {
        const config = vscode.workspace.getConfiguration('jsonLength');
        if (!config.get('enable', true)) {
            return [];
        }
        const showArray = config.get('showArrayLength', true);
        const showObject = config.get('showObjectPropertyCount', true);
        const text = document.getText();
        const lenses = [];
        const stack = [];
        try {
            (0, jsonc_parser_1.visit)(text, {
                onArrayBegin: (offset) => {
                    if (token.isCancellationRequested) {
                        throw new Error('Canceled');
                    }
                    if (stack.length > 0) {
                        const parent = stack[stack.length - 1];
                        if (parent.type === 'array') {
                            parent.count++;
                        }
                    }
                    stack.push({ type: 'array', count: 0, startOffset: offset });
                },
                onArrayEnd: (offset, length) => {
                    if (token.isCancellationRequested) {
                        throw new Error('Canceled');
                    }
                    const context = stack.pop();
                    if (context && context.type === 'array' && showArray) {
                        const startPos = document.positionAt(context.startOffset);
                        const endPos = document.positionAt(context.startOffset + length);
                        const range = new vscode.Range(startPos, endPos);
                        const lens = new vscode.CodeLens(range, {
                            title: `Array: ${context.count} items`,
                            tooltip: `This array contains ${context.count} items`,
                            command: '',
                        });
                        lenses.push(lens);
                    }
                },
                onObjectBegin: (offset) => {
                    if (token.isCancellationRequested) {
                        throw new Error('Canceled');
                    }
                    if (stack.length > 0) {
                        const parent = stack[stack.length - 1];
                        if (parent.type === 'array') {
                            parent.count++;
                        }
                    }
                    stack.push({ type: 'object', count: 0, startOffset: offset });
                },
                onObjectProperty: () => {
                    if (stack.length > 0) {
                        const parent = stack[stack.length - 1];
                        if (parent.type === 'object') {
                            parent.count++;
                        }
                    }
                },
                onObjectEnd: (offset, length) => {
                    if (token.isCancellationRequested) {
                        throw new Error('Canceled');
                    }
                    const context = stack.pop();
                    if (context && context.type === 'object' && showObject) {
                        const startPos = document.positionAt(context.startOffset);
                        const endPos = document.positionAt(context.startOffset + length);
                        const range = new vscode.Range(startPos, endPos);
                        const lens = new vscode.CodeLens(range, {
                            title: `Object: ${context.count} properties`,
                            tooltip: `This object has ${context.count} properties`,
                            command: '',
                        });
                        lenses.push(lens);
                    }
                },
                onLiteralValue: () => {
                    // No explicit cancellation check here to keep it lightweight for tight loops of literals
                    if (stack.length > 0) {
                        const parent = stack[stack.length - 1];
                        if (parent.type === 'array') {
                            parent.count++;
                        }
                    }
                },
            });
        }
        catch (e) {
            if (e.message === 'Canceled') {
                return [];
            }
            // Silently ignore parsing errors
        }
        return lenses;
    }
}
//# sourceMappingURL=extension.js.map