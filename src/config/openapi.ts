export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'TecnoTaller API',
    version: '0.1.0',
    description:
      'API REST para la gestión integral de establecimientos de venta de dispositivos tecnológicos y servicio técnico. Incluye catálogo, inventario, agendamiento, órdenes de servicio con trazabilidad, repuestos, garantías, reportes, auditoría y notificaciones.',
    license: { name: 'MIT' },
  },
  servers: [{ url: 'http://localhost:3000/api/v1', description: 'Desarrollo local' }],
  tags: [
    { name: 'auth', description: 'Registro y autenticación' },
    { name: 'products', description: 'Catálogo e inventario de productos' },
    { name: 'services', description: 'Servicios técnicos' },
    { name: 'appointments', description: 'Agendamiento de citas' },
    { name: 'work-orders', description: 'Órdenes de servicio (trazabilidad)' },
    { name: 'diagnostics', description: 'Diagnóstico técnico' },
    { name: 'parts', description: 'Repuestos' },
    { name: 'customers', description: 'Gestión de clientes' },
    { name: 'technicians', description: 'Gestión de técnicos' },
    { name: 'warranties', description: 'Garantías' },
    { name: 'reports', description: 'Reportes administrativos' },
    { name: 'audit', description: 'Auditoría de operaciones' },
    { name: 'notifications', description: 'Notificaciones' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token de acceso de Supabase Auth',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
            },
          },
        },
      },
      AuthUser: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['cliente', 'tecnico', 'administrador'] },
          fullName: { type: 'string' },
          phone: { type: 'string', nullable: true },
        },
      },
      AuthSession: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresAt: { type: 'number' },
          user: { $ref: '#/components/schemas/AuthUser' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          sku: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          imageUrl: { type: 'string', nullable: true },
          categoryId: { type: 'string', format: 'uuid', nullable: true },
          purchasePrice: { type: 'number' },
          salePrice: { type: 'number' },
          stock: { type: 'integer' },
          active: { type: 'boolean' },
          available: { type: 'boolean' },
        },
      },
      Service: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          active: { type: 'boolean' },
        },
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          serviceId: { type: 'string', format: 'uuid' },
          customerName: { type: 'string' },
          phone: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['pendiente', 'confirmada', 'cancelada', 'completada'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      WorkOrder: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          guideNumber: { type: 'string' },
          customerId: { type: 'string', format: 'uuid', nullable: true },
          technicianId: { type: 'string', format: 'uuid', nullable: true },
          deviceBrand: { type: 'string' },
          deviceModel: { type: 'string' },
          deviceSerial: { type: 'string' },
          problemDescription: { type: 'string' },
          accessories: { type: 'string', nullable: true },
          currentStatus: {
            type: 'string',
            enum: [
              'INGRESADO',
              'EN_REVISION',
              'ESPERANDO_REPUESTO',
              'EN_REPARACION',
              'REPARADO',
              'LISTO_PARA_ENTREGA',
              'ENTREGADO',
            ],
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Part: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          sku: { type: 'string' },
          stock: { type: 'integer' },
          purchasePrice: { type: 'number' },
          salePrice: { type: 'number' },
        },
      },
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', nullable: true },
          fullName: { type: 'string' },
          phone: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Technician: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string', nullable: true },
          active: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Warranty: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          workOrderId: { type: 'string', format: 'uuid' },
          periodDays: { type: 'integer' },
          expiresAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['vigente', 'vencida'] },
          isActive: { type: 'boolean' },
        },
      },
      Diagnostic: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          workOrderId: { type: 'string', format: 'uuid' },
          technicianId: { type: 'string', format: 'uuid' },
          observations: { type: 'string' },
          faults: { type: 'string' },
          recommendedActions: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid', nullable: true },
          action: { type: 'string' },
          entity: { type: 'string' },
          entityId: { type: 'string', format: 'uuid', nullable: true },
          details: {},
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          workOrderId: { type: 'string', format: 'uuid' },
          toEmail: { type: 'string', format: 'email' },
          type: { type: 'string' },
          status: { type: 'string', enum: ['pendiente', 'enviada', 'fallida'] },
          sentAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['auth'],
        summary: 'Registrar',
        description: 'Crea una cuenta con rol administrador. El correo no puede estar asociado a otra cuenta. Los clientes son creados por el administrador desde /customers (RF-01).',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'fullName'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  fullName: { type: 'string', minLength: 2 },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Cuenta de administrador creada', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/AuthUser' } } } } } },
          409: { description: 'Correo ya registrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['auth'],
        summary: 'Iniciar sesión',
        description: 'Autentica al usuario y devuelve tokens (RF-02).',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } },
            },
          },
        },
        responses: {
          200: { description: 'Sesión iniciada', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthSession' } } } },
          401: { description: 'Credenciales inválidas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['auth'],
        summary: 'Cerrar sesión',
        security: [{ bearerAuth: [] }],
        responses: { 204: { description: 'Sesión cerrada' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['auth'],
        summary: 'Obtener perfil actual',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Perfil', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/AuthUser' } } } } } } },
      },
    },
    '/products': {
      get: {
        tags: ['products'],
        summary: 'Catálogo público',
        description: 'Lista productos activos con paginación (RF-03).',
        security: [],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Lista de productos' } },
      },
      post: {
        tags: ['products'],
        summary: 'Crear producto',
        description: 'Registra un producto (RF-04). Requiere rol administrador.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sku', 'name', 'purchasePrice', 'salePrice', 'stock'],
                properties: {
                  sku: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  imageUrl: { type: 'string', nullable: true },
                  categoryId: { type: 'string', format: 'uuid', nullable: true },
                  purchasePrice: { type: 'number', minimum: 0 },
                  salePrice: { type: 'number', minimum: 0 },
                  stock: { type: 'integer', minimum: 0 },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Producto creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } } },
      },
    },
    '/products/admin/all': {
      get: {
        tags: ['products'],
        summary: 'Listar todos los productos',
        description: 'Incluye productos inactivos. Requiere autenticación.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Lista completa' } },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['products'],
        summary: 'Detalle de producto',
        security: [],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Producto', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } }, 404: { description: 'No encontrado' } },
      },
      put: {
        tags: ['products'],
        summary: 'Modificar producto',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Producto actualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } } },
      },
    },
    '/products/{id}/availability': {
      patch: {
        tags: ['products'],
        summary: 'Cambiar disponibilidad',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['active'], properties: { active: { type: 'boolean' } } } } } },
        responses: { 200: { description: 'Disponibilidad actualizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } } },
      },
    },
    '/products/{id}/movements': {
      get: {
        tags: ['products'],
        summary: 'Movimientos de inventario',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Movimientos' } },
      },
      post: {
        tags: ['products'],
        summary: 'Registrar entrada/salida',
        description: 'Registra un movimiento de inventario actualizando el stock de forma transaccional (RF-05).',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'quantity', 'reason'],
                properties: { type: { type: 'string', enum: ['IN', 'OUT'] }, quantity: { type: 'integer', minimum: 1 }, reason: { type: 'string' } },
              },
            },
          },
        },
        responses: { 201: { description: 'Movimiento registrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } } },
      },
    },
    '/services': {
      get: {
        tags: ['services'],
        summary: 'Servicios activos',
        description: 'Catálogo público de servicios técnicos activos (RF-07).',
        security: [],
        responses: { 200: { description: 'Lista de servicios' } },
      },
      post: {
        tags: ['services'],
        summary: 'Crear servicio',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['name', 'price'], properties: { name: { type: 'string' }, description: { type: 'string' }, price: { type: 'number', minimum: 0 } } },
            },
          },
        },
        responses: { 201: { description: 'Servicio creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Service' } } } } },
      },
    },
    '/services/admin/all': {
      get: {
        tags: ['services'],
        summary: 'Todos los servicios',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Lista completa' } },
      },
    },
    '/services/{id}': {
      put: {
        tags: ['services'],
        summary: 'Modificar servicio',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Servicio actualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Service' } } } } },
      },
    },
    '/services/{id}/status': {
      patch: {
        tags: ['services'],
        summary: 'Activar/desactivar servicio',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['active'], properties: { active: { type: 'boolean' } } } } } },
        responses: { 200: { description: 'Estado actualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Service' } } } } },
      },
    },
    '/appointments': {
      post: {
        tags: ['appointments'],
        summary: 'Agendar cita',
        description: 'Solicita una cita sin necesidad de autenticarse (RF-08). Se cancela por inactividad tras 15 minutos.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['serviceId', 'customerName', 'phone', 'date'],
                properties: {
                  serviceId: { type: 'string', format: 'uuid' },
                  customerName: { type: 'string' },
                  phone: { type: 'string' },
                  date: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Cita agendada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } } }, 409: { description: 'Solapamiento de horario' } },
      },
      get: {
        tags: ['appointments'],
        summary: 'Consultar citas',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pendiente', 'confirmada', 'cancelada', 'completada'] } },
        ],
        responses: { 200: { description: 'Lista de citas' } },
      },
    },
    '/appointments/{id}/confirm': {
      patch: {
        tags: ['appointments'],
        summary: 'Confirmar cita',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Cita confirmada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } } } },
      },
    },
    '/appointments/{id}/cancel': {
      patch: {
        tags: ['appointments'],
        summary: 'Cancelar cita',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Cita cancelada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } } } },
      },
    },
    '/work-orders/track/{guideNumber}': {
      get: {
        tags: ['work-orders'],
        summary: 'Seguimiento por número de guía',
        description: 'Consulta pública del estado de una orden sin autenticación (RF-15).',
        security: [],
        parameters: [{ name: 'guideNumber', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Orden y su historial' }, 404: { description: 'Guía no encontrada' } },
      },
    },
    '/work-orders': {
      post: {
        tags: ['work-orders'],
        summary: 'Crear orden de servicio',
        description: 'Registra el ingreso de un dispositivo (RF-09). Genera un número de guía único.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['deviceBrand', 'deviceModel', 'deviceSerial', 'problemDescription'],
                properties: {
                  customerId: { type: 'string', format: 'uuid', nullable: true },
                  technicianId: { type: 'string', format: 'uuid', nullable: true },
                  deviceBrand: { type: 'string' },
                  deviceModel: { type: 'string' },
                  deviceSerial: { type: 'string' },
                  problemDescription: { type: 'string' },
                  devicePassword: { type: 'string', description: 'Se cifra en la base de datos (RNF-05)' },
                  accessories: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Orden creada', content: { 'application/json': { schema: { $ref: '#/components/schemas/WorkOrder' } } } } },
      },
      get: {
        tags: ['work-orders'],
        summary: 'Listar órdenes',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['INGRESADO', 'EN_REVISION', 'ESPERANDO_REPUESTO', 'EN_REPARACION', 'REPARADO', 'LISTO_PARA_ENTREGA', 'ENTREGADO'] } },
          { name: 'technicianId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Lista de órdenes' } },
      },
    },
    '/work-orders/{id}': {
      get: {
        tags: ['work-orders'],
        summary: 'Detalle de orden',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Orden', content: { 'application/json': { schema: { $ref: '#/components/schemas/WorkOrder' } } } }, 404: { description: 'No encontrada' } },
      },
    },
    '/work-orders/{id}/status': {
      patch: {
        tags: ['work-orders'],
        summary: 'Cambiar estado de reparación',
        description: 'Actualiza el estado validando la transición en la máquina de estados (RF-11).',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['toStatus'],
                properties: { toStatus: { type: 'string', enum: ['INGRESADO', 'EN_REVISION', 'ESPERANDO_REPUESTO', 'EN_REPARACION', 'REPARADO', 'LISTO_PARA_ENTREGA', 'ENTREGADO'] } },
              },
            },
          },
        },
        responses: { 200: { description: 'Estado actualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/WorkOrder' } } } }, 403: { description: 'Transición inválida' } },
      },
    },
    '/work-orders/{id}/history': {
      get: {
        tags: ['work-orders'],
        summary: 'Historial de la orden',
        description: 'Historial cronológico de cambios de estado (RF-14).',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Historial' } },
      },
    },
    '/work-orders/{id}/photos': {
      post: {
        tags: ['work-orders'],
        summary: 'Registrar fotografía',
        description: 'Registra el estado fotográfico (inicial/final) del dispositivo (RF-09).',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['storagePath', 'kind'], properties: { storagePath: { type: 'string' }, kind: { type: 'string', enum: ['inicial', 'final'] } } },
            },
          },
        },
        responses: { 201: { description: 'Foto registrada' } },
      },
    },
    '/work-orders/{id}/exit-register': {
      post: {
        tags: ['work-orders'],
        summary: 'Registro de estado de salida',
        description: 'Registra las condiciones del dispositivo antes de la entrega (RF-13).',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['finalState', 'repairsPerformed'],
                properties: { finalState: { type: 'string' }, repairsPerformed: { type: 'string' }, partsUsed: { type: 'string' }, observations: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Salida registrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/WorkOrder' } } } } },
      },
    },
    '/work-orders/{id}/diagnostics': {
      get: {
        tags: ['diagnostics'],
        summary: 'Listar diagnósticos',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Diagnósticos' } },
      },
      post: {
        tags: ['diagnostics'],
        summary: 'Registrar diagnóstico',
        description: 'Registra el diagnóstico técnico de la orden (RF-10). Requiere rol técnico.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['observations', 'faults', 'recommendedActions'],
                properties: { observations: { type: 'string' }, faults: { type: 'string' }, recommendedActions: { type: 'string' } },
              },
            },
          },
        },
        responses: { 201: { description: 'Diagnóstico registrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Diagnostic' } } } } },
      },
    },
    '/parts': {
      get: {
        tags: ['parts'],
        summary: 'Listar repuestos',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Repuestos' } },
      },
      post: {
        tags: ['parts'],
        summary: 'Crear repuesto',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'sku', 'stock', 'purchasePrice', 'salePrice'],
                properties: { name: { type: 'string' }, sku: { type: 'string' }, stock: { type: 'integer', minimum: 0 }, purchasePrice: { type: 'number', minimum: 0 }, salePrice: { type: 'number', minimum: 0 } },
              },
            },
          },
        },
        responses: { 201: { description: 'Repuesto creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Part' } } } } },
      },
    },
    '/parts/{id}': {
      put: {
        tags: ['parts'],
        summary: 'Modificar repuesto',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Repuesto actualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Part' } } } } },
      },
    },
    '/work-orders/{id}/parts': {
      post: {
        tags: ['parts'],
        summary: 'Asociar repuesto a orden',
        description: 'Descuenta stock de forma transaccional y registra el repuesto usado (RF-12).',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['partId', 'quantity'], properties: { partId: { type: 'string', format: 'uuid' }, quantity: { type: 'integer', minimum: 1 } } },
            },
          },
        },
        responses: { 201: { description: 'Repuesto asociado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Part' } } } }, 400: { description: 'Stock insuficiente' } },
      },
    },
    '/customers': {
      get: {
        tags: ['customers'],
        summary: 'Listar clientes',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Clientes' } },
      },
      post: {
        tags: ['customers'],
        summary: 'Registrar cliente',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['fullName'], properties: { fullName: { type: 'string' }, email: { type: 'string', nullable: true }, phone: { type: 'string', nullable: true } } },
            },
          },
        },
        responses: { 201: { description: 'Cliente creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Customer' } } } } },
      },
    },
    '/customers/{id}': {
      get: {
        tags: ['customers'],
        summary: 'Detalle de cliente',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Cliente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Customer' } } } } },
      },
    },
    '/customers/{id}/work-orders': {
      get: {
        tags: ['customers'],
        summary: 'Órdenes del cliente',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Órdenes asociadas' } },
      },
    },
    '/technicians': {
      get: {
        tags: ['technicians'],
        summary: 'Listar técnicos',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Técnicos' } },
      },
      post: {
        tags: ['technicians'],
        summary: 'Registrar técnico',
        description: 'Crea un usuario con rol técnico (RF-18). Requiere administrador.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['email', 'password', 'fullName'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 }, fullName: { type: 'string' }, phone: { type: 'string' } } },
            },
          },
        },
        responses: { 201: { description: 'Técnico creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Technician' } } } } },
      },
    },
    '/technicians/{id}/status': {
      patch: {
        tags: ['technicians'],
        summary: 'Activar/desactivar técnico',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['active'], properties: { active: { type: 'boolean' } } } } } },
        responses: { 200: { description: 'Estado actualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Technician' } } } } },
      },
    },
    '/technicians/{id}/work-orders': {
      get: {
        tags: ['technicians'],
        summary: 'Órdenes asignadas al técnico',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Órdenes asignadas' } },
      },
    },
    '/work-orders/{id}/warranty': {
      get: {
        tags: ['warranties'],
        summary: 'Consultar garantía',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Garantía' } },
      },
      post: {
        tags: ['warranties'],
        summary: 'Crear garantía',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['periodDays'], properties: { periodDays: { type: 'integer', minimum: 1 } } } } } },
        responses: { 201: { description: 'Garantía creada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Warranty' } } } }, 409: { description: 'Ya existe garantía vigente' } },
      },
    },
    '/reports/{type}': {
      get: {
        tags: ['reports'],
        summary: 'Generar reporte',
        description: 'Reportes: services, inventory, orders-by-status (RF-19).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'type', in: 'path', required: true, schema: { type: 'string', enum: ['services', 'inventory', 'orders-by-status'] } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: { 200: { description: 'Reporte generado' } },
      },
    },
    '/audit': {
      get: {
        tags: ['audit'],
        summary: 'Consultar auditoría',
        description: 'Lista operaciones registradas (RF-20). Solo administrador.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'entity', in: 'query', schema: { type: 'string' } },
          { name: 'userId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Registros de auditoría' } },
      },
    },
    '/work-orders/{id}/notifications': {
      get: {
        tags: ['notifications'],
        summary: 'Notificaciones de la orden',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Notificaciones' } },
      },
    },
  },
} as const;
