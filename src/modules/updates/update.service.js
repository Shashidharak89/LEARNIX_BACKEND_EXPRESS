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

  /**
   * Update an update by ID with ownership verification.
   */
  static async updateUpdateById(params) {
    return AuthorizedUpdatesService.updateUpdateById(params);
  }

  /**
   * Delete an update by ID with ownership verification.
   */
  static async deleteUpdateById(params) {
    return AuthorizedUpdatesService.deleteUpdateById(params);
  }

  /**
   * Directly upload attached files to Cloudinary and create update document in MongoDB.
   */
  static async createUpdateDirect(params) {
    return AuthorizedUpdatesService.createUpdateDirect(params);
  }

  /**
   * Create an update in MongoDB and invalidate cached latest titles.
   */
  static async createUpdate(params) {
    return AuthorizedUpdatesService.createUpdate(params);
  }
}

export { PublicUpdatesService, AuthorizedUpdatesService };
export { UpdateWebSocketService } from "./websocket/update-ws.service.js";
export { initUpdatesWebSocket } from "./websocket/update-ws.handler.js";


