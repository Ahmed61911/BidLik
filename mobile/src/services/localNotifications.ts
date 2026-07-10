/**
 * Local (client-scheduled) notification reminders — see architecture plan §7
 * step 6. These fire on-device from data the app already has (auction endsAt,
 * payment deadline), so they need no server round-trip. Best-effort: silently
 * no-op if permission isn't granted.
 *
 * Each reminder uses a deterministic identifier derived from its subject id,
 * so re-scheduling replaces rather than duplicates.
 */
import * as Notifications from "expo-notifications";

async function hasPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

/**
 * Schedules an "auction ending in N minutes" reminder. `leadMinutes` before
 * endsAt. No-op if that moment is already in the past.
 */
export async function scheduleAuctionEndingReminder(
  auctionId: string,
  endsAtIso: string,
  marqueModele: string,
  leadMinutes = 5,
): Promise<void> {
  try {
    if (!(await hasPermission())) return;
    const fireAt = new Date(endsAtIso).getTime() - leadMinutes * 60_000;
    if (fireAt <= Date.now()) return;

    const identifier = `auction-ending-${auctionId}`;
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: "Enchère bientôt terminée",
        body: `${marqueModele} se termine dans ${leadMinutes} minutes.`,
        data: { type: "ending_soon", auction_id: auctionId },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt) },
    });
  } catch {
    /* ignore */
  }
}

/** Schedules a payment-deadline reminder `leadHours` before the deadline. */
export async function schedulePaymentDeadlineReminder(
  auctionId: string,
  deadlineIso: string,
  marqueModele: string,
  leadHours = 12,
): Promise<void> {
  try {
    if (!(await hasPermission())) return;
    const fireAt = new Date(deadlineIso).getTime() - leadHours * 3_600_000;
    if (fireAt <= Date.now()) return;

    const identifier = `payment-deadline-${auctionId}`;
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: "Échéance de paiement proche",
        body: `Réglez ${marqueModele} avant l'échéance pour ne pas perdre le véhicule.`,
        data: { type: "payment_approved", auction_id: auctionId },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt) },
    });
  } catch {
    /* ignore */
  }
}

export async function cancelAuctionEndingReminder(auctionId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`auction-ending-${auctionId}`).catch(() => {});
}
