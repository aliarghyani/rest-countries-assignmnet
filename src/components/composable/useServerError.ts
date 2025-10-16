import { isAxiosError, type AxiosError } from 'axios';
import type { Pinia } from 'pinia';
import type { Router } from 'vue-router';

import router from '@/router';
import store, { useGlobal } from '@/store';

import handleCorsError from './handleCorsError';
import sendAlert, { type AlertType } from './useSendAlert';

const AUTH_ROUTE_NAME = 'Auth';
const SERVER_ERROR_TITLE = 'Server Error';
const UNAUTHORIZED_ERROR_MESSAGE = 'Your session has expired. Please sign in again.';
const NETWORK_ERROR_MESSAGE = 'Network error detected. Please check your connection and try again.';
const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again later.';

type ValidationErrorValue = string | string[] | undefined | null;
type ValidationErrorResponse = Record<string, ValidationErrorValue>;

interface ErrorResponse {
  errors?: ValidationErrorResponse;
}

type ServerAxiosError = AxiosError<ErrorResponse>;

type StoreWithLegacyCommit = Pinia & {
  commit?: (type: string, payload?: unknown) => void;
};

const storeWithCommit = store as StoreWithLegacyCommit;
const applicationRouter = router as Router;

const SERVER_ERROR_STATUSES = new Set([500, 503]);

const getFirstErrorMessage = (errors: ValidationErrorResponse): string | null => {
  for (const key of Object.keys(errors)) {
    const message = errors[key];
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }

    if (Array.isArray(message)) {
      const [first] = message.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
      if (first) {
        return first;
      }
    }
  }

  return null;
};

const notifyError = (message: string, type: AlertType = 'error'): void => {
  sendAlert(message, type);
  const globalStore = useGlobal();
  globalStore.setMessage(message);
};

const reportGlobalError = (error: unknown, context: string, severity: 'error' | 'warning' | 'info' = 'error'): void => {
  const globalStore = useGlobal();
  if (globalStore.reportError) {
    globalStore.reportError(error, context, severity);
  }
};

const handleUnauthorized = (): void => {
  if (typeof storeWithCommit.commit === 'function') {
    storeWithCommit.commit('logOut');
  }

  void applicationRouter.push({ name: AUTH_ROUTE_NAME }).catch(() => undefined);
  notifyError(UNAUTHORIZED_ERROR_MESSAGE);
};

const handleServerErrors = (axiosError: ServerAxiosError): void => {
  const { response, message } = axiosError;
  const status = response?.status ?? null;
  reportGlobalError(axiosError, 'http-error');

  if (status === 0 && message === 'Network Error') {
    handleCorsError(axiosError);
    notifyError(NETWORK_ERROR_MESSAGE, 'warning');
    return;
  }

  if (status === 401) {
    handleUnauthorized();
    return;
  }

  const firstValidationError = response?.data?.errors ? getFirstErrorMessage(response.data.errors) : null;
  if (firstValidationError) {
    notifyError(firstValidationError);
    return;
  }

  if (status !== null && SERVER_ERROR_STATUSES.has(status)) {
    notifyError(SERVER_ERROR_TITLE);
    return;
  }

  if (status) {
    notifyError(`${DEFAULT_ERROR_MESSAGE} (HTTP ${status})`);
  } else {
    notifyError(DEFAULT_ERROR_MESSAGE);
  }
};

export default function serverError(error: unknown): void {
  if (!isAxiosError<ErrorResponse>(error)) {
    reportGlobalError(error, 'unknown-error');
    notifyError(DEFAULT_ERROR_MESSAGE);
    return;
  }

  handleServerErrors(error);
}
