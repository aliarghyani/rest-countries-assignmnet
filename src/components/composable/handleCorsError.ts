import type { AxiosError } from 'axios';

import sendAlert from './useSendAlert';

const NETWORK_ERROR_TITLE = 'Network Error';
const NETWORK_ERROR_MESSAGE =
  "We're having trouble reaching the server right now. Please check your connection and try again.";

type CorsLikeError = AxiosError | Error | unknown;

/**
 * Present a user-facing notification for network or CORS related errors.
 *
 * @param error - Error instance thrown by the HTTP client.
 */
export default function handleCorsError(error: CorsLikeError): void {
  // Keep a console trace to aid debugging in development environments.
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(NETWORK_ERROR_TITLE, error);
  }

  sendAlert(NETWORK_ERROR_MESSAGE, 'error', NETWORK_ERROR_TITLE);
}
