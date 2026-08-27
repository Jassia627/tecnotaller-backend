import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiReference } from '@scalar/express-api-reference';
import { env } from './config/env';
import { openapiSpec } from './config/openapi';
import { errorHandler } from './shared/middlewares/error-handler';
import { createAuthRouter } from './modules/auth/auth.routes';
import { createProductsRouter } from './modules/products/products.routes';
import { createServicesRouter } from './modules/services/services.routes';
import { createAppointmentsRouter } from './modules/appointments/appointments.routes';
import { createWorkOrdersRouter } from './modules/work-orders/work-orders.routes';
import { createDiagnosticsRouter } from './modules/diagnostics/diagnostics.routes';
import { createPartsRouter } from './modules/parts/parts.routes';
import { createCustomersRouter } from './modules/customers/customers.routes';
import { createTechniciansRouter } from './modules/technicians/technicians.routes';
import { createWarrantiesRouter } from './modules/warranties/warranties.routes';
import { createReportsRouter } from './modules/reports/reports.routes';
import { createAuditRouter } from './modules/audit/audit.routes';
import { createNotificationsRouter } from './modules/notifications/notifications.routes';
import { createTechnicianAvailabilityRouter } from './modules/technician-availability/technician-availability.routes';
import { createPurchaseRequestsRouter } from './modules/purchase-requests/purchase-requests.routes';

export function createApp(): Express {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',') }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/healthcheck', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/openapi.json', (_req, res) => {
    res.json(openapiSpec);
  });

  app.use(
    '/docs',
    apiReference({
      pageTitle: 'TecnoTaller API',
      spec: { url: '/openapi.json' },
    }),
  );

  app.use('/api/v1/auth', createAuthRouter());
  app.use('/api/v1/products', createProductsRouter());
  app.use('/api/v1/services', createServicesRouter());
  app.use('/api/v1/appointments', createAppointmentsRouter());
  app.use('/api/v1/work-orders', createWorkOrdersRouter());
  app.use('/api/v1', createDiagnosticsRouter());
  app.use('/api/v1', createPartsRouter());
  app.use('/api/v1/customers', createCustomersRouter());
  app.use('/api/v1/technicians', createTechniciansRouter());
  app.use('/api/v1', createWarrantiesRouter());
  app.use('/api/v1/reports', createReportsRouter());
  app.use('/api/v1/audit', createAuditRouter());
  app.use('/api/v1', createNotificationsRouter());
  app.use('/api/v1/technicians', createTechnicianAvailabilityRouter());
  app.use('/api/v1/purchase-requests', createPurchaseRequestsRouter());

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
  });

  app.use(errorHandler);

  return app;
}
