import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '../generated/client';
import { getUniversityDbContext, UniversityDbContext } from './university-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const appDatabaseUrl = process.env.APP_DATABASE_URL;
    if (!appDatabaseUrl) {
      throw new Error('APP_DATABASE_URL must point to a non-owner, NOBYPASSRLS role');
    }
    super({ datasources: { db: { url: appDatabaseUrl } } });

    const client = this;
    const modelDelegates = new Set(
      Prisma.dmmf.datamodel.models.map(
        (model) => model.name[0].toLowerCase() + model.name.slice(1),
      ),
    );

    return new Proxy(this, {
      get(target, property, receiver) {
        if (property === '$transaction') {
          return (operation: unknown, options?: unknown) => {
            const context = getUniversityDbContext();
            if (typeof operation !== 'function' || !context) {
              return Reflect.get(target, property, receiver).call(
                target,
                operation,
                options,
              );
            }
            return client.$transaction(async (transaction) => {
              await setTransactionUniversity(transaction, context);
              return (operation as (tx: Prisma.TransactionClient) => unknown)(transaction);
            }, options as never);
          };
        }

        if (
          property === '$queryRaw' ||
          property === '$executeRaw' ||
          property === '$queryRawUnsafe' ||
          property === '$executeRawUnsafe'
        ) {
          const method = Reflect.get(target, property, receiver);
          return (...args: unknown[]) => {
            const context = getUniversityDbContext();
            if (!context) return method.apply(target, args);
            return client.$transaction(async (transaction) => {
              await setTransactionUniversity(transaction, context);
              return Reflect.get(transaction, property).apply(transaction, args);
            });
          };
        }

        const value = Reflect.get(target, property, receiver);
        if (typeof property !== 'string' || !modelDelegates.has(property)) {
          return value;
        }

        return new Proxy(value as object, {
          get(delegate, operation) {
            const method = Reflect.get(delegate, operation, delegate);
            if (typeof method !== 'function') return method;
            return (...args: unknown[]) => {
              const context = getUniversityDbContext();
              if (!context) return method.apply(delegate, args);
              return client.$transaction(async (transaction) => {
                await setTransactionUniversity(transaction, context);
                const transactionDelegate = Reflect.get(transaction, property);
                return Reflect.get(transactionDelegate, operation).apply(
                  transactionDelegate,
                  args,
                );
              });
            };
          },
        });
      },
    });
  }

  async withUniversity<T>(
    context: UniversityDbContext,
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T> {
    return this.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        SELECT
          set_config('app.root_organization_id', ${context.rootOrganizationId}, true),
          set_config('app.user_id', ${context.userId}, true)
      `;
      return operation(transaction);
    }, options);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

async function setTransactionUniversity(
  transaction: Prisma.TransactionClient,
  context: UniversityDbContext,
) {
  await transaction.$queryRaw`
    SELECT
      set_config('app.root_organization_id', ${context.rootOrganizationId}, true),
      set_config('app.user_id', ${context.userId}, true)
  `;
}
