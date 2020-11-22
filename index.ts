require('dotenv').config({ path: './.env' });
import express, { Request, Response } from 'express';
import speakeasy from 'speakeasy';
import { v4 } from 'uuid';
import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';

const app = express();
app.use(express.json());

const db = new JsonDB(new Config('2fa_db', true, false, '/'));

app.get('/api', (_, res: Response) => {
	res.json('Hello from 2fa');
});

// Register user and create temp secret
app.post('/api/register', (_, res: Response) => {
	const id = v4();
	try {
		const path = `/user/${id}`;
		const temp_secret = speakeasy.generateSecret();
		db.push(path, { id, temp_secret });
		res.json({ id, secret: temp_secret });
	} catch (e) {
		console.log(e);
		res.status(500).json('Error generating secret');
	}
});

// Verify
app.post('/api/verify', (req: Request, res: Response) => {
	const { token, uid } = req.body;
	try {
		const path = `/user/${uid}`;
		const user = db.getData(path);

		const { base32: secret } = user.temp_secret;

		const verified = speakeasy.totp.verify({
			secret,
			encoding: 'base32',
			token,
			window: 1
		});
		if (verified) {
			db.push(path, { id: user, secret: user.temp_secret });
			res.json({ verified: true });
		} else {
			res.json({ verified: false });
		}
	} catch (e) {
		console.log(e);
		res.status(500).json('Error verifying user');
	}
});

app.listen(process.env.PORT, () =>
	console.log(`http://localhost:${process.env.PORT}`)
);
