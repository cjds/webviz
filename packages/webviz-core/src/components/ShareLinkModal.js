// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type BrowserHistory } from "history";
import React, { Component } from "react";

import styles from "./ShareJsonModal.module.scss";
import Button from "webviz-core/src/components/Button";
import Flex from "webviz-core/src/components/Flex";
import Modal from "webviz-core/src/components/Modal";
import clipboard from "webviz-core/src/util/clipboard";

import sendNotification from "webviz-core/src/util/sendNotification";

type Props = {
    onRequestClose: () => void,
    onChange: (value: any) => void,
    // the panel state from redux
    // this will be serialized to json & displayed
    value: any, // eslint-disable-line react/no-unused-prop-types
    noun: string,
    history?: BrowserHistory,
};

type State = {|
    value: string,
        url: string,
|};

function encode(value: any): string {
    try {
        return JSON.stringify(value, null, 2);
    } catch (e) {
        sendNotification("Error encoding value", e, "app", "error");
        return "";
    }
}

function extractHostname(url) {
    let hostname;
    //find & remove protocol (http, ftp, etc.) and get hostname

    if (url.indexOf("//") > -1) {
        hostname = `${url.split("/")[0]}//${url.split("/")[2]}`;
    } else {
        hostname = url.split("/")[0];
    }

    //find & remove "?"
    hostname = hostname.split("?")[0];

    return hostname;
}

export default class ShareLinkModal extends Component<Props, State> {
    state = {
        value: encode(this.props.value),
        url: "",
        copied: false
    };

    generateCustomURL = () => {
        const { value } = this.state;
        const params = new URLSearchParams(window.location.search);
        const host = params.get("host") || "http://localhost:1234/api/webviz/config/";
        const data = {
            RosbagId: parseInt(params.get("s3bagid")) || 0,
            SeekTo: parseInt(params.get("seek-to")) || 0,
            Config: value,
        };
        fetch(host, {
            method: "POST", // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, *cors, same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "same-origin", // include, *same-origin, omit
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${params.get("token")}`,
            },
            redirect: "follow", // manual, *follow, error
            referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify(data), // body data type must match "Content-Type" header
        })
            .then((response) => response.json())
            .then((regex_data) => this.setState({ url: `${extractHostname(host)}/uuid/${regex_data.UUID}` }));
    };

    onCopy = () => {
        const { url } = this.state;
        clipboard.copy(url).then(() => {
            this.setState({ copied: true });
            setTimeout(() => this.setState({ copied: false }), 1500);
        });
    };

    render() {
        const params = new URLSearchParams(window.location.search);
        const host = params.get("host");
        const s3bagid = params.get("s3bagid");
        let shareLinkGenerator =
            <div style={{ color: "red" }}>
                <p>You cannot use Generate URLs without Fetch Authorization. Please visit
                <a style={{ color: "white" }} href="https://bagfinder.eks.fetchcore-cloud.com/webviz"> https://bagfinder.eks.fetchcore-cloud.com/webviz </a>
                instead
                </p>
            </div>;
        if (host) {
            let info_text = <div>
                <p style={{ lineHeight: "32px" }}>
                    <em>Copy the current  notes, and layout into a UUID to share configuration</em>
                </p>
                <p style={{ color: "red" }}>Note: No bag will not be attached, as this webviz connected to S3 </p>
            </div>
            if (s3bagid) {
                info_text = <p style={{ lineHeight: "32px" }}>
                    <em>Copy the current bag, notes, and layout into a referencable URL</em>
                </p>
            }
            shareLinkGenerator =
                <div>
                    {info_text}
                    <p style={{ lineHeight: "32px" }}>
                        <Button onClick={this.generateCustomURL} className="test-apply">
                            Click me to generate URL
                        </Button>
                    </p>
                    <hr />
                    {this.state.url !== "" &&
                        <div>
                            <a href={this.state.url}> {this.state.url}</a>
                            <Button onClick={this.onCopy}>{this.state.copied ? "Copied!" : "Copy"}</Button>
                        </div>
                    }
                </div>;
        }
        return (
            <Modal
                onRequestClose={this.props.onRequestClose}
                contentStyle={{
                    height: 400,
                    width: 600,
                    display: "flex",
                }}>
                <Flex col className={styles.container}>
                    {shareLinkGenerator}
                </Flex>
            </Modal>
        );
    }
}
