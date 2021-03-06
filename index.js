require('dotenv').config();
const express = require('express');
const s3o = require('@financial-times/s3o-middleware');
const helmet = require('helmet');
const express_enforces_ssl = require('express-enforces-ssl');
const path = require('path');
const hbs = require('express-hbs');
const PROJECT_PATH = path.join(__dirname + '/project');

const app = express();

if(process.env.NODE_ENV !== 'local') {
	app.use(helmet());
	app.enable('trust proxy');
	app.use(express_enforces_ssl());
}

app.use(s3o);
app.use(express.static(PROJECT_PATH));
app.engine('hbs', hbs.express4({
  partialsDir: PROJECT_PATH
}));
app.set('view engine', 'hbs');
app.set('views', PROJECT_PATH);

app.get('/keysFor/:project', (req, res) => {
	const validUser = checkUser(req.cookies.s3o_username);
	let response;

	if(validUser) {
		const keys = formatKeys(req.params.project);
		const hasKeys = keysExist(keys);

		if(hasKeys) {
			response = {'key': process.env[keys.key], 'secret': process.env[keys.secret]};
		} else {
			response = {'error': 'The keys for this resource don\'t exist.', 'errorType': '404'};
		}
	} else {
		response = {'error': 'You are not allowed to get keys for this resource.', 'errorType': '403'};
	}

	if(response.key !== undefined) {
		const responseText = JSON.stringify(response);
		return res.render('ftlabs-ftda', {creds: responseText});
	}

	res.status(response.errorType).send(response.error);
});

function checkUser(user) {
	if(user !== undefined) {
		const allowlist = (!!process.env.USER_ALLOWLIST)?process.env.USER_ALLOWLIST.split(','):[];
		return allowlist.indexOf(user) > -1;
	}

	return false;
}

function formatKeys(project) {
	const formatProject = project.replace('-','_').toUpperCase();
	return {'key': formatProject + '_KEY', 'secret': formatProject + '_SECRET'};
}

function keysExist(keys) {
	return (!!process.env[keys.key] && !!process.env[keys.secret]);
}

app.listen(process.env.PORT || 2017);
