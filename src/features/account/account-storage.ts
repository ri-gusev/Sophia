export function accountStoragePrefix(accountId: string) {
  return `sophia.account.${encodeURIComponent(accountId)}.`;
}

let suspendedAccountPrefix: string | undefined;

export function suspendAccountBrowserStorage(accountId: string) {
  suspendedAccountPrefix = accountStoragePrefix(accountId);
}

export function canWriteAccountBrowserStorage(key: string) {
  return !suspendedAccountPrefix || !key.startsWith(suspendedAccountPrefix);
}
