// @flow

import type { RTCDataChannel } from "wrtc";
import type { Transport } from "../../../protocol";
import type { Connection } from "..";

type DataChannelOptions = {
  dataChannel: RTCDataChannel
};

import { Signal } from "../../../signal";

export default class RTCChannel implements Connection {
  _dataChannel: RTCDataChannel;
  _open: boolean = true;

  closed: Signal<> = new Signal();
  errors: Signal<{ error: string }> = new Signal();
  messages: Signal<> = new Signal();

  get id(): string {
    return this._dataChannel.label;
  }

  constructor(options: DataChannelOptions) {
    const { dataChannel } = options;

    this._dataChannel = dataChannel;
    this._dataChannel.addEventListener("message", this._onMessage);
    this._dataChannel.addEventListener("close", () => this.close());
    this._dataChannel.addEventListener("error", this._onError);
  }

  _onMessage = (e: MessageEvent) =>
    this.messages.dispatch((e.data: any));

  _onError = e => this.errors.dispatch({ error: e.message });

  send = (message: mixed) => {
    if (
      this._dataChannel.readyState === "closing" ||
      this._dataChannel.readyState === "closed"
    ) {
      return;
    }

    this._dataChannel.send(message);
  };

  close() {
    this._open = false;
    this._dataChannel.removeEventListener("message", this._onMessage);

    if (
      this._dataChannel.readyState !== "closing" ||
      this._dataChannel.readyState !== "closed"
    ) {
      this._dataChannel.close();
    }

    this.closed.dispatch();
  }
}
