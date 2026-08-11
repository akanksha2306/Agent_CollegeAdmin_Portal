import { Router } from 'express';
import * as controller from './agents.controller.js';
import { upload } from './upload.middleware.js';

// Wrap async handlers so rejected promises reach the error middleware.
const wrap =
  (fn: (req: import('express').Request, res: import('express').Response) => Promise<unknown>) =>
  (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) =>
    fn(req, res).catch(next);

export const agentsRouter = Router();

agentsRouter.get('/', wrap(controller.list));
agentsRouter.post('/', wrap(controller.create));
agentsRouter.get('/:id', wrap(controller.getOne));
agentsRouter.patch('/:id', wrap(controller.patch));
agentsRouter.get('/:id/gate', wrap(controller.gate));
agentsRouter.get('/:id/audit', wrap(controller.audit));
agentsRouter.post('/:id/documents/:key/verify', wrap(controller.verifyDoc));
agentsRouter.post('/:id/documents/:key/upload', wrap(controller.uploadDoc));
// Real file upload (multipart) + download
agentsRouter.post('/:id/documents/:key/file', upload.single('file'), wrap(controller.uploadDocFile));
agentsRouter.get('/:id/documents/:key/file', wrap(controller.downloadDocFile));
agentsRouter.delete('/:id/documents/:key/file', wrap(controller.removeDocFile));

// Stage navigation
agentsRouter.post('/:id/advance', wrap(controller.advance));
agentsRouter.post('/:id/back', wrap(controller.back));

// Stage 3 — acknowledgement loop + references
agentsRouter.post('/:id/ack/send', wrap(controller.sendAck));
agentsRouter.post('/:id/ack/reply', wrap(controller.markReplied));
agentsRouter.post('/:id/references/:refId/approve', wrap(controller.approveReference));

// Decisions
agentsRouter.post('/:id/request-info', wrap(controller.requestInfo));
agentsRouter.post('/:id/reject', wrap(controller.reject));
agentsRouter.post('/:id/approve', wrap(controller.approve));

// Activation state (post-approval)
agentsRouter.post('/:id/agreement/sign', wrap(controller.agreementSign));
agentsRouter.post('/:id/provision', wrap(controller.provision));
