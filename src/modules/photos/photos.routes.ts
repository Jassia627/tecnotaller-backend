import { Router } from 'express';
import multer from 'multer';
import { PhotoController } from './photos.controller';
import { PhotoService } from './photos.service';
import { PhotoRepository } from './photos.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

// Configurar multer para almacenar en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Solo permitir imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se aceptan archivos de imagen'));
    }
  },
});

export function createPhotosRouter(): Router {
  const repository = new PhotoRepository();
  const service = new PhotoService(repository);
  const controller = new PhotoController(service);

  const router = Router({ mergeParams: true });

  router.use(authMiddleware);
  router.use(authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO));

  // POST /api/v1/work-orders/:id/photos - Upload de foto
  router.post('/', upload.single('file'), asyncHandler(controller.upload.bind(controller)));

  // GET /api/v1/work-orders/:id/photos - Listar fotos de una orden
  router.get('/', asyncHandler(controller.listByWorkOrder.bind(controller)));

  return router;
}
