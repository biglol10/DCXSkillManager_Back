import asyncHandler from '@src/middleware/async';
import queryExecutorResult from '@src/util/queryExecutorResult';
import ErrorResponse from '@src/util/errorResponse';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault('Asia/Seoul');

export const uploadTest = asyncHandler(async (req: any, res, next) => {
	console.log('uploadTest');

	console.log(req.file);
	return res.status(200).json({
		result: 'success',
	});
});

export const registerUser = asyncHandler(async (req, res, next) => {
	console.log(req.body);
	const { name, user_id, passwd, team, title, phonenum, detail } = req.body;

	const time = dayjs();

	const regPassword = new RegExp('^(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{6,})');
	if (!regPassword.test(passwd)) {
		return next(
			new ErrorResponse('비밀번호는 최소 6자리, 숫자+특수문자를 포함해야 합니다', 401),
		);
	}

	const salt = await bcrypt.genSalt(10);

	const hashedPassword = await bcrypt.hash(passwd, salt);

	const sql = `INSERT INTO USER(USER_ID, NAME, PASSWD, TEAM_CD, TITLE, PHONENUM, DETAIL, REGISTER_DATE, ADMIN) VALUES ('${user_id}', '${name}', '${hashedPassword}', '${team}', '${title}','${phonenum}', '${detail}', CURRENT_TIMESTAMP,  0)`;

	const resultData = await queryExecutorResult(sql);

	if (resultData.status === 'success' && process.env.JWT_SECRET) {
		// const token = jwt.sign({ id: user_id }, process.env.JWT_SECRET, {
		// 	expiresIn: process.env.JWT_EXPIRE,
		// });

		// const cookie_expire = process.env.COOKIE_EXPIRE
		// 	? parseInt(process.env.COOKIE_EXPIRE, 10)
		// 	: 30;
		const { token, options } = tokenResponse(user_id, process.env.JWT_SECRET);

		return res.status(200).cookie('user_token', token, options).json({
			name,
			user_id,
			time,
			token,
			result: 'success',
		});
	} else {
		return res.status(401).json({
			result: 'fail',
			message: 'User register failed',
			status: resultData.status || 'err from node',
			sqlMessage: resultData.sqlMessage || 'check env var',
		});
	}
});

export const idCheck = asyncHandler(async (req, res, next) => {
	const { userId } = req.body;
	const sql = `SELECT EXISTS (SELECT * FROM USER WHERE USER_ID = '${userId}') AS SUCCESS`;

	const resultData = await queryExecutorResult(sql);
	const foundId = resultData.queryResult[0].SUCCESS == 1 ? true : false;
	// console.log(resultData.queryResult[0].SUCCESS);

	if (resultData.status === 'success') {
		return res.status(200).json({
			result: 'success',
			foundId,
		});
	} else {
		return res.status(401).json({
			result: 'fail',
			message: 'Id Check failed',
		});
	}
});

export const getTeamList = asyncHandler(async (req, res, next) => {
	const sql = 'SELECT * FROM TEAM';

	const resultData = await queryExecutorResult(sql);
	if (resultData.status === 'success') {
		return res.status(200).json({
			resultData,
		});
	} else {
		return res.status(401).json({
			resultData,
			message: 'query execute failed',
		});
	}
});

export const loginUser = asyncHandler(async (req, res, next) => {
	const { userId, password } = req.body;

	if (!userId || !password) {
		return next(new ErrorResponse('아이디/비밀번호를 입력해주세요', 400));
	}

	const userFindSql = `SELECT * FROM USER WHERE USER_ID = '${userId}'`;

	const { queryResult: selectedUser } = await queryExecutorResult(userFindSql);

	if (selectedUser.length === 0) {
		return next(new ErrorResponse('로그인에 실패했습니다', 401));
	}

	const isMatch = await matchPassword(password, selectedUser[0].PASSWD);

	if (!isMatch) {
		return next(new ErrorResponse('로그인에 실패했습니다', 401));
	}

	const updateUserLoginSql = `UPDATE USER SET REGISTER_DATE = SYSDATE() WHERE USER_ID = '${userId}'`;

	const { queryResult: updateResult } = await queryExecutorResult(updateUserLoginSql);

	if (updateResult.affectedRows && process.env.JWT_SECRET) {
		const { token, options } = tokenResponse(userId, process.env.JWT_SECRET);

		const time = dayjs();

		return res.status(200).cookie('user_token', token, options).json({
			name: selectedUser[0].NAME,
			userId,
			time,
			token,
			result: 'success',
		});
	} else {
		return res.status(401).json({
			result: 'error',
			message: 'User login failed',
		});
	}
});

const matchPassword = async (enteredPassword: string, dbPassword: string) => {
	return await bcrypt.compare(enteredPassword, dbPassword);
};

const tokenResponse = (userId: string, jwt_secret: string) => {
	const token = jwt.sign({ id: userId }, jwt_secret, {
		expiresIn: process.env.JWT_EXPIRE,
	});

	const cookie_expire = process.env.COOKIE_EXPIRE ? parseInt(process.env.COOKIE_EXPIRE, 10) : 30;

	const options = {
		expires: new Date(Date.now() + cookie_expire * 24 * 60 * 60 * 1000),
		httpOnly: true, // only want the cookie to be access through client side script
		secure: false,
	};

	if (process.env.NODE_ENV === 'production') {
		options.secure = true; // https (production)
	}

	return { token, options };
};
