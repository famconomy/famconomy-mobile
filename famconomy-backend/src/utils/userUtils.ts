/**
 * Utility functions for handling user data transformations
 */

/**
 * Constructs a full name from first and last name components
 * @param firstName - The user's first name
 * @param lastName - The user's last name
 * @returns Combined full name, handling null/undefined values gracefully
 */
export const constructFullName = (firstName?: string | null, lastName?: string | null): string => {
  const first = firstName?.trim() || '';
  const last = lastName?.trim() || '';
  return `${first} ${last}`.trim() || 'Unknown User';
};

/**
 * Transforms a Prisma Users object to match frontend expectations
 * @param user - Prisma Users object with FirstName/LastName
 * @returns User object with fullName field
 */
export const transformUserForFrontend = (user: {
  UserID: string;
  FirstName?: string | null;
  LastName?: string | null;
  Email?: string;
  ProfilePhotoUrl?: string | null;
  [key: string]: any;
}) => {
  const { UserID, FirstName, LastName, ...rest } = user;
  return {
    id: UserID,
    fullName: constructFullName(FirstName, LastName),
    firstName: FirstName,
    lastName: LastName,
    ...rest
  };
};