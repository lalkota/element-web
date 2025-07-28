/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type ReactNode } from "react";
import { Room } from "matrix-js-sdk/src/matrix";

import { useRoomTab, RoomContentTab } from "../../contexts/RoomTabContext";
import RoomImagesView from "../views/rooms/RoomImagesView";
import RoomFilesView from "../views/rooms/RoomFilesView";
import RoomLinksView from "../views/rooms/RoomLinksView";

interface RoomContentProps {
    room: Room;
    chatContent: ReactNode;
}

export default function RoomContent({ room, chatContent }: RoomContentProps): JSX.Element {
    const { activeTab } = useRoomTab();

    switch (activeTab) {
        case RoomContentTab.Images:
            return <RoomImagesView room={room} />;
        case RoomContentTab.Files:
            return <RoomFilesView room={room} />;
        case RoomContentTab.Links:
            return <RoomLinksView room={room} />;
        case RoomContentTab.Chat:
        default:
            return <>{chatContent}</>;
    }
}
