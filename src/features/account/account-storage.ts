export function accountStoragePrefix(accountId: string) {
  return `sophia.account.${encodeURIComponent(accountId)}.`;
}
