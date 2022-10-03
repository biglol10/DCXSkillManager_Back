import { Router } from 'express';
import { getTestApi2 } from '@src/controllers/testApiController';

const router = Router();

router.route('/').get(getTestApi2);

export default router;
