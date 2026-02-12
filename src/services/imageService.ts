// Service for handling MESBG unit images from the mesbg-list-builder repository

const REMOTE_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/avcordaro/mesbg-list-builder-v2024/main/static-resources/images/profiles';

// For local images, we'll use the asset path
// In Expo, we need to reference local files differently
const USE_LOCAL_IMAGES = false; // Set to true once images are downloaded

export const imageService = {
  /**
   * Get the image URL for a unit
   * @param profileOrigin - The profile_origin from the unit data (faction folder name)
   * @param unitName - The name of the unit
   * @returns The full URL to the unit's image
   */
  getUnitImageUrl(profileOrigin: string, unitName: string): string {
    const encodedName = encodeURIComponent(unitName);

    if (USE_LOCAL_IMAGES) {
      // Try local images first
      // Note: In production, you'd want to use expo-asset or require() for local images
      // For now, we'll use the remote URL
      // const localPath = `../../assets/images/profiles/${profileOrigin}/${unitName}.png`;
      // return localPath;
    }

    // Fall back to remote images
    const encodedFolder = encodeURIComponent(profileOrigin);
    return `${REMOTE_IMAGE_BASE_URL}/${encodedFolder}/pictures/${encodedName}.png`;
  },

  /**
   * Check if an origin has images available
   * @param profileOrigin - The profile_origin from the unit data
   * @returns true if the origin is valid
   */
  hasImages(profileOrigin: string): boolean {
    // All profile_origin values should have corresponding image folders
    const validOrigins = [
      'Arnor & Angmar',
      'Dwarven Holds',
      'Elven Kingdoms',
      'Evil Legacy',
      'Fallen Realms',
      'Gondor',
      'Good Legacy',
      'Gundabad & Dol Guldur',
      'Isengard',
      'Kingdoms of Men',
      'Mordor',
      'Rohan',
      'Smaug',
      'The Free Peoples',
      'The Hill Tribes',
      'The Misty Mountains',
      'Siege Equipment'
    ];
    return validOrigins.includes(profileOrigin);
  }
};
