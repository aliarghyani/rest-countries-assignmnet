import { useNotification, type NotificationsOptions } from '@kyvg/vue3-notification';

export type AlertType = NotificationsOptions['type'];

type ExtendedNotificationOptions = NotificationsOptions & {
  position?: string;
  top?: string;
};

const NOTIFICATION_DURATION = 2500;

/**
 * Trigger a UI notification using the global notification composable.
 *
 * @param message - Body text to display in the notification.
 * @param type - Notification tone (success, error, warn, etc.).
 * @param title - Optional heading for the notification.
 */
export default function sendAlert(
  message: string,
  type: AlertType = 'success',
  title = ''
): void {
  const notification = useNotification();
  const payload: ExtendedNotificationOptions = {
    title,
    type,
    text: message,
    duration: NOTIFICATION_DURATION,
    position: 'top center',
    top: '100px',
  };

  notification.notify(payload);
}
