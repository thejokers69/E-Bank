import { Client } from 'appwrite';
import { environment } from '../../environments/environment';

/**
 * Shared Appwrite web client for the E-Bank Angular app.
 * Import this (or AppwriteService) anywhere you need Account, Databases, etc.
 */
export const appwriteClient = new Client()
  .setEndpoint(environment.appwriteEndpoint)
  .setProject(environment.appwriteProjectId);
