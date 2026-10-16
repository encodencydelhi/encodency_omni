import { apiClient } from '@/lib/api/client';
import { companyScopeHeaders } from '@/lib/api/company-scope';
import { getStoredClientId, getStoredCompanyId } from '@/lib/api/tenancy-storage';
import type { AutomationRepository } from './repository';
import type { AutomationSettingsState } from './settings-types';
import type { AutomationWorkflow } from './types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveValidClientId(candidate?: string): string {
  if (candidate && UUID_PATTERN.test(candidate)) return candidate;
  const stored = getStoredClientId();
  if (stored && UUID_PATTERN.test(stored)) return stored;
  return '';
}

function buildHeaders(clientId?: string): Record<string, string> {
  const validClientId = resolveValidClientId(clientId);
  return companyScopeHeaders(getStoredCompanyId(), validClientId ? { 'x-client-id': validClientId } : {});
}

async function req<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  clientId?: string,
  body?: unknown,
  query?: Record<string, string>
): Promise<T> {
  return apiClient.request<T>({
    method,
    path,
    headers: buildHeaders(clientId),
    body,
    query,
  });
}

export class LiveAutomationRepository implements AutomationRepository {
  getWorkflows = (c?: string) => req<any[]>('GET', '/automation/workflows', c);
  getWorkflow = (id: string) => req<any>('GET', `/automation/workflows/${id}`);
  createWorkflow = (c: string, w: Partial<AutomationWorkflow>) => req<any>('POST', '/automation/workflows', c, w);
  updateWorkflow = (id: string, u: Partial<AutomationWorkflow>) => req<any>('PATCH', `/automation/workflows/${id}`, undefined, u);
  deleteWorkflow = (id: string) => req<void>('DELETE', `/automation/workflows/${id}`);
  getRuns = (c?: string, w?: string) => req<any[]>('GET', '/automation/runs', c, undefined, w ? { workflowId: w } : undefined);
  getRun = (id: string) => req<any>('GET', `/automation/runs/${id}`);
  retryRun = (id: string, options: { acknowledgeDuplicateRisk?: boolean } = {}) => req<any>('POST', `/automation/runs/${id}/retry`, undefined, options);
  bulkRetryRuns = (runIds: string[], options: { acknowledgeDuplicateRisk?: boolean } = {}) => req<any[]>('POST', '/automation/runs/retry', undefined, { runIds, ...options });
  createTestWebhookRun = (p: any) => req<any>('POST', '/automation/test-webhook', undefined, p);
  getConsoleLogs = () => req<any[]>('GET', '/automation/logs');
  getTemplates = () => req<any[]>('GET', '/automation/templates');
  getAnalytics = (c?: string) => req<any>('GET', '/automation/analytics', c);
  getHealthMetrics = () => req<any>('GET', '/automation/health');
  getSettings = () => req<any>('GET', '/automation/settings');
  updateSettings = (settings: Partial<AutomationSettingsState>) => req<any>('PUT', '/automation/settings', undefined, { settings });
  resetSettings = () => req<any>('POST', '/automation/settings/reset');
}
