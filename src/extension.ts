import * as vscode from 'vscode';
import { AutoAcceptService } from './auto-accept';

let service: AutoAcceptService | undefined;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'autoAcceptLite.toggle';
    context.subscriptions.push(statusBarItem);

    // Read initial config
    const config = vscode.workspace.getConfiguration('autoAcceptLite');
    const interval = Math.max(config.get<number>('interval', 800), 200);

    // Create service
    service = new AutoAcceptService(interval);
    context.subscriptions.push(service);

    // Register toggle command
    const toggleCmd = vscode.commands.registerCommand('autoAcceptLite.toggle', () => {
        if (!service) return;
        const nowEnabled = service.toggle();
        const config = vscode.workspace.getConfiguration('autoAcceptLite');
        config.update('enabled', nowEnabled, vscode.ConfigurationTarget.Global);
        updateStatusBar(nowEnabled);
        vscode.window.showInformationMessage(
            nowEnabled
                ? '✅ Auto-Accept: ON — Agent steps will be accepted automatically.'
                : '⏸️ Auto-Accept: OFF — Manual approval required.'
        );
    });
    context.subscriptions.push(toggleCmd);

    // Watch config changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (!service) return;

            if (e.affectsConfiguration('autoAcceptLite.enabled')) {
                const enabled = vscode.workspace
                    .getConfiguration('autoAcceptLite')
                    .get<boolean>('enabled', false);
                if (enabled && !service.isRunning()) {
                    service.start();
                } else if (!enabled && service.isRunning()) {
                    service.stop();
                }
                updateStatusBar(enabled);
            }

            if (e.affectsConfiguration('autoAcceptLite.interval')) {
                const newInterval = Math.max(
                    vscode.workspace
                        .getConfiguration('autoAcceptLite')
                        .get<number>('interval', 800),
                    200
                );
                service.updateInterval(newInterval);
            }
        })
    );

    // Auto-start if enabled in config
    const autoStart = config.get<boolean>('enabled', false);
    if (autoStart) {
        service.start();
    }
    updateStatusBar(autoStart);
}

function updateStatusBar(enabled: boolean) {
    if (enabled) {
        statusBarItem.text = '$(check-all) Auto-Accept: ON';
        statusBarItem.tooltip = 'Click to disable auto-accept';
        statusBarItem.backgroundColor = new vscode.ThemeColor(
            'statusBarItem.warningBackground'
        );
    } else {
        statusBarItem.text = '$(circle-slash) Auto-Accept: OFF';
        statusBarItem.tooltip = 'Click to enable auto-accept';
        statusBarItem.backgroundColor = undefined;
    }
    statusBarItem.show();
}

export function deactivate() {
    service?.dispose();
    service = undefined;
}
