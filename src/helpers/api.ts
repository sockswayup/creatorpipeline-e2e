/**
 * API Helper layer for E2E test data management.
 * Connects to the isolated test API at localhost:18080.
 */

const API_BASE = process.env.API_URL || 'http://localhost:18080/api/v1';

// ============ Types ============

export interface Pipeline {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Series {
  id: number;
  pipelineId: number;
  name: string;
  description?: string;
  publishDay: string;
  workflowTemplateId?: number;
  episodeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Episode {
  id: number;
  seriesId: number;
  title: string;
  description?: string;
  status: string;
  scheduledDate?: string;
  publishedDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  error?: string;
}

// ============ Helper Functions ============

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${method} ${path} failed: ${response.status} - ${text}`);
  }

  // DELETE returns 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const json: ApiResponse<T> = await response.json();
  return json.data;
}

// ============ Pipeline CRUD ============

export async function createPipeline(
  name: string,
  description?: string
): Promise<Pipeline> {
  return apiRequest<Pipeline>('POST', '/pipelines', { name, description });
}

export async function getPipeline(id: number): Promise<Pipeline> {
  return apiRequest<Pipeline>('GET', `/pipelines/${id}`);
}

export async function listPipelines(): Promise<Pipeline[]> {
  return apiRequest<Pipeline[]>('GET', '/pipelines');
}

export async function updatePipeline(
  id: number,
  data: { name?: string; description?: string }
): Promise<Pipeline> {
  return apiRequest<Pipeline>('PUT', `/pipelines/${id}`, data);
}

export async function deletePipeline(id: number): Promise<void> {
  await apiRequest<void>('DELETE', `/pipelines/${id}`);
}

// ============ Series CRUD ============

export async function createSeries(
  pipelineId: number,
  name: string,
  publishDay: string = 'MONDAY',
  description?: string
): Promise<Series> {
  return apiRequest<Series>('POST', `/pipelines/${pipelineId}/series`, {
    name,
    publishDay,
    description,
  });
}

export async function getSeries(id: number): Promise<Series> {
  return apiRequest<Series>('GET', `/series/${id}`);
}

export async function listSeries(pipelineId: number): Promise<Series[]> {
  return apiRequest<Series[]>('GET', `/pipelines/${pipelineId}/series`);
}

export async function updateSeries(
  id: number,
  data: { name?: string; description?: string; publishDay?: string }
): Promise<Series> {
  return apiRequest<Series>('PUT', `/series/${id}`, data);
}

export async function deleteSeries(id: number): Promise<void> {
  await apiRequest<void>('DELETE', `/series/${id}`);
}

// ============ Episode CRUD ============

export async function createEpisode(
  seriesId: number,
  title: string,
  description?: string,
  scheduledDate?: string
): Promise<Episode> {
  return apiRequest<Episode>('POST', `/series/${seriesId}/episodes`, {
    title,
    description,
    scheduledDate,
  });
}

export async function getEpisode(id: number): Promise<Episode> {
  return apiRequest<Episode>('GET', `/episodes/${id}`);
}

export async function listEpisodes(seriesId: number): Promise<Episode[]> {
  return apiRequest<Episode[]>('GET', `/series/${seriesId}/episodes`);
}

export async function updateEpisode(
  id: number,
  data: { title?: string; description?: string; scheduledDate?: string }
): Promise<Episode> {
  return apiRequest<Episode>('PUT', `/episodes/${id}`, data);
}

export async function updateEpisodeStatus(
  id: number,
  status: string
): Promise<Episode> {
  return apiRequest<Episode>('PATCH', `/episodes/${id}/status`, { status });
}

export async function deleteEpisode(id: number): Promise<void> {
  await apiRequest<void>('DELETE', `/episodes/${id}`);
}

export async function getSuggestedDate(seriesId: number): Promise<string> {
  return apiRequest<string>('GET', `/series/${seriesId}/episodes/suggested-date`);
}

// ============ Cleanup ============

/**
 * Delete all test data by listing and deleting all pipelines.
 * Cascade delete handles series and episodes.
 */
export async function cleanupAll(): Promise<void> {
  try {
    const pipelines = await listPipelines();
    for (const pipeline of pipelines) {
      await deletePipeline(pipeline.id);
    }
  } catch (error) {
    // Ignore errors during cleanup (data may already be deleted)
    console.log('Cleanup completed (some items may have already been deleted)');
  }
}

/**
 * Wait for the API to be healthy.
 */
export async function waitForApi(
  maxAttempts = 30,
  intervalMs = 1000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${API_BASE.replace('/api/v1', '')}/actuator/health`);
      if (response.ok) {
        return true;
      }
    } catch {
      // API not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}
