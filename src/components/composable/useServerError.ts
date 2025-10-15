import { isAxiosError, type AxiosError } from 'axios';
import type { Pinia } from 'pinia';
import type { Router } from 'vue-router';

import router from '@/router';
import store from '@/store';

import handleCorsError from './handleCorsError';
import sendAlert, { type AlertType } from './useSendAlert';

const AUTH_ROUTE_NAME = 'Auth';
const SERVER_ERROR_TITLE = 'Server Error';

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
};

const handleUnauthorized = (): void => {
  if (typeof storeWithCommit.commit === 'function') {
    storeWithCommit.commit('logOut');
  }

  void applicationRouter.push({ name: AUTH_ROUTE_NAME }).catch(() => undefined);
};

const handleServerErrors = (axiosError: ServerAxiosError): void => {
  const { response, message } = axiosError;
  const status = response?.status ?? null;

  if (status === 0 && message === 'Network Error') {
    handleCorsError(axiosError);
    return;
  }

  if (status === 401) {
    handleUnauthorized();
    return;
  }

  if (status !== null && SERVER_ERROR_STATUSES.has(status)) {
    notifyError(SERVER_ERROR_TITLE);
  }

  const firstValidationError = response?.data?.errors ? getFirstErrorMessage(response.data.errors) : null;
  if (firstValidationError) {
    notifyError(firstValidationError);
  }
};

export default function serverError(error: unknown): void {
  if (!isAxiosError<ErrorResponse>(error)) {
    return;
  }

  handleServerErrors(error);
}
