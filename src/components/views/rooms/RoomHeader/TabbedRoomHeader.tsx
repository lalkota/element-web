/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useCallback, type JSX } from "react";
import { Room } from "matrix-js-sdk/src/matrix";
import { type ViewRoomOpts } from "@matrix-org/react-sdk-module-api/lib/lifecycles/RoomViewLifecycle";
import classNames from "classnames";

import RoomHeader from "./RoomHeader";
import { _t } from "../../../../languageHandler";
import { type IOOBData } from "../../../../stores/ThreepidInviteStore";
import AccessibleButton from "../../elements/AccessibleButton";

export enum RoomContentTab {
    Chat = "chat",
    Images = "images",
    Files = "files",
}

interface IProps {
    room: Room;
    additionalButtons?: ViewRoomOpts["buttons"];
    oobData?: IOOBData;
    activeTab: RoomContentTab;
    onTabChange: (tab: RoomContentTab) => void;
}

export default function TabbedRoomHeader({
    room,
    additionalButtons,
    oobData,
    activeTab,
    onTabChange,
}: IProps): JSX.Element {
    const tabs = [
        {
            id: RoomContentTab.Chat,
            label: "Chat"
        },
        {
            id: RoomContentTab.Images,
            label: "Images"
        },
        {
            id: RoomContentTab.Files,
            label: "Files"
        },
    ];

    const handleTabClick = useCallback((tabId: RoomContentTab) => {
        onTabChange(tabId);
    }, [onTabChange]);

    return (
        <div className="mx_TabbedRoomHeader">
            <RoomHeader
                room={room}
                additionalButtons={additionalButtons}
                oobData={oobData}
            />
            <div className="mx_TabbedRoomHeader_tabs">
                {tabs.map((tab) => {
                    return (
                        <AccessibleButton
                            key={tab.id}
                            className={classNames("mx_TabbedRoomHeader_tab", {
                                "mx_TabbedRoomHeader_tab--active": activeTab === tab.id,
                            })}
                            onClick={() => handleTabClick(tab.id)}
                            aria-label={tab.label}
                        >
                            <span className="mx_TabbedRoomHeader_tabLabel">{tab.label}</span>
                        </AccessibleButton>
                    );
                })}
            </div>
        </div>
    );
}
