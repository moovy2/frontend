import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/state-badge";
import "../../../components/ha-alert";
import "../../../components/ha-spinner";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import type { DeviceRegistryEntry } from "../../../data/device_registry";
import {
  computeDeviceName,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
import { subscribeEntityRegistry } from "../../../data/entity_registry";
import type { UpdateEntity } from "../../../data/update";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-updates")
class HaConfigUpdates extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public updateEntities?: UpdateEntity[];

  @property({ type: Number }) public total?: number;

  @state() private _devices?: DeviceRegistryEntry[];

  @state() private _entities?: EntityRegistryEntry[];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._devices = entries;
      }),
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entities = entities.filter((entity) => entity.device_id !== null);
      }),
    ];
  }

  private getDeviceEntry = memoizeOne(
    (deviceId: string): DeviceRegistryEntry | undefined =>
      this._devices?.find((device) => device.id === deviceId)
  );

  private getEntityEntry = memoizeOne(
    (entityId: string): EntityRegistryEntry | undefined =>
      this._entities?.find((entity) => entity.entity_id === entityId)
  );

  protected render() {
    if (!this.updateEntities?.length) {
      return nothing;
    }

    const updates = this.updateEntities;

    return html`
      <div class="title">
        ${this.hass.localize("ui.panel.config.updates.title", {
          count: this.total || this.updateEntities.length,
        })}
      </div>
      <mwc-list>
        ${updates.map((entity) => {
          const entityEntry = this.getEntityEntry(entity.entity_id);
          const deviceEntry =
            entityEntry && entityEntry.device_id
              ? this.getDeviceEntry(entityEntry.device_id)
              : undefined;

          return html`
            <ha-list-item
              twoline
              graphic="medium"
              class=${ifDefined(
                entity.attributes.skipped_version ? "skipped" : undefined
              )}
              .entity_id=${entity.entity_id}
              .hasMeta=${!this.narrow}
              @click=${this._openMoreInfo}
            >
              <state-badge
                slot="graphic"
                .title=${entity.attributes.title ||
                entity.attributes.friendly_name}
                .hass=${this.hass}
                .stateObj=${entity}
                class=${ifDefined(
                  this.narrow && entity.attributes.in_progress
                    ? "updating"
                    : undefined
                )}
              ></state-badge>
              ${this.narrow && entity.attributes.in_progress
                ? html`<ha-spinner
                    slot="graphic"
                    class="absolute"
                    size="small"
                    .ariaLabel=${this.hass.localize(
                      "ui.panel.config.updates.update_in_progress"
                    )}
                  ></ha-spinner>`
                : ""}
              <span
                >${deviceEntry
                  ? computeDeviceName(deviceEntry, this.hass)
                  : entity.attributes.friendly_name}</span
              >
              <span slot="secondary">
                ${entity.attributes.title} ${entity.attributes.latest_version}
                ${entity.attributes.skipped_version
                  ? `(${this.hass.localize("ui.panel.config.updates.skipped")})`
                  : ""}
              </span>
              ${!this.narrow
                ? entity.attributes.in_progress
                  ? html`<ha-spinner
                      size="small"
                      slot="meta"
                      .ariaLabel=${this.hass.localize(
                        "ui.panel.config.updates.update_in_progress"
                      )}
                    ></ha-spinner>`
                  : html`<ha-icon-next slot="meta"></ha-icon-next>`
                : ""}
            </ha-list-item>
          `;
        })}
      </mwc-list>
    `;
  }

  private _openMoreInfo(ev: MouseEvent): void {
    fireEvent(this, "hass-more-info", {
      entityId: (ev.currentTarget as any).entity_id,
    });
  }

  static get styles(): CSSResultGroup[] {
    return [
      css`
        :host {
          --mdc-list-vertical-padding: 0;
        }
        .title {
          font-size: 16px;
          padding: 16px;
          padding-bottom: 0;
        }
        .skipped {
          background: var(--secondary-background-color);
        }
        ha-list-item {
          --mdc-list-item-graphic-size: 40px;
        }
        ha-icon-next {
          color: var(--secondary-text-color);
          height: 24px;
          width: 24px;
        }
        button.show-more {
          color: var(--primary-color);
          text-align: left;
          cursor: pointer;
          background: none;
          border-width: initial;
          border-style: none;
          border-color: initial;
          border-image: initial;
          padding: 16px;
          font: inherit;
        }
        button.show-more:focus {
          outline: none;
          text-decoration: underline;
        }
        ha-list-item {
          cursor: pointer;
          font-size: 16px;
        }
        ha-spinner.absolute {
          position: absolute;
          width: 28px;
          height: 28px;
        }
        state-badge.updating {
          opacity: 0.5;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-updates": HaConfigUpdates;
  }
}
