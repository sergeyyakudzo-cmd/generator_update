/**
 * TypeScript type definitions for Generator modules
 */

// Work and message types
export type WorkType = 'planned' | 'multiday' | 'unplanned' | 'avr';
export type MessageType = 'start' | 'extension' | 'completion';

// System config from config.json
export interface SystemConfig {
    label: string;
    service: string;
    preset?: {
        date: 'current' | 'saturday' | 'thursday';
        time: string;
    };
}

// Generator params
export interface GeneratorParams {
    workType: WorkType;
    msgType: MessageType;
    dateStart: string;
    dateCompletion?: string;
    timeStart?: string;
    timeEnd?: string;
    timeDisplay?: string;
    timeCompletion?: string;
    system: string;
    impact?: string;
    services: string;
    additionalMessage?: string;
    recommendations?: string;
    includeRec?: boolean;
    includeAdditional?: boolean;
}

// Queue item
export interface QueueItem {
    system: string;
    dateStart: string;
    time?: string;
    workType: WorkType;
    msgType: MessageType;
    services?: string;
    impact?: string;
    additionalMessage?: string;
    timestamp: number;
}

// Telegram history item
export interface HistoryItem {
    system: string;
    dateStart: string;
    message_id: number;
    msgType: MessageType;
    time: number;
}

// Max API response
export interface MaxResponse {
    ok: boolean;
    result?: {
        message_id: number;
    };
    description?: string;
}

// Zimbra response
export interface ZimbraResponse {
    success: boolean;
    error?: string;
}

// Update check response
export interface UpdateResponse {
    currentVersion: string;
    latestVersion?: string;
    updateAvailable?: boolean;
    error?: string;
}

// Global declarations for window functions
declare global {
    function updateServicesBySystem(system: string, workType?: WorkType): void;
    function updateEmails(): void;
    function handleSystemChange(newSystem: string, oldSystem: string): void;
    function showStatus(message: string, type?: string): void;
    function renderQueue(): void;
    function showNotification(title: string, text: string): void;
    function createRipple(event: Event, button: HTMLElement): void;
    function animateCopyButton(button: HTMLElement, type: string): void;
    
    var currentWorkType: WorkType;
    var currentMessageType: MessageType;
    var previousSystem: string;
    var soundsEnabled: boolean;
}

export {};