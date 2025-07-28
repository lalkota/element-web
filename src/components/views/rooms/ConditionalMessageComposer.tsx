/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ReactNode, type JSX } from "react";

import { useRoomTab, RoomContentTab } from "../../../contexts/RoomTabContext";

interface ConditionalMessageComposerProps {
    children: ReactNode;
}

export default function ConditionalMessageComposer({ children }: ConditionalMessageComposerProps): JSX.Element | null {
    const { activeTab } = useRoomTab();

    // Only render the message composer when on the Chat tab
    if (activeTab === RoomContentTab.Chat) {
        return <>{children}</>;
    }

    return null;
}
