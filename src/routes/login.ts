import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import {
	loginUser,
	registerUser,
	idCheck,
	getTeamList,
	uploadUserImg,
	uploadUserImgS3,
	getUserByToken,
	getTechList,
} from '@src/controllers/authController';
import { protectedApi } from '@src/middleware/auth';
const image = require('../controllers/image');

const multer = require('multer');

const upload = require('../middleware/multer');
//[로컬 이미지 ]
// var path = require('path');
// const storage = multer.diskStorage({
// 	destination: function (req: any, file: any, cb: any) {
// 		cb(null, 'images/userImg/');
// 	},
// 	filename: function (req: any, file: any, cb: any) {
// 		cb(null, file.originalname);
// 	},
// });

// const upload = multer({
// 	storage: storage,
// });
//[로컬 이미지 ]

const router = Router();

router.route('/registerUser').post(registerUser);

router.route('/loginUser').post(loginUser);

router.route('/idCheck').post(idCheck);

router.route('/getTeamList').post(getTeamList);

router.route('/getTechList').post(getTechList);

// router.route('/uploadUserImg').post(upload.single('img'), uploadUserImgS3);
router.post(
	'/uploadUserImg',
	(req, res) =>
		upload.single('img')(req, res, (err: any) => {
			console.log(`error~`, err);
		}),
	image.post,
);

router.post('/getLoggedInUserInfo', protectedApi, getUserByToken);

export default router;
