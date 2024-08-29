import { apiGet, apiPost } from '../util/HttpApi';
import { LOGIN_URL, MAIN_URL } from './GlobalManager';

export const LOGIN_LOGOUT_URL = MAIN_URL + '/' + LOGIN_URL + '#logout'; // lose window.location.search/window.location.hash

const CHANGE_EMAIL_MSG = 'change';
const DELETE_EMAIL_MSG = 'delete';
const DEFAULT_AUTH_API_LANG = 'en';

export async function userRegisterAndSendCode({ username, setError, lang = DEFAULT_AUTH_API_LANG }) {
    const response = await apiGet(`${process.env.REACT_APP_USER_API_SITE}/mapapi/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.toLowerCase() }),
        params: { lang },
    });
    if (await isRequestOk(response, setError)) {
        setError('');
    }
}

export async function userActivate({ username, pwd, token, setError, lang = DEFAULT_AUTH_API_LANG }) {
    const response = await apiGet(`${process.env.REACT_APP_USER_API_SITE}/mapapi/auth/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.toLowerCase(), password: pwd, token: token, lang }),
    });
    if (await isRequestOk(response, setError)) {
        setError('');
    }
    return true;
}

export async function userLogin({ ctx, username, pwd, setError, handleClose, lang = DEFAULT_AUTH_API_LANG }) {
    const response = await apiGet(`${process.env.REACT_APP_USER_API_SITE}/mapapi/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.toLowerCase(), password: pwd, lang }),
    });
    if (await isRequestOk(response, setError)) {
        setError('');
        ctx.setLoginUser(username);
        ctx.setEmailCookie(username, { days: 30, SameSite: 'Strict' }); // for next login
        handleClose();
    }
}

async function userLogout({ ctx, username, setError, handleClose, setState, lang = DEFAULT_AUTH_API_LANG }) {
    const response = await apiGet(`${process.env.REACT_APP_USER_API_SITE}/mapapi/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.toLowerCase(), lang }),
    });
    if (await isRequestOk(response, setError)) {
        setState('login');
        ctx.setLoginUser('');
        setError('');
        handleClose();
    }
}

async function deleteAccount({ userEmail, code, setError, setAccountDeleted }) {
    if (isValidEmail(userEmail)) {
        const resp = await apiPost(`${process.env.REACT_APP_USER_API_SITE}/mapapi/auth/delete-account`, '', {
            throwErrors: true,
            dataOnErrors: true,
            headers: {
                'Content-Type': 'application/json',
            },
            params: {
                token: code,
            },
        }).catch((error) => setError(error.response.data));

        if (resp?.status === 200) {
            setAccountDeleted(true);
        }
    } else {
        setError('Please enter valid email');
    }
}

function isValidEmail(email) {
    return email !== null && email.length >= 3 && email.length < 320;
}

async function isRequestOk(response, setError) {
    if (!response.ok) {
        let message = await response.text();
        setError(message);
        return null;
    }
    const res = await response.json();
    if (res.status !== 'ok') {
        const message = `Unknown error has occured: ${JSON.stringify(res)}`;
        setError(message);
    }
    return res;
}

async function sendCode({ action, setError = null, lang = DEFAULT_AUTH_API_LANG }) {
    const resp = await apiPost(`${process.env.REACT_APP_USER_API_SITE}/mapapi/auth/send-code`, '', {
        throwErrors: true,
        dataOnErrors: true,
        headers: {
            'Content-Type': 'application/json',
        },
        params: {
            lang,
            action,
        },
    }).catch((error) => {
        setError && setError(error.response.data);
    });
    if (resp?.status === 200) {
        return true;
    }
}

async function sendCodeToNewEmail({ email, action, setError = null, lang = DEFAULT_AUTH_API_LANG, code }) {
    const resp = await apiPost(`${process.env.REACT_APP_USER_API_SITE}/mapapi/auth/send-code-to-new-email`, '', {
        throwErrors: true,
        dataOnErrors: true,
        headers: {
            'Content-Type': 'application/json',
        },
        params: {
            email: email.toLowerCase(),
            code,
            action,
            lang,
        },
    }).catch((error) => {
        setError && setError(error.response.data);
    });
    if (resp?.status === 200) {
        return true;
    }
}

async function changeEmail({ email, token, setError, lang = DEFAULT_AUTH_API_LANG }) {
    const data = {
        username: email.toLowerCase(),
        password: null,
        token: token,
        lang,
    };
    const resp = await apiPost(`${process.env.REACT_APP_USER_API_SITE}/mapapi/auth/change-email`, data, {
        throwErrors: true,
        dataOnErrors: true,
        headers: {
            'Content-Type': 'application/json',
        },
    }).catch((error) => setError(error.response.data));
    if (resp?.status === 200) {
        return true;
    }
}

const AccountManager = {
    deleteAccount,
    userLogout,
    sendCode,
    sendCodeToNewEmail,
    changeEmail,
    CHANGE_EMAIL_MSG: CHANGE_EMAIL_MSG,
    DELETE_EMAIL_MSG: DELETE_EMAIL_MSG,
    LOGIN_LOGOUT_URL,
};

export default AccountManager;
