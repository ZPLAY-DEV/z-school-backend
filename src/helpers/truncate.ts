export const truncate = (message: string, length: number): string => {
  const messageLength = message.length;
  if (length > messageLength) {
    return message;
  }
  return message.substring(0, length) + '…';
};
