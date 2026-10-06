import { useState } from 'react';
import { createGreenApiClient, DEMO_API_URL, guessApiUrl } from '../api/greenApi';
import { IconEye } from './icons';

const STATE_HINTS = {
  notAuthorized: 'Инстанс не авторизован в MAX. Авторизуйте его в личном кабинете GREEN-API',
  blocked: 'Аккаунт MAX заблокирован',
  starting: 'Инстанс запускается. Попробуйте через минуту',
  yellowCard: 'На аккаунт наложены ограничения MAX',
};

export default function LoginScreen({ onLogin }) {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiUrlTouched, setApiUrlTouched] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const effectiveApiUrl = apiUrlTouched ? apiUrl : guessApiUrl(idInstance);

  async function handleSubmit(e) {
    e.preventDefault();
    const credentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
      apiUrl: effectiveApiUrl.trim(),
    };
    if (!/^\d+$/.test(credentials.idInstance)) return setError('idInstance состоит только из цифр');
    if (!credentials.apiTokenInstance) return setError('Введите apiTokenInstance');
    if (!/^https?:\/\//.test(credentials.apiUrl)) return setError('Укажите apiUrl из личного кабинета, например https://3100.api.green-api.com');
    if (credentials.apiUrl.replace(/\/+$/, '') === window.location.origin) {
      return setError(`Это адрес самого сайта, а не GREEN-API. Для демо: ${DEMO_API_URL}`);
    }

    setError('');
    setLoading(true);
    try {
      const { stateInstance } = await createGreenApiClient(credentials).getStateInstance();
      if (stateInstance !== 'authorized') {
        setError(STATE_HINTS[stateInstance] ?? `Инстанс в состоянии «${stateInstance}»`);
        return;
      }
      onLogin(credentials);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login">
      <form className="login__card" onSubmit={handleSubmit} noValidate>
        <div className="login__brand" aria-hidden="true" />
        <h1 className="login__title">Вход в чат</h1>
        <p className="login__lead">
          Данные инстанса есть в{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">личном кабинете GREEN-API</a>
        </p>

        <label className="field">
          <span className="field__label">idInstance</span>
          <input className="field__input" inputMode="numeric" autoComplete="username" placeholder="3100123456"
            value={idInstance} onChange={(e) => setIdInstance(e.target.value)} autoFocus />
        </label>

        <label className="field">
          <span className="field__label">apiTokenInstance</span>
          <span className="field__row">
            <input className="field__input" type={showToken ? 'text' : 'password'} autoComplete="current-password"
              placeholder="Токен инстанса" value={apiTokenInstance} onChange={(e) => setApiTokenInstance(e.target.value)} />
            <button type="button" className="field__toggle" onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}>
              <IconEye off={showToken} />
            </button>
          </span>
        </label>

        <label className="field">
          <span className="field__label">apiUrl</span>
          <input className="field__input" inputMode="url" placeholder="https://3100.api.green-api.com"
            value={effectiveApiUrl} onChange={(e) => { setApiUrlTouched(true); setApiUrl(e.target.value); }} />
          <span className="field__hint">Подставляется по idInstance. Если в кабинете указан другой — замените</span>
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </main>
  );
}
