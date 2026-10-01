import { PublicUpdatesService } from "./public/public-updates.service.js";
import { AuthorizedUpdatesService } from "./authorized/authorized-updates.service.js";

export class UpdateService {
  /**
   * Fetch public updates with pagination, sorting (latest first), and optional keyword search.
   */
  static async getUpdates(params) {
    return PublicUpdatesService.getUpdates(params);
  }

  /**
   * Fetch a single update by ID with visibility allowed for public or unlisted.
   */
  static async getUpdateById(id) {
    return PublicUpdatesService.getUpdateById(id);
  }

  /**
   * Fetch updates belonging to a specific authenticated user considering all visibilities.
   */
  static async getUserUpdates(params) {
    return AuthorizedUpdatesService.getUserUpdates(params);
  }
}

export { PublicUpdatesService, AuthorizedUpdatesService };

