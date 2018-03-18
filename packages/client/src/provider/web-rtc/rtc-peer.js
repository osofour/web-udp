// @flow

import type {
  RTCDataChannelEvent,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCPeerConnectionIceEvent,
  RTCSessionDescription
} from "wrtc";

import type { Connection } from "..";

import { Signal } from "@web-udp/protocol";
import RTCChannel from "./rtc-channel";

// Enforce UDP-like SCTP messaging.
const DATA_CHANNEL_OPTIONS = {
  ordered: false,
  reliable: false
};

export interface Peer {
  channel(
    string,
    options?: { binaryType?: "arraybuffer" | "blob" }
  ): Promise<Connection>;
  offer(): Promise<RTCSessionDescription>;
  answer(RTCSessionDescription): Promise<RTCSessionDescription>;
  setRemoteDescription(RTCSessionDescription): void;
  addIceCandidate(RTCIceCandidate): void;
}

export type PeerOptions = {
  onChannel: RTCChannel => mixed,
  onClose: (...mixed[]) => mixed,
  onICE: RTCIceCandidate => mixed,
  peerConnection: RTCPeerConnection
};

export default class RTCPeer implements Peer {
  _channels: { [string]: RTCChannel } = {};
  _onChannel: RTCChannel => mixed;
  _onClose: (...mixed[]) => mixed;
  _onICE: RTCIceCandidate => mixed;
  _peerConnection: RTCPeerConnection;

  constructor(options: PeerOptions) {
    const { onChannel, onClose, onICE, peerConnection } = options;

    this._onICE = onICE;
    this._onChannel = onChannel;
    this._onClose = onClose;

    this._peerConnection = peerConnection;

    this._peerConnection.addEventListener("close", () =>
      this.close()
    );
    this._peerConnection.addEventListener(
      "datachannel",
      this._onDataChannel
    );
    this._peerConnection.addEventListener(
      "icecandidate",
      this._onIceCandidate
    );
    this._peerConnection.addEventListener(
      "signalingstatechange",
      this._onSignalingStateChange
    );
  }

  channel(
    cid: string,
    options: { binaryType?: "arraybuffer" | "blob" } = {}
  ): Promise<Connection> {
    // Create a RTCDataChannel with the id as the label.
    const dataChannel = this._peerConnection.createDataChannel(
      cid,
      DATA_CHANNEL_OPTIONS
    );

    dataChannel.binaryType = options.binaryType || "arraybuffer";

    return new Promise(resolve => {
      const handle = () => {
        const channel = (this._channels[
          dataChannel.label
        ] = new RTCChannel({
          dataChannel
        }));
        resolve(channel);
        this._onChannel(channel);
      };
      dataChannel.addEventListener("open", handle);
    });
  }

  /**
   * Create an offer session description.
   */
  offer() {
    return this._peerConnection
      .createOffer()
      .then(sdp => {
        this._setLocalDescription(sdp);
        return sdp;
      })
      .catch(console.error);
  }

  /**
   * Create an answer session description.
   */
  answer() {
    return this._peerConnection
      .createAnswer()
      .then(sdp => {
        this._setLocalDescription(sdp);
        return sdp;
      })
      .catch(console.error);
  }

  _setLocalDescription = (sdp: RTCSessionDescription) => {
    this._peerConnection.setLocalDescription(sdp);
  };

  _onIceCandidate = (e: RTCPeerConnectionIceEvent) => {
    this._onICE(e.candidate);
  };

  _onDataChannel = (e: RTCDataChannelEvent) => {
    const { channel: dataChannel } = e;

    let channel = this._channels[dataChannel.label];

    if (channel) {
      return;
    }

    channel = this._channels[dataChannel.label] = new RTCChannel({
      dataChannel
    });

    this._onChannel(channel);
  };

  _onSignalingStateChange = () => {
    const { connectionState } = this._peerConnection;

    switch (connectionState) {
      case "disconnected":
      case "failed":
      case "closed":
        this._onClose();
        break;
      default:
        break;
    }
  };

  /**
   * Handle remote session description generated by answer.
   */
  setRemoteDescription(sdp: RTCSessionDescription) {
    this._peerConnection.setRemoteDescription(sdp);
  }

  addIceCandidate(ice: RTCIceCandidate) {
    if (ice === null) {
      return;
    }
    this._peerConnection.addIceCandidate(ice);
  }

  close() {
    if (this._peerConnection.connectionState !== "closed") {
      this._peerConnection.close();
    }

    for (let cid in this._channels) {
      this._channels[cid].close();
    }

    this._onClose();
  }
}