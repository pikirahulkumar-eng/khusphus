import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DebugStageLog {
  timestamp: string;
  stage: string;
  status: 'OK' | 'FAIL' | 'PENDING' | 'INFO';
  appState: string;
  details?: any;
}

class CallDebuggerClass {
  private logs: DebugStageLog[] = [];
  private readonly MAX_LOGS = 100;
  private readonly STORAGE_KEY = 'synking_call_debugger_logs';

  constructor() {
    this.loadPersistedLogs();
  }

  private async loadPersistedLogs() {
    try {
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        const saved = await AsyncStorage.getItem(this.STORAGE_KEY).catch(() => null);
        if (saved) {
          this.logs = JSON.parse(saved);
        }
      }
    } catch (e) {}
  }

  private async persistLogs() {
    try {
      if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs.slice(-this.MAX_LOGS))).catch(() => {});
      }
    } catch (e) {}
  }

  public logStage(stage: string, status: 'OK' | 'FAIL' | 'PENDING' | 'INFO', details?: any) {
    const time = new Date().toISOString().substring(11, 19);
    const appState = AppState.currentState || 'unknown';

    const entry: DebugStageLog = {
      timestamp: time,
      stage,
      status,
      appState,
      details,
    };

    this.logs.push(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }
    this.persistLogs();

    // Visual Emoji Icon
    const icon = status === 'OK' ? '✅' : status === 'FAIL' ? '❌' : status === 'PENDING' ? '⏳' : 'ℹ️';
    const detailStr = details ? ` | ${typeof details === 'object' ? JSON.stringify(details) : details}` : '';

    // Formatted for ADB logcat: filterable via "SYNKING_CALL_DEBUG" or "synking"
    console.log(`[SYNKING_CALL_DEBUG] [${time}] ${icon} ${stage.padEnd(24)} [${appState.toUpperCase()}]${detailStr}`);
  }

  public printCallSummary(callId: string, caller: string, type: string) {
    const time = new Date().toISOString().substring(11, 19);
    console.log(`
======================================================
📱 [SYNKING CALL DEBUGGER SUMMARY] [${time}]
======================================================
Call ID:     ${callId}
Caller:      ${caller}
Type:        ${type.toUpperCase()}
App State:   ${AppState.currentState?.toUpperCase()}
Platform:    ${Platform.OS.toUpperCase()}
======================================================`);
  }

  public getRecentLogs(): DebugStageLog[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    AsyncStorage.removeItem(this.STORAGE_KEY).catch(() => {});
  }
}

export const CallDebugger = new CallDebuggerClass();
