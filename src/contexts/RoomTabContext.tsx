/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { createContext, useContext, useState, type ReactNode } from "react";

export enum RoomContentTab {
    Chat = "chat",
    Images = "images",
    Files = "files",
    Links = "links",
}

interface RoomTabContextValue {
    activeTab: RoomContentTab;
    setActiveTab: (tab: RoomContentTab) => void;
}

const RoomTabContext = createContext<RoomTabContextValue | null>(null);

interface RoomTabProviderProps {
    children: ReactNode;
}

export function RoomTabProvider({ children }: RoomTabProviderProps): React.JSX.Element {
    const [activeTab, setActiveTab] = useState<RoomContentTab>(RoomContentTab.Chat);

    return (
        <RoomTabContext.Provider value={{ activeTab, setActiveTab }}>
            {children}
        </RoomTabContext.Provider>
    );
}

export function useRoomTab(): RoomTabContextValue {
    const context = useContext(RoomTabContext);
    if (!context) {
        throw new Error("useRoomTab must be used within a RoomTabProvider");
    }
    return context;
}
