export const calcAge = (dob: Date | null): number | null => {
  if (dob === null) return null;
  const today = new Date().getTime();
  const birth = new Date(dob).getTime();
  return Math.floor((today - birth) / 3.15576e10);
};
