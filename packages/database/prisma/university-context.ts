import { AsyncLocalStorage } from 'node:async_hooks';

export interface UniversityDbContext {
  rootOrganizationId: string;
  userId: string;
}

const universityContext = new AsyncLocalStorage<UniversityDbContext>();

export function getUniversityDbContext(): UniversityDbContext | undefined {
  return universityContext.getStore();
}

export function runWithUniversityContext<T>(
  context: UniversityDbContext,
  operation: () => T,
): T {
  return universityContext.run(context, operation);
}
