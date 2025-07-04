import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataContext, getDatasource, getLocalDataContext, getRemoteDataContext } from '@medic/cht-datasource';

import { SettingsService } from '@mm-services/settings.service';
import { ChangesService } from '@mm-services/changes.service';
import { SessionService } from '@mm-services/session.service';
import { DbService } from '@mm-services/db.service';

import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CHTDatasourceService {
  private userCtx;
  private dataContext!: DataContext;
  private settings;
  private initialized;
  private extensionLibs = {};

  constructor(
    private http: HttpClient,
    private sessionService: SessionService,
    private settingsService: SettingsService,
    private changesService: ChangesService,
    private dbService: DbService
  ) { }

  isInitialized() {
    if (!this.initialized) {
      this.initialized = this.init();
    }

    return this.initialized;
  }

  private async init() {
    this.watchChanges();
    this.userCtx = this.sessionService.userCtx();
    await Promise.all([this.getSettings(), this.loadScripts()]);
    this.dataContext = await this.createDataContext();
  }

  private async createDataContext() {
    if (this.sessionService.isOnlineOnly(this.userCtx)) {
      return getRemoteDataContext();
    }

    const settingsService = { getAll: () => this.settings };
    const sourceDatabases = { medic: await this.dbService.get() };
    return getLocalDataContext(settingsService, sourceDatabases);
  }

  private async loadScripts() {
    try {
      const request = this.http.get<string[]>('/extension-libs', { responseType: 'json' });
      const extensionLibs = await lastValueFrom(request);
      if (extensionLibs?.length) {
        return Promise.all(extensionLibs.map(name => this.loadScript(name)));
      }
    } catch (e) {
      console.error('Error loading extension libs', e);
    }
  }

  private async loadScript(name) {
    try {
      const request = this.http.get('/extension-libs/' + name, { responseType: 'text' });
      const result = await lastValueFrom(request);
      const module = { exports: null };
      new Function('module', result)(module);
      this.extensionLibs[name] = module.exports;
    } catch (e) {
      console.error(`Error loading extension lib: "${name}"`, e);
    }
  }

  private async getSettings() {
    const settings = await this.settingsService.get();
    this.settings = settings;
  }

  private watchChanges() {
    this.changesService.subscribe({
      key: 'cht-script-api-settings-changes',
      filter: change => change.id === 'settings',
      callback: () => this.getSettings()
    });
  }

  private getChtPermissionsFromSettings(chtSettings) {
    return chtSettings?.permissions || this.settings?.permissions;
  }

  private getRolesFromUser(user) {
    return user?.roles || this.userCtx?.roles;
  }

  /**
   * Binds a cht-datasource function to the data context.
   * (e.g. `const getPersonWithLineage = this.bind(Person.v1.getWithLineage);`)
   * @param fn the function to bind. It should accept a data context as the parameter and return another function that
   * results in a `Promise`.
   * @returns a "context-aware" version of the function that is bound to the data context and ready to be used
   */
  bind<R, F extends (arg?: unknown) => Promise<R>>(fn: (ctx: DataContext) => F):
  (...p: Parameters<F>) => ReturnType<F> {
    return (...p) => {
      return new Promise((resolve, reject) => {
        this.isInitialized().then(() => {
          const contextualFn = this.dataContext.bind(fn);
          contextualFn(...p)
            .then(resolve)
            .catch(reject);
        });
      }) as ReturnType<F>;
    };
  }

  async get() {
    await this.isInitialized();
    const dataSource = getDatasource(this.dataContext);
    return {
      ...dataSource,
      v1: {
        ...dataSource.v1,
        hasPermissions: (permissions, user?, chtSettings?) => {
          const userRoles = this.getRolesFromUser(user);
          const chtPermissionsSettings = this.getChtPermissionsFromSettings(chtSettings);
          return dataSource.v1.hasPermissions(permissions, userRoles, chtPermissionsSettings);
        },
        hasAnyPermission: (permissionsGroupList, user?, chtSettings?) => {
          const userRoles = this.getRolesFromUser(user);
          const chtPermissionsSettings = this.getChtPermissionsFromSettings(chtSettings);
          return dataSource.v1.hasAnyPermission(permissionsGroupList, userRoles, chtPermissionsSettings);
        },
        getExtensionLib: (id) => {
          return this.extensionLibs[id];
        },
        analytics: {
          getTargetDocs: () => ([]),
        },
      }
    };
  }

  async getDataContext() {
    this.isInitialized();
    return this.dataContext;
  }
}
