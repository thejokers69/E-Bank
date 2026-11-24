import { Injectable } from '@angular/core';
import { Client } from 'appwrite';
import { appwriteClient } from '../lib/appwrite';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppwriteService {
  readonly client: Client = appwriteClient;
  readonly projectName = environment.appwriteProjectName;
  readonly endpoint = environment.appwriteEndpoint;
  readonly projectId = environment.appwriteProjectId;

  private pingStarted = false;

  /** Verify connectivity once per app session. */
  pingOnce(): void {
    if (this.pingStarted) {
      return;
    }
    this.pingStarted = true;

    this.client
      .ping()
      .then((result) => {
        console.log('[Appwrite] ping ok', {
          project: this.projectName,
          projectId: this.projectId,
          endpoint: this.endpoint,
          result
        });
      })
      .catch((err: unknown) => {
        console.error('[Appwrite] ping failed', err);
      });
  }
}
